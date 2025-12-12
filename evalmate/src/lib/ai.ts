import Groq from 'groq-sdk'

const groq = process.env.GROQ_API_KEY ? new Groq({
  apiKey: process.env.GROQ_API_KEY,
}) : null

export interface AIEvaluation {
  score: number
  strengths: string[]
  improvements: string[]
  feedback: string
  suggestions: string[]
}

export async function evaluateTask(
  title: string,
  description: string,
  codeContent?: string,
  language?: string
): Promise<AIEvaluation> {
  if (!groq) {
    // Return mock evaluation when AI is not configured
    return {
      score: 7,
      strengths: [
        "Well-structured task description",
        "Clear problem statement"
      ],
      improvements: [
        "Consider adding more specific requirements",
        "Include edge cases to test"
      ],
      feedback: "This is a mock evaluation because AI services are not configured. Please set up your GROQ_API_KEY environment variable to get real AI-powered feedback.",
      suggestions: [
        "Configure environment variables",
        "Test with real AI evaluation",
        "Consider adding more detailed code examples"
      ]
    }
  }

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
`

  try {
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      model: 'llama3-8b-8192',
      temperature: 0.3,
      max_tokens: 2000,
    })

    const response = completion.choices[0]?.message?.content

    if (!response) {
      throw new Error('No response from AI')
    }

    // Parse the JSON response
    const evaluation = JSON.parse(response) as AIEvaluation

    // Validate the response structure
    if (
      typeof evaluation.score !== 'number' ||
      !Array.isArray(evaluation.strengths) ||
      !Array.isArray(evaluation.improvements) ||
      typeof evaluation.feedback !== 'string' ||
      !Array.isArray(evaluation.suggestions)
    ) {
      throw new Error('Invalid AI response format')
    }

    // Ensure score is within bounds
    evaluation.score = Math.max(1, Math.min(10, evaluation.score))

    return evaluation
  } catch (error) {
    console.error('AI evaluation error:', error)
    throw new Error('Failed to evaluate task with AI')
  }
}
