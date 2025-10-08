"use client";
import { useCallback, useEffect, useRef, useState } from 'react';

/*
  Reusable VideoPlayer component
  Props:
    src (string): media URL (mp4 or HLS .m3u8)
    type ("mp4"|"hls")
    poster (string optional)
    onError(message)
    debug (optional boolean) -> renders debug panel
*/
export default function VideoPlayer({ src, type, poster, onError, debug }) {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const hlsInstanceRef = useRef(null);
  const timeoutRef = useRef(null);
  const uiHideTimerRef = useRef(null);

  // Core state
  const [initialized, setInitialized] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [buffered, setBuffered] = useState(0); // percent
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [hlsLevels, setHlsLevels] = useState([]); // {index,height}
  const [hlsLevel, setHlsLevel] = useState('auto');
  const [manualPlayNeeded, setManualPlayNeeded] = useState(false);
  const [showUi, setShowUi] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [log, setLog] = useState([]);

  const pushLog = (m) => setLog(d => [...d, `[${new Date().toISOString()}] ${m}`]);

  // Preference keys
  const PREF_KEY = 'bf_player_prefs_v1';
  const loadPrefs = () => {
    if (typeof window === 'undefined') return null;
    try { return JSON.parse(localStorage.getItem(PREF_KEY) || 'null'); } catch { return null; }
  };
  const savePrefs = (patch) => {
    if (typeof window === 'undefined') return;
    try {
      const current = loadPrefs() || {};
      const next = { ...current, ...patch };
      localStorage.setItem(PREF_KEY, JSON.stringify(next));
    } catch {}
  };

  // Load persisted preferences on mount
  useEffect(() => {
    const prefs = loadPrefs();
    if (prefs) {
      if (typeof prefs.volume === 'number') setVolume(prefs.volume);
      if (typeof prefs.muted === 'boolean') setMuted(prefs.muted);
      if (typeof prefs.playbackRate === 'number') setPlaybackRate(prefs.playbackRate);
      if (prefs.hlsQuality) setHlsLevel(prefs.hlsQuality); // will apply after manifest
    }
  }, []);

  const formatTime = (s) => {
    if (!isFinite(s)) return '0:00';
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = Math.floor(s % 60).toString().padStart(2,'0');
    if (h > 0) return `${h}:${m.toString().padStart(2,'0')}:${sec}`;
    return `${m}:${sec}`;
  };

  useEffect(() => {
    if (!src || !type) return;
    setInitialized(true);
  }, [src, type]);

  // Initialize playback for HLS/MP4
  useEffect(() => {
    const setup = async () => {
      if (!initialized) return;
      const el = videoRef.current; if (!el) return;
      if (type === 'hls') {
        try {
          const HlsModule = await import('hls.js');
          const Hls = HlsModule.default;
          if (Hls.isSupported()) {
            hlsInstanceRef.current = new Hls();
            hlsInstanceRef.current.loadSource(src);
            hlsInstanceRef.current.attachMedia(el);
            hlsInstanceRef.current.on(Hls.Events.MANIFEST_PARSED, () => {
              pushLog('HLS manifest parsed');
              if (hlsInstanceRef.current && Array.isArray(hlsInstanceRef.current.levels)) {
                const levels = hlsInstanceRef.current.levels.map((l, idx) => ({ index: idx, height: l.height || (l.attrs && l.attrs.RESOLUTION ? parseInt(l.attrs.RESOLUTION.split('x')[1]) : undefined) }));
                setHlsLevels(levels);
                // Apply persisted quality if exists
                const prefs = loadPrefs();
                if (prefs && prefs.hlsQuality && prefs.hlsQuality !== 'auto') {
                  const target = levels.find(l => (l.height && (l.height + 'p') === prefs.hlsQuality) || l.index === prefs.hlsQuality);
                  if (target) {
                    hlsInstanceRef.current.currentLevel = target.index;
                    setHlsLevel(target.index);
                    pushLog(`Applied persisted quality ${prefs.hlsQuality}`);
                  }
                } else if (prefs && prefs.hlsQuality === 'auto') {
                  hlsInstanceRef.current.currentLevel = -1;
                  setHlsLevel('auto');
                }
              }
              attemptAutoplay();
            });
            hlsInstanceRef.current.on(Hls.Events.ERROR, (_, data) => {
              pushLog(`HLS error: ${data.type} - ${data.details}`);
              if (data.fatal) {
                onError?.('Fatal HLS streaming error');
              }
            });
          } else if (el.canPlayType('application/vnd.apple.mpegurl')) {
            el.src = src; // Safari
            el.addEventListener('loadedmetadata', attemptAutoplay);
          } else {
            onError?.('HLS not supported in this browser.');
          }
        } catch (e) {
          console.error(e);
          onError?.('Failed to initialize HLS.');
        }
      } else if (type === 'mp4') {
        el.src = src;
        el.addEventListener('loadedmetadata', attemptAutoplay);
      }
      timeoutRef.current = setTimeout(() => {
        if (!el.paused && !el.currentTime) return; // started
        if (el.paused) {
          pushLog('Autoplay likely blocked');
          setManualPlayNeeded(true);
        }
      }, 8000);
    };
    setup();
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (hlsInstanceRef.current) { hlsInstanceRef.current.destroy(); hlsInstanceRef.current = null; }
    };
  }, [initialized, src, type]);

  const attemptAutoplay = useCallback(() => {
    const el = videoRef.current; if (!el) return;
    el.play().then(() => {
      pushLog('Autoplay success');
      setManualPlayNeeded(false);
    }).catch(() => {
      setManualPlayNeeded(true);
    });
  }, []);

  const handleManualPlay = () => {
    const el = videoRef.current; if (!el) return;
    el.play().catch(err => onError?.('Cannot start playback: ' + err.message));
  };

  // Element event listeners
  useEffect(() => {
    const el = videoRef.current; if (!el) return;
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onLoaded = () => setDuration(el.duration || 0);
    const onTime = () => setCurrentTime(el.currentTime || 0);
    const onProgress = () => {
      try {
        if (el.buffered.length) {
          const end = el.buffered.end(el.buffered.length - 1);
          const pct = el.duration ? (end / el.duration) * 100 : 0;
          setBuffered(Math.min(100, Math.round(pct)));
        }
      } catch {}
    };
    const onVolume = () => { setVolume(el.volume); setMuted(el.muted); };
    el.addEventListener('play', onPlay);
    el.addEventListener('pause', onPause);
    el.addEventListener('loadedmetadata', onLoaded);
    el.addEventListener('timeupdate', onTime);
    el.addEventListener('progress', onProgress);
    el.addEventListener('volumechange', onVolume);
    return () => {
      el.removeEventListener('play', onPlay);
      el.removeEventListener('pause', onPause);
      el.removeEventListener('loadedmetadata', onLoaded);
      el.removeEventListener('timeupdate', onTime);
      el.removeEventListener('progress', onProgress);
      el.removeEventListener('volumechange', onVolume);
    };
  }, [type]);

  // Persist volume & mute changes
  useEffect(() => { savePrefs({ volume, muted }); }, [volume, muted]);
  // Persist playback rate
  useEffect(() => { savePrefs({ playbackRate }); }, [playbackRate]);
  // Persist quality (store human-friendly label if available)
  useEffect(() => {
    if (type !== 'hls') return;
    let label = 'auto';
    if (hlsLevel !== 'auto') {
      const lvl = hlsLevels.find(l => l.index === hlsLevel);
      label = lvl?.height ? lvl.height + 'p' : hlsLevel;
    }
    savePrefs({ hlsQuality: label });
  }, [hlsLevel, hlsLevels, type]);

  // UI hide behaviour
  const resetUiHideTimer = useCallback(() => {
    if (uiHideTimerRef.current) clearTimeout(uiHideTimerRef.current);
    setShowUi(true);
    if (isPlaying) uiHideTimerRef.current = setTimeout(() => setShowUi(false), 3000);
  }, [isPlaying]);

  useEffect(() => {
    const root = containerRef.current; if (!root) return;
    const events = ['mousemove','touchstart','keydown'];
    events.forEach(ev => root.addEventListener(ev, resetUiHideTimer));
    return () => events.forEach(ev => root.removeEventListener(ev, resetUiHideTimer));
  }, [resetUiHideTimer]);

  const togglePlay = () => {
    const el = videoRef.current; if (!el) return;
    if (el.paused) el.play(); else el.pause();
  };
  const skip = (seconds) => {
    const el = videoRef.current; if (!el) return;
    const target = (el.currentTime || 0) + seconds;
    el.currentTime = Math.min(Math.max(0, target), duration || el.duration || target);
  };
  const handleSeek = (e) => {
    const el = videoRef.current; if (!el || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    el.currentTime = pct * duration;
  };
  const handleVolumeChange = (e) => {
    const el = videoRef.current; if (!el) return;
    const val = parseFloat(e.target.value);
    el.volume = val; if (val > 0 && el.muted) el.muted = false;
  };
  const toggleMute = () => {
    const el = videoRef.current; if (!el) return;
    el.muted = !el.muted; if (!el.muted && el.volume === 0) el.volume = 0.5;
  };
  const changeRate = (r) => {
    const el = videoRef.current; if (!el) return;
    el.playbackRate = r; setPlaybackRate(r); setShowSpeedMenu(false);
  };
  const incrementRate = (delta) => {
    const newRate = Math.min(3, Math.max(0.25, playbackRate + delta));
    changeRate(parseFloat(newRate.toFixed(2)));
  };
  const incrementVolume = (delta) => {
    const el = videoRef.current; if (!el) return;
    el.volume = Math.min(1, Math.max(0, (el.volume + delta)));
  };
  const toggleFullscreen = () => {
    const el = containerRef.current; if (!el) return;
    if (!document.fullscreenElement) el.requestFullscreen?.(); else document.exitFullscreen?.();
  };
  useEffect(() => {
    const onFs = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);
  const selectQuality = (val) => {
    if (val === 'auto') {
      if (hlsInstanceRef.current) hlsInstanceRef.current.currentLevel = -1;
      setHlsLevel('auto');
    } else {
      if (hlsInstanceRef.current) hlsInstanceRef.current.currentLevel = val;
      setHlsLevel(val);
    }
    setShowQualityMenu(false);
  };

  const handleKey = (e) => {
    if (['INPUT','TEXTAREA'].includes(e.target.tagName)) return;
    switch(e.key.toLowerCase()) {
      case ' ': case 'k': e.preventDefault(); togglePlay(); break;
      case 'm': toggleMute(); break;
      case 'f': toggleFullscreen(); break;
      case 'arrowright': { const el = videoRef.current; if (el) el.currentTime = Math.min(el.currentTime + 5, duration); break; }
      case 'arrowleft': { const el = videoRef.current; if (el) el.currentTime = Math.max(el.currentTime - 5, 0); break; }
      case 'arrowup': { const el = videoRef.current; if (el) el.volume = Math.min(1, el.volume + 0.05); break; }
      case 'arrowdown': { const el = videoRef.current; if (el) el.volume = Math.max(0, el.volume - 0.05); break; }
      case '>': case '.': changeRate(Math.min(3, (playbackRate + 0.25))); break;
      case '<': case ',': changeRate(Math.max(0.25, (playbackRate - 0.25))); break;
      default: break;
    }
  };

  return (
    <div ref={containerRef} tabIndex={0} onKeyDown={handleKey} className="w-full h-full outline-none relative select-none">
      <video
        ref={videoRef}
        className="w-full h-full bg-black"
        playsInline
        preload="metadata"
        poster={poster}
        onClick={togglePlay}
        onError={() => onError?.('Video element encountered an error.')}
        style={{cursor:'pointer'}}
      />
      {manualPlayNeeded && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm z-20">
          <button
            onClick={handleManualPlay}
            className="px-8 py-4 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold shadow-lg hover:scale-105 transition-transform"
          >
            Tap to Play
          </button>
          <p className="mt-4 text-xs text-gray-300 max-w-xs text-center">Autoplay was blocked by the browser. Tap to begin playback.</p>
        </div>
      )}
      {!isPlaying && !manualPlayNeeded && (
        <button
          onClick={togglePlay}
          aria-label={isPlaying ? 'Pause' : 'Play'}
          className={`absolute inset-0 m-auto w-20 h-20 flex items-center justify-center rounded-full bg-black/40 backdrop-blur border border-white/30 text-white z-10 transition-opacity ${showUi ? 'opacity-100' : 'opacity-0'}`}
        >
          <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24">
            {isPlaying ? <path d="M6 4h4v16H6zm8 0h4v16h-4z"/> : <path d="M8 5v14l11-7z"/>}
          </svg>
        </button>
      )}
      <div
        className={`absolute inset-x-0 bottom-0 pt-10 bg-gradient-to-t from-black/70 via-black/20 to-transparent text-white text-xs transition-opacity ${showUi ? 'opacity-100' : 'opacity-0'} z-30`}
        onMouseMove={resetUiHideTimer}
        onTouchStart={resetUiHideTimer}
      >
        <div className="group px-4 mb-2 cursor-pointer" onClick={handleSeek}>
          <div className="h-2 w-full bg-white/20 rounded relative overflow-hidden">
            <div className="absolute left-0 top-0 h-full bg-white/30" style={{width: `${buffered}%`}} />
            <div className="absolute left-0 top-0 h-full bg-blue-500" style={{width: duration ? `${(currentTime/duration)*100}%` : '0%'}} />
          </div>
          <div className="flex justify-between mt-1 text-[10px] text-gray-300 tracking-wider">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
        <div className="flex items-center gap-3 px-4 pb-3 flex-wrap">
          <button onClick={() => skip(-10)} aria-label="Skip Back 10s" className="w-8 h-8 flex items-center justify-center rounded hover:bg-white/10">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 5v2.79C10.84 6.67 9.34 6 7.67 6 4.18 6 1.39 8.69 1.39 12S4.18 18 7.67 18c1.67 0 3.17-.67 4.33-1.79V19h2V5h-2zm-4.33 11C6.01 16 4.39 14.43 4.39 12s1.62-4 3.28-4c1.15 0 2.18.55 2.77 1.4v5.2c-.59.85-1.62 1.4-2.77 1.4zM19 6h-2v12h2V6z"/></svg>
          </button>
          <button onClick={togglePlay} aria-label={isPlaying ? 'Pause' : 'Play'} className="w-8 h-8 flex items-center justify-center rounded hover:bg-white/10">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              {isPlaying ? <path d="M6 4h4v16H6zm8 0h4v16h-4z"/> : <path d="M8 5v14l11-7z"/>}
            </svg>
          </button>
          <button onClick={() => skip(10)} aria-label="Skip Forward 10s" className="w-8 h-8 flex items-center justify-center rounded hover:bg-white/10">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 5v2.79C13.16 6.67 14.66 6 16.33 6c3.49 0 6.28 2.69 6.28 6s-2.79 6-6.28 6c-1.67 0-3.17-.67-4.33-1.79V19h-2V5h2zm4.33 11c1.66 0 3.28-1.57 3.28-4s-1.62-4-3.28-4c-1.15 0-2.18.55-2.77 1.4v5.2c.59.85 1.62 1.4 2.77 1.4zM5 6H3v12h2V6z"/></svg>
          </button>
          <button onClick={toggleMute} aria-label={muted || volume===0 ? 'Unmute' : 'Mute'} className="w-8 h-8 flex items-center justify-center rounded hover:bg-white/10">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              {muted || volume===0 ? (
                <path d="M16.5 12L19 9.5 17.6 8.1 15 10.7 12.4 8.1 11 9.5 13.5 12 11 14.5 12.4 15.9 15 13.3 17.6 15.9 19 14.5zM5 9v6h4l5 5V4L9 9H5z" />
              ) : (
                <path d="M5 9v6h4l5 5V4L9 9H5zm9.54-4.46l-1.42 1.42A7.007 7.007 0 0 1 17 12c0 1.93-.78 3.68-2.05 4.95l1.42 1.42A8.963 8.963 0 0 0 19 12c0-2.49-1.02-4.73-2.66-6.34l-1.42 1.42A6.978 6.978 0 0 1 17 12c0 1.93-.78 3.68-2.05 4.95l1.42 1.42" />
              )}
            </svg>
          </button>
          <input
            type="range" min={0} max={1} step={0.01}
            value={muted ? 0 : volume}
            onChange={handleVolumeChange}
            className="w-24 accent-blue-500 cursor-pointer"
            aria-label="Volume"
          />
          <div className="flex items-center gap-1 mr-2">
            <button onClick={() => incrementVolume(-0.1)} aria-label="Volume Down" className="w-7 h-7 flex items-center justify-center rounded bg-white/10 hover:bg-white/20 text-[10px]">-</button>
            <button onClick={() => incrementVolume(0.1)} aria-label="Volume Up" className="w-7 h-7 flex items-center justify-center rounded bg-white/10 hover:bg-white/20 text-[10px]">+</button>
          </div>
          {type === 'hls' && hlsLevels.length > 0 && (
            <div className="relative">
              <button onClick={() => {setShowQualityMenu(v=>!v); setShowSpeedMenu(false);}} className="px-2 h-8 rounded bg-white/10 hover:bg-white/20 text-[11px] tracking-wide" aria-haspopup="true" aria-expanded={showQualityMenu}>Q {hlsLevel==='auto' ? 'Auto' : hlsLevels.find(l=>l.index===hlsLevel)?.height || hlsLevel}</button>
              {showQualityMenu && (
                <div className="absolute bottom-10 left-0 bg-black/80 backdrop-blur border border-white/10 rounded shadow-lg p-2 flex flex-col gap-1 z-50 min-w-[80px]">
                  <button onClick={()=>selectQuality('auto')} className={`px-2 py-1 rounded text-left hover:bg-white/10 text-xs ${hlsLevel==='auto'?'bg-blue-600/40':''}`}>Auto</button>
                  {hlsLevels.map(l => (
                    <button key={l.index} onClick={()=>selectQuality(l.index)} className={`px-2 py-1 rounded text-left hover:bg-white/10 text-xs ${hlsLevel===l.index?'bg-blue-600/40':''}`}>{l.height ? l.height+'p' : l.index}</button>
                  ))}
                </div>
              )}
            </div>
          )}
          <div className="relative">
            <button onClick={() => {setShowSpeedMenu(v=>!v); setShowQualityMenu(false);}} className="px-2 h-8 rounded bg-white/10 hover:bg-white/20 text-[11px] tracking-wide" aria-haspopup="true" aria-expanded={showSpeedMenu}>{playbackRate}x</button>
            {showSpeedMenu && (
              <div className="absolute bottom-10 left-0 bg-black/80 backdrop-blur border border-white/10 rounded shadow-lg p-2 flex flex-col gap-1 z-50 min-w-[70px]">
                {[0.5,0.75,1,1.25,1.5,1.75,2].map(r => (
                  <button key={r} onClick={()=>changeRate(r)} className={`px-2 py-1 rounded text-left hover:bg-white/10 text-xs ${playbackRate===r?'bg-blue-600/40':''}`}>{r}x</button>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => incrementRate(-0.25)} aria-label="Speed Down" className="w-7 h-7 flex items-center justify-center rounded bg-white/10 hover:bg-white/20 text-[10px]">-</button>
            <button onClick={() => incrementRate(0.25)} aria-label="Speed Up" className="w-7 h-7 flex items-center justify-center rounded bg-white/10 hover:bg-white/20 text-[10px]">+</button>
          </div>
          <button onClick={toggleFullscreen} aria-label={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'} className="w-8 h-8 flex items-center justify-center rounded hover:bg-white/10 ml-auto">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              {isFullscreen ? (
                <path d="M14 10V4h6v6h-2V6h-4v4h-2zm-4 4v6H4v-6h2v4h4v-4h2zm0-4H8V6H6v4H4V4h6v6zm4 4h2v4h4v-4h2v6h-6v-6z" />
              ) : (
                <path d="M8 8H6v4H4V6h6v2H8zm10 0h-2V6h-4V4h6v6h-2V8zM8 16h2v2h4v2H8v-6zm10-4h2v6h-6v-2h4v-4z" />
              )}
            </svg>
          </button>
        </div>
      </div>
      {debug && log.length > 0 && (
        <details className="absolute top-2 left-2 bg-black/70 text-white text-[10px] p-2 rounded max-w-[260px] space-y-1">
          <summary className="cursor-pointer font-semibold">Debug</summary>
          {log.map((l,i)=><div key={i}>{l}</div>)}
        </details>
      )}
    </div>
  );
}
