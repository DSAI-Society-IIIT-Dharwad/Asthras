import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Volume2, VolumeX, RotateCcw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChatMessage } from "@/components/ChatMessage";
import { MicButton } from "@/components/MicButton";
import { StructuredDataPanel } from "@/components/StructuredDataPanel";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import {
  streamChat,
  parseAIResponse,
  type Message,
  type StructuredData,
  type Insights,
} from "@/lib/ai-service";
import { speakText, stopSpeaking } from "@/lib/tts";
import { toast } from "sonner";

export default function ConversationApp() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [domain, setDomain] = useState<"healthcare" | "finance">("healthcare");
  const [structuredData, setStructuredData] = useState<StructuredData | null>(null);
  const [insights, setInsights] = useState<Insights | null>(null);
  const [lastReply, setLastReply] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);
  const pendingSendRef = useRef(false);
  const { isRecording, isSupported, transcript, startRecording, stopRecording } = useSpeechRecognition();

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Show live transcript in input while recording
  useEffect(() => {
    if (isRecording && transcript) {
      setInputText(transcript);
    }
  }, [isRecording, transcript]);

  const handleSend = useCallback(
    async (text: string) => {
      if (!text.trim() || isLoading) return;

      const userMsg: Message = { role: "user", content: text.trim() };
      const newMessages = [...messages, userMsg];
      setMessages(newMessages);
      setInputText("");
      setIsLoading(true);

      let fullResponse = "";

      const updateAssistant = (chunk: string) => {
        fullResponse += chunk;
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant") {
            return prev.map((m, i) =>
              i === prev.length - 1 ? { ...m, content: fullResponse } : m
            );
          }
          return [...prev, { role: "assistant", content: fullResponse }];
        });
      };

      try {
        await streamChat({
          messages: newMessages,
          domain,
          onDelta: updateAssistant,
          onDone: () => {
            setIsLoading(false);
            const parsed = parseAIResponse(fullResponse);
            setStructuredData(parsed.structured_data);
            setInsights(parsed.insights);
            setLastReply(parsed.reply);

            setMessages((prev) =>
              prev.map((m, i) =>
                i === prev.length - 1 && m.role === "assistant"
                  ? { ...m, content: parsed.reply }
                  : m
              )
            );

            speakText(parsed.reply, voiceEnabled);
          },
        });
      } catch (e) {
        console.error(e);
        setIsLoading(false);
        toast.error(e instanceof Error ? e.message : "Failed to get response");
      }
    },
    [messages, isLoading, domain, voiceEnabled]
  );

  const handleMicToggle = async () => {
    if (isRecording) {
      // Stop recording — the promise from startRecording will resolve with the text
      stopRecording();
      pendingSendRef.current = true;
    } else {
      if (!isSupported) {
        toast.error("Speech recognition not supported. Please use Chrome or Edge, or type your message.");
        return;
      }
      try {
        pendingSendRef.current = false;
        const text = await startRecording();
        // Only auto-send if user explicitly stopped (not on error/no-speech)
        if (text.trim() && pendingSendRef.current) {
          handleSend(text);
        } else if (!text.trim()) {
          toast.error("No speech detected. Please try again.");
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Speech recognition failed");
      }
    }
  };

  const handleReplay = () => {
    if (lastReply) speakText(lastReply, true);
  };

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border bg-card px-6 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <span className="text-sm font-bold text-primary-foreground">CI</span>
          </div>
          <div>
            <h1 className="text-base font-semibold text-foreground">
              Conversational Intelligence
            </h1>
            <p className="text-xs text-muted-foreground">
              AI-powered multilingual assistant
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Domain toggle */}
          <div className="flex rounded-lg border border-border bg-muted p-0.5">
            {(["healthcare", "finance"] as const).map((d) => (
              <button
                key={d}
                onClick={() => setDomain(d)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-all ${
                  domain === d
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {d}
              </button>
            ))}
          </div>

          {/* Voice toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setVoiceEnabled(!voiceEnabled);
              if (voiceEnabled) stopSpeaking();
            }}
            title={voiceEnabled ? "Mute voice" : "Enable voice"}
          >
            {voiceEnabled ? (
              <Volume2 className="h-4 w-4" />
            ) : (
              <VolumeX className="h-4 w-4" />
            )}
          </Button>

          {/* Replay */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleReplay}
            disabled={!lastReply}
            title="Replay last response"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Chat panel */}
        <div className="flex flex-1 flex-col">
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.length === 0 && (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                  <span className="text-3xl">🎤</span>
                </div>
                <h2 className="text-lg font-semibold text-foreground">
                  Ready to listen
                </h2>
                <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                  Tap the microphone to speak, or type your message. I understand
                  multiple languages and will respond in yours.
                </p>
              </div>
            )}
            {messages.map((msg, i) => (
              <ChatMessage key={i} message={msg} />
            ))}
            {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
              <div className="flex gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent">
                  <Loader2 className="h-4 w-4 animate-spin text-accent-foreground" />
                </div>
                <div className="rounded-2xl rounded-bl-md bg-chat-ai px-4 py-3">
                  <span className="text-sm text-muted-foreground">Thinking...</span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input area */}
          <div className="border-t border-border bg-card p-4">
            {isRecording && (
              <div className="mb-3 flex items-center gap-2 rounded-lg bg-recording/10 px-3 py-2">
                <div className="h-2 w-2 animate-pulse rounded-full bg-recording" />
                <span className="text-xs font-medium text-recording">
                  Listening... tap mic to stop & send
                </span>
              </div>
            )}
            <div className="flex items-center gap-3">
              <MicButton
                isRecording={isRecording}
                isTranscribing={false}
                onClick={handleMicToggle}
                disabled={isLoading}
              />
              <div className="relative flex-1">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend(inputText);
                    }
                  }}
                  placeholder={isRecording ? "Listening..." : "Type a message or use voice..."}
                  className="w-full rounded-xl border border-input bg-background px-4 py-3 pr-12 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  disabled={isLoading}
                  readOnly={isRecording}
                />
                <button
                  onClick={() => handleSend(inputText)}
                  disabled={!inputText.trim() || isLoading}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg bg-primary p-2 text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-40"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Structured data panel */}
        <div className="hidden w-[380px] border-l border-border p-4 lg:block">
          <StructuredDataPanel data={structuredData} insights={insights} domain={domain} />
        </div>
      </div>
    </div>
  );
}
