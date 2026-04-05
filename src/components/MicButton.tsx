import { Mic, MicOff, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface MicButtonProps {
  isRecording: boolean;
  isTranscribing: boolean;
  onClick: () => void;
  disabled?: boolean;
}

export function MicButton({ isRecording, isTranscribing, onClick, disabled }: MicButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || isTranscribing}
      className={cn(
        "relative flex h-12 w-12 items-center justify-center rounded-full transition-all duration-200",
        isRecording
          ? "bg-recording animate-pulse-recording"
          : "bg-primary hover:bg-primary/90",
        disabled && "opacity-50 cursor-not-allowed"
      )}
      title={isRecording ? "Stop recording" : "Start recording"}
    >
      {isTranscribing ? (
        <Loader2 className="h-5 w-5 animate-spin text-primary-foreground" />
      ) : isRecording ? (
        <MicOff className="h-5 w-5 text-primary-foreground" />
      ) : (
        <Mic className="h-5 w-5 text-primary-foreground" />
      )}
    </button>
  );
}
