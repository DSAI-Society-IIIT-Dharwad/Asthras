import { supabase } from "@/integrations/supabase/client";

export type Message = {
  role: "user" | "assistant";
  content: string;
};

export type StructuredData = {
  complaint_or_query: string;
  background_history: string;
  observations: string;
  status_or_diagnosis: string;
  action_plan: string;
};

export type Insights = {
  emotion: string;
  priority_score: number;
  is_critical: boolean;
};

export type ParsedAIResponse = {
  reply: string;
  structured_data: StructuredData;
  insights: Insights;
};

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

const DEFAULT_INSIGHTS: Insights = {
  emotion: "neutral",
  priority_score: 1,
  is_critical: false,
};

const DEFAULT_STRUCTURED: StructuredData = {
  complaint_or_query: "",
  background_history: "",
  observations: "",
  status_or_diagnosis: "",
  action_plan: "",
};

export function parseAIResponse(raw: string): ParsedAIResponse {
  try {
    let jsonStr = raw.trim();
    
    // Handle markdown code blocks
    const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      jsonStr = codeBlockMatch[1].trim();
    }
    
    const parsed = JSON.parse(jsonStr);
    return {
      reply: parsed.reply || raw,
      structured_data: {
        complaint_or_query: parsed.structured_data?.complaint_or_query || "",
        background_history: parsed.structured_data?.background_history || "",
        observations: parsed.structured_data?.observations || "",
        status_or_diagnosis: parsed.structured_data?.status_or_diagnosis || "",
        action_plan: parsed.structured_data?.action_plan || "",
      },
      insights: {
        emotion: parsed.insights?.emotion || "neutral",
        priority_score: Math.min(5, Math.max(1, parsed.insights?.priority_score ?? 1)),
        is_critical: parsed.insights?.is_critical === true,
      },
    };
  } catch {
    return {
      reply: raw,
      structured_data: { ...DEFAULT_STRUCTURED },
      insights: { ...DEFAULT_INSIGHTS },
    };
  }
}

export async function streamChat({
  messages,
  domain,
  onDelta,
  onDone,
}: {
  messages: Message[];
  domain: string;
  onDelta: (text: string) => void;
  onDone: () => void;
}) {
  const resp = await fetch(CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ messages, domain }),
  });

  if (!resp.ok || !resp.body) {
    const errData = await resp.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(errData.error || `Chat failed: ${resp.status}`);
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let textBuffer = "";
  let streamDone = false;

  while (!streamDone) {
    const { done, value } = await reader.read();
    if (done) break;
    textBuffer += decoder.decode(value, { stream: true });

    let newlineIndex: number;
    while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
      let line = textBuffer.slice(0, newlineIndex);
      textBuffer = textBuffer.slice(newlineIndex + 1);

      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (line.startsWith(":") || line.trim() === "") continue;
      if (!line.startsWith("data: ")) continue;

      const jsonStr = line.slice(6).trim();
      if (jsonStr === "[DONE]") {
        streamDone = true;
        break;
      }

      try {
        const parsed = JSON.parse(jsonStr);
        const content = parsed.choices?.[0]?.delta?.content as string | undefined;
        if (content) onDelta(content);
      } catch {
        textBuffer = line + "\n" + textBuffer;
        break;
      }
    }
  }

  if (textBuffer.trim()) {
    for (let raw of textBuffer.split("\n")) {
      if (!raw) continue;
      if (raw.endsWith("\r")) raw = raw.slice(0, -1);
      if (raw.startsWith(":") || raw.trim() === "") continue;
      if (!raw.startsWith("data: ")) continue;
      const jsonStr = raw.slice(6).trim();
      if (jsonStr === "[DONE]") continue;
      try {
        const parsed = JSON.parse(jsonStr);
        const content = parsed.choices?.[0]?.delta?.content as string | undefined;
        if (content) onDelta(content);
      } catch { /* ignore */ }
    }
  }

  onDone();
}
