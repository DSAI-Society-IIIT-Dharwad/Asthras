import { FileText, Stethoscope, AlertCircle, Eye, ClipboardList, Brain, Gauge, ShieldAlert } from "lucide-react";
import type { StructuredData, Insights } from "@/lib/ai-service";
import { cn } from "@/lib/utils";

interface StructuredDataPanelProps {
  data: StructuredData | null;
  insights: Insights | null;
  domain: string;
}

const fields = [
  { key: "complaint_or_query" as const, label: "Complaint / Query", icon: FileText },
  { key: "background_history" as const, label: "Background History", icon: Stethoscope },
  { key: "observations" as const, label: "Observations", icon: Eye },
  { key: "status_or_diagnosis" as const, label: "Status / Diagnosis", icon: AlertCircle },
  { key: "action_plan" as const, label: "Action Plan", icon: ClipboardList },
];

const EMOTION_MAP: Record<string, { label: string; emoji: string; color: string }> = {
  calm: { label: "Calm", emoji: "😌", color: "text-green-600" },
  neutral: { label: "Neutral", emoji: "😐", color: "text-muted-foreground" },
  concerned: { label: "Concerned", emoji: "😟", color: "text-yellow-600" },
  urgent: { label: "Urgent", emoji: "⚠️", color: "text-orange-500" },
  distressed: { label: "Distressed", emoji: "😰", color: "text-orange-600" },
  angry: { label: "Angry", emoji: "😠", color: "text-red-600" },
};

const PRIORITY_CONFIG: Record<number, { label: string; color: string; bg: string; bar: string }> = {
  1: { label: "Very Low", color: "text-green-600", bg: "bg-green-100", bar: "bg-green-500" },
  2: { label: "Low", color: "text-green-500", bg: "bg-green-50", bar: "bg-green-400" },
  3: { label: "Medium", color: "text-yellow-600", bg: "bg-yellow-100", bar: "bg-yellow-500" },
  4: { label: "High", color: "text-orange-600", bg: "bg-orange-100", bar: "bg-orange-500" },
  5: { label: "Critical", color: "text-red-600", bg: "bg-red-100", bar: "bg-red-500" },
};

export function StructuredDataPanel({ data, insights, domain }: StructuredDataPanelProps) {
  const emotion = EMOTION_MAP[insights?.emotion || "neutral"] || EMOTION_MAP.neutral;
  const priority = PRIORITY_CONFIG[insights?.priority_score || 1] || PRIORITY_CONFIG[1];

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-lg">
      <div className="bg-panel-header px-5 py-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-panel-header-foreground">
          {domain === "finance" ? "Financial" : "Clinical"} Intelligence
        </h2>
        <p className="mt-0.5 text-xs text-panel-header-foreground/70">
          AI-extracted data & insights
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {!data && !insights ? (
          <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
            <p className="text-center">
              Start a conversation to see<br />structured data appear here.
            </p>
          </div>
        ) : (
          <>
            {/* Critical Alert */}
            {insights?.is_critical && (
              <div className="animate-fade-in-up rounded-xl border-2 border-red-500 bg-red-50 p-4">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5 text-red-600" />
                  <span className="text-sm font-bold text-red-700">
                    🚨 High Priority Case Detected
                  </span>
                </div>
                <p className="mt-1 text-xs text-red-600">
                  This case has been flagged as critical and requires immediate attention.
                </p>
              </div>
            )}

            {/* Insights Section */}
            {insights && (
              <div className="rounded-xl border border-border bg-background p-4 space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <Brain className="h-4 w-4 text-accent" />
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Conversation Insights
                  </span>
                </div>

                {/* Emotion */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Emotion</span>
                  <span className={cn("text-sm font-medium", emotion.color)}>
                    {emotion.emoji} {emotion.label}
                  </span>
                </div>

                {/* Priority Score */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-muted-foreground">Priority</span>
                    <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full", priority.bg, priority.color)}>
                      {insights.priority_score}/5 · {priority.label}
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn("h-full rounded-full transition-all duration-500", priority.bar)}
                      style={{ width: `${(insights.priority_score / 5) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Critical Flag */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Critical</span>
                  <span className={cn(
                    "text-xs font-semibold px-2 py-0.5 rounded-full",
                    insights.is_critical
                      ? "bg-red-100 text-red-700"
                      : "bg-green-100 text-green-700"
                  )}>
                    {insights.is_critical ? "🚨 Yes" : "✅ No"}
                  </span>
                </div>
              </div>
            )}

            {/* Structured Data Fields */}
            {data && fields.map(({ key, label, icon: Icon }) => (
              <div
                key={key}
                className="rounded-xl border border-border bg-background p-4 transition-all hover:shadow-md"
              >
                <div className="mb-2 flex items-center gap-2">
                  <Icon className="h-4 w-4 text-primary" />
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {label}
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-foreground">
                  {data[key] || (
                    <span className="italic text-muted-foreground">Not yet determined</span>
                  )}
                </p>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
