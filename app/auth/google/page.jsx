"use client";
import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import { GoogleAuthProvider, signInWithRedirect, getRedirectResult } from "firebase/auth";
import { useRouter } from "next/navigation";
import { ADMIN_EMAILS } from "@/lib/config";

/*
  Minimal Google redirect page.
  Purpose: isolate redirect-based auth for mobile / problematic browsers to avoid popup logic complexity.
  Usage: navigate user here from login page when force redirect desired.
*/
export default function GoogleRedirectAuthPage() {
  const router = useRouter();
  const [status, setStatus] = useState("initial");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setStatus("checking");
      try {
        // First see if we're returning from a redirect
        const redirectRes = await getRedirectResult(auth).catch(() => null);
        if (redirectRes?.user) {
          setStatus("completed");
          const email = redirectRes.user.email || "";
          const target = ADMIN_EMAILS.includes(email) ? "/admin" : "/user";
          router.replace(target);
          return;
        }
        setStatus("starting");
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: "select_account" });
        await signInWithRedirect(auth, provider);
      } catch (e) {
        if (cancelled) return;
        console.error("[AUTH][REDIRECT] error", e);
        setError(e.message || "Redirect sign-in failed");
        setStatus("error");
      }
    };
    run();
    return () => { cancelled = true; };
  }, [router]);

  const getStatusConfig = () => {
    switch (status) {
      case "checking":
        return {
          title: "Checking Session",
          message: "Looking for existing authentication...",
          color: "text-blue-400",
          icon: "🔍"
        };
      case "starting":
        return {
          title: "Redirecting to Google",
          message: "You'll be redirected to Google sign-in...",
          color: "text-yellow-400",
          icon: "🚀"
        };
      case "completed":
        return {
          title: "Sign-in Successful",
          message: "Taking you to your dashboard...",
          color: "text-green-400",
          icon: "✅"
        };
      case "error":
        return {
          title: "Authentication Failed",
          message: error,
          color: "text-red-400",
          icon: "❌"
        };
      default:
        return {
          title: "Initializing",
          message: "Setting up authentication...",
          color: "text-gray-400",
          icon: "⚡"
        };
    }
  };

  const statusConfig = getStatusConfig();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center p-4">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 25% 25%, #ffffff 2px, transparent 2px),
                           radial-gradient(circle at 75% 75%, #ffffff 2px, transparent 2px)`,
          backgroundSize: '50px 50px'
        }} />
      </div>

      <div className="relative z-10 max-w-md w-full">
        {/* Main Card */}
        <div className="backdrop-blur-sm bg-white/10 border border-white/20 rounded-2xl p-8 shadow-2xl">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <img 
                src="https://www.svgrepo.com/show/475656/google-color.svg" 
                alt="Google" 
                className="w-8 h-8" 
              />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">
              Google Sign-in
            </h1>
            <p className="text-gray-300 text-sm">
              Securely authenticate with your Google account
            </p>
          </div>

          {/* Status Display */}
          <div className="text-center mb-8">
            <div className="text-4xl mb-4">{statusConfig.icon}</div>
            <h2 className={`text-lg font-semibold mb-2 ${statusConfig.color}`}>
              {statusConfig.title}
            </h2>
            <p className="text-gray-300 text-sm">
              {statusConfig.message}
            </p>
          </div>

          {/* Loading Spinner */}
          {status !== "error" && (
            <div className="flex justify-center mb-8">
              <div className="relative">
                <div className="h-12 w-12 border-4 border-white/20 border-t-white rounded-full animate-spin" />
                <div className="absolute inset-0 h-12 w-12 border-4 border-transparent border-r-blue-400 rounded-full animate-spin animation-delay-150" />
              </div>
            </div>
          )}

          {/* Error Actions */}
          {status === "error" && (
            <div className="space-y-3">
              <button
                onClick={() => window.location.reload()}
                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={() => router.replace("/login")}
                className="w-full py-3 px-4 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors"
              >
                Back to Login
              </button>
            </div>
          )}

          {/* Help Text */}
          <div className="mt-8 p-4 bg-white/5 rounded-lg border border-white/10">
            <p className="text-xs text-gray-400 text-center leading-relaxed">
              💡 <strong>Having trouble?</strong><br/>
              • Make sure cookies are enabled<br/>
              • Try opening in your system browser<br/>
              • Disable ad blockers if needed
            </p>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="mt-6 flex justify-center space-x-2">
          {["checking", "starting", "completed"].map((step, index) => (
            <div
              key={step}
              className={`h-2 w-8 rounded-full transition-all duration-300 ${
                status === step ? "bg-blue-400 w-12" : 
                ["checking", "starting", "completed"].indexOf(status) > index ? "bg-green-400" : "bg-white/20"
              }`}
            />
          ))}
        </div>
      </div>

      <style jsx global>{`
        .animation-delay-150 {
          animation-delay: 0.15s;
        }
        @media (max-width: 640px) {
          html, body, .min-h-screen {
            min-height: 100dvh;
          }
        }
      `}</style>
    </div>
  );
}
