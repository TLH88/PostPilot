"use client";

import { useState, useRef } from "react";
import { Play, Pause, RotateCcw, X, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TutorialVideoPlayerProps {
  videoUrl: string;
  title: string;
  onClose: () => void;
}

/**
 * Embedded video player for tutorial videos.
 * Supports play/pause, restart, fullscreen, and close.
 * Videos are provided by the user (recorded externally).
 */
export function TutorialVideoPlayer({
  videoUrl,
  title,
  onClose,
}: TutorialVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  function togglePlay() {
    if (!videoRef.current) return;
    if (playing) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setPlaying(!playing);
  }

  function restart() {
    if (!videoRef.current) return;
    videoRef.current.currentTime = 0;
    videoRef.current.play();
    setPlaying(true);
  }

  function handleTimeUpdate() {
    if (!videoRef.current) return;
    const pct = (videoRef.current.currentTime / videoRef.current.duration) * 100;
    setProgress(pct);
  }

  function handleEnded() {
    setPlaying(false);
    setProgress(100);
  }

  function toggleFullscreen() {
    if (!videoRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      videoRef.current.requestFullscreen();
    }
  }

  return (
    <div className="fixed inset-0 z-[998] flex items-center justify-center bg-black/70">
      <div className="w-full max-w-3xl mx-4 rounded-2xl bg-background shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="text-sm font-semibold">{title}</h3>
          <button
            onClick={onClose}
            className="flex size-7 items-center justify-center rounded-full hover:bg-muted transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Video */}
        <div className="relative bg-black aspect-video">
          <video
            ref={videoRef}
            src={videoUrl}
            className="w-full h-full"
            onTimeUpdate={handleTimeUpdate}
            onEnded={handleEnded}
            onClick={togglePlay}
            playsInline
          />
          {/* Play overlay when paused */}
          {!playing && (
            <button
              onClick={togglePlay}
              className="absolute inset-0 flex items-center justify-center bg-black/20 transition-opacity"
            >
              <div className="flex size-16 items-center justify-center rounded-full bg-primary/90 text-white">
                <Play className="size-7 ml-1" />
              </div>
            </button>
          )}
        </div>

        {/* Controls */}
        <div className="px-4 py-3 space-y-2">
          {/* Progress bar */}
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon-sm" onClick={togglePlay}>
                {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
              </Button>
              <Button variant="ghost" size="icon-sm" onClick={restart}>
                <RotateCcw className="size-4" />
              </Button>
            </div>
            <Button variant="ghost" size="icon-sm" onClick={toggleFullscreen}>
              <Maximize2 className="size-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
