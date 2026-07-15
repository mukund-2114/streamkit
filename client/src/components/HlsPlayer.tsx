import { useEffect, useRef } from "react";
import Hls from "hls.js";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { playingChanged, timeUpdated } from "../store/playerSlice";

const TEST_STREAM_URL = "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8";

interface HlsPlayerProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
}

export default function HlsPlayer({ videoRef }: HlsPlayerProps) {
  const dispatch = useAppDispatch();
  const currentTime = useAppSelector((s) => s.player.currentTime);
  const hlsRef = useRef<Hls | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (Hls.isSupported()) {
      const hls = new Hls();
      hlsRef.current = hls;
      hls.loadSource(TEST_STREAM_URL);
      hls.attachMedia(video);
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) console.error("HLS fatal error:", data);
      });
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = TEST_STREAM_URL;
    }

    const onTimeUpdate = () => dispatch(timeUpdated({ currentTime: video.currentTime, duration: video.duration }));
    const onPlay = () => dispatch(playingChanged(true));
    const onPause = () => dispatch(playingChanged(false));

    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);

    return () => {
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      hlsRef.current?.destroy();
      hlsRef.current = null;
    };
  }, [videoRef, dispatch]);

  useEffect(() => {
    const video = videoRef.current;
    if (video && Math.abs(video.currentTime - currentTime) > 0.5) {
      video.currentTime = currentTime;
    }
  }, [currentTime, videoRef]);

  return <video ref={videoRef} controls className="video-el" playsInline />;
}
