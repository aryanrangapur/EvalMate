// ai.ts — Robust Groq fetch-based AI client for Supabase Edge (Deno compatible)

const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
if (!GROQ_API_KEY) {
  throw new Error("GROQ_API_KEY environment variable is missing");
}

// A small helper to extract the first JSON object from a string, if present
function extractFirstJson(text: string): string | null {
  const start = text.indexOf("{");
  if (start === -1) return null;
  // naive but works for well-formed single JSON object responses:
  // find matching closing brace by tracking nested braces
  let depth = 0;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) {
        return text.slice(start, i + 1);
      }
    }
  }
  return null;
}

export interface AIEvaluation {
  score: number;
  strengths: string[];
  improvements: string[];
  feedback: string;
  suggestions: string[];
}

/**
 * Query Groq models list and pick the best candidate.
 * Returns a model id string or null if none found.
 */
async function pickFallbackModel(): Promise<string | null> {
  const url = "https://api.groq.com/openai/v1/models";
  const res = await fetch(url, {
    method: "GET",
    headers: { "Authorization": `Bearer ${GROQ_API_KEY}`, "Content-Type": "application/json" },
  });

  if (!res.ok) {
    const t = await res.text().catch(() => "");
    console.error("Failed to fetch Groq models list:", res.status, t);
    return null;
  }
  const json = await res.json().catch(() => null);
  if (!json || !Array.isArray(json.data)) {
    // Some Groq responses place model list in top-level array or `data`
    const arr = json?.data ?? json;
    if (!Array.isArray(arr)) return null;
    // fall through using arr
    json.data = arr;
  }

  // Heuristics: prefer models with 'instant' or 'versatile' or 'llama-3' in name
  const preferOrder = ["instant", "versatile", "llama-3", "llama-4", "mixtral", "gemma"];
  const models: string[] = (json.data as any[]).map((m) => m.id || m.model || m.name).filter(Boolean);

  // score candidates based on heuristics
  models.sort((a, b) => {
    const score = (s: string) =>
      preferOrder.reduce((acc, key, idx) => (s.toLowerCase().includes(key) ? acc + (10 - idx) : acc), 0);
    return score(b) - score(a);
  });

  return models.length ? models[0] : null;
}

/**
 * Attempt a single chat completion call with a given model id.
 * Returns raw string content if success, otherwise throws an Error with details.
 */
