"use client";
import { useEffect, useRef, useState, useCallback } from 'react';

/*
  YouTubePlayer Component
  Provides controlled YouTube playback with skip, play/pause, volume, speed, and fullscreen toggles.
  Uses the YouTube IFrame API loaded lazily. Exposes same basic keyboard shortcuts as VideoPlayer.
*/

export default function YouTubePlayer({ videoId, autoPlay = true, onError, skipSeconds = 10 }) {
  const containerRef = useRef(null);
  const playerRef = useRef(null); // YT.Player instance
  const [ready, setReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(true);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [showUi, setShowUi] = useState(true);
  const hideTimerRef = useRef(null);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [availableRates, setAvailableRates] = useState([1]);

  const resetHide = useCallback(() => {
    setShowUi(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => setShowUi(false), 3000);
  }, []);

  const loadApi = useCallback(() => {
    return new Promise((resolve, reject) => {
      if (window.YT && window.YT.Player) return resolve(window.YT);
      const existing = document.getElementById('yt-iframe-api');
      if (existing) {
        existing.addEventListener('load', () => resolve(window.YT));
        return;
      }
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      tag.id = 'yt-iframe-api';
      tag.async = true;
      tag.onload = () => resolve(window.YT);
      tag.onerror = () => reject(new Error('Failed to load YT API'));
      document.head.appendChild(tag);
      window.onYouTubeIframeAPIReady = () => resolve(window.YT);
    });
  }, []);

  useEffect(() => {
    let interval;
    loadApi().then((YT) => {
      playerRef.current = new YT.Player(containerRef.current, {
        videoId,
        playerVars: {
          autoplay: autoPlay ? 1 : 0,
          rel: 0,
          playsinline: 1,
          modestbranding: 1,
          controls: 0,
          fs: 0,
        },
        events: {
          onReady: (e) => {
            setReady(true);
            setDuration(e.target.getDuration());
            setAvailableRates(e.target.getAvailablePlaybackRates());
            if (autoPlay) e.target.playVideo();
            // We keep spinner until we get PLAYING or CANPLAY equivalent
            resetHide();
          },
          onStateChange: (e) => {
            const YTState = window.YT.PlayerState;
            setIsPlaying(e.data === YTState.PLAYING);
            // Manage buffering/loader visibility based on YT states
            if (e.data === YTState.BUFFERING || e.data === YTState.UNSTARTED) {
              setIsBuffering(true);
            } else {
              // PLAYING, PAUSED, ENDED, CUED
              setIsBuffering(false);
            }
          },
          onError: (e) => {
            onError?.('YouTube error code ' + e.data);
          }
        }
      });
      interval = setInterval(() => {
        const p = playerRef.current;
        if (p && ready) {
          try {
            setCurrentTime(p.getCurrentTime());
            setDuration(p.getDuration());
          } catch {}
        }
      }, 500);
    }).catch(err => onError?.(err.message));
    return () => { if (interval) clearInterval(interval); };
  }, [videoId, autoPlay, loadApi, onError, ready, resetHide]);

  const togglePlay = () => {
    const p = playerRef.current; if (!p) return;
    if (isPlaying) p.pauseVideo(); else p.playVideo();
  };
  const skip = (sec) => {
    const p = playerRef.current; if (!p) return;
    try {
      const t = p.getCurrentTime();
      let next = t + sec;
      if (next < 0) next = 0;
      if (duration && next > duration - 0.25) next = duration - 0.25;
      p.seekTo(next, true);
      setCurrentTime(next);
      resetHide();
    } catch {}
  };
  const changeRate = (r) => {
    const p = playerRef.current; if (!p) return;
    try { p.setPlaybackRate(r); setPlaybackRate(r); } catch {}
  };
  const incrementRate = (d) => {
    const idx = availableRates.indexOf(playbackRate);
    if (idx === -1) return;
    const next = availableRates[idx + (d > 0 ? 1 : -1)];
    if (next) changeRate(next);
  };
  const format = (s) => {
    if (!s && s !== 0) return '00:00';
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = Math.floor(s % 60);
    return (h>0? h+':' : '') + String(m).padStart(2,'0') + ':' + String(sec).padStart(2,'0');
  };

  const handleKey = useCallback((e) => {
    if (!ready) return;
    const key = e.key.toLowerCase();
    switch (key) {
      case ' ': case 'k': e.preventDefault(); togglePlay(); break;
      case 'arrowright': skip(skipSeconds); break;
      case 'arrowleft': skip(-skipSeconds); break;
      case '>': case '.': incrementRate(1); break;
      case '<': case ',': incrementRate(-1); break;
      default: break;
    }
  }, [ready, skipSeconds, incrementRate]);

  useEffect(() => {
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleKey]);

  return (
    <div className="w-full h-full relative group bg-black" onMouseMove={resetHide} onClick={resetHide}>
      <div className="absolute inset-0" ref={containerRef} />
      {/* Loading / buffering overlay for slow connections */}
      {isBuffering && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm z-20">
          <div className="w-14 h-14 rounded-full border-4 border-red-600 border-t-transparent animate-spin" aria-label="Loading" />
          <p className="mt-3 text-xs text-gray-300">Loading video…</p>
        </div>
      )}
      {/* Overlay controls */}
      <div className={`absolute inset-0 flex items-center justify-center gap-24 pointer-events-none transition-opacity ${showUi? 'opacity-100' : 'opacity-0'}`}>
        <button
          type="button"
          onClick={() => skip(-skipSeconds)}
          className="pointer-events-auto w-16 h-16 md:w-20 md:h-20 flex items-center justify-center rounded-full bg-black/40 backdrop-blur border border-white/20 hover:bg-black/60 active:scale-95 transition-all"
          aria-label={`Skip back ${skipSeconds}s`}
        >
          <div className="relative flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-10 h-10 text-white"><path fill="currentColor" d="M12 5v2.79C10.84 6.67 9.34 6 7.67 6 4.18 6 1.39 8.69 1.39 12S4.18 18 7.67 18c1.67 0 3.17-.67 4.33-1.79V19h2V5h-2zm-4.33 11C6.01 16 4.39 14.43 4.39 12s1.62-4 3.28-4c1.15 0 2.18.55 2.77 1.4v5.2c-.59.85-1.62 1.4-2.77 1.4z"/></svg>
            <span className="absolute text-white font-semibold text-sm">{skipSeconds}</span>
          </div>
        </button>
        <button
          type="button"
          onClick={togglePlay}
          className="pointer-events-auto w-16 h-16 md:w-20 md:h-20 flex items-center justify-center rounded-full bg-black/40 backdrop-blur border border-white/20 hover:bg-black/60 active:scale-95 transition-all"
          aria-label={isPlaying? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <svg className="w-9 h-9 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M6 4h4v16H6zm8 0h4v16h-4z"/></svg>
          ) : (
            <svg className="w-9 h-9 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
          )}
        </button>
        <button
          type="button"
          onClick={() => skip(skipSeconds)}
          className="pointer-events-auto w-16 h-16 md:w-20 md:h-20 flex items-center justify-center rounded-full bg-black/40 backdrop-blur border border-white/20 hover:bg-black/60 active:scale-95 transition-all"
          aria-label={`Skip forward ${skipSeconds}s`}
        >
          <div className="relative flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-10 h-10 text-white rotate-180"><path fill="currentColor" d="M12 5v2.79C10.84 6.67 9.34 6 7.67 6 4.18 6 1.39 8.69 1.39 12S4.18 18 7.67 18c1.67 0 3.17-.67 4.33-1.79V19h2V5h-2zm-4.33 11C6.01 16 4.39 14.43 4.39 12s1.62-4 3.28-4c1.15 0 2.18.55 2.77 1.4v5.2c-.59.85-1.62 1.4-2.77 1.4z"/></svg>
            <span className="absolute text-white font-semibold text-sm">{skipSeconds}</span>
          </div>
        </button>
      </div>
      {/* Bottom bar */}
      <div className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent px-4 pt-10 pb-3 text-white text-xs transition-opacity ${showUi? 'opacity-100' : 'opacity-0'}`}>        
        <div className="flex justify-between text-[10px] text-white/70 mb-1">
          <span>{format(currentTime)}</span>
          <span>{format(duration)}</span>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <button onClick={() => skip(-skipSeconds)} className="px-2 h-7 rounded bg-white/10 hover:bg-white/20" aria-label="Skip Back">-{skipSeconds}s</button>
          <button onClick={togglePlay} className="px-3 h-7 rounded bg-white/10 hover:bg-white/20" aria-label={isPlaying? 'Pause': 'Play'}>{isPlaying? 'Pause':'Play'}</button>
          <button onClick={() => skip(skipSeconds)} className="px-2 h-7 rounded bg-white/10 hover:bg-white/20" aria-label="Skip Forward">+{skipSeconds}s</button>
          <div className="relative">
            <button onClick={()=>incrementRate(1)} className="px-2 h-7 rounded bg-white/10 hover:bg-white/20" aria-label="Speed Up">Speed {playbackRate}x</button>
          </div>
        </div>
      </div>
    </div>
  );
}
