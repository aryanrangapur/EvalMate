// ai.ts — Robust Groq fetch-based AI client for Supabase Edge (Deno compatible)

const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
if (!GROQ_API_KEY) {
  throw new Error("GROQ_API_KEY environment variable is missing");
}

/**
 * Sanitize JSON string by removing backticks, markdown code blocks, and fixing common issues
 */
function sanitizeJson(jsonString: string): string {
  let sanitized = jsonString.trim();

  // Remove markdown code blocks
  sanitized = sanitized.replace(/```json\s*/gi, "");
  sanitized = sanitized.replace(/```\s*/g, "");
  
  // Remove backticks that might break JSON
  sanitized = sanitized.replace(/`([^`]*)`/g, (match, content) => {
    // If it's a code block, escape it properly
    return JSON.stringify(content);
  });

  // Fix common issues: code fields with backticks
  sanitized = sanitized.replace(/"code":\s*`([^`]*)`/g, (_, code) => {
    return `"code": ${JSON.stringify(code)}`;
  });
  
  sanitized = sanitized.replace(/"correctedCode":\s*`([^`]*)`/g, (_, code) => {
    return `"correctedCode": ${JSON.stringify(code)}`;
  });

  // Remove any remaining backticks
  sanitized = sanitized.replace(/`/g, "");

  return sanitized;
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
  premiumInsights?: {
    architecture: string;
    performance: string;
    security: string;
    codeQuality: number;
    industryAverage: number;
    topPerformers: number;
    expertRecommendations: {
      immediate: string[];
      future: string[];
    };
    learningPath: {
      nextSkills: string[];
      resources: string[];
    };
    correctedCode?: string;
  };
}

/**
 * Query Groq models list and pick the best candidate.
 * Filters out decommissioned models and returns a working model.
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

  // Known working models as of Dec 2025
  const knownWorkingModels = [
    "llama-3.3-70b-versatile",
    "llama-3.3-8b-instant",
    "gemma2-9b-it",
    "mixtral-8x22b",
    "llama-3.1-70b-versatile", // Keep as fallback
    "llama-3.1-8b-instant", // Keep as fallback
  ];

  // Get all available models
  const allModels: string[] = (json.data as any[]).map((m) => m.id || m.model || m.name).filter(Boolean);
  
  // Filter to only known working models
  const workingModels = allModels.filter((m) => 
    knownWorkingModels.some((known) => m.includes(known) || m === known)
  );

  if (workingModels.length === 0) {
    console.warn("No known working models found, trying first available model");
    return allModels.length > 0 ? allModels[0] : null;
  }

  // Prefer models in order: llama-3.3 > gemma2 > mixtral > others
  const preferOrder = ["llama-3.3", "gemma2", "mixtral-8x22b", "llama-3.1", "mixtral"];
  workingModels.sort((a, b) => {
    const score = (s: string) =>
      preferOrder.reduce((acc, key, idx) => (s.toLowerCase().includes(key) ? acc + (10 - idx) : acc), 0);
    return score(b) - score(a);
  });

  console.log("Selected fallback model:", workingModels[0]);
  return workingModels[0];
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
  // Truncate code if too long to prevent token limit issues
  const maxCodeLength = 8000; // Leave room for prompt and response
  let processedCode = codeContent || '';
  let wasTruncated = false;

  if (processedCode.length > maxCodeLength) {
    processedCode = processedCode.substring(0, maxCodeLength) + '\n\n[... Code truncated due to length ...]';
    wasTruncated = true;
    console.warn(`Code truncated from ${codeContent?.length || 0} to ${maxCodeLength} characters`);
  }

  const prompt = `
You are a STRICT and RIGOROUS code evaluator. Your job is to be CRITICAL and find ALL issues. You are NOT here to be nice - you are here to evaluate code quality objectively.

TASK TITLE: ${title}

TASK DESCRIPTION: ${description}

${processedCode ? `CODE SUBMITTED:\n\`\`\`${language || 'javascript'}\n${processedCode}\n\`\`\`` : 'No code was submitted for this task.'}${wasTruncated ? '\n\n⚠️ Note: Code was truncated for evaluation due to length constraints.' : ''}

${language ? `PROGRAMMING LANGUAGE: ${language}` : ''}

EVALUATION CRITERIA (BE STRICT):
1. Code Quality: Syntax errors, logic errors, edge cases, type safety
2. Best Practices: Code structure, naming conventions, DRY principle, SOLID principles
3. Problem Solving: Does it solve the problem correctly? Are there bugs?
4. Completeness: Are all requirements met? Missing features?
5. Maintainability: Is code readable? Is it modular? Can it be extended?
6. Performance: Are there inefficiencies? Unnecessary operations?
7. Security: Input validation, error handling, potential vulnerabilities
8. Testing: Are edge cases handled? Error scenarios?

SCORING GUIDELINES (BE STRICT):
- 1-3: Code has critical bugs, doesn't work, or is completely wrong
- 4-5: Code works but has major issues, poor structure, missing requirements
- 6-7: Code works and meets basic requirements but has significant issues or poor practices
- 8-9: Code is good quality with minor issues or improvements needed
- 10: Production-ready, excellent code with best practices

IMPORTANT: 
- If code is minimal (like 3 letters), score should be VERY LOW (1-3)
- If code has bugs, score should reflect severity
- If code doesn't follow best practices, deduct points
- Be HONEST and CRITICAL - don't inflate scores

CRITICAL: Return ONLY valid JSON. Do NOT include:
- Backticks
- Markdown code blocks
- Explanations outside the JSON
- Any text before or after the JSON object

Please provide a comprehensive evaluation in the following JSON format (return ONLY this JSON, nothing else):
{
  "score": <number between 1-10, be STRICT and HONEST>,
  "strengths": [<array of strings - only include if there are actual strengths, be specific>],
  "improvements": [<array of strings - list ALL issues found, be specific and critical>],
  "feedback": "<overall feedback paragraph - be direct and critical about issues>",
  "suggestions": [<array of specific actionable suggestions with code examples if needed>]
}

Be CRITICAL, SPECIFIC, and HONEST. Point out every flaw. Don't sugarcoat issues.

Return ONLY the JSON object above. No markdown, no backticks, no explanations.
`.trim();

  // Preferred model list - Updated for Dec 2025 (current working models)
  const preferred = [
    "llama-3.3-70b-versatile",
    "llama-3.3-8b-instant",
    "gemma2-9b-it",
    "mixtral-8x22b",
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

  // Sanitize JSON to remove backticks, markdown, and fix common issues
  candidate = sanitizeJson(candidate);
  console.log("Sanitized JSON candidate (first 200 chars):", candidate.substring(0, 200));

  let evaluation: AIEvaluation;
  try {
    evaluation = JSON.parse(candidate);
  } catch (err) {
    console.error("Failed to parse AI output as JSON after sanitization.");
    console.error("Sanitized candidate:", candidate.substring(0, 500));
    console.error("Original raw output (first 500 chars):", rawOutput.substring(0, 500));
    console.error("Parse error:", err);
    throw new Error(`Invalid JSON returned from AI: ${(err as Error).message}`);
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

  // Generate Premium Insights (AI-generated, not hardcoded)
  try {
    console.log("Generating premium insights...");
    const premiumInsights = await generatePremiumInsights(
      title,
      description,
      processedCode,
      language,
      evaluation
    );
    evaluation.premiumInsights = premiumInsights;
  } catch (err) {
    console.error("Failed to generate premium insights:", err);
    // Continue without premium insights if generation fails
  }

  return evaluation;
}

/**
 * Generate premium insights with corrected code using AI
 */
