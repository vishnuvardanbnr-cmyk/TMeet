import { useState, useRef, useCallback } from "react";

export type RecordingState = "idle" | "recording" | "paused" | "stopping";

interface UseRecordingOptions {
  roomId: string;
  hostId?: number;
  onRecordingComplete?: (recording: any) => void;
  onError?: (error: Error) => void;
}

export function useRecording({ roomId, hostId, onRecordingComplete, onError }: UseRecordingOptions) {
  const [state, setState] = useState<RecordingState>("idle");
  const [duration, setDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedTimeRef = useRef<number>(0);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const updateDuration = useCallback(() => {
    if (state === "recording" && startTimeRef.current) {
      const elapsed = Math.floor((Date.now() - startTimeRef.current - pausedTimeRef.current) / 1000);
      setDuration(elapsed);
    }
  }, [state]);

  const startRecording = useCallback(async () => {
    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: { 
          displaySurface: "browser",
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: true,
      });

      let audioStream: MediaStream | null = null;
      try {
        audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (e) {
        console.log("Could not capture microphone audio");
      }

      const tracks = [...displayStream.getTracks()];
      if (audioStream) {
        tracks.push(...audioStream.getAudioTracks());
      }

      const combinedStream = new MediaStream(tracks);
      streamRef.current = combinedStream;

      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
        ? "video/webm;codecs=vp9,opus"
        : MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus")
        ? "video/webm;codecs=vp8,opus"
        : "video/webm";

      const mediaRecorder = new MediaRecorder(combinedStream, {
        mimeType,
        videoBitsPerSecond: 2500000,
      });

      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const finalDuration = Math.floor((Date.now() - startTimeRef.current - pausedTimeRef.current) / 1000);
        
        try {
          const response = await fetch("/api/recordings/upload", {
            method: "POST",
            headers: {
              "Content-Type": "application/octet-stream",
              "x-room-id": roomId,
              "x-host-id": hostId?.toString() || "",
              "x-duration": finalDuration.toString(),
              "x-original-filename": `meeting_${roomId}_${new Date().toISOString().slice(0, 10)}.webm`,
            },
            body: blob,
          });

          const data = await response.json();
          if (data.success && onRecordingComplete) {
            onRecordingComplete(data.recording);
          }
        } catch (error: any) {
          console.error("Error uploading recording:", error);
          if (onError) {
            onError(error);
          }
        }

        setState("idle");
        setDuration(0);
        chunksRef.current = [];
      };

      displayStream.getVideoTracks()[0].onended = () => {
        if (state === "recording" || state === "paused") {
          stopRecording();
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(1000);

      startTimeRef.current = Date.now();
      pausedTimeRef.current = 0;
      setState("recording");

      durationIntervalRef.current = setInterval(() => {
        if (mediaRecorderRef.current?.state === "recording") {
          const elapsed = Math.floor((Date.now() - startTimeRef.current - pausedTimeRef.current) / 1000);
          setDuration(elapsed);
        }
      }, 1000);

    } catch (error: any) {
      console.error("Error starting recording:", error);
      if (onError) {
        onError(error);
      }
      setState("idle");
    }
  }, [roomId, hostId, onRecordingComplete, onError, state]);

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && state === "recording") {
      mediaRecorderRef.current.pause();
      pausedTimeRef.current -= Date.now();
      setState("paused");
    }
  }, [state]);

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && state === "paused") {
      mediaRecorderRef.current.resume();
      pausedTimeRef.current += Date.now();
      setState("recording");
    }
  }, [state]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && (state === "recording" || state === "paused")) {
      setState("stopping");
      
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }

      mediaRecorderRef.current.stop();

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    }
  }, [state]);

  const formatDuration = useCallback((seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }, []);

  return {
    state,
    duration,
    formattedDuration: formatDuration(duration),
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    isRecording: state === "recording",
    isPaused: state === "paused",
    isStopping: state === "stopping",
  };
}
