"use client";
import { useState } from "react";
import Link from "next/link";
import { auth } from "@/lib/firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSignup = async () => {
    if (!email || !password) return alert("Email & password required");
    if (password.length < 6) return alert("Password must be 6+ characters");
    try {
      setBusy(true);
      await createUserWithEmailAndPassword(auth, email, password);
      // Firebase auto-login after signup ✅
      window.location.href = "/"; // home pe bhej do (protected page)
    } catch (err) {
      alert(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="p-6 rounded-2xl bg-white shadow-md w-80">
        <h1 className="text-xl font-bold mb-4">Create account</h1>

        <input
          type="email"
          placeholder="Email"
          className="border p-2 w-full mb-3 rounded"
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          placeholder="Password (min 6)"
          className="border p-2 w-full mb-3 rounded"
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          onClick={handleSignup}
          disabled={busy}
          className="bg-green-600 text-white w-full py-2 rounded disabled:opacity-60"
        >
          {busy ? "Creating..." : "Sign up"}
        </button>

        <p className="text-sm mt-3">
          Already have an account?{" "}
          <Link href="/login" className="text-blue-600 underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
