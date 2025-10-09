"use client";
import { useEffect, useRef } from "react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, setDoc, updateDoc, serverTimestamp, deleteDoc } from "firebase/firestore";
import { usePathname } from "next/navigation";

async function fetchIpInfo() {
  try {
    const res = await fetch("https://ipapi.co/json/", { cache: "no-store" });
    if (!res.ok) return null;
    const data = await res.json();
    return {
      ip: data.ip,
      city: data.city,
      region: data.region,
      country: data.country_name || data.country,
      countryCode: data.country || data.country_code,
      timezone: data.timezone,
      org: data.org,
      latitude: data.latitude,
      longitude: data.longitude,
    };
  } catch (_) {
    return null;
  }
}

export default function useUserPresence() {
  const pathname = usePathname();
  const heartbeatRef = useRef(null);
  const userRef = useRef(null);
  const onlineRef = useRef(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }
      userRef.current = null;
      onlineRef.current = null;

      if (!u) return;

      const uid = u.uid;
      const usersDocRef = doc(db, "users", uid);
      const onlineDocRef = doc(db, "onlineUsers", uid);
      userRef.current = usersDocRef;
      onlineRef.current = onlineDocRef;

      const profile = {
        email: u.email || null,
        name: u.displayName || null,
        photoURL: u.photoURL || null,
        provider: u.providerData?.[0]?.providerId || "unknown",
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      };

      const envInfo = {
        userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
        timezone:
          typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "",
      };

      try {
        await setDoc(usersDocRef, { ...profile, ...envInfo }, { merge: true });
      } catch {}

      fetchIpInfo().then(async (ip) => {
        if (!ip) return;
        try {
          await setDoc(usersDocRef, { ipLocation: ip, updatedAt: serverTimestamp() }, { merge: true });
        } catch {}
      });

      if (typeof navigator !== "undefined" && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            const { latitude, longitude, accuracy } = pos.coords || {};
            try {
              await setDoc(usersDocRef, { geo: { latitude, longitude, accuracy } }, { merge: true });
            } catch {}
          },
          () => {},
          { maximumAge: 600000, timeout: 8000, enableHighAccuracy: false }
        );
      }

      const writePresence = async () => {
        const data = {
          uid,
          email: u.email || null,
          lastActive: serverTimestamp(),
          page: typeof window !== "undefined" ? window.location.pathname : pathname,
          timezone: envInfo.timezone,
          userAgent: envInfo.userAgent,
        };
        try {
          await setDoc(onlineDocRef, data, { merge: true });
          await setDoc(usersDocRef, { isOnline: true, lastActive: serverTimestamp(), lastPageVisited: data.page }, { merge: true });
        } catch {}
      };

      await writePresence();

      heartbeatRef.current = setInterval(() => {
        writePresence();
      }, 30000);

      const beforeUnload = async () => {
        try {
          await updateDoc(usersDocRef, { isOnline: false, lastActive: new Date() });
          await deleteDoc(onlineDocRef);
        } catch {}
      };
      window.addEventListener("beforeunload", beforeUnload);

      initializedRef.current = true;

      return () => {
        window.removeEventListener("beforeunload", beforeUnload);
      };
    });

    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      unsub && unsub();
    };
  }, [pathname]);

  useEffect(() => {
    const usersDocRef = userRef.current;
    const onlineDocRef = onlineRef.current;
    if (!initializedRef.current || !usersDocRef || !onlineDocRef) return;
    (async () => {
      try {
        await setDoc(onlineDocRef, { page: pathname, lastActive: serverTimestamp() }, { merge: true });
        await setDoc(usersDocRef, { lastPageVisited: pathname, lastActive: serverTimestamp() }, { merge: true });
      } catch {}
    })();
  }, [pathname]);
}
