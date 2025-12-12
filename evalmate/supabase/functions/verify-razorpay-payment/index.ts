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
  console.log('🎯 verify-razorpay-payment called:', {
    method: req.method,
    url: req.url,
    headers: Object.fromEntries(req.headers.entries())
  });

  if (req.method === "OPTIONS") {
    console.log('✅ Handling CORS preflight');
    return new Response("ok", { headers: corsHeaders });
  }

  // Test endpoint for connectivity
  if (req.method === "GET") {
    console.log('✅ Handling GET request for connectivity test');
    return new Response(JSON.stringify({
      status: "verify-razorpay-payment function is active",
      timestamp: new Date().toISOString(),
      env_check: {
        supabase_url: !!Deno.env.get("SUPABASE_URL"),
        service_role_key: !!Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
        razorpay_key_id: !!Deno.env.get("RAZORPAY_KEY_ID"),
        razorpay_key_secret: !!Deno.env.get("RAZORPAY_KEY_SECRET")
      }
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  console.log('🔄 Processing POST request for payment verification');
  try {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature, taskId } =
      await req.json();

    console.log('🔍 Verifying payment:', { razorpay_payment_id, razorpay_order_id, taskId });

    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature || !taskId) {
      return new Response(
        JSON.stringify({ error: "Missing payment verification fields" }),
        { status: 400, headers: corsHeaders }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Get logged-in user
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
    } = await supabase.auth.getUser(token);

    if (!user) {
      return new Response(JSON.stringify({ error: "Invalid user" }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    console.log('👤 User verified:', user.id);

    // Verify payment by calling Razorpay API
    const res = await fetch(
      `https://api.razorpay.com/v1/payments/${razorpay_payment_id}`,
      {
        headers: {
          Authorization: encodeBasicAuth(
            Deno.env.get("RAZORPAY_KEY_ID")!,
            Deno.env.get("RAZORPAY_KEY_SECRET")!,
          ),
        },
      }
    );

    const payment = await res.json();

    console.log('💳 Razorpay API response:', { status: res.status, payment_status: payment.status });

    if (!res.ok || payment.status !== "captured") {
      return new Response(
        JSON.stringify({ error: "Payment not verified or not captured", payment }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Insert into payments table
    console.log('💾 Inserting payment record...');
    const { error: paymentError } = await supabase.from("payments").insert({
      user_id: user.id,
      task_id: taskId,
      stripe_payment_id: razorpay_payment_id, // Using existing field for Razorpay ID
      amount: payment.amount,
      currency: payment.currency,
      status: "completed",
    });

    if (paymentError) {
      console.error('❌ Payment insert error:', paymentError);
      return new Response(
        JSON.stringify({ error: "Failed to record payment", details: paymentError }),
        { status: 500, headers: corsHeaders }
      );
    }

    // Set user as premium (account-wide access)
    console.log('👑 Setting user as premium...');
    const { error: premiumError } = await supabase
      .from("user_profiles")
      .update({
        premium_user: true,
        premium_since: new Date().toISOString()
      })
      .eq("user_id", user.id);

    if (premiumError) {
      console.error('❌ Premium upgrade error:', premiumError);
      return new Response(
        JSON.stringify({ error: "Failed to upgrade to premium", details: premiumError }),
        { status: 500, headers: corsHeaders }
      );
    }

    console.log('✅ Payment verified and user upgraded to premium successfully');

    return new Response(JSON.stringify({
      success: true,
      unlocked: true,
      message: "Payment verified and report unlocked"
    }), {
      status: 200,
      headers: corsHeaders,
    });
  } catch (err) {
    console.error("❌ verify-payment error:", err);
    return new Response(JSON.stringify({ error: "Server error", details: err.message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
