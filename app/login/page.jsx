"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
} from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { ADMIN_EMAILS } from "@/lib/config";

const BG_IMAGES = [
  "https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?w=1600&q=60",
  "https://images.unsplash.com/photo-1554080351-a76ca804d5f0?w=1600&q=60",
  "https://images.unsplash.com/photo-1649972904349-6e44c42644a7?w=1600&q=60",
];

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [pwResetSent, setPwResetSent] = useState(false);
  const [slide, setSlide] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [infoMsg, setInfoMsg] = useState("");
  const authProcessing = useRef(false);
  const mounted = useRef(false);
  const navigated = useRef(false);
  // Simplified flow: we now prefer popup here; dedicated redirect page at /auth/google handles redirect-only flow.

  // Carousel
  useEffect(() => {
    const id = setInterval(() => {
      setSlide((i) => (i + 1) % BG_IMAGES.length);
    }, 6000);
    return () => clearInterval(id);
  }, []);

  const urlParams = () => (typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null);

  // Location (optional, non-blocking)
  const fetchLocation = async () => {
    try {
      const r = await fetch("https://ipapi.co/json/");
      if (!r.ok) return "Unknown";
      const j = await r.json();
      return j.city ? `${j.city}, ${j.country_name}` : "Unknown";
    } catch {
      return "Unknown";
    }
  };

  const upsertUser = async (user) => {
    const ref = doc(db, "users", user.uid);
    const snap = await getDoc(ref);
    const location = await fetchLocation();
    const base = {
      email: user.email || "",
      name: user.displayName || "",
      photoURL: user.photoURL || "",
      provider: user.providerData?.[0]?.providerId || "google",
      updatedAt: serverTimestamp(),
      lastLoginAt: serverTimestamp(),
      isOnline: true,
      location,
    };
    if (!snap.exists()) {
      await setDoc(ref, { ...base, createdAt: serverTimestamp() });
    } else {
      await updateDoc(ref, base);
    }
  };

  const routeAfter = (user) => {
    if (navigated.current) return;
    navigated.current = true;
    const target = ADMIN_EMAILS.includes(user.email || "") ? "/admin" : "/user";
    router.push(target);
  };

  const processUser = async (user) => {
    if (!user) return;
    if (authProcessing.current) {
      console.log("[AUTH] Skipping processUser - already processing");
      return;
    }
    authProcessing.current = true;
    console.log("[AUTH] Processing user:", user.email);
    try {
      await upsertUser(user);
      if (!mounted.current) return;
      routeAfter(user);
    } catch (e) {
      console.error("[AUTH] Post-login error", e);
      if (mounted.current) {
        setErrorMsg("Post login failed. Retry.");
        setIsLoading(false);
        authProcessing.current = false;
      }
    }
  };

  const mapError = (code, message) => {
    switch (code) {
      case "auth/popup-blocked":
        return "Popup blocked. Allow popups.";
      case "auth/popup-closed-by-user":
        return "Sign-in cancelled.";
      case "auth/network-request-failed":
        return "Network issue. Retry.";
      case "auth/unauthorized-domain":
        return "Domain not authorized in Firebase.";
      case "auth/operation-not-allowed":
        return "Google sign-in disabled in Firebase.";
      case "auth/cancelled-popup-request":
        return "Popup request cancelled.";
      case "auth/operation-not-supported-in-this-environment":
        return "Popup not supported here; using redirect.";
      case "auth/invalid-email":
        return "Invalid email.";
      case "auth/invalid-credential":
      case "auth/wrong-password":
        return "Incorrect email or password.";
      case "auth/user-not-found":
        return "No account with that email.";
      case "auth/too-many-requests":
        return "Too many attempts. Try later.";
      default:
        return message || "Authentication failed.";
    }
  };

  const initPersistence = async () => {
    try {
      // iOS sometimes rejects indexedDB => fallback to session
      await setPersistence(auth, browserLocalPersistence).catch(async () => {
        await setPersistence(auth, browserSessionPersistence);
      });
      console.log("[AUTH] Persistence set.");
    } catch (e) {
      console.warn("[AUTH] Persistence failed:", e);
    }
  };

  const handleLogin = async () => {
    if (isLoading || authProcessing.current) return;
    setErrorMsg("");
    setIsLoading(true);
    await initPersistence();
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });

    try {
      const debug = typeof window !== 'undefined' && window.location.search.includes('debugAuth=1');
      console.log("[AUTH] Trying popup flow.");
      const res = await signInWithPopup(auth, provider);
      await processUser(res.user);
    } catch (err) {
      console.warn("[AUTH] Popup flow error:", err.code, err.message);
      // Fallback: send user to dedicated redirect page
      if (
        [
          "auth/operation-not-supported-in-this-environment",
          "auth/popup-blocked",
          "auth/cancelled-popup-request",
          "auth/unauthorized-domain",
          "auth/network-request-failed",
        ].includes(err.code)
      ) {
        console.log('[AUTH] Redirecting user to /auth/google for redirect flow.');
        router.push('/auth/google');
        return;
      } else {
        if (mounted.current) {
          const debug = urlParams()?.get('debugAuth') === '1';
          setErrorMsg(mapError(err.code, err.message) + (debug ? ` [${err.code}]` : ""));
          setIsLoading(false);
          authProcessing.current = false;
        }
      }
    }
  };

  const handleEmailPasswordLogin = async (e) => {
    e.preventDefault();
    if (isLoading || authProcessing.current) return;
    setErrorMsg("");
    setPwResetSent(false);
    if (!email || !password) {
      setErrorMsg("Email & password required.");
      return;
    }
    setIsLoading(true);
    try {
      await initPersistence();
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
      await processUser(cred.user);
    } catch (e) {
      if (mounted.current) {
        setErrorMsg(mapError(e.code, e.message));
        setIsLoading(false);
        authProcessing.current = false;
      }
    }
  };

  const handlePasswordReset = async () => {
    if (!email) {
      setErrorMsg("Enter email to reset password.");
      return;
    }
    try {
      setErrorMsg("");
      await sendPasswordResetEmail(auth, email.trim());
      setPwResetSent(true);
    } catch (e) {
      setErrorMsg(mapError(e.code, e.message));
    }
  };

  // Subscribe to auth state (simplified - redirect handled on /auth/google page now)
  useEffect(() => {
    mounted.current = true;
    authProcessing.current = false;
    navigated.current = false;
    let unsub = onAuthStateChanged(auth, (user) => {
        console.log("[AUTH] onAuthStateChanged:", user?.email || "null");
        if (user) processUser(user);
      });
    (async () => { await initPersistence(); setIsLoading(false); })();

    return () => {
      mounted.current = false;
      unsub && unsub();
    };
  }, []);

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        {BG_IMAGES.map((src, i) => (
          <div
            key={src}
            className={`absolute inset-0 transition-opacity duration-[1200ms] ${
              i === slide ? "opacity-100" : "opacity-0"
            }`}
          >
            <img
              src={src}
              alt=""
              className="w-full h-full object-cover"
              loading={i === 0 ? "eager" : "lazy"}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-black/70" />
          </div>
        ))}
      </div>

      {/* Dots */}
      <div className="absolute bottom-4 z-20 flex gap-2">
        {BG_IMAGES.map((_, i) => (
          <button
            key={i}
            aria-label={`Slide ${i + 1}`}
            onClick={() => setSlide(i)}
            className={`h-3 w-3 rounded-full transition ${
              i === slide ? "bg-white scale-125" : "bg-white/60 hover:bg-white/80"
            }`}
          />
        ))}
      </div>

      {/* Card */}
      <div className="relative z-10 w-full max-w-md px-5">
        <div className="backdrop-blur-md bg-white/90 border border-white/15 rounded-2xl p-8 shadow-xl animate-fadeIn">
          <h1 className="text-3xl font-bold text-center mb-2 text-gray-800">
            BrainFuel
          </h1>
            <p className="text-center text-gray-600 mb-6">
              Sign in to access your dashboard
            </p>

          {errorMsg && (
            <div className="mb-4 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
              {errorMsg}{" "}
              <button
                onClick={() => setErrorMsg("")}
                className="ml-2 text-xs underline"
              >
                dismiss
              </button>
            </div>
          )}
          {infoMsg && !errorMsg && (
            <div className="mb-4 rounded-md border border-blue-300 bg-blue-50 px-3 py-2 text-xs text-blue-700">
              {infoMsg}{" "}
              <button
                onClick={() => setInfoMsg("")}
                className="ml-2 text-[10px] underline"
              >
                dismiss
              </button>
            </div>
          )}
          {/* <div className="mt-3 text-center text-xs text-gray-600">
            Having trouble with Google popup on your device? <a href="/auth/google" className="text-purple-600 underline hover:text-purple-700">Use redirect sign-in</a>
          </div> */}

          {/* Email / Password */}
          {/* <form onSubmit={handleEmailPasswordLogin} className="space-y-4 mb-6">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border border-gray-300 bg-white/70 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="you@example.com"
                disabled={isLoading}
              />
            </div>
            <div>
              <label className="flex items-center justify-between text-xs font-medium text-gray-700 mb-1">
                <span>Password</span>
                <button type="button" onClick={() => setShowPassword(p=>!p)} className="text-[10px] uppercase tracking-wide text-blue-600 hover:underline">
                  {showPassword ? "Hide" : "Show"}
                </button>
              </label>
              <input
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-md border border-gray-300 bg-white/70 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="••••••••"
                disabled={isLoading}
              />
            </div>
            <div className="flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={handlePasswordReset}
                className="text-blue-600 hover:underline"
                disabled={isLoading}
              >
                Forgot password?
              </button>
              {pwResetSent && (
                <span className="text-green-600">Reset email sent</span>
              )}
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full flex items-center justify-center gap-2 rounded-md bg-blue-600 py-2.5 text-sm font-medium text-white shadow transition ${isLoading ? "opacity-70" : "hover:bg-blue-700"}`}
            >
              {isLoading ? "Signing in..." : "Sign in"}
            </button>
          </form> */}

          {/* <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-gray-300" /></div>
            <div className="relative flex justify-center"><span className="bg-white/90 px-3 text-[10px] font-medium text-gray-500 tracking-wider">OR</span></div>
          </div> */}

          {/* Google Sign In */}
          <button
            onClick={handleLogin}
            disabled={isLoading}
            className={`w-full flex items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 py-3 font-medium text-white shadow-lg transition ${isLoading ? "opacity-80 cursor-not-allowed" : "hover:scale-[1.02]"}`}
          >
            {isLoading ? (
              <>
                <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="white" strokeWidth="4" />
                  <path className="opacity-75" fill="white" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
                <span>Signing in...</span>
              </>
            ) : (
              <>
                <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="h-5 w-5" loading="lazy" />
                <span>Continue with Google</span>
              </>
            )}
          </button>

          {/* <p className="mt-4 text-center text-sm text-gray-600">
            No account? <a href="/signup" className="text-blue-600 hover:underline">Create one</a>
          </p> */}

          <p className="mt-6 text-center text-xs text-gray-500">
            By signing in you agree to our Terms & Privacy Policy
          </p>
        </div>
      </div>

      <style jsx global>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(16px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.7s ease-out;
        }
        @media (max-width: 640px) {
          html,
          body,
          .min-h-screen {
            min-height: 100dvh;
          }
        }
      `}</style>
    </div>
  );
}