async function callGroqChat(modelId: string, prompt: string): Promise<string> {
  const url = "https://api.groq.com/openai/v1/chat/completions";
  const payload = {
    model: modelId,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.3,
    max_tokens: 2000,
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const text = await res.text().catch(() => "");

  if (!res.ok) {
    // try to include useful diagnostics
    let details = text;
    console.error(`Groq API responded ${res.status}:`, details);
    // bubble up a structured error
    const err = new Error("Groq API request failed");
    (err as any).status = res.status;
    (err as any).body = details;
    throw err;
  }

  // res.ok; try to parse JSON to find the message content
  try {
    const json = JSON.parse(text);
    const raw = json?.choices?.[0]?.message?.content ?? json?.choices?.[0]?.text;
    if (raw) return raw;
    // if structure different, return text and let caller parse
    return text;
  } catch (parseErr) {
    // non-JSON reply but ok status — return raw text for parsing attempt
    return text;
  }
}

export async function evaluateTask(
  title: string,
  description: string,
  codeContent?: string,
  language?: string
): Promise<AIEvaluation> {
  const prompt = `
You are an expert code reviewer and technical interviewer. Evaluate the following coding task submission and provide detailed feedback.

TASK TITLE: ${title}

TASK DESCRIPTION: ${description}

${codeContent ? `CODE SUBMITTED:\n${codeContent}` : 'No code was submitted for this task.'}

${language ? `PROGRAMMING LANGUAGE: ${language}` : ''}

Please provide a comprehensive evaluation in the following JSON format:
{
  "score": <number between 1-10, where 10 is excellent>,
  "strengths": [<array of strings highlighting what was done well>],
  "improvements": [<array of strings suggesting areas for improvement>],
  "feedback": "<overall feedback paragraph>",
  "suggestions": [<array of specific actionable suggestions>]
}

Be constructive, specific, and helpful. Consider code quality, best practices, problem-solving approach, and completeness.


Do NOT include anything outside the JSON.
`.trim();

  // Preferred model list to try first
  const preferred = [
    // pick modern, production-ready names — these are common choices; we will fallback to model listing if needed
    "llama-3.1-8b-instant",
    "llama-3.1-70b-versatile",
    "mixtral-8x7b-32768",
    "llama-4-scout-17b-16e-instruct",
  ];

  let lastError: any = null;
  let rawOutput: string | null = null;

  // Try preferred models first
  for (const model of preferred) {
    try {
      rawOutput = await callGroqChat(model, prompt);
      console.info("Groq returned content with model:", model);
      break;
    } catch (err) {
      console.warn("Model attempt failed:", model, (err as any).status ?? "", (err as any).body ?? err.message);
      lastError = err;
      // if error indicates model_decommissioned, try next; otherwise continue trying other candidates
    }
  }

  // If still no output, query the models endpoint to pick a fallback
  if (!rawOutput) {
    const fallback = await pickFallbackModel();
    if (fallback) {
      try {
        rawOutput = await callGroqChat(fallback, prompt);
        console.info("Groq returned content with fallback model:", fallback);
      } catch (err) {
        console.error("Fallback model call failed:", fallback, err);
        lastError = err;
      }
    } else {
      console.error("No fallback model available; lastError:", lastError);
      throw new Error("No available model to perform AI evaluation");
    }
  }

  if (!rawOutput) {
    // final failure
    console.error("Groq returned no usable output; lastError:", lastError);
    throw new Error("Groq returned no output");
  }

  // Try parsing rawOutput as JSON; if it contains extra text, extract first JSON object
  let candidate = rawOutput.trim();

  // If it looks like the assistant may have prefixed text, try to find the JSON block
  if (!candidate.startsWith("{")) {
    const extracted = extractFirstJson(candidate);
    if (extracted) {
      candidate = extracted;
      console.info("Extracted JSON substring from Groq output");
    } else {
      // as a last resort, try to locate a markdown code block containing JSON
      const mdMatch = candidate.match(/```(?:json)?\s*([\s\S]*?)```/i);
      if (mdMatch?.[1]) {
        candidate = mdMatch[1].trim();
        console.info("Extracted JSON from markdown code block");
      }
    }
  }

  let evaluation: AIEvaluation;
  try {
    evaluation = JSON.parse(candidate);
  } catch (err) {
    console.error("Failed to parse AI output as JSON. Raw output:", rawOutput);
    throw new Error("Invalid JSON returned from AI");
  }

  // Validate structure
  if (
    typeof evaluation.score !== "number" ||
    !Array.isArray(evaluation.strengths) ||
    !Array.isArray(evaluation.improvements) ||
    typeof evaluation.feedback !== "string" ||
    !Array.isArray(evaluation.suggestions)
  ) {
    console.error("Malformed evaluation object:", evaluation);
    throw new Error("AI returned an evaluation, but format was invalid");
  }

  // clamp score
  evaluation.score = Math.max(1, Math.min(10, evaluation.score));

  return evaluation;
}













// ai.ts — Supabase Edge Function Compatible Version (Deno Runtime)

// const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");

// if (!GROQ_API_KEY) {
//   throw new Error("GROQ_API_KEY environment variable is missing");
// }

// export interface AIEvaluation {
//   score: number;
//   strengths: string[];
//   improvements: string[];
//   feedback: string;
//   suggestions: string[];
// }

// export async function evaluateTask(
//   title: string,
//   description: string,
//   codeContent?: string,
//   language?: string
// ): Promise<AIEvaluation> {
//   const prompt = `
// You are an expert code reviewer and technical interviewer. Evaluate the following coding task submission and provide detailed feedback.

// TASK TITLE: ${title}

// TASK DESCRIPTION: ${description}

// ${codeContent ? `CODE SUBMITTED:\n${codeContent}` : 'No code was submitted for this task.'}

// ${language ? `PROGRAMMING LANGUAGE: ${language}` : ''}

// Please provide a comprehensive evaluation in the following JSON format:
// {
//   "score": <number between 1-10, where 10 is excellent>,
//   "strengths": [<array of strings highlighting what was done well>],
//   "improvements": [<array of strings suggesting areas for improvement>],
//   "feedback": "<overall feedback paragraph>",
//   "suggestions": [<array of specific actionable suggestions>]
// }

// Be constructive, specific, and helpful. Consider code quality, best practices, problem-solving approach, and completeness.


// Do NOT include anything outside the JSON.
// `;

//   try {
//     // ---------------------------
//     // Call Groq API using fetch()
//     // ---------------------------
//     const response = await fetch(
//       "https://api.groq.com/openai/v1/chat/completions",
//       {
//         method: "POST",
//         headers: {
//           "Authorization": `Bearer ${GROQ_API_KEY}`,
//           "Content-Type": "application/json",
//         },
//         body: JSON.stringify({
//           model: "llama3-8b-8192",
//           messages: [{ role: "user", content: prompt }],
//           temperature: 0.3,
//           max_tokens: 2000,
//         }),
//       }
//     );

//     if (!response.ok) {
//       const err = await response.text();
//       console.error("Groq API error:", err);
//       throw new Error("Groq API request failed");
//     }

//     const result = await response.json();
//     const raw = result?.choices?.[0]?.message?.content;

//     if (!raw) {
//       console.error("Groq returned empty content:", result);
//       throw new Error("Groq response missing content");
//     }

//     // ---------------------------
//     // Parse JSON returned by Groq
//     // ---------------------------
//     let evaluation: AIEvaluation;
//     try {
//       evaluation = JSON.parse(raw);
//     } catch (err) {
//       console.error("Failed to parse Groq JSON:", raw);
//       throw new Error("Groq returned invalid JSON");
//     }

//     // ---------------------------
//     // Validate structure
//     // ---------------------------
//     if (
//       typeof evaluation.score !== "number" ||
//       !Array.isArray(evaluation.strengths) ||
//       !Array.isArray(evaluation.improvements) ||
//       typeof evaluation.feedback !== "string" ||
//       !Array.isArray(evaluation.suggestions)
//     ) {
//       console.error("Invalid evaluation structure:", evaluation);
//       throw new Error("Invalid AI evaluation format");
//     }

//     // Clamp score
//     evaluation.score = Math.max(1, Math.min(10, evaluation.score));

//     return evaluation;
//   } catch (error) {
//     console.error("AI evaluation error:", error);
//     throw new Error("Failed to evaluate task with AI");
//   }
// }

