"use client";
import { useEffect, useMemo, useState } from "react";

/*
  AdBlockGuard
  - Detects ad blockers using multiple heuristics (DOM bait, local script bait, remote ads script, API probe)
  - If detected, hides all children and shows a fullscreen overlay with a message

  Usage: Wrap your app content (e.g., in app/layout.js) with <AdBlockGuard> ... </AdBlockGuard>
*/

export default function AdBlockGuard({ children }) {
  const [detected, setDetected] = useState(false);
  const [checked, setChecked] = useState(false);

  const message = useMemo(() => ({
    title: "AdBlock Detected 🚫",
    lines: [
      "We noticed you're using an AdBlocker. Ads help us keep this website free and support our creators.",
      "Please disable your AdBlocker and refresh the page to continue enjoying our content. 💙",
      "Thank you for supporting us!",
    ],
  }), []);

  useEffect(() => {
    let cancelled = false;

    const timeout = (ms) => new Promise((res) => setTimeout(res, ms));

    const checkDomBait = async () => {
      try {
        return await new Promise((resolve) => {
          const wrap = document.createElement("div");
          const bait = document.createElement("div");
          const ins = document.createElement("ins");
          // Commonly blocked classes/ids
          bait.className = "ads ad ad-banner advert advertisement sponsor pub_300x250 ad-container ad-slot adsbox";
          bait.id = "ad-banner";
          ins.className = "adsbygoogle ad adsbox sponsor";
          Object.assign(wrap.style, { position: "absolute", left: "-9999px", top: "-9999px" });
          Object.assign(bait.style, { width: "300px", height: "250px" });
          Object.assign(ins.style, { width: "1px", height: "1px", display: "block" });
          wrap.appendChild(bait);
          wrap.appendChild(ins);
          document.body.appendChild(wrap);

          let removed = false;
          const mo = new MutationObserver(() => {
            if (!wrap.isConnected || !bait.isConnected || !ins.isConnected) {
              removed = true;
            }
          });
          mo.observe(wrap, { childList: true, subtree: true, attributes: true, attributeFilter: ["style", "class"] });

          requestAnimationFrame(() => {
            const cs1 = window.getComputedStyle(bait);
            const cs2 = window.getComputedStyle(ins);
            const hidden =
              removed ||
              cs1.display === "none" ||
              cs1.visibility === "hidden" ||
              bait.offsetHeight === 0 ||
              cs2.display === "none" ||
              cs2.visibility === "hidden" ||
              ins.offsetHeight === 0;
            wrap.remove();
            mo.disconnect();
            resolve(!!hidden);
          });
        });
      } catch {
        return false;
      }
    };

    const loadScriptProbe = (src, ms = 3000) => {
      return new Promise((resolve) => {
        const s = document.createElement("script");
        let settled = false;
        const done = (val) => { if (!settled) { settled = true; resolve(val); } s.remove(); };
        s.async = true;
        s.src = src + (src.includes("?") ? "&" : "?") + "_ab=" + Date.now();
        s.onload = () => done(false); // not blocked
        s.onerror = () => done(true); // likely blocked
        document.head.appendChild(s);
        setTimeout(() => done(false), ms); // timeout -> inconclusive -> treat as not blocked to avoid false positives
      });
    };

    const fetchProbe = async (url, ms = 2500) => {
      try {
        const controller = new AbortController();
        const to = setTimeout(() => controller.abort(), ms);
        const resp = await fetch(url + (url.includes("?") ? "&" : "?") + "_ab=" + Date.now(), { signal: controller.signal, credentials: "omit" });
        clearTimeout(to);
        // If request is blocked, many blockers surface a TypeError before here.
        // Only treat as blocked when network fails; 2xx/3xx/4xx means not blocked at network level.
        return false;
      } catch {
        // Network error or actively blocked
        return true;
      }
    };

    const imageProbe = (src, ms = 3000) => new Promise((resolve) => {
      let settled = false;
      const done = (val) => { if (!settled) { settled = true; resolve(val); } };
      const img = new Image();
      img.onload = () => done(false); // not blocked
      img.onerror = () => done(true); // likely blocked
      img.src = src + (src.includes("?") ? "&" : "?") + "_ab=" + Date.now();
      setTimeout(() => done(false), ms);
    });

    const fetchNoCorsProbe = async (url, ms = 3000) => {
      try {
        const controller = new AbortController();
        const to = setTimeout(() => controller.abort(), ms);
        // no-cors yields opaque response on success; TypeError on network/DNR block
        await fetch(url + (url.includes("?") ? "&" : "?") + "_ab=" + Date.now(), {
          mode: "no-cors",
          cache: "no-store",
          signal: controller.signal,
        });
        clearTimeout(to);
        return false; // not blocked (or at least not detectable)
      } catch {
        return true; // network/DNR blocked
      }
    };

    const iframeProbe = (src, ms = 3000) => new Promise((resolve) => {
      const frame = document.createElement("iframe");
      frame.style.position = "absolute";
      frame.style.width = "1px";
      frame.style.height = "1px";
      frame.style.left = "-9999px";
      frame.style.top = "-9999px";
      let settled = false;
      const done = (val) => { if (!settled) { settled = true; resolve(val); if (frame.parentNode) frame.parentNode.removeChild(frame); } };
      frame.onload = () => done(false); // loaded -> not blocked
      // no onerror for iframe; rely on timeout as heuristic
      frame.src = src + (src.includes("?") ? "&" : "?") + "_ab=" + Date.now();
      document.body.appendChild(frame);
      setTimeout(() => done(true), ms);
    });

    const detect = async () => {
      // Run probes in parallel to keep things fast
      const results = await Promise.all([
        // DOM bait
        checkDomBait(),
        // Local script baits (commonly blocklisted names)
        loadScriptProbe("/ads.js"),
        loadScriptProbe("/advert.js"),
        loadScriptProbe("/adsbygoogle.js"),
        loadScriptProbe("/adframe.js"),
        // Remote ads scripts (very strong indicators)
        loadScriptProbe("https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"),
        loadScriptProbe("https://securepubads.g.doubleclick.net/tag/js/gpt.js"),
        loadScriptProbe("https://static.doubleclick.net/instream/ad_status.js"),
        // API probes
        fetchProbe("/api/ads-probe"),
        fetchProbe("/api/adserver"),
        fetchProbe("/api/advert"),
        // Image probe against an ad domain
        imageProbe("https://securepubads.g.doubleclick.net/pcs/view"),
        // no-cors fetch probes to ad domains (uBlock Origin Lite is DNR-based)
        fetchNoCorsProbe("https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"),
        fetchNoCorsProbe("https://securepubads.g.doubleclick.net/tag/js/gpt.js"),
        fetchNoCorsProbe("https://static.doubleclick.net/instream/ad_status.js"),
        // iframe probe to ad domain (no onerror, use timeout)
        iframeProbe("https://googleads.g.doubleclick.net/pagead/html/r20190131/zrt_lookup.html"),
      ]);

      const [
        domBait,
        localAdsJs,
        localAdvertJs,
        localAdsByGoogleJs,
        localAdFrameJs,
        remoteAdsByGoogle,
        remoteGpt,
        remoteDoubleClickStatus,
        apiAdsProbe,
        apiAdserverProbe,
        apiAdvertProbe,
        imgDoubleClick,
        noCorsAdsByGoogle,
        noCorsGpt,
        noCorsDoubleClick,
        iframeDoubleClick,
      ] = results;

      const positives = results.filter(Boolean).length;

      // Strong signals: any of the well-known remote ad scripts blocked
      const strong = remoteAdsByGoogle || remoteGpt || remoteDoubleClickStatus || noCorsAdsByGoogle || noCorsGpt || noCorsDoubleClick || iframeDoubleClick;

      // Base decision: strong OR 3+ positives overall OR (DOM bait + any script/image/API block)
      let result = strong || positives >= 3 || (domBait && (localAdsJs || localAdvertJs || localAdsByGoogleJs || localAdFrameJs || imgDoubleClick || apiAdsProbe || apiAdserverProbe || apiAdvertProbe));

      // If offline, avoid false positives by requiring DOM bait too
      if (!navigator.onLine) {
        const anyScriptBlocked = localAdsJs || localAdvertJs || localAdsByGoogleJs || localAdFrameJs || remoteAdsByGoogle || remoteGpt || remoteDoubleClickStatus;
        result = domBait && anyScriptBlocked;
      }

      if (!cancelled) {
        setDetected(!!result);
        setChecked(true);
      }

      // Recheck shortly after load in case extension initializes late
      await timeout(1500);
      if (cancelled) return;
      const again = await checkDomBait();
      if (!cancelled && (result || again)) {
        setDetected(true);
        setChecked(true);
      }
    };

    // Schedule once mounted
    detect();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="relative w-full min-h-screen">
      {/* Site content */}
      <div aria-hidden={detected ? "true" : "false"} style={{ display: detected ? "none" : undefined }}>
        {children}
      </div>

      {/* Fullscreen overlay when detected */}
      {detected && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/90 text-white p-6">
          <div className="max-w-lg w-full text-center">
            <h2 className="text-3xl font-bold mb-4">{message.title}</h2>
            <div className="text-sm sm:text-base text-gray-200 space-y-3 leading-relaxed">
              {message.lines.map((l, i) => (
                <p key={i}>{l}</p>
              ))}
            </div>
            <div className="mt-6 flex items-center justify-center gap-3">
              <button
                onClick={() => window.location.reload()}
                className="px-5 py-2 rounded bg-white text-black font-medium hover:bg-gray-200 transition"
              >
                Refresh Page
              </button>
            </div>
            {!checked && (
              <div className="mt-4 text-xs text-white/60">Checking for blockers…</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