async function generatePremiumInsights(
  title: string,
  description: string,
  codeContent: string,
  language: string | undefined,
  evaluation: AIEvaluation
): Promise<AIEvaluation["premiumInsights"]> {
  const prompt = `
You are an expert code reviewer providing premium technical analysis. Analyze the code deeply and provide industry-standard insights.

TASK TITLE: ${title}
TASK DESCRIPTION: ${description}
CODE SUBMITTED:
\`\`\`${language || 'javascript'}
${codeContent}
\`\`\`

CURRENT EVALUATION SCORE: ${evaluation.score}/10

Based on the actual code quality, provide a comprehensive premium analysis in the following JSON format:
{
  "architecture": "<detailed analysis of code architecture, structure, design patterns used or missing>",
  "performance": "<analysis of performance implications, time/space complexity, optimizations needed>",
  "security": "<security analysis including input validation, potential vulnerabilities, best practices>",
  "codeQuality": <number 0-100 based on ACTUAL code quality - be STRICT. If code is minimal/bad, score should be LOW>,
  "industryAverage": <number 0-100 representing typical code quality in the industry for similar tasks - usually 65-75>,
  "topPerformers": <number 0-100 representing code quality of top 10% developers for similar tasks - usually 85-95>,
  "expertRecommendations": {
    "immediate": [<array of specific immediate improvements needed>],
    "future": [<array of future enhancements to consider>]
  },
  "learningPath": {
    "nextSkills": [<array of skills to learn next based on code gaps>],
    "resources": [<array of specific learning resources>]
  },
  "correctedCode": "<Provide a FULL, COMPLETE, PRODUCTION-READY corrected version of the code that addresses ALL issues found. Include proper error handling, validation, best practices, and comments. Format as a code block.>"
}

IMPORTANT - CRITICAL FOR BENCHMARKS:
- codeQuality should reflect ACTUAL code quality (0-100). If code is terrible/minimal -> HAVING 3-5 random characters (like "aee" or "ee"), score should be VERY LOW (10-30). If code is good, score can be higher (70-100).
- industryAverage MUST vary based on ACTUAL code quality and task complexity:
  * If code is terrible/minimal/nonsense: industryAverage should be LOW (10-25) - most developers would do better
  * If code is average: industryAverage should be MODERATE (40-70)
  * If code is good: industryAverage should be HIGHER (95)
  * For simple tasks, benchmarks are higher; for complex tasks, they're lower
- topPerformers MUST vary based on ACTUAL code quality and task complexity:
  * If code is terrible/minimal/nonsense: topPerformers should be MODERATE (10-25) - even top developers have limits
  * If code is average: topPerformers should be HIGH (45-72)
  * If code is good: topPerformers should be VERY HIGH (80-98)
  * DO NOT always return 70 and 90 - these MUST vary significantly based on the actual code submitted
- These benchmarks MUST reflect how the submitted code compares to industry standards
- If someone submits nonsense (like "aee"), industryAverage should be HIGHER than their codeQuality (showing most developers do better)
- If someone submits good code, industryAverage might be LOWER than their codeQuality (showing they're above average)
- Be HONEST and DYNAMIC - never use the same values for different code
- correctedCode should be a complete, working, production-ready solution
- All analysis should be based on the ACTUAL code submitted, not generic responses

CRITICAL: Return ONLY valid JSON. Do NOT include:
- Backticks
- Markdown code blocks
- Explanations outside the JSON
- Any text before or after the JSON object

Return ONLY the JSON object above. No markdown, no backticks, no explanations.
`.trim();

  // Updated models for Dec 2025 (same as main evaluation)
  const preferred = [
    "llama-3.3-70b-versatile",
    "llama-3.3-8b-instant",
    "gemma2-9b-it",
    "mixtral-8x22b",
  ];

  let rawOutput: string | null = null;
  let lastError: any = null;

  for (const model of preferred) {
    try {
      rawOutput = await callGroqChat(model, prompt);
      console.info("Premium insights generated with model:", model);
      break;
    } catch (err) {
      console.warn("Premium insights model attempt failed:", model, err);
      lastError = err;
    }
  }

  // Try fallback if preferred models fail
  if (!rawOutput) {
    const fallback = await pickFallbackModel();
    if (fallback) {
      try {
        rawOutput = await callGroqChat(fallback, prompt);
        console.info("Premium insights generated with fallback model:", fallback);
      } catch (err) {
        console.error("Premium insights fallback model failed:", fallback, err);
        lastError = err;
      }
    }
  }

  if (!rawOutput) {
    console.error("Failed to generate premium insights; lastError:", lastError);
    throw new Error("Failed to generate premium insights - no working model found");
  }

  // Parse JSON from response
  let candidate = rawOutput.trim();
  if (!candidate.startsWith("{")) {
    const extracted = extractFirstJson(candidate);
    if (extracted) {
      candidate = extracted;
      console.info("Extracted JSON substring from premium insights output");
    } else {
      const mdMatch = candidate.match(/```(?:json)?\s*([\s\S]*?)```/i);
      if (mdMatch?.[1]) {
        candidate = mdMatch[1].trim();
        console.info("Extracted JSON from markdown code block in premium insights");
      }
    }
  }

  // Sanitize JSON to remove backticks, markdown, and fix common issues
  candidate = sanitizeJson(candidate);
  console.log("Sanitized premium insights JSON (first 200 chars):", candidate.substring(0, 200));

  try {
    const insights = JSON.parse(candidate);
    
    // Validate and clamp codeQuality
    if (typeof insights.codeQuality === 'number') {
      insights.codeQuality = Math.max(0, Math.min(100, insights.codeQuality));
    } else {
      insights.codeQuality = Math.max(0, Math.min(100, evaluation.score * 10));
    }

    // Validate and clamp industryAverage - ensure it's a number and varies
    if (typeof insights.industryAverage !== 'number') {
      // Generate dynamic default based on codeQuality
      insights.industryAverage = Math.max(50, Math.min(80, insights.codeQuality + 20));
      console.warn("industryAverage was not a number, generated dynamic default:", insights.industryAverage);
    } else {
      insights.industryAverage = Math.max(0, Math.min(100, insights.industryAverage));
    }

    // Validate and clamp topPerformers - ensure it's a number and varies
    if (typeof insights.topPerformers !== 'number') {
      // Generate dynamic default based on codeQuality
      insights.topPerformers = Math.max(70, Math.min(98, insights.codeQuality + 50));
      console.warn("topPerformers was not a number, generated dynamic default:", insights.topPerformers);
    } else {
      insights.topPerformers = Math.max(0, Math.min(100, insights.topPerformers));
    }

    // Log benchmarks for debugging
    console.log("Generated benchmarks:", {
      codeQuality: insights.codeQuality,
      industryAverage: insights.industryAverage,
      topPerformers: insights.topPerformers
    });

    return insights;
  } catch (err) {
    console.error("Failed to parse premium insights JSON after sanitization.");
    console.error("Sanitized candidate (first 500 chars):", candidate.substring(0, 500));
    console.error("Original raw output (first 500 chars):", rawOutput.substring(0, 500));
    console.error("Parse error:", err);
    throw new Error(`Invalid JSON in premium insights: ${(err as Error).message}`);
  }
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

