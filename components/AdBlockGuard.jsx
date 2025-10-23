"use client";
import { useEffect, useMemo, useState } from "react";

export default function AdBlockGuard({ children }) {
  const [detected, setDetected] = useState(false);
  const [checked, setChecked] = useState(false);
  const [blockerName, setBlockerName] = useState("");

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
        s.onload = () => done(false);
        s.onerror = () => done(true);
        document.head.appendChild(s);
        setTimeout(() => done(false), ms);
      });
    };

    const fetchProbe = async (url, ms = 2500) => {
      try {
        const controller = new AbortController();
        const to = setTimeout(() => controller.abort(), ms);
        const resp = await fetch(url + (url.includes("?") ? "&" : "?") + "_ab=" + Date.now(), { 
          signal: controller.signal, 
          credentials: "omit" 
        });
        clearTimeout(to);
        return false;
      } catch {
        return true;
      }
    };

    const imageProbe = (src, ms = 3000) => new Promise((resolve) => {
      let settled = false;
      const done = (val) => { if (!settled) { settled = true; resolve(val); } };
      const img = new Image();
      img.onload = () => done(false);
      img.onerror = () => done(true);
      img.src = src + (src.includes("?") ? "&" : "?") + "_ab=" + Date.now();
      setTimeout(() => done(false), ms);
    });

    const fetchNoCorsProbe = async (url, ms = 3000) => {
      try {
        const controller = new AbortController();
        const to = setTimeout(() => controller.abort(), ms);
        await fetch(url + (url.includes("?") ? "&" : "?") + "_ab=" + Date.now(), {
          mode: "no-cors",
          cache: "no-store",
          signal: controller.signal,
        });
        clearTimeout(to);
        return false;
      } catch {
        return true;
      }
    };

    const detect = async () => {
      if (cancelled) return false;

      try {
        const results = await Promise.all([
          checkDomBait(), // Cosmetic filtering
          loadScriptProbe("/ads.js"), // Local ad scripts
          loadScriptProbe("/advert.js"),
          loadScriptProbe("https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"), // Google Ads
          loadScriptProbe("https://securepubads.g.doubleclick.net/tag/js/gpt.js"), // GPT
          fetchProbe("/api/ads-probe"), // API endpoints
          imageProbe("https://securepubads.g.doubleclick.net/pcs/view"), // Tracking pixel
          fetchNoCorsProbe("https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"), // DNR blocking
        ]);

        // More targeted detection - focus on key adblock indicators
        const [
          cosmeticFiltering,
          localScriptBlocked,
          localScript2Blocked,
          googleAdsBlocked, 
          gptBlocked,
          apiBlocked,
          imageBlocked,
          dnrBlocked
        ] = results;

        // STRONG INDICATORS (any of these alone is strong evidence)
        const strongIndicators = [
          cosmeticFiltering,    // Element hiding
          googleAdsBlocked,     // Google Ads blocked
          gptBlocked,           // GPT blocked
          dnrBlocked           // DNR blocking
        ];

        // WEAK INDICATORS (need multiple)
        const weakIndicators = [
          localScriptBlocked,
          localScript2Blocked, 
          apiBlocked,
          imageBlocked
        ];

        const strongPositiveCount = strongIndicators.filter(Boolean).length;
        const weakPositiveCount = weakIndicators.filter(Boolean).length;

        // DETECTION LOGIC:
        // - 1+ strong indicators = likely adblock
        // - 3+ weak indicators = likely adblock  
        // - 2 strong + 1 weak = definite adblock
        const shouldBlock = 
          strongPositiveCount >= 1 || 
          weakPositiveCount >= 3 ||
          (strongPositiveCount >= 1 && weakPositiveCount >= 1);

        console.log('Adblock detection results:', {
          strongIndicators,
          weakIndicators,
          strongPositiveCount,
          weakPositiveCount,
          shouldBlock
        });

        // Identify blocker type
        let detectedBlocker = "";
        if (shouldBlock) {
          if (cosmeticFiltering) {
            detectedBlocker = "Cosmetic Filtering (uBlock Origin, AdGuard)";
          } else if (googleAdsBlocked || gptBlocked) {
            detectedBlocker = "Google Ads Blocking (AdBlocker Ultimate, AdBlock)";
          } else if (dnrBlocked) {
            detectedBlocker = "DNR Blocking (Brave Shields, uBlock Origin Lite)";
          } else if (localScriptBlocked || apiBlocked) {
            detectedBlocker = "Pattern-based Blocking (AdBlock Plus)";
          } else {
            detectedBlocker = "Unknown AdBlocker";
          }
        }

        if (!cancelled) {
          setDetected(shouldBlock);
          setBlockerName(detectedBlocker);
          setChecked(true);
        }

        return shouldBlock;
      } catch (error) {
        console.error('Adblock detection error:', error);
        if (!cancelled) {
          setDetected(false);
          setChecked(true);
        }
        return false;
      }
    };

    // Initial detection
    const initialDetection = async () => {
      await timeout(500); // Short delay for page load
      if (cancelled) return;
      
      const wasDetected = await detect();
      
      // If detected, set up periodic checking
      if (wasDetected && !cancelled) {
        const intervalId = setInterval(() => {
          if (cancelled) {
            clearInterval(intervalId);
            return;
          }
          detect();
        }, 3000);
      }
    };

    initialDetection();

    return () => {
      cancelled = true;
    };
  }, []);

  // Show loading state while checking
  if (!checked) {
    return (
      <div className="relative w-full min-h-screen">
        {children}
      </div>
    );
  }

  return (
    <div className="relative w-full min-h-screen">
      {/* Site content - only hide if detected */}
      <div style={{ display: detected ? "none" : "block" }}>
        {children}
      </div>

      {/* Overlay only when detected */}
      {detected && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/90 text-white p-6">
          <div className="max-w-lg w-full text-center">
            <h2 className="text-3xl font-bold mb-4">{message.title}</h2>
            <div className="text-sm sm:text-base text-gray-200 space-y-3 leading-relaxed">
              {message.lines.map((l, i) => (
                <p key={i}>{l}</p>
              ))}
              {blockerName && (
                <p className="mt-4 text-base font-semibold text-red-400">Detected: {blockerName}</p>
              )}
            </div>
            <div className="mt-6 flex items-center justify-center gap-3">
              <button
                onClick={() => window.location.reload()}
                className="px-5 py-2 rounded bg-white text-black font-medium hover:bg-gray-200 transition"
              >
                Refresh Page
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}








// "use client";
// import { useEffect, useMemo, useState } from "react";

// export default function AdBlockGuard({ children }) {
//   const [detected, setDetected] = useState(false);
//   const [checked, setChecked] = useState(false);
//   const [blockerName, setBlockerName] = useState("");

//   const message = useMemo(() => ({
//     title: "AdBlock Detected 🚫",
//     lines: [
//       "We noticed you're using an AdBlocker. Ads help us keep this website free and support our creators.",
//       "Please disable your AdBlocker and refresh the page to continue enjoying our content. 💙",
//       "Thank you for supporting us!",
//     ],
//   }), []);

//   useEffect(() => {
//     let cancelled = false;

//     const timeout = (ms) => new Promise((res) => setTimeout(res, ms));

//     const checkDomBait = async () => {
//       try {
//         return await new Promise((resolve) => {
//           const wrap = document.createElement("div");
//           const bait = document.createElement("div");
//           const ins = document.createElement("ins");
//           bait.className = "ads ad ad-banner advert advertisement sponsor pub_300x250 ad-container ad-slot adsbox";
//           bait.id = "ad-banner";
//           ins.className = "adsbygoogle ad adsbox sponsor";
//           Object.assign(wrap.style, { position: "absolute", left: "-9999px", top: "-9999px" });
//           Object.assign(bait.style, { width: "300px", height: "250px" });
//           Object.assign(ins.style, { width: "1px", height: "1px", display: "block" });
//           wrap.appendChild(bait);
//           wrap.appendChild(ins);
//           document.body.appendChild(wrap);

//           let removed = false;
//           const mo = new MutationObserver(() => {
//             if (!wrap.isConnected || !bait.isConnected || !ins.isConnected) {
//               removed = true;
//             }
//           });
//           mo.observe(wrap, { childList: true, subtree: true, attributes: true, attributeFilter: ["style", "class"] });

//           requestAnimationFrame(() => {
//             const cs1 = window.getComputedStyle(bait);
//             const cs2 = window.getComputedStyle(ins);
//             const hidden =
//               removed ||
//               cs1.display === "none" ||
//               cs1.visibility === "hidden" ||
//               bait.offsetHeight === 0 ||
//               cs2.display === "none" ||
//               cs2.visibility === "hidden" ||
//               ins.offsetHeight === 0;
//             wrap.remove();
//             mo.disconnect();
//             resolve(!!hidden);
//           });
//         });
//       } catch {
//         return false;
//       }
//     };

//     const loadScriptProbe = (src, ms = 3000) => {
//       return new Promise((resolve) => {
//         const s = document.createElement("script");
//         let settled = false;
//         const done = (val) => { if (!settled) { settled = true; resolve(val); } s.remove(); };
//         s.async = true;
//         s.src = src + (src.includes("?") ? "&" : "?") + "_ab=" + Date.now();
//         s.onload = () => done(false);
//         s.onerror = () => done(true);
//         document.head.appendChild(s);
//         setTimeout(() => done(false), ms);
//       });
//     };

//     const fetchProbe = async (url, ms = 2500) => {
//       try {
//         const controller = new AbortController();
//         const to = setTimeout(() => controller.abort(), ms);
//         const resp = await fetch(url + (url.includes("?") ? "&" : "?") + "_ab=" + Date.now(), { 
//           signal: controller.signal, 
//           credentials: "omit" 
//         });
//         clearTimeout(to);
//         return false;
//       } catch {
//         return true;
//       }
//     };

//     const imageProbe = (src, ms = 3000) => new Promise((resolve) => {
//       let settled = false;
//       const done = (val) => { if (!settled) { settled = true; resolve(val); } };
//       const img = new Image();
//       img.onload = () => done(false);
//       img.onerror = () => done(true);
//       img.src = src + (src.includes("?") ? "&" : "?") + "_ab=" + Date.now();
//       setTimeout(() => done(false), ms);
//     });

//     const fetchNoCorsProbe = async (url, ms = 3000) => {
//       try {
//         const controller = new AbortController();
//         const to = setTimeout(() => controller.abort(), ms);
//         await fetch(url + (url.includes("?") ? "&" : "?") + "_ab=" + Date.now(), {
//           mode: "no-cors",
//           cache: "no-store",
//           signal: controller.signal,
//         });
//         clearTimeout(to);
//         return false;
//       } catch {
//         return true;
//       }
//     };

//     const detect = async () => {
//       if (cancelled) return false;

//       try {
//         const results = await Promise.all([
//           checkDomBait(),
//           loadScriptProbe("/ads.js"),
//           loadScriptProbe("/advert.js"),
//           loadScriptProbe("/adsbygoogle.js"),
//           loadScriptProbe("/adframe.js"),
//           loadScriptProbe("https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"),
//           loadScriptProbe("https://securepubads.g.doubleclick.net/tag/js/gpt.js"),
//           loadScriptProbe("https://static.doubleclick.net/instream/ad_status.js"),
//           fetchProbe("/api/ads-probe"),
//           fetchProbe("/api/adserver"),
//           fetchProbe("/api/advert"),
//           imageProbe("https://securepubads.g.doubleclick.net/pcs/view"),
//           fetchNoCorsProbe("https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"),
//           fetchNoCorsProbe("https://securepubads.g.doubleclick.net/tag/js/gpt.js"),
//           fetchNoCorsProbe("https://static.doubleclick.net/instream/ad_status.js"),
//         ]);

//         // Count positive detections
//         const positiveCount = results.filter(Boolean).length;
//         const totalProbes = results.length;

//         // Only trigger if majority of probes are positive (more conservative)
//         // Require at least 60% positive detection rate
//         const shouldBlock = positiveCount >= Math.floor(totalProbes * 0.6);

//         // Identify blocker type only if blocking is triggered
//         let detectedBlocker = "";
//         if (shouldBlock) {
//           const categories = {
//             cosmetic: results[0],
//             local: results[1] || results[2] || results[3] || results[4],
//             remote: results[5] || results[6] || results[7],
//             api: results[8] || results[9] || results[10],
//             image: results[11],
//             dnr: results[12] || results[13] || results[14],
//           };

//           if (categories.cosmetic) detectedBlocker = "Cosmetic/Element Hiding (AdGuard, uBlock Origin, Brave)";
//           else if (categories.local) detectedBlocker = "Filename-based Blocking (AdGuard, uBlock Origin)";
//           else if (categories.remote) detectedBlocker = "Network Blocking (uBlock Origin, AdGuard, Brave Shields)";
//           else if (categories.api) detectedBlocker = "API Path Blocking (AdGuard, uBlock Origin)";
//           else if (categories.image) detectedBlocker = "Image/Tracker Blocking (uBlock Origin, AdGuard)";
//           else if (categories.dnr) detectedBlocker = "DNR/Network Request Blocking (uBlock Origin Lite, Brave Shields)";
//           else detectedBlocker = "Unknown AdBlocker";
//         }

//         if (!cancelled) {
//           setDetected(shouldBlock);
//           setBlockerName(detectedBlocker);
//           // Only mark as checked when we have a definitive result
//           if (positiveCount > 0 || shouldBlock) {
//             setChecked(true);
//           }
//         }

//         return shouldBlock;
//       } catch (error) {
//         console.error('Adblock detection error:', error);
//         if (!cancelled) {
//           setDetected(false);
//           setChecked(true);
//         }
//         return false;
//       }
//     };

//     // Initial detection with delay to ensure page is loaded
//     const initialDetection = async () => {
//       await timeout(1000); // Wait 1 second before first check
//       if (cancelled) return;
      
//       await detect();
      
//       // Only set up continuous checking if adblock was detected
//       const wasDetected = await detect();
//       if (wasDetected && !cancelled) {
//         // If detected, check every 5 seconds instead of 2
//         const intervalId = setInterval(() => {
//           if (cancelled) {
//             clearInterval(intervalId);
//             return;
//           }
//           detect();
//         }, 5000);
//       }
//     };

//     initialDetection();

//     return () => {
//       cancelled = true;
//     };
//   }, []);

//   // Don't show overlay until we've actually checked
//   if (!checked) {
//     return (
//       <div className="relative w-full min-h-screen">
//         {children}
//       </div>
//     );
//   }

//   return (
//     <div className="relative w-full min-h-screen">
//       {/* Site content - only hide if definitely detected */}
//       <div style={{ display: detected ? "none" : "block" }}>
//         {children}
//       </div>

//       {/* Only show overlay when definitely detected */}
//       {detected && (
//         <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/90 text-white p-6">
//           <div className="max-w-lg w-full text-center">
//             <h2 className="text-3xl font-bold mb-4">{message.title}</h2>
//             <div className="text-sm sm:text-base text-gray-200 space-y-3 leading-relaxed">
//               {message.lines.map((l, i) => (
//                 <p key={i}>{l}</p>
//               ))}
//               {blockerName && (
//                 <p className="mt-4 text-base font-semibold text-red-400">Detected: {blockerName}</p>
//               )}
//             </div>
//             <div className="mt-6 flex items-center justify-center gap-3">
//               <button
//                 onClick={() => window.location.reload()}
//                 className="px-5 py-2 rounded bg-white text-black font-medium hover:bg-gray-200 transition"
//               >
//                 Refresh Page
//               </button>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }



// ==============



// "use client";
// import { useEffect, useMemo, useState } from "react";

// /*
//   AdBlockGuard
//   - Detects ad blockers using multiple heuristics (DOM bait, local script bait, remote ads script, API probe)
//   - If detected, hides all children and shows a fullscreen overlay with a message

//   Usage: Wrap your app content (e.g., in app/layout.js) with <AdBlockGuard> ... </AdBlockGuard>
// */

// export default function AdBlockGuard({ children }) {
//   const [detected, setDetected] = useState(false);
//   const [checked, setChecked] = useState(false);
//   const [blockerName, setBlockerName] = useState("");

//   const message = useMemo(() => ({
//     title: "AdBlock Detected 🚫",
//     lines: [
//       "We noticed you're using an AdBlocker. Ads help us keep this website free and support our creators.",
//       "Please disable your AdBlocker and refresh the page to continue enjoying our content. 💙",
//       "Thank you for supporting us!",
//     ],
//   }), []);

//   useEffect(() => {
//     let cancelled = false;

//     const timeout = (ms) => new Promise((res) => setTimeout(res, ms));

//     const checkDomBait = async () => {
//       try {
//         return await new Promise((resolve) => {
//           const wrap = document.createElement("div");
//           const bait = document.createElement("div");
//           const ins = document.createElement("ins");
//           // Commonly blocked classes/ids
//           bait.className = "ads ad ad-banner advert advertisement sponsor pub_300x250 ad-container ad-slot adsbox";
//           bait.id = "ad-banner";
//           ins.className = "adsbygoogle ad adsbox sponsor";
//           Object.assign(wrap.style, { position: "absolute", left: "-9999px", top: "-9999px" });
//           Object.assign(bait.style, { width: "300px", height: "250px" });
//           Object.assign(ins.style, { width: "1px", height: "1px", display: "block" });
//           wrap.appendChild(bait);
//           wrap.appendChild(ins);
//           document.body.appendChild(wrap);

//           let removed = false;
//           const mo = new MutationObserver(() => {
//             if (!wrap.isConnected || !bait.isConnected || !ins.isConnected) {
//               removed = true;
//             }
//           });
//           mo.observe(wrap, { childList: true, subtree: true, attributes: true, attributeFilter: ["style", "class"] });

//           requestAnimationFrame(() => {
//             const cs1 = window.getComputedStyle(bait);
//             const cs2 = window.getComputedStyle(ins);
//             const hidden =
//               removed ||
//               cs1.display === "none" ||
//               cs1.visibility === "hidden" ||
//               bait.offsetHeight === 0 ||
//               cs2.display === "none" ||
//               cs2.visibility === "hidden" ||
//               ins.offsetHeight === 0;
//             wrap.remove();
//             mo.disconnect();
//             resolve(!!hidden);
//           });
//         });
//       } catch {
//         return false;
//       }
//     };

//     const loadScriptProbe = (src, ms = 3000) => {
//       return new Promise((resolve) => {
//         const s = document.createElement("script");
//         let settled = false;
//         const done = (val) => { if (!settled) { settled = true; resolve(val); } s.remove(); };
//         s.async = true;
//         s.src = src + (src.includes("?") ? "&" : "?") + "_ab=" + Date.now();
//         s.onload = () => done(false); // not blocked
//         s.onerror = () => done(true); // likely blocked
//         document.head.appendChild(s);
//         setTimeout(() => done(false), ms); // timeout -> inconclusive -> treat as not blocked to avoid false positives
//       });
//     };

//     const fetchProbe = async (url, ms = 2500) => {
//       try {
//         const controller = new AbortController();
//         const to = setTimeout(() => controller.abort(), ms);
//         const resp = await fetch(url + (url.includes("?") ? "&" : "?") + "_ab=" + Date.now(), { signal: controller.signal, credentials: "omit" });
//         clearTimeout(to);
//         // If request is blocked, many blockers surface a TypeError before here.
//         // Only treat as blocked when network fails; 2xx/3xx/4xx means not blocked at network level.
//         return false;
//       } catch {
//         // Network error or actively blocked
//         return true;
//       }
//     };

//     const imageProbe = (src, ms = 3000) => new Promise((resolve) => {
//       let settled = false;
//       const done = (val) => { if (!settled) { settled = true; resolve(val); } };
//       const img = new Image();
//       img.onload = () => done(false); // not blocked
//       img.onerror = () => done(true); // likely blocked
//       img.src = src + (src.includes("?") ? "&" : "?") + "_ab=" + Date.now();
//       setTimeout(() => done(false), ms);
//     });

//     const fetchNoCorsProbe = async (url, ms = 3000) => {
//       try {
//         const controller = new AbortController();
//         const to = setTimeout(() => controller.abort(), ms);
//         // no-cors yields opaque response on success; TypeError on network/DNR block
//         await fetch(url + (url.includes("?") ? "&" : "?") + "_ab=" + Date.now(), {
//           mode: "no-cors",
//           cache: "no-store",
//           signal: controller.signal,
//         });
//         clearTimeout(to);
//         return false; // not blocked (or at least not detectable)
//       } catch {
//         return true; // network/DNR blocked
//       }
//     };

//     // Note: Avoid iframe probes to ad domains; many set X-Frame-Options which causes false positives.

//     const detect = async () => {
//       // Run probes in parallel
//       const results = await Promise.all([
//         checkDomBait(), // Cosmetic/element hiding
//         loadScriptProbe("/ads.js"), // Local filename
//         loadScriptProbe("/advert.js"),
//         loadScriptProbe("/adsbygoogle.js"),
//         loadScriptProbe("/adframe.js"),
//         loadScriptProbe("https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"), // Remote network
//         loadScriptProbe("https://securepubads.g.doubleclick.net/tag/js/gpt.js"),
//         loadScriptProbe("https://static.doubleclick.net/instream/ad_status.js"),
//         fetchProbe("/api/ads-probe"), // API path
//         fetchProbe("/api/adserver"),
//         fetchProbe("/api/advert"),
//         imageProbe("https://securepubads.g.doubleclick.net/pcs/view"), // Image/tracker
//         fetchNoCorsProbe("https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"), // DNR/no-cors
//         fetchNoCorsProbe("https://securepubads.g.doubleclick.net/tag/js/gpt.js"),
//         fetchNoCorsProbe("https://static.doubleclick.net/instream/ad_status.js"),
//       ]);

//       // Group probes by category
//       const categories = {
//         cosmetic: results[0],
//         local: results[1] || results[2] || results[3] || results[4],
//         remote: results[5] || results[6] || results[7],
//         api: results[8] || results[9] || results[10],
//         image: results[11],
//         dnr: results[12] || results[13] || results[14],
//       };

//       // Count how many categories are positive
//       const positiveCategories = Object.values(categories).filter(Boolean).length;

//       // Identify which probe triggered detection
//       let detectedBlocker = "Unknown AdBlocker";
//       if (categories.cosmetic) detectedBlocker = "Cosmetic/Element Hiding (AdGuard, uBlock Origin, Brave)";
//       else if (categories.local) detectedBlocker = "Filename-based Blocking (AdGuard, uBlock Origin)";
//       else if (categories.remote) detectedBlocker = "Network Blocking (uBlock Origin, AdGuard, Brave Shields)";
//       else if (categories.api) detectedBlocker = "API Path Blocking (AdGuard, uBlock Origin)";
//       else if (categories.image) detectedBlocker = "Image/Tracker Blocking (uBlock Origin, AdGuard)";
//       else if (categories.dnr) detectedBlocker = "DNR/Network Request Blocking (uBlock Origin Lite, Brave Shields)";

//       // Require at least 4 independent categories to trigger overlay (even less strict)
//       let result = positiveCategories >= 4;

//       // If offline, still require at least 4 signals
//       if (!navigator.onLine) {
//         result = positiveCategories >= 4;
//       }

//       // (Removed old probe-specific detection logic; now handled by category-based logic above)

//       if (!cancelled) {
//   setDetected(!!result);
//   setChecked(true);
//   setBlockerName(result ? detectedBlocker : "");
//       }

//       // Recheck shortly after load in case extension initializes late
//       await timeout(1500);
//       if (cancelled) return;
//       // Recheck all categories, not just DOM bait
//       const resultsRecheck = await Promise.all([
//         checkDomBait(),
//         loadScriptProbe("/ads.js"),
//         loadScriptProbe("/advert.js"),
//         loadScriptProbe("/adsbygoogle.js"),
//         loadScriptProbe("/adframe.js"),
//         loadScriptProbe("https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"),
//         loadScriptProbe("https://securepubads.g.doubleclick.net/tag/js/gpt.js"),
//         loadScriptProbe("https://static.doubleclick.net/instream/ad_status.js"),
//         fetchProbe("/api/ads-probe"),
//         fetchProbe("/api/adserver"),
//         fetchProbe("/api/advert"),
//         imageProbe("https://securepubads.g.doubleclick.net/pcs/view"),
//         fetchNoCorsProbe("https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"),
//         fetchNoCorsProbe("https://securepubads.g.doubleclick.net/tag/js/gpt.js"),
//         fetchNoCorsProbe("https://static.doubleclick.net/instream/ad_status.js"),
//       ]);
//       const categoriesRecheck = {
//         cosmetic: resultsRecheck[0],
//         local: resultsRecheck[1] || resultsRecheck[2] || resultsRecheck[3] || resultsRecheck[4],
//         remote: resultsRecheck[5] || resultsRecheck[6] || resultsRecheck[7],
//         api: resultsRecheck[8] || resultsRecheck[9] || resultsRecheck[10],
//         image: resultsRecheck[11],
//         dnr: resultsRecheck[12] || resultsRecheck[13] || resultsRecheck[14],
//       };
//       const positiveCategoriesRecheck = Object.values(categoriesRecheck).filter(Boolean).length;
//       if (!cancelled && (result || positiveCategoriesRecheck >= 1)) {
//         setDetected(true);
//         setChecked(true);
//         setBlockerName(detectedBlocker);
//       } else if (!cancelled) {
//         setDetected(false);
//         setChecked(true);
//         setBlockerName("");
//       }
//     };

//     // Schedule once mounted
//     let intervalId = null;
//     const runDetect = async () => {
//       await detect();
//       // Always keep checking every 2s to update overlay dynamically
//       intervalId = setInterval(async () => {
//         await detect();
//       }, 2000);
//     };
//     runDetect();
//     return () => {
//       cancelled = true;
//       if (intervalId) clearInterval(intervalId);
//     };
//   }, []);

//   return (
//     <div className="relative w-full min-h-screen">
//       {/* Site content */}
//       <div aria-hidden={detected ? "true" : "false"} style={{ display: detected ? "none" : undefined }}>
//         {children}
//       </div>

//       {/* Fullscreen overlay when detected */}
//       {detected && (
//         <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/90 text-white p-6">
//           <div className="max-w-lg w-full text-center">
//             <h2 className="text-3xl font-bold mb-4">{message.title}</h2>
//             <div className="text-sm sm:text-base text-gray-200 space-y-3 leading-relaxed">
//               {message.lines.map((l, i) => (
//                 <p key={i}>{l}</p>
//               ))}
//               {blockerName && (
//                 <p className="mt-4 text-base font-semibold text-red-400">Detected: {blockerName}</p>
//               )}
//             </div>
//             <div className="mt-6 flex items-center justify-center gap-3">
//               <button
//                 onClick={() => window.location.reload()}
//                 className="px-5 py-2 rounded bg-white text-black font-medium hover:bg-gray-200 transition"
//               >
//                 Refresh Page
//               </button>
//             </div>
//             {!checked && (
//               <div className="mt-4 text-xs text-white/60">Checking for blockers…</div>
//             )}
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }
