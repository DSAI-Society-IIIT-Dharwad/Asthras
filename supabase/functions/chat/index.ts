import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LANGUAGE_RULES = `
STRICT LANGUAGE MIRRORING RULE (MANDATORY):
- ALWAYS respond in the EXACT SAME language as the user input.
- If the user speaks English, respond ONLY in English.
- If the user speaks Hindi, respond ONLY in Hindi.
- If the user speaks Kannada, respond ONLY in Kannada.
- If the user uses mixed language (e.g., Hinglish), respond in a similar mixed style.
- NEVER translate the user's language. NEVER switch language unless the user switches.
- Detect the language automatically from the input text.
`;

const DOMAIN_PROMPTS: Record<string, string> = {
  healthcare: `You are a multilingual AI healthcare assistant. You help patients and providers with medical queries, symptom analysis, and health guidance.

${LANGUAGE_RULES}

Behavior:
- Be conversational and natural
- Ask intelligent follow-up questions when information is insufficient
- Use semantic medical understanding, NOT keyword matching
- Never hallucinate diagnoses - indicate uncertainty when appropriate
- Maintain full conversation context across turns`,

  finance: `You are a multilingual AI financial assistant. You help with financial planning, investment queries, budgeting, tax questions, and analysis.

${LANGUAGE_RULES}

Behavior:
- Be conversational and natural
- Ask intelligent follow-up questions when information is insufficient
- Use semantic financial understanding, NOT keyword matching
- Never provide specific investment advice without proper disclaimers
- Maintain full conversation context across turns`,
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { messages, domain = "healthcare" } = await req.json();
    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "messages array is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `${DOMAIN_PROMPTS[domain] || DOMAIN_PROMPTS.healthcare}

OUTPUT FORMAT (STRICT - NO EXTRA TEXT):
You MUST output ONLY valid JSON. No markdown, no code blocks, no extra text before or after.
Use this EXACT structure:
{
  "reply": "Your response in the SAME language as the user input",
  "structured_data": {
    "complaint_or_query": "Main issue or question identified",
    "background_history": "Relevant background information gathered",
    "observations": "Your professional observations",
    "status_or_diagnosis": "Current assessment or status",
    "action_plan": "Recommended next steps"
  },
  "insights": {
    "emotion": "one of: calm, neutral, concerned, urgent, distressed, angry",
    "priority_score": 1,
    "is_critical": false
  }
}

INSIGHTS RULES:
- emotion: Detect from user's tone, word choice, and context. Options: calm, neutral, concerned, urgent, distressed, angry.
- priority_score: 1 (very low) to 5 (critical). Base on urgency in language, severity of symptoms/issues, emotional tone, and accumulated context.
- is_critical: true if case requires immediate attention (e.g., chest pain, breathing difficulty, payment fraud, account compromise). false otherwise.
- Update insights dynamically based on the FULL conversation history, not just the latest message.
- Use semantic understanding to infer urgency — do NOT use keyword matching.

Rules:
- Always return valid JSON only
- No text outside JSON
- If a field is not yet determined, use empty string "" for strings, 1 for priority_score, false for is_critical
- Never omit any field
- Do NOT hallucinate missing data`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Credits exhausted. Please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
