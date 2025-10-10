"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { auth } from "@/lib/firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";

const BG_IMAGES = [
  "https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?w=1600&q=60",
  "https://images.unsplash.com/photo-1554080351-a76ca804d5f0?w=1600&q=60",
  "https://images.unsplash.com/photo-1649972904349-6e44c42644a7?w=1600&q=60",
];

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [slide, setSlide] = useState(0);

  // Carousel effect
  useEffect(() => {
    const id = setInterval(() => {
      setSlide((i) => (i + 1) % BG_IMAGES.length);
    }, 6000);
    return () => clearInterval(id);
  }, []);

  const handleSignup = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    
    if (!email || !password || !confirmPassword) {
      setErrorMsg("All fields are required");
      return;
    }
    
    if (password.length < 6) {
      setErrorMsg("Password must be at least 6 characters");
      return;
    }
    
    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match");
      return;
    }
    
    try {
      setBusy(true);
      await createUserWithEmailAndPassword(auth, email.trim(), password);
      // Firebase auto-login after signup ✅
      window.location.href = "/";
    } catch (err) {
      setErrorMsg(err.message || "Failed to create account");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center relative overflow-hidden">
      {/* Background Carousel */}
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

      {/* Carousel Dots */}
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

      {/* Signup Card */}
      <div className="relative z-10 w-full max-w-md px-5">
        <div className="backdrop-blur-md bg-white/90 border border-white/15 rounded-2xl p-8 shadow-xl animate-fadeIn">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              Join YouTube
            </h1>
            <p className="text-gray-600">
              Create your account to get started
            </p>
          </div>

          {errorMsg && (
            <div className="mb-4 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
              {errorMsg}
              <button
                onClick={() => setErrorMsg("")}
                className="ml-2 text-xs underline"
              >
                dismiss
              </button>
            </div>
          )}

          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border border-gray-300 bg-white/70 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="you@example.com"
                disabled={busy}
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-gray-700">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-[10px] uppercase tracking-wide text-blue-600 hover:underline"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-md border border-gray-300 bg-white/70 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="••••••••"
                disabled={busy}
                required
                minLength={6}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-gray-700">
                  Confirm Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="text-[10px] uppercase tracking-wide text-blue-600 hover:underline"
                >
                  {showConfirmPassword ? "Hide" : "Show"}
                </button>
              </div>
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-md border border-gray-300 bg-white/70 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="••••••••"
                disabled={busy}
                required
                minLength={6}
              />
            </div>

            <button
              type="submit"
              disabled={busy}
              className={`w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-600 to-red-500 py-3 font-medium text-white shadow-lg transition ${
                busy ? "opacity-80 cursor-not-allowed" : "hover:scale-[1.02]"
              }`}
            >
              {busy ? (
                <>
                  <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="white"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="white"
                      d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                    />
                  </svg>
                  <span>Creating Account...</span>
                </>
              ) : (
                "Create Account"
              )}
            </button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white/90 px-3 text-[10px] font-medium text-gray-500 tracking-wider">
                OR
              </span>
            </div>
          </div>

          <p className="text-center text-sm text-gray-600">
            Already have an account?{" "}
            <Link href="/login" className="text-blue-600 hover:underline font-medium">
              Sign in
            </Link>
          </p>

          <p className="mt-6 text-center text-xs text-gray-500">
            By creating an account you agree to our Terms & Privacy Policy
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
