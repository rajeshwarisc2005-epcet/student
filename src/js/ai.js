/**
 * Groq AI Resume Intelligence Service
 * Uses ultra-fast inference for deep resume critique, tailored bullet point rewrites,
 * and conversational interview coaching.
 */

// Models available on this Groq tier in priority order
const PREFERRED_COACH_MODELS = [
  "groq/compound-mini",
  "groq/compound",
  "openai/gpt-oss-20b",
  "qwen/qwen3.6-27b"
];

const DEFAULT_KEY = "";

export function getApiKey() {
  if (typeof localStorage !== 'undefined' && typeof localStorage.getItem === 'function') {
    try {
      const saved = localStorage.getItem('groq_api_key');
      if (saved && saved.trim()) return saved.trim();
    } catch (e) {}
  }
  if (typeof __GROQ_API_KEY__ !== 'undefined' && __GROQ_API_KEY__) {
    return __GROQ_API_KEY__;
  }
  if (typeof window !== 'undefined' && window.__GROQ_API_KEY__) {
    return window.__GROQ_API_KEY__;
  }
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_GROQ_API_KEY) {
    return import.meta.env.VITE_GROQ_API_KEY;
  }
  return DEFAULT_KEY;
}

export function saveApiKey(key) {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('groq_api_key', key.trim());
  }
}

/**
 * Execute Groq Completion with automated model fallback
 */
async function callGroqWithFallback(messages, maxTokens = 600, temperature = 0.5) {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("No Groq API Key found. Please click 'Groq AI' in the navbar to save your key.");
  }

  let lastError = null;

  for (const model of PREFERRED_COACH_MODELS) {
    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model,
          messages,
          temperature,
          max_tokens: maxTokens
        })
      });

      if (response.ok) {
        const data = await response.json();
        const text = data.choices?.[0]?.message?.content;
        if (text) return text;
      } else {
        const errorData = await response.json().catch(() => ({}));
        lastError = new Error(errorData.error?.message || `Groq API returned status ${response.status}`);
        // If rate limit or token limit on this model, continue to fallback model
        console.warn(`Model ${model} failed with: ${lastError.message}. Trying next fallback model...`);
      }
    } catch (err) {
      lastError = err;
      console.warn(`Model ${model} network error: ${err.message}. Trying fallback...`);
    }
  }

  throw lastError || new Error("Failed to get response from Groq AI service.");
}

/**
 * Generates an end-to-end AI Executive Critique & Action Plan
 */
export async function generateAiResumeReview(resumeText, jobDescription = "") {
  const prompt = `
You are an elite executive recruiter and Applicant Tracking System (ATS) architect.
Analyze the following candidate resume and target job description (if provided).

Target Job Description:
"""
${jobDescription ? jobDescription.slice(0, 2500) : "General Professional / Tech Role"}
"""

Candidate Resume:
"""
${resumeText.slice(0, 3500)}
"""

Provide your assessment in the following structured format:

### 1. Executive Recruiter Verdict
Provide a 2-3 sentence frank assessment of this candidate's market positioning and competitiveness.

### 2. Top 3 Strengths
- Bullet points highlighting what makes this candidate stand out.

### 3. Critical Red Flags & ATS Gaps
- Specific parseability risks, missing qualifications, or weak narrative points.

### 4. 2 High-Impact Bullet Point Rewrites (Google XYZ Formula)
Pick weak bullets from their resume and rewrite them using: Accomplished [X], as measured by [Y], by doing [Z].
- **Original:** ...
  **Optimized:** ...
- **Original:** ...
  **Optimized:** ...

### 5. Tailored 60-Second Elevator Pitch
Write a concise 3-sentence networking/interview introduction pitch answering "Tell me about yourself".
`;

  return await callGroqWithFallback([
    {
      role: "system",
      content: "You are an elite, candid executive resume strategist and ATS engineer. Return clean, insightful, structured markdown."
    },
    {
      role: "user",
      content: prompt
    }
  ], 750, 0.4);
}

/**
 * Interactive Resume Coach Chat Query
 */
export async function askAiCoach(userQuestion, resumeText = "", jobDescription = "", chatHistory = []) {
  const systemPrompt = `You are ATS Coach, an elite career mentor and Applicant Tracking System engineer.
You are directly coaching the candidate on their uploaded resume to maximize their ATS pass rate and interview callbacks.

Candidate Resume Context:
"""
${resumeText ? resumeText.slice(0, 3000) : "Candidate has not uploaded a resume yet."}
"""

Target Job Description Context:
"""
${jobDescription ? jobDescription.slice(0, 1800) : "No target job description specified."}
"""

Instructions:
- Give crisp, actionable, high-impact advice (2-3 concise paragraphs or bullet points).
- If asked about bullets, rewrite them using Google's XYZ formula: Accomplished [X] as measured by [Y] by doing [Z].
- When asked about skills or keywords, give specific high-priority keywords from their domain.
- Be encouraging, candid, and direct.`;

  const messagesPayload = [
    { role: "system", content: systemPrompt },
    ...chatHistory.slice(-4),
    { role: "user", content: userQuestion }
  ];

  return await callGroqWithFallback(messagesPayload, 550, 0.5);
}


