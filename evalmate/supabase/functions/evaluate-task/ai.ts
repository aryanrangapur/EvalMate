// ai.ts — Enhanced AI Evaluation Engine for EvalMate
// Robust Groq-based code evaluation with premium insights

const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
if (!GROQ_API_KEY) {
  throw new Error("GROQ_API_KEY environment variable is missing");
}

// ===================================
// INTERFACES
// ===================================

export interface AIEvaluation {
  score: number;
  strengths: string[];
  improvements: string[];
  feedback: string;
  suggestions: string[];
  premiumInsights?: PremiumInsights;
}

export interface PremiumInsights {
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
}

// ===================================
// UTILITY FUNCTIONS
// ===================================

/**
 * Sanitize JSON string by removing backticks, markdown, and fixing common issues
 */
function sanitizeJson(jsonString: string): string {
  let sanitized = jsonString.trim();

  // Remove markdown code blocks
  sanitized = sanitized.replace(/```json\s*/gi, "");
  sanitized = sanitized.replace(/```javascript\s*/gi, "");
  sanitized = sanitized.replace(/```\s*/g, "");

  // Fix code fields with backticks
  sanitized = sanitized.replace(/"(code|correctedCode)":\s*`([^`]*)`/g, (_, field, code) => {
    return `"${field}": ${JSON.stringify(code)}`;
  });

  // Remove any remaining backticks
  sanitized = sanitized.replace(/`/g, "");

  return sanitized;
}

/**
 * Extract first valid JSON object from text
 */
function extractFirstJson(text: string): string | null {
  const start = text.indexOf("{");
  if (start === -1) return null;

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

// ===================================
// GROQ API FUNCTIONS
// ===================================

/**
 * Query Groq models and select best available model
 */
async function pickFallbackModel(): Promise<string | null> {
  const url = "https://api.groq.com/openai/v1/models";

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
    });

    if (!res.ok) {
      console.error("Failed to fetch Groq models:", res.status);
      return null;
    }

    const json = await res.json();
    const models = Array.isArray(json?.data) ? json.data : (Array.isArray(json) ? json : []);

    // Preferred working models (Dec 2025)
    const preferredModels = [
      "llama-3.3-70b-versatile",
      "llama-3.3-8b-instant",
      "gemma2-9b-it",
      "mixtral-8x22b",
      "llama-3.1-70b-versatile",
      "llama-3.1-8b-instant",
    ];

    const availableModels = models
      .map((m: any) => m.id || m.model || m.name)
      .filter(Boolean);

    // Find first matching preferred model
    for (const preferred of preferredModels) {
      const found = availableModels.find((m: string) =>
        m.includes(preferred) || m === preferred
      );
      if (found) {
        console.log("Selected fallback model:", found);
        return found;
      }
    }

    // Return first available as last resort
    return availableModels[0] || null;
  } catch (error) {
    console.error("Error fetching models:", error);
    return null;
  }
}

/**
 * Call Groq API with specified model
 */
async function callGroqChat(
  modelId: string,
  prompt: string,
  maxTokens: number = 3000
): Promise<string> {
  const url = "https://api.groq.com/openai/v1/chat/completions";

  const payload = {
    model: modelId,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.3,
    max_tokens: maxTokens,
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const text = await res.text();

  if (!res.ok) {
    console.error(`Groq API error (${res.status}):`, text);
    const err = new Error("Groq API request failed");
    (err as any).status = res.status;
    (err as any).body = text;
    throw err;
  }

  try {
    const json = JSON.parse(text);
    return json?.choices?.[0]?.message?.content ?? text;
  } catch {
    return text;
  }
}

/**
 * Parse JSON response with fallback extraction
 */
function parseJsonResponse(rawOutput: string): any {
  let candidate = rawOutput.trim();

  // Try direct parse first
  if (candidate.startsWith("{")) {
    try {
      return JSON.parse(candidate);
    } catch {
      // Continue to extraction methods
    }
  }

  // Extract JSON from text
  const extracted = extractFirstJson(candidate);
  if (extracted) {
    candidate = extracted;
  } else {
    // Try markdown code block
    const mdMatch = candidate.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (mdMatch?.[1]) {
      candidate = mdMatch[1].trim();
    }
  }

  // Sanitize and parse
  candidate = sanitizeJson(candidate);
  return JSON.parse(candidate);
}

// ===================================
// MAIN EVALUATION FUNCTION
// ===================================

export async function evaluateTask(
  title: string,
  description: string,
  codeContent?: string,
  language?: string
): Promise<AIEvaluation> {

  // Truncate code if too long
  const maxCodeLength = 10000;
  let processedCode = codeContent || '';
  let wasTruncated = false;

  if (processedCode.length > maxCodeLength) {
    processedCode = processedCode.substring(0, maxCodeLength) +
      '\n\n[... Code truncated due to length ...]';
    wasTruncated = true;
    console.warn(`Code truncated: ${codeContent?.length || 0} → ${maxCodeLength} chars`);
  }

  // Build comprehensive evaluation prompt
  const prompt = buildEvaluationPrompt(title, description, processedCode, language, wasTruncated);

  // Try preferred models
  const preferredModels = [
    "llama-3.3-70b-versatile",
    "llama-3.3-8b-instant",
    "gemma2-9b-it",
    "mixtral-8x22b",
  ];

  let rawOutput: string | null = null;
  let lastError: any = null;

  // Attempt with preferred models
  for (const model of preferredModels) {
    try {
      rawOutput = await callGroqChat(model, prompt);
      console.info("✓ Evaluation completed with model:", model);
      break;
    } catch (err) {
      console.warn("✗ Model failed:", model, (err as any).status);
      lastError = err;
    }
  }

  // Fallback to dynamic model selection
  if (!rawOutput) {
    const fallback = await pickFallbackModel();
    if (fallback) {
      try {
        rawOutput = await callGroqChat(fallback, prompt);
        console.info("✓ Evaluation completed with fallback:", fallback);
      } catch (err) {
        console.error("✗ Fallback failed:", fallback, err);
        lastError = err;
      }
    }
  }

  if (!rawOutput) {
    console.error("All models failed. Last error:", lastError);
    throw new Error("No available model for AI evaluation");
  }

  // Parse and validate evaluation
  let evaluation: AIEvaluation;
  try {
    evaluation = parseJsonResponse(rawOutput);
  } catch (err) {
    console.error("JSON parse error:", err);
    console.error("Raw output:", rawOutput.substring(0, 500));
    throw new Error(`Invalid JSON from AI: ${(err as Error).message}`);
  }

  // Validate structure
  if (
    typeof evaluation.score !== "number" ||
    !Array.isArray(evaluation.strengths) ||
    !Array.isArray(evaluation.improvements) ||
    typeof evaluation.feedback !== "string" ||
    !Array.isArray(evaluation.suggestions)
  ) {
    console.error("Invalid evaluation structure:", evaluation);
    throw new Error("AI returned malformed evaluation");
  }

  // Clamp score to valid range
  evaluation.score = Math.max(1, Math.min(10, evaluation.score));

  // Generate premium insights
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
    console.log("✓ Premium insights generated successfully");
  } catch (err) {
    console.error("✗ Premium insights generation failed:", err);
    // Continue without premium insights
  }

  return evaluation;
}

// ===================================
// PROMPT BUILDERS
// ===================================

function buildEvaluationPrompt(
  title: string,
  description: string,
  code: string,
  language?: string,
  wasTruncated?: boolean
): string {
  return `
You are a senior software engineer and technical interviewer conducting a rigorous code review. Your evaluation must be STRICT, HONEST, and COMPREHENSIVE.

═══════════════════════════════════════════════════════════════
TASK SUBMISSION
═══════════════════════════════════════════════════════════════

Title: ${title}

Description:
${description}

${code ? `Code Submitted (${language || 'unknown language'}):
\`\`\`${language || 'text'}
${code}
\`\`\`` : '⚠️ No code was submitted'}
${wasTruncated ? '\n⚠️ Code was truncated for evaluation' : ''}

═══════════════════════════════════════════════════════════════
EVALUATION CRITERIA (BE CRITICAL AND THOROUGH)
═══════════════════════════════════════════════════════════════

1. CORRECTNESS (35%)
   - Does the code solve the problem correctly?
   - Are there logical errors or bugs?
   - Does it handle edge cases?
   - Are there off-by-one errors, null checks, etc.?

2. CODE QUALITY (25%)
   - Readability and clarity
   - Naming conventions (descriptive names)
   - Code organization and structure
   - Consistent style and formatting

3. BEST PRACTICES (20%)
   - Follows language-specific conventions
   - DRY principle (Don't Repeat Yourself)
   - SOLID principles where applicable
   - Separation of concerns

4. PERFORMANCE (10%)
   - Time and space complexity
   - Efficient algorithms and data structures
   - No unnecessary operations
   - Scalability considerations

5. SECURITY & ROBUSTNESS (10%)
   - Input validation
   - Error handling and edge cases
   - Potential vulnerabilities
   - Defensive programming

═══════════════════════════════════════════════════════════════
SCORING GUIDELINES (BE HONEST AND STRICT)
═══════════════════════════════════════════════════════════════

10 = PERFECT: Production-ready, exemplary code with best practices
 9 = EXCELLENT: Very strong with only minor nitpicks
 8 = GOOD: Solid code with a few improvements needed
 7 = ABOVE AVERAGE: Working code with several issues to address
 6 = AVERAGE: Functional but has notable problems
 5 = BELOW AVERAGE: Works partially, has significant issues
 4 = POOR: Major problems, barely functional
 3 = VERY POOR: Critical flaws, mostly non-functional
 2 = MINIMAL: Barely any correct code, fundamental misunderstanding
 1 = UNACCEPTABLE: No working code, random characters, or empty

IMPORTANT RULES:
• Minimal code (< 10 characters) = Score 1-2
• Non-functional code = Score 1-3
• Working but poor quality = Score 4-6
• Good quality with issues = Score 7-8
• Excellent quality = Score 9-10
• Be STRICT - most code should score 5-7

═══════════════════════════════════════════════════════════════
OUTPUT FORMAT (CRITICAL: RETURN ONLY JSON, NO MARKDOWN)
═══════════════════════════════════════════════════════════════

{
  "score": <number 1-10, be STRICT and CRITICAL>,
  "strengths": [
    <list specific things done well - be honest, only if there ARE strengths>
  ],
  "improvements": [
    <list ALL issues found - be thorough and specific>
  ],
  "feedback": "<2-3 paragraph overall assessment - be direct, constructive, and critical>",
  "suggestions": [
    <specific actionable recommendations with examples where helpful>
  ]
}

CRITICAL REQUIREMENTS:
• Return ONLY the JSON object
• NO markdown code blocks
• NO backticks
• NO explanatory text outside JSON
• Be SPECIFIC in all feedback
• Provide CODE EXAMPLES in suggestions where helpful
• Be HONEST about weaknesses

EVALUATE NOW:
`.trim();
}

// ===================================
// PREMIUM INSIGHTS GENERATION
// ===================================

async function generatePremiumInsights(
  title: string,
  description: string,
  codeContent: string,
  language: string | undefined,
  evaluation: AIEvaluation
): Promise<PremiumInsights> {

  const prompt = buildPremiumInsightsPrompt(
    title,
    description,
    codeContent,
    language,
    evaluation
  );

  const preferredModels = [
    "llama-3.3-70b-versatile",
    "llama-3.3-8b-instant",
    "gemma2-9b-it",
  ];

  let rawOutput: string | null = null;

  for (const model of preferredModels) {
    try {
      rawOutput = await callGroqChat(model, prompt, 4000);
      console.info("✓ Premium insights from model:", model);
      break;
    } catch (err) {
      console.warn("✗ Premium model failed:", model);
    }
  }

  if (!rawOutput) {
    const fallback = await pickFallbackModel();
    if (fallback) {
      rawOutput = await callGroqChat(fallback, prompt, 4000);
    }
  }

  if (!rawOutput) {
    throw new Error("Failed to generate premium insights");
  }

  // Parse insights
  const insights = parseJsonResponse(rawOutput);

  // Validate and normalize numeric fields
  insights.codeQuality = Math.max(0, Math.min(100, insights.codeQuality || evaluation.score * 10));
  insights.industryAverage = Math.max(0, Math.min(100, insights.industryAverage || 72));
  insights.topPerformers = Math.max(0, Math.min(100, insights.topPerformers || 92));

  console.log("Benchmarks:", {
    codeQuality: insights.codeQuality,
    industryAverage: insights.industryAverage,
    topPerformers: insights.topPerformers
  });

  return insights;
}

function buildPremiumInsightsPrompt(
  title: string,
  description: string,
  code: string,
  language: string | undefined,
  evaluation: AIEvaluation
): string {
  return `
You are a STAFF SOFTWARE ENGINEER conducting a deep technical review for premium analysis. Provide industry-grade insights.

═══════════════════════════════════════════════════════════════
CODE UNDER REVIEW
═══════════════════════════════════════════════════════════════

Task: ${title}
Description: ${description}
Language: ${language || 'Not specified'}
Current Score: ${evaluation.score}/10

Code:
\`\`\`${language || 'text'}
${code}
\`\`\`

═══════════════════════════════════════════════════════════════
PREMIUM ANALYSIS REQUIREMENTS
═══════════════════════════════════════════════════════════════

Provide a comprehensive technical deep-dive covering:

1. ARCHITECTURE ANALYSIS
   • Design patterns used or missing
   • Code organization and modularity
   • Coupling and cohesion assessment
   • Scalability considerations
   • Architectural recommendations

2. PERFORMANCE ANALYSIS
   • Time complexity (Big O notation)
   • Space complexity
   • Performance bottlenecks
   • Optimization opportunities
   • Memory usage considerations

3. SECURITY ANALYSIS
   • Input validation coverage
   • Potential vulnerabilities (OWASP Top 10)
   • Error handling robustness
   • Security best practices
   • Data handling and privacy

4. INDUSTRY BENCHMARKS (CRITICAL - BE REALISTIC)
   • codeQuality: 0-100 based on ACTUAL code quality
     * Terrible/minimal code (3 chars): 5-20
     * Poor code: 20-40
     * Average code: 40-65
     * Good code: 65-85
     * Excellent code: 85-100

   • industryAverage: 0-100 (typical quality for this task)
     * Simple tasks: 60-75
     * Medium tasks: 50-70
     * Complex tasks: 40-60

   • topPerformers: 0-100 (top 10% for this task)
     * Simple tasks: 85-95
     * Medium tasks: 75-90
     * Complex tasks: 65-85

5. EXPERT RECOMMENDATIONS
   • Immediate: Critical fixes needed NOW
   • Future: Enhancements for long-term quality

6. LEARNING PATH
   • Specific skills to develop
   • Concrete learning resources

7. CORRECTED CODE
   • COMPLETE, PRODUCTION-READY version
   • Addresses ALL identified issues
   • Includes error handling
   • Well-commented and documented
   • Follows best practices

═══════════════════════════════════════════════════════════════
OUTPUT FORMAT (JSON ONLY, NO MARKDOWN)
═══════════════════════════════════════════════════════════════

{
  "architecture": "<detailed architecture analysis, 3-5 sentences>",
  "performance": "<performance analysis with complexity, 3-5 sentences>",
  "security": "<security assessment, 3-5 sentences>",
  "codeQuality": <0-100, STRICT based on actual code>,
  "industryAverage": <0-100, realistic for this task complexity>,
  "topPerformers": <0-100, realistic for this task>,
  "expertRecommendations": {
    "immediate": [
      "<specific immediate fix 1>",
      "<specific immediate fix 2>"
    ],
    "future": [
      "<future enhancement 1>",
      "<future enhancement 2>"
    ]
  },
  "learningPath": {
    "nextSkills": [
      "<skill to learn 1>",
      "<skill to learn 2>"
    ],
    "resources": [
      "<specific learning resource 1>",
      "<specific learning resource 2>"
    ]
  },
  "correctedCode": "<COMPLETE corrected code with proper structure, error handling, comments>"
}

CRITICAL RULES:
• Return ONLY JSON (no markdown, no backticks, no explanations)
• Be REALISTIC with benchmarks (don't always use 70/90)
• correctedCode must be COMPLETE and PRODUCTION-READY
• All analysis must be SPECIFIC to the actual code
• Provide ACTIONABLE recommendations

GENERATE NOW:
`.trim();
}
