import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function encodeBasicAuth(key_id: string, key_secret: string) {
  return "Basic " + btoa(`${key_id}:${key_secret}`);
}

serve(async (req) => {
  console.log('🎯 create-razorpay-order called:', {
    method: req.method,
    url: req.url,
    headers: Object.fromEntries(req.headers.entries())
  });

  if (req.method === "OPTIONS") {
    console.log('✅ Handling CORS preflight');
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const RZP_KEY_ID = Deno.env.get("RAZORPAY_KEY_ID")!;
    const RZP_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET")!;

    console.log('🔧 Environment check:', {
      hasRazorpayKey: !!RZP_KEY_ID,
      hasRazorpaySecret: !!RZP_KEY_SECRET,
      hasSupabaseUrl: !!Deno.env.get("SUPABASE_URL"),
      hasServiceKey: !!Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
    });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { taskId, amount } = await req.json().catch(() => ({}));
    console.log('📥 Request body parsed:', { taskId, amount });

    if (!taskId || !amount) {
      console.log('❌ Missing required fields');
      return new Response(
        JSON.stringify({ error: "Task ID and amount are required" }),
        { status: 400, headers: corsHeaders },
      );
    }

    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser(token);

    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Invalid user" }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    console.log('🔍 Checking task access:', { taskId, userId: user.id });

    const { data: task, error: taskError } = await supabase
      .from("tasks")
      .select("*")
      .eq("id", taskId)
      .eq("user_id", user.id)
      .single();

    console.log('📋 Task query result:', {
      taskFound: !!task,
      taskError,
      taskData: task ? { id: task.id, user_id: task.user_id, title: task.title } : null
    });

    if (!task) {
      console.log('❌ Task not found or access denied');
      return new Response(JSON.stringify({
        error: "Task not found or access denied",
        details: { taskId, userId: user.id, taskError }
      }), {
        status: 400, // Changed from 404 to 400 to match the error
        headers: corsHeaders,
      });
    }

    if (task.report_unlocked) {
      return new Response(
        JSON.stringify({ error: "Report already unlocked" }),
        { status: 400, headers: corsHeaders },
      );
    }

    // 💳 CREATE Razorpay order using fetch()
    // Razorpay max receipt length = 40
    const shortReceipt =
      `t_${taskId.slice(0, 8)}_${Date.now().toString().slice(-6)}`;

    const orderPayload = {
      amount,
      currency: "INR",
      receipt: shortReceipt,
      notes: {
        task_id: String(taskId),
        user_id: String(user.id)
      }
    };

    const razorpayRes = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Authorization": encodeBasicAuth(RZP_KEY_ID, RZP_KEY_SECRET),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(orderPayload),
    });

    const razorpayData = await razorpayRes.json();

    if (!razorpayRes.ok) {
      console.error("Razorpay error:", razorpayData);
      return new Response(
        JSON.stringify({ error: "Failed to create Razorpay order", details: razorpayData }),
        { status: 500, headers: corsHeaders },
      );
    }

    return new Response(
      JSON.stringify({
        id: razorpayData.id,
        amount: razorpayData.amount,
        currency: razorpayData.currency,
        receipt: razorpayData.receipt,
      }),
      { status: 200, headers: corsHeaders },
    );
  } catch (err) {
    console.error("create-order error:", err);
    return new Response(JSON.stringify({ error: "Server error" }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
