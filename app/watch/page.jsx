"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { ADMIN_EMAILS } from "@/lib/config";
import VideoPlayer from "@/components/VideoPlayer";
import YouTubePlayer from "@/components/YouTubePlayer";

export default function WatchPage() {
  const router = useRouter();
  const videoRef = useRef(null);
  const [rawSrc, setRawSrc] = useState("");
  const [resolvedSrc, setResolvedSrc] = useState("");
  const [videoType, setVideoType] = useState(""); // hls | mp4 | youtube | generic | unknown
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [isAdminPreview, setIsAdminPreview] = useState(false);
  const [autoplayTried, setAutoplayTried] = useState(false);
  const [manualPlayNeeded, setManualPlayNeeded] = useState(false);
  const [debug, setDebug] = useState([]);
  const [initialized, setInitialized] = useState(false);
  const [ytReady, setYtReady] = useState(false);
  const [ytEmbedUrl, setYtEmbedUrl] = useState(""); // retained for thumbnail initialization (unused with new player)
  const [ytVideoId, setYtVideoId] = useState("");
  const [ytThumb, setYtThumb] = useState("");
  const [fbReady, setFbReady] = useState(false);
  const [fbEmbedUrl, setFbEmbedUrl] = useState("");
  const [fbThumb, setFbThumb] = useState(""); // Will attempt simple placeholder (FB doesn't give easy thumb without API)
  // Streamtape support
  const [streamtapeId, setStreamtapeId] = useState("");
  const [streamtapeResolving, setStreamtapeResolving] = useState(false);
  const [streamtapeFallback, setStreamtapeFallback] = useState(false); // fallback to iframe embed
  const [streamtapeRetryToken, setStreamtapeRetryToken] = useState(0);
  const hlsInstanceRef = useRef(null);
  const timeoutRef = useRef(null);
  // Custom player logic moved into VideoPlayer component

  const pushDebug = (msg) => setDebug(d => [...d, `[${new Date().toISOString()}] ${msg}`]);

  // Auth guard
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) {
        router.replace("/login");
        return;
      }
      // Allow both normal users & admins (could restrict if desired)
    });
    return () => unsub();
  }, [router]);

  // Normalize various link formats into playable form
  const normalizeUrl = useCallback((url) => {
    let type = "unknown";
    let finalUrl = url.trim();

  // Streamtape detection: patterns like streamtape.com/v/<id>/ or streamtape.com/e/<id>
  // Original regex required a trailing slash which caused some valid links to fail detection.
  const streamtapeRegex = /streamtape\.com\/(?:v|e)\/([A-Za-z0-9]+)(?:\/|$)/i;
    const stMatch = finalUrl.match(streamtapeRegex);
    if (stMatch) {
      type = 'streamtape';
      // We'll defer resolution (need to fetch actual streamable link via serverless endpoint) and return placeholder for now.
      return { type, finalUrl };
    }

    // Facebook variants: /videos/<id>, fb.watch/<code>, watch/?v=<id>
    const fbWatchParam = finalUrl.match(/facebook\.com\/watch\/?\?v=([0-9]+)/);
    if (fbWatchParam) {
      type = 'facebook';
      const vid = fbWatchParam[1];
      const canonical = `https://www.facebook.com/video.php?v=${vid}`;
      const encoded = encodeURIComponent(canonical);
      finalUrl = `https://www.facebook.com/plugins/video.php?href=${encoded}&show_text=0&autoplay=1&mute=0&allowfullscreen=true`;
      return { type, finalUrl };
    }

    const fbRegex = /(facebook\.com\/.+\/videos\/[0-9]+)|(fb\.watch\/[A-Za-z0-9_-]+)/;
    if (fbRegex.test(finalUrl)) {
      type = 'facebook';
      // Build embed URL (encode original) - remove tracking params for cleanliness
      const clean = finalUrl.split('?')[0];
      const encoded = encodeURIComponent(clean);
      finalUrl = `https://www.facebook.com/plugins/video.php?href=${encoded}&show_text=0&autoplay=1&mute=0&allowfullscreen=true`;
      return { type, finalUrl };
    }

  const ytRegex = /(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/;
    const ytMatch = finalUrl.match(ytRegex);
    if (ytMatch) {
      const id = ytMatch[1];
      type = "youtube";
      finalUrl = `https://www.youtube.com/embed/${id}?rel=0&autoplay=1&playsinline=1`;
      return { type, finalUrl };
    }

    if (/\.m3u8($|\?)/i.test(finalUrl)) {
      type = "hls";
      return { type, finalUrl };
    }

    if (/\.mp4($|\?)/i.test(finalUrl)) {
      type = "mp4";
      return { type, finalUrl };
    }

    // Google Drive -> convert /file/d/<id>/ to direct uc link
    const driveMatch = finalUrl.match(/drive\.google\.com\/file\/d\/([^/]+)\//);
    if (driveMatch) {
      const id = driveMatch[1];
      finalUrl = `https://drive.google.com/uc?export=download&id=${id}`;
      // We cannot be certain of mime; try mp4
      type = finalUrl.endsWith('.m3u8') ? 'hls' : 'mp4';
      return { type, finalUrl };
    }

    // Dropbox share -> add ?raw=1
    if (/dropbox\.com\//.test(finalUrl) && !/raw=1/.test(finalUrl)) {
      finalUrl += (finalUrl.includes('?') ? '&' : '?') + 'raw=1';
      type = finalUrl.endsWith('.m3u8') ? 'hls' : /\.mp4/.test(finalUrl) ? 'mp4' : 'generic';
      return { type, finalUrl };
    }

    // Fallback heuristics
    if (/\.webm($|\?)/i.test(finalUrl)) {
      type = 'mp4'; // treat similarly for <video>
    } else if (/\.ogg($|\?)/i.test(finalUrl)) {
      type = 'mp4';
    } else {
      type = 'generic';
    }
    return { type, finalUrl };
  }, []);

  // Load URL from localStorage (tempDownloadUrl) with resilience for legacy/plain string values
  useEffect(() => {
    const load = () => {
      try {
        const raw = typeof window !== 'undefined' ? localStorage.getItem('tempDownloadUrl') : null;
        if (!raw) { router.replace('/user'); return; }

        let data;
        try {
          data = JSON.parse(raw);
        } catch {
          // Fallback: older format may have stored the URL directly as string
          data = { url: raw, timestamp: Date.now() };
        }
        if (!data || typeof data.url !== 'string') {
          router.replace('/user');
          return;
        }
        const now = Date.now();
        if (!data.timestamp || typeof data.timestamp !== 'number') {
          // Backfill missing timestamp instead of rejecting
          data.timestamp = now;
        }
        // Expiry check (30m); if expired allow user to reselect rather than error
        if (now - data.timestamp > 30 * 60 * 1000) {
          localStorage.removeItem('tempDownloadUrl');
          router.replace('/user');
          return;
        }

        const originalUrl = data.url.trim();
        if (!originalUrl) { router.replace('/user'); return; }
        setRawSrc(originalUrl);
        const { type, finalUrl } = normalizeUrl(originalUrl);
        setVideoType(type);
        setResolvedSrc(finalUrl);
        if (type === 'streamtape') {
          const idMatch = originalUrl.match(/streamtape\.com\/(?:v|e)\/([A-Za-z0-9]+)(?:\/|$)/i);
          if (idMatch) setStreamtapeId(idMatch[1]);
        }
        if (type === 'youtube') {
          const idMatch = originalUrl.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
          const vid = idMatch ? idMatch[1] : null;
          if (vid) {
            setYtVideoId(vid);
            setYtThumb(`https://img.youtube.com/vi/${vid}/hqdefault.jpg`);
          }
        } else if (type === 'facebook') {
          // Basic placeholder thumbnail (could be improved by a scraping service / Graph API if allowed)
          setFbThumb('https://static.xx.fbcdn.net/rsrc.php/v3/yN/r/AMd4C3xQ0oZ.png');
          setFbEmbedUrl(finalUrl);
        }
        pushDebug(`Original URL: ${originalUrl}`);
        pushDebug(`Normalized (${type}): ${finalUrl}`);
        if (typeof window !== 'undefined') {
          const p = new URLSearchParams(window.location.search);
          setIsAdminPreview(p.get('adminPreview') === '1');
        }
        setLoading(false);
        setInitialized(true);
      } catch (e) {
        console.error(e);
        setError('Failed to load video metadata.');
        setLoading(false);
      }
    };
    load();
  }, [router, normalizeUrl]);

  // Initialize playback for hls/mp4 types
  useEffect(() => {
    const setup = async () => {
      if (!initialized) return;
      if (!resolvedSrc) return;
      if (videoType === 'youtube' || videoType === 'generic') return; // handled by iframe or potential unsupported
      const el = videoRef.current;
      if (!el) return;

      if (videoType === 'hls') {
        try {
          const HlsModule = await import('hls.js');
          const Hls = HlsModule.default;
          if (Hls.isSupported()) {
            hlsInstanceRef.current = new Hls();
            hlsInstanceRef.current.loadSource(resolvedSrc);
            hlsInstanceRef.current.attachMedia(el);
            hlsInstanceRef.current.on(Hls.Events.MANIFEST_PARSED, () => {
              pushDebug('HLS manifest parsed');
              attemptAutoplay();
            });
            hlsInstanceRef.current.on(Hls.Events.ERROR, (_, data) => {
              pushDebug(`HLS error: ${data.type} - ${data.details}`);
              if (data.fatal) setError('Fatal HLS streaming error.');
            });
          } else if (el.canPlayType('application/vnd.apple.mpegurl')) {
            el.src = resolvedSrc; // Safari
            el.addEventListener('loadedmetadata', attemptAutoplay);
          } else {
            setError('HLS not supported in this browser.');
          }
        } catch (e) {
          console.error(e);
          setError('Failed to initialize HLS.');
        }
      } else if (videoType === 'mp4') {
        el.src = resolvedSrc;
        el.addEventListener('loadedmetadata', attemptAutoplay);
      }

      // Fallback timer: if not started within 8s show manual play
      timeoutRef.current = setTimeout(() => {
        if (!el.paused && !el.currentTime) return; // maybe buffering but started
        if (el.paused) {
          pushDebug('Autoplay likely blocked. Showing manual play overlay.');
          setManualPlayNeeded(true);
        }
      }, 8000);
    };
    setup();
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (hlsInstanceRef.current) {
        hlsInstanceRef.current.destroy();
        hlsInstanceRef.current = null;
      }
    };
  }, [initialized, resolvedSrc, videoType]);

  const attemptAutoplay = useCallback(() => {
    if (autoplayTried) return;
    setAutoplayTried(true);
    const el = videoRef.current;
    if (!el) return;
    el.play().then(() => {
      pushDebug('Autoplay success');
      setManualPlayNeeded(false);
    }).catch(err => {
      pushDebug('Autoplay blocked: ' + err.message);
      setManualPlayNeeded(true);
    });
  }, [autoplayTried]);

  const handleManualPlay = () => {
    const el = videoRef.current;
    if (!el) return;
    el.play().catch(err => {
      setError('Cannot start playback: ' + err.message);
    });
  };


  const handleExit = () => { router.push('/user'); };

  // Resolve Streamtape direct URL once identified
  useEffect(() => {
    const resolveStreamtape = async () => {
      if (videoType !== 'streamtape') return;
      if (!rawSrc) return;
      try {
        setStreamtapeResolving(true);
        pushDebug('Resolving Streamtape direct link...');
        const abort = new AbortController();
        const timeout = setTimeout(() => abort.abort(), 12000);
        const resp = await fetch(`/api/resolve-streamtape?url=${encodeURIComponent(rawSrc)}`, { signal: abort.signal });
        clearTimeout(timeout);
        const data = await resp.json();
        if (data.url) {
          pushDebug('Streamtape resolved to direct URL.');
          // Replace resolvedSrc with direct MP4 link and force type mp4
          setResolvedSrc(data.url);
          setVideoType('mp4');
        } else {
          pushDebug('Streamtape resolution failed: ' + (data.error || 'unknown error'));
          if (streamtapeId) {
            pushDebug('Falling back to Streamtape embed due to failed resolution.');
            setStreamtapeFallback(true);
          }
        }
      } catch (e) {
        pushDebug('Streamtape resolution error: ' + e.message);
        if (streamtapeId) {
          pushDebug('Falling back to Streamtape embed due to resolution exception.');
          setStreamtapeFallback(true);
        }
      }
      finally {
        setStreamtapeResolving(false);
      }
    };
    resolveStreamtape();
  }, [videoType, rawSrc, streamtapeRetryToken, streamtapeId]);

  // Handle errors from VideoPlayer (including failed Streamtape hotlink) by falling back to embed
  const handlePlayerError = (msg) => {
    setError(msg);
    if (streamtapeId && !streamtapeFallback) {
      pushDebug('Direct Streamtape playback failed, falling back to embed iframe.');
      setStreamtapeFallback(true);
      // Reset error so user can still view via iframe
      setError('');
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <header className="p-4 flex flex-wrap gap-3 justify-between items-center bg-gradient-to-r from-gray-900 to-gray-800 border-b border-gray-700">
        <h1 className="text-lg font-semibold">Watch Content</h1>
        <div className="flex gap-3 items-center">
          {isAdminPreview && (
            <span className="px-2 py-1 text-xs rounded bg-purple-700/40 border border-purple-500 text-purple-200">Admin Preview</span>
          )}
          {/* {videoType && (
            <span className="px-2 py-1 text-xs rounded bg-gray-700 text-gray-300 border border-gray-600 capitalize">{videoType}</span>
          )} */}
          <button onClick={handleExit} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm font-medium">Exit</button>
        </div>
      </header>

      <main className="flex-grow flex flex-col items-center justify-start p-4 w-full">
        {loading && (
          <div className="text-center mt-24">
            <div className="w-16 h-16 border-4 border-blue-500 rounded-full animate-spin mb-4" />
            <p className="text-gray-400">Loading video metadata...</p>
          </div>
        )}
        {!loading && error && (
          <div className="text-center max-w-md mt-16">
            <p className="text-red-400 mb-4 font-medium">{error}</p>
            <div className="space-x-3">
              <button onClick={() => window.location.reload()} className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded">Reload</button>
              <button onClick={handleExit} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded">Back</button>
            </div>
          </div>
        )}
        {!loading && !error && resolvedSrc && (
          <div className="w-full max-w-5xl aspect-video bg-black relative rounded-lg overflow-hidden shadow-xl border border-gray-800">
            {videoType === 'youtube' ? (
              <div className="w-full h-full relative flex items-center justify-center bg-black">
                {!ytReady && ytThumb && (
                  <button onClick={() => setYtReady(true)} className="group relative w-full h-full">
                    <img src={ytThumb} alt="Video thumbnail" className="w-full h-full object-cover opacity-80 group-hover:opacity-60 transition-opacity" loading="lazy" />
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <div className="w-20 h-20 rounded-full bg-white/15 backdrop-blur-sm border border-white/30 flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
                        <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                      </div>
                      <p className="mt-4 text-xs text-gray-300 tracking-wide uppercase">Tap to Start</p>
                    </div>
                  </button>
                )}
                {ytReady && ytVideoId && (
                  <YouTubePlayer videoId={ytVideoId} onError={(m)=>setError(m)} />
                )}
              </div>
            ) : videoType === 'facebook' ? (
              <div className="w-full h-full relative flex items-center justify-center bg-black">
                {!fbReady && (
                  <button
                    onClick={() => setFbReady(true)}
                    className="group relative w-full h-full"
                  >
                    {fbThumb && (
                      <img
                        src={fbThumb}
                        alt="Facebook video placeholder"
                        className="w-full h-full object-contain opacity-70 group-hover:opacity-50 transition-opacity"
                        loading="lazy"
                      />
                    )}
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <div className="w-20 h-20 rounded-full bg-blue-600/30 backdrop-blur-sm border border-blue-400/40 flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
                        <svg className="w-10 h-10 text-blue-200" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                      <p className="mt-4 text-xs text-blue-200 tracking-wide uppercase">Tap to Play</p>
                    </div>
                  </button>
                )}
                {fbReady && fbEmbedUrl && (
                  <>
                    <iframe
                      src={fbEmbedUrl}
                      className="absolute inset-0 w-full h-full"
                      style={{border:'none',overflow:'hidden'}}
                      scrolling="no"
                      frameBorder="0"
                      allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                      allowFullScreen={true}
                      title="Facebook Video"
                    />
                    <div className="absolute top-2 left-2 bg-black/60 backdrop-blur px-2 py-1 rounded text-[10px] text-white/70 border border-white/10 max-w-[210px]">
                      Arrow key skipping is only available for MP4 / HLS sources right now.
                    </div>
                  </>
                )}
                {fbReady && !fbEmbedUrl && (
                  <div className="text-xs text-gray-300 p-4 text-center">Embed unavailable. Video may be private or region-locked.</div>
                )}
              </div>
            ) : videoType === 'streamtape' ? (
              <div className="flex flex-col gap-4 items-center justify-center w-full h-full text-sm text-gray-300 p-6 text-center">
                <div>
                  {streamtapeResolving ? 'Resolving Streamtape video…' : (streamtapeFallback ? 'Using fallback embed…' : 'Preparing Streamtape video…')}
                </div>
                {!streamtapeResolving && !streamtapeFallback && (
                  <div className="flex gap-3 flex-wrap justify-center">
                    <button
                      onClick={() => setStreamtapeRetryToken(t=>t+1)}
                      className="px-3 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs"
                    >Retry Resolve</button>
                    {streamtapeId && (
                      <button
                        onClick={() => setStreamtapeFallback(true)}
                        className="px-3 py-1 rounded bg-gray-700 hover:bg-gray-600 text-white text-xs"
                      >Use Embed Now</button>
                    )}
                    <a
                      href={rawSrc}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1 rounded bg-white/10 hover:bg-white/20 text-white text-xs"
                    >Open Original</a>
                  </div>
                )}
              </div>
            ) : videoType === 'generic' ? (
              <div className="flex items-center justify-center w-full h-full text-sm text-gray-400 p-6 text-center">
                This link type is not directly playable. Provide a direct MP4 or HLS (.m3u8) URL.
              </div>
            ) : (
              <VideoPlayer
                src={resolvedSrc}
                type={videoType === 'hls' ? 'hls' : 'mp4'}
                poster="https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?auto=format&fit=crop&w=1200&q=60"
                onError={handlePlayerError}
                debug={process.env.NODE_ENV === 'development'}
              />
            )}
            {/* Streamtape fallback embed (shown only if direct mp4 failed) */}
            {streamtapeFallback && streamtapeId && (
              <div className="absolute inset-0 w-full h-full bg-black">
                <iframe
                  src={`https://streamtape.com/e/${streamtapeId}/`}
                  className="w-full h-full"
                  allowFullScreen
                  title="Streamtape Fallback"
                  allow="autoplay; picture-in-picture"
                />
                {/* <div className="absolute top-2 left-2 bg-black/60 text-white/70 text-[10px] px-2 py-1 rounded border border-white/10">
                  Fallback embed (skip keys may not work)
                </div> */}
              </div>
            )}
          </div>
        )}
        {!loading && !error && !resolvedSrc && (
          <p className="text-gray-400 mt-16">No video source available.</p>
        )}

        {/* Debug Panel (optional; remove in production) */}
        {/* {process.env.NODE_ENV === 'development' && debug.length > 0 && (
          <details className="mt-8 w-full max-w-5xl bg-gray-900 border border-gray-800 rounded p-4 text-xs text-gray-300 space-y-1">
            <summary className="cursor-pointer font-medium">Debug Info</summary>
            {debug.map((l, i) => (<div key={i}>{l}</div>))}
            <div className="pt-2"><span className="text-gray-500">Raw:</span> {rawSrc}</div>
            <div><span className="text-gray-500">Resolved:</span> {resolvedSrc}</div>
          </details>
        )} */}
      </main>

      <footer className="p-4 text-center text-[10px] text-gray-500 border-t border-gray-800">Secure Streaming • HLS / MP4 / YouTube prototype</footer>
    </div>
  );
}
