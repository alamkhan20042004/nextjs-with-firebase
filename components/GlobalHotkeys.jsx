"use client";
import { useEffect } from "react";

export default function GlobalHotkeys() {
  useEffect(() => {
    const onKey = (e) => {
      // Ignore when typing in inputs/textareas or when modifiers pressed
      const tag = e.target?.tagName;
      if (["INPUT","TEXTAREA","SELECT"].includes(tag)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if ((e.key || "").toLowerCase() === 'f') {
        e.preventDefault();
        const preferred = document.querySelector('[data-prefer-fullscreen]');
        const el = preferred || document.querySelector('main') || document.documentElement;
        if (!document.fullscreenElement) {
          el?.requestFullscreen?.();
        } else {
          document.exitFullscreen?.();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  return null;
}
