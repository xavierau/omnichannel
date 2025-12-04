import { useState, useRef, useCallback, useEffect } from "react"
import { Mic, Square, Trash2, Send, Pause, Play } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface VoiceNoteButtonProps {
  onRecordComplete: (audioBlob: Blob, duration: number) => void
  disabled?: boolean
}

type RecordingState = "idle" | "recording" | "paused" | "recorded"

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
}

export function VoiceNoteButton({
  onRecordComplete,
  disabled = false,
}: VoiceNoteButtonProps) {
  const [state, setState] = useState<RecordingState>("idle")
  const [recordingTime, setRecordingTime] = useState(0)
  const [finalDuration, setFinalDuration] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [])

  const startTimer = useCallback(() => {
    timerRef.current = setInterval(() => {
      setRecordingTime((prev) => prev + 1)
    }, 1000)
  }, [])

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const handleStartRecording = useCallback(() => {
    setState("recording")
    setRecordingTime(0)
    setFinalDuration(0)
    startTimer()
  }, [startTimer])

  const handlePauseRecording = useCallback(() => {
    setState("paused")
    stopTimer()
  }, [stopTimer])

  const handleResumeRecording = useCallback(() => {
    setState("recording")
    startTimer()
  }, [startTimer])

  const handleStopRecording = useCallback(() => {
    stopTimer()
    setFinalDuration(recordingTime)
    setState("recorded")
  }, [stopTimer, recordingTime])

  const handleDiscardRecording = useCallback(() => {
    stopTimer()
    setState("idle")
    setRecordingTime(0)
    setFinalDuration(0)
  }, [stopTimer])

  const handleSendRecording = useCallback(() => {
    // Create a mock audio blob for UI demonstration
    // In a real implementation, this would be the actual recorded audio
    const mockAudioData = new Uint8Array([0, 0, 0, 0])
    const mockBlob = new Blob([mockAudioData], { type: "audio/webm" })

    const duration = finalDuration > 0 ? finalDuration : recordingTime
    onRecordComplete(mockBlob, duration)

    // Reset state
    setState("idle")
    setRecordingTime(0)
    setFinalDuration(0)
  }, [onRecordComplete, recordingTime, finalDuration])

  // Idle state - show mic button
  if (state === "idle") {
    return (
      <Button
        type="button"
        variant="ghost"
        size="icon"
        disabled={disabled}
        onClick={handleStartRecording}
        className="h-9 w-9 shrink-0"
        aria-label="Start voice recording"
      >
        <Mic className="h-5 w-5 text-muted-foreground" />
      </Button>
    )
  }

  // Recording or paused state - show recording controls
  if (state === "recording" || state === "paused") {
    return (
      <div className="flex items-center gap-2 bg-destructive/10 rounded-full px-3 py-1.5">
        {/* Recording indicator */}
        <div
          className={cn(
            "h-2 w-2 rounded-full",
            state === "recording"
              ? "bg-destructive animate-pulse"
              : "bg-muted-foreground"
          )}
        />

        {/* Timer display */}
        <span className="text-sm font-mono text-destructive min-w-[48px]">
          {formatTime(recordingTime)}
        </span>

        {/* Pause/Resume button */}
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={state === "recording" ? handlePauseRecording : handleResumeRecording}
          className="h-7 w-7"
          aria-label={state === "recording" ? "Pause recording" : "Resume recording"}
        >
          {state === "recording" ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4" />
          )}
        </Button>

        {/* Stop button */}
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={handleStopRecording}
          className="h-7 w-7 text-destructive hover:text-destructive"
          aria-label="Stop recording"
        >
          <Square className="h-4 w-4 fill-current" />
        </Button>

        {/* Discard button */}
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={handleDiscardRecording}
          className="h-7 w-7"
          aria-label="Discard recording"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    )
  }

  // Recorded state - show preview and send controls
  const displayDuration = finalDuration > 0 ? finalDuration : recordingTime

  return (
    <div className="flex items-center gap-2 bg-muted rounded-full px-3 py-1.5">
      {/* Audio icon */}
      <Mic className="h-4 w-4 text-muted-foreground" />

      {/* Duration display */}
      <span className="text-sm font-mono text-muted-foreground min-w-[48px]">
        {formatTime(displayDuration)}
      </span>

      {/* Discard button */}
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={handleDiscardRecording}
        className="h-7 w-7"
        aria-label="Discard recording"
      >
        <Trash2 className="h-4 w-4" />
      </Button>

      {/* Send button */}
      <Button
        type="button"
        variant="default"
        size="icon-sm"
        onClick={handleSendRecording}
        className="h-7 w-7"
        aria-label="Send voice note"
      >
        <Send className="h-4 w-4" />
      </Button>
    </div>
  )
}
