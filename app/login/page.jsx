
"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { ADMIN_EMAILS } from "@/lib/config"; // ✅ Import admin emails

export default function LoginPage() {
  const router = useRouter();

  const handleRedirectAfterLogin = (user) => {
    if (!user) return;

    if (ADMIN_EMAILS.includes(user.email)) {
      router.push("/admin"); // ✅ Admin page
    } else {
      router.push("/user");  // ✅ Normal user page
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();

      if (/Mobi|Android/i.test(navigator.userAgent)) {
        // Mobile -> redirect
        await signInWithRedirect(auth, provider);
      } else {
        // Desktop -> popup
        const result = await signInWithPopup(auth, provider);
        handleRedirectAfterLogin(result.user);
      }
    } catch (err) {
      console.error("Login error:", err);
      alert(err.message);
    }
  };

  // ✅ Redirect result (mobile) handle karna
  useEffect(() => {
    getRedirectResult(auth)
      .then((result) => {
        if (result?.user) {
          console.log("Redirect login success:", result.user);
          handleRedirectAfterLogin(result.user);
        }
      })
      .catch((err) => {
        console.error("Redirect login error:", err);
      });
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="p-6 rounded-2xl bg-white shadow-md w-80 text-center">
        <h1 className="text-xl font-bold mb-4">Login BrainFuel</h1>

        {/* Google button */}
        <button
          onClick={handleGoogleLogin}
          className="flex items-center justify-center gap-2 w-full max-w-sm bg-white text-gray-700 font-medium py-2 px-4 border border-gray-300 rounded-xl shadow-md hover:bg-gray-100 hover:shadow-lg active:scale-95 transition-all duration-200"
        >
          <img
            src="https://www.svgrepo.com/show/475656/google-color.svg"
            alt="Google"
            className="w-5 h-5"
          />
          <span>Sign in with Google</span>
        </button>
      </div>
    </div>
  );
}














// ===============================================================================
  // ===============================================================================================
  
// "use client";
// import { useEffect, useState } from "react";
// import { useRouter } from "next/navigation";
// import {
//   GoogleAuthProvider,
//   signInWithPopup,
//   signInWithRedirect,
//   getRedirectResult,
//   onAuthStateChanged,
// } from "firebase/auth";
// import { auth } from "@/lib/firebase";

// import { ADMIN_EMAILS } from "@/lib/config";


// export default function LoginPage() {
//   const router = useRouter();
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     // Check auth state on mount
//     const unsubscribe = onAuthStateChanged(auth, (user) => {
//       // =================================
//       // if (user) {
//       //   console.log("User already logged in:", user);
//       //   router.push("/");
//       // } else {
//       //   setLoading(false);
//       // }

//       if (user) {
//         console.log("User already logged in:", user);

//         if (ADMIN_EMAILS.includes(user.email)) {
//           router.push("/admin");  // ✅ admin redirect
//         } else {
//           router.push("/user");   // ✅ normal user redirect
//         }
//       }


//       // ======================
//     });

//     // Check redirect result
//     const checkRedirectResult = async () => {
//       try {
//         const result = await getRedirectResult(auth);

//         // ============================

//         // if (result?.user) {
//         //   console.log("Redirect login success:", result.user);
//         //   router.push("/");
//         // }

//         if (result?.user) {
//           console.log("Redirect login success:", result.user);

//           if (ADMIN_EMAILS.includes(result.user.email)) {
//             router.push("/admin");
//           } else {
//             router.push("/user");
//           }
//         }


//         // ================================

//       } catch (err) {
//         console.error("Redirect login error:", err);
//       }
//     };

//     checkRedirectResult();

//     return () => unsubscribe();
//   }, [router]);

//   const isMobile = () => {
//     return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
//       navigator.userAgent
//     );
//   };

//   const handleGoogleLogin = async () => {
//     try {
//       const provider = new GoogleAuthProvider();
      
//       if (isMobile()) {
//         console.log("Using redirect for mobile");
//         await signInWithRedirect(auth, provider);
//       } else {
//         console.log("Using popup for desktop");
//         await signInWithPopup(auth, provider);
//       }
//     } catch (err) {
//       console.error("Login error:", err);
//       alert(err.message);
//     }
//   };

//   if (loading) {
//     return (
//       <div className="flex min-h-screen items-center justify-center bg-gray-100">
//         <div>Loading...</div>
//       </div>
//     );
//   }

//   return (
//     <div className="flex min-h-screen items-center justify-center bg-gray-100">
//       <div className="p-6 rounded-2xl bg-white shadow-md w-80 text-center">
//         <h1 className="text-xl font-bold mb-4">Login BrainFuel</h1>
//         <button
//           onClick={handleGoogleLogin}
//           className="flex items-center justify-center gap-2 w-full max-w-sm bg-white text-gray-700 font-medium py-2 px-4 border border-gray-300 rounded-xl shadow-md hover:bg-gray-100 hover:shadow-lg active:scale-95 transition-all duration-200"
//         >
//           <img
//             src="https://www.svgrepo.com/show/475656/google-color.svg"
//             alt="Google"
//             className="w-5 h-5"
//           />
//           <span>Sign in with Google</span>
//         </button>
//       </div>
//     </div>
//   );
// }
















// ===============================================================================
  // ===============================================================================================
  // "use client";
  // import { useEffect } from "react";
  // import { useRouter } from "next/navigation";
  // import {
  //   GoogleAuthProvider,
  //   signInWithPopup,
  //   signInWithRedirect,
  //   getRedirectResult,
  // } from "firebase/auth";
  // import { auth } from "@/lib/firebase";
  // // import { auth } from "@/lib/firebase";
  // // import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";

  // // ===========================================================

  // // export default function LoginPage() {
  // //   const handleGoogleLogin = async () => {
  // //     try {
  // //       const provider = new GoogleAuthProvider();
  // //       await signInWithPopup(auth, provider);
  // //       window.location.href = "/"; // login ke baad home par bhej do
  // //     } catch (err) {
  // //       alert(err.message);
  // //     }
  // //   };

  // export default function LoginPage() {
  //   const router = useRouter();

  //   const handleGoogleLogin = async () => {
  //     try {
  //       const provider = new GoogleAuthProvider();

  //       // ✅ Agar mobile hai to redirect use karein
  //       if (/Mobi|Android/i.test(navigator.userAgent)) {
  //         // ✅ Mobile -> redirect
  //         await signInWithRedirect(auth, provider);
  //       } else {
  //         // ✅ Desktop pe popup use karo
  //         await signInWithPopup(auth, provider);
  //         router.push("/"); // login ke baad home par bhej do
  //       }
  //     } catch (err) {
  //       alert(err.message);
  //     }
  //   };

  //   // ==============================================================

  //   // // 🔹 Redirect ke baad result handle karna
  //   // useEffect(() => {
  //   //   const checkRedirect = async () => {
  //   //     try {
  //   //       const result = await getRedirectResult(auth);
  //   //       if (result && result.user) {
  //   //         console.log("Redirect login success:", result.user);
  //   //         router.push("/"); // login ke baad home page par redirect
  //   //       }
  //   //     } catch (error) {
  //   //       console.error("Redirect error:", error);
  //   //     }
  //   //   };
  //   //   checkRedirect();
  //   // }, [router]);


  //   // ✅ Yeh part sirf redirect ke liye zaroori hai
  //   useEffect(() => {
  //     getRedirectResult(auth)
  //       .then((result) => {
  //         if (result?.user) {
  //           console.log("Redirect se login success:", result.user);
  //           router.push("/");
  //         }
  //       })
  //       .catch((err) => {
  //         console.error("Redirect login error:", err);
  //       });
  //   }, [router]);

  // // ========================================================================

  //   // return (
  //   //   <div className="flex min-h-screen items-center justify-center bg-gray-100">
  //   //     <div className="p-6 rounded-2xl bg-white shadow-md w-80 text-center">
  //   //       <h1 className="text-xl font-bold mb-4">Login</h1>

  //   //       {/* 👇 Google button */}
        
  //   //       <button
  //   //         onClick={handleGoogleLogin} // 👈 yahan naam same hona chahiye
  //   //         className="flex items-center justify-center gap-2 w-full max-w-sm bg-white text-gray-700 font-medium py-2 px-4 border border-gray-300 rounded-xl shadow-md hover:bg-gray-100 hover:shadow-lg active:scale-95 transition-all duration-200"
  //   //       >
  //   //         <img
  //   //           src="https://www.svgrepo.com/show/475656/google-color.svg"
  //   //           alt="Google"
  //   //           className="w-5 h-5"
  //   //         />
  //   //         <span>Sign in with Google</span>
  //   //       </button>

  //   //     </div>
  //   //   </div>
  //   // );


  //   return (
  //     <div className="flex min-h-screen items-center justify-center bg-gray-100">
  //       <div className="p-6 rounded-2xl bg-white shadow-md w-80 text-center">
  //         <h1 className="text-xl font-bold mb-4">Login BrainFuel</h1>

  //         {/* 👇 Google button */}
        
  //         <button
  //           onClick={handleGoogleLogin} // 👈 yahan naam same hona chahiye
  //           className="flex items-center justify-center gap-2 w-full max-w-sm bg-white text-gray-700 font-medium py-2 px-4 border border-gray-300 rounded-xl shadow-md hover:bg-gray-100 hover:shadow-lg active:scale-95 transition-all duration-200"
  //         >
  //           <img
  //             src="https://www.svgrepo.com/show/475656/google-color.svg"
  //             alt="Google"
  //             className="w-5 h-5"
  //           />
  //           <span>Sign in with Google</span>
  //         </button>

  //       </div>
  //     </div>
  //   );
  //   // =====================================================================
  // }

// ===============================================================================
  // ===============================================================================================






{/* <button
          onClick={handleGoogleLogin}
          className="bg-red-500 text-white w-full py-2 rounded"
        >
          Continue with Google
        </button> */}


























// "use client";
// import { useState } from "react";
// import { auth } from "@/lib/firebase";
// import { signInWithEmailAndPassword } from "firebase/auth";
// import Link from "next/link";

// export default function LoginPage() {
//   const [email, setEmail] = useState("");
//   const [password, setPassword] = useState("");

//   const handleLogin = async () => {
//     try {
//       await signInWithEmailAndPassword(auth, email, password);
//       alert("Login successful!");
//       window.location.href = "/"; // 👈 home par bhej do
//     } catch (error) {
//       alert(error.message);
//     }
//   };

//   return (
//     <div className="flex min-h-screen items-center justify-center bg-gray-100">
//       <div className="p-6 rounded-2xl bg-white shadow-md w-80">
//         <h1 className="text-xl font-bold mb-4">Login</h1>
//         <input
//           type="email"
//           placeholder="Email"
//           className="border p-2 w-full mb-3 rounded"
//           onChange={(e) => setEmail(e.target.value)}
//         />
//         <input
//           type="password"
//           placeholder="Password"
//           className="border p-2 w-full mb-3 rounded"
//           onChange={(e) => setPassword(e.target.value)}
//         />
//         <button
//           onClick={handleLogin}
//           className="bg-blue-500 text-white w-full py-2 rounded"
//         >
//           Login
//         </button>
//               {/* ✅ Best practice: Next.js Link */}
//       <Link href="/signup" className="text-green-600 underline mt-2">
//         Go to Signup
//       </Link>
//       </div>
//     </div>
//   );
// }
