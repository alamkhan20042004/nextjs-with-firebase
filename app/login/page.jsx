"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  onAuthStateChanged,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { ADMIN_EMAILS } from "@/lib/config";

export default function LoginPage() {
  const router = useRouter();
  
  const handleRedirectAfterLogin = (user) => {
    if (!user) return;
    if (ADMIN_EMAILS.includes(user.email)) {
      router.push("/admin");
    } else {
      router.push("/user");
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      if (/Mobi|Android/i.test(navigator.userAgent)) {
        await signInWithRedirect(auth, provider);
      } else {
        const result = await signInWithPopup(auth, provider);
        handleRedirectAfterLogin(result.user);
      }
    } catch (err) {
      console.error("Login error:", err);
      alert(err.message);
    }
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        handleRedirectAfterLogin(user);
      }
    });
    
    getRedirectResult(auth)
      .then((result) => {
        if (result?.user) {
          handleRedirectAfterLogin(result.user);
        }
      })
      .catch((err) => console.error("Redirect login error:", err));
    
    return () => unsub();
  }, [router]);

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(15)].map((_, i) => (
          <div 
            key={i}
            className="absolute rounded-full bg-blue-500 opacity-10 animate-pulse"
            style={{
              width: `${Math.random() * 80 + 20}px`,
              height: `${Math.random() * 80 + 20}px`,
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              animationDuration: `${Math.random() * 6 + 4}s`,
              animationDelay: `${Math.random() * 2}s`
            }}
          ></div>
        ))}
      </div>
      
      {/* Login card with animation */}
      <div className="relative z-10 w-full max-w-md transform transition-all duration-700 animate-fadeIn">
        <div className="bg-gray-900 bg-opacity-70 backdrop-blur-lg rounded-2xl p-8 border border-gray-800 shadow-2xl">
          <div className="text-center mb-8">
            {/* Logo/Icon */}
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 mb-6 transform transition-transform duration-500 hover:scale-110">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd" />
              </svg>
            </div>
            
            <h1 className="text-3xl md:text-4xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
              BrainFuel
            </h1>
            <p className="text-gray-400">Sign in to access your dashboard</p>
          </div>
          
          {/* Google Sign-In Button */}
          <button
            onClick={handleGoogleLogin}
            className="flex items-center justify-center gap-3 w-full py-4 px-6 bg-white text-gray-800 font-medium rounded-xl shadow-lg transform transition-all duration-300 hover:scale-[1.02] hover:shadow-xl active:scale-[0.98] group"
          >
            <div className="relative">
              <img
                src="https://www.svgrepo.com/show/475656/google-color.svg"
                alt="Google"
                className="w-6 h-6"
              />
              <div className="absolute inset-0 bg-white rounded-full opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
            </div>
            <span className="font-medium">Continue with Google</span>
          </button>
          
          <div className="mt-8 text-center text-sm text-gray-500">
            By signing in, you agree to our Terms of Service and Privacy Policy
          </div>
          <span className="bg-black text-white px-4 py-2 rounded-lg font-bold shadow-md animate-pulse">
            ⚠️ Mobile user: Please enable "Desktop mode" in your browser before using this website. Very important!
          </span>
        </div>
      </div>
      
      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.8s ease-out forwards;
        }
      `}</style>
    </div>
  );
}























// "use client";
// import { useEffect } from "react";
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

//   const handleRedirectAfterLogin = (user) => {
//     if (!user) return;

//     if (ADMIN_EMAILS.includes(user.email)) {
//       router.push("/admin");
//     } else {
//       router.push("/user");
//     }
//   };

//   const handleGoogleLogin = async () => {
//     try {
//       const provider = new GoogleAuthProvider();

//       if (/Mobi|Android/i.test(navigator.userAgent)) {
//         await signInWithRedirect(auth, provider);
//       } else {
//         const result = await signInWithPopup(auth, provider);
//         handleRedirectAfterLogin(result.user);
//       }
//     } catch (err) {
//       console.error("Login error:", err);
//       alert(err.message);
//     }
//   };

//   useEffect(() => {
//     const unsub = onAuthStateChanged(auth, (user) => {
//       if (user) {
//         handleRedirectAfterLogin(user);
//       }
//     });

//     getRedirectResult(auth)
//       .then((result) => {
//         if (result?.user) {
//           handleRedirectAfterLogin(result.user);
//         }
//       })
//       .catch((err) => console.error("Redirect login error:", err));

//     return () => unsub();
//   }, [router]);

//   return (
//     <div className="flex min-h-screen items-center justify-center bg-black">
//       <div className="p-6 rounded-2xl bg-black w-80 text-center shadow-md border border-white">
//         <h1 className="text-2xl font-bold mb-4 text-white">Login BrainFuel</h1>

//         {/* Google Sign-In Button */}
//         <button
//           onClick={handleGoogleLogin}
//           className="flex items-center justify-center gap-2 w-full max-w-sm bg-white text-black font-medium py-2 px-4 border border-white rounded-xl shadow-md hover:bg-gray-200 active:scale-95 transition-all duration-200"
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





















// "use client";
// import { useEffect } from "react";
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

//   const handleRedirectAfterLogin = (user) => {
//     if (!user) return;

//     if (ADMIN_EMAILS.includes(user.email)) {
//       router.push("/admin");
//     } else {
//       router.push("/user");
//     }
//   };

//   const handleGoogleLogin = async () => {
//     try {
//       const provider = new GoogleAuthProvider();

//       if (/Mobi|Android/i.test(navigator.userAgent)) {
//         await signInWithRedirect(auth, provider);
//       } else {
//         const result = await signInWithPopup(auth, provider);
//         handleRedirectAfterLogin(result.user);
//       }
//     } catch (err) {
//       console.error("Login error:", err);
//       alert(err.message);
//     }
//   };

//   useEffect(() => {
//     const unsub = onAuthStateChanged(auth, (user) => {
//       if (user) {
//         handleRedirectAfterLogin(user);
//       }
//     });

//     getRedirectResult(auth)
//       .then((result) => {
//         if (result?.user) {
//           handleRedirectAfterLogin(result.user);
//         }
//       })
//       .catch((err) => console.error("Redirect login error:", err));

//     return () => unsub();
//   }, [router]);

//   return (
//     <div className="flex min-h-screen items-center justify-center bg-white">
//       <div className="p-6 rounded-2xl bg-black w-80 text-center shadow-md">
//         <h1 className="text-2xl font-bold mb-4 text-white">Login BrainFuel</h1>

//         {/* Google Sign-In Button */}
//         <button
//           onClick={handleGoogleLogin}
//           className="flex items-center justify-center gap-2 w-full max-w-sm bg-white text-black font-medium py-2 px-4 border border-black rounded-xl shadow-md hover:bg-gray-200 active:scale-95 transition-all duration-200"
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




















// ================================================================
//   ==========================================================

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
// import { ADMIN_EMAILS } from "@/lib/config"; // ✅ Import admin emails

// export default function LoginPage() {
//   const router = useRouter();

//   const handleRedirectAfterLogin = (user) => {
//     if (!user) return;

//     if (ADMIN_EMAILS.includes(user.email)) {
//       router.push("/admin"); // ✅ Admin page
//     } else {
//       router.push("/user");  // ✅ Normal user page
//     }
//   };

//   const handleGoogleLogin = async () => {
//     try {
//       const provider = new GoogleAuthProvider();

//       if (/Mobi|Android/i.test(navigator.userAgent)) {
//         // Mobile -> redirect
//         await signInWithRedirect(auth, provider);
//       } else {
//         // Desktop -> popup
//         const result = await signInWithPopup(auth, provider);
//         handleRedirectAfterLogin(result.user);
//       }
//     } catch (err) {
//       console.error("Login error:", err);
//       alert(err.message);
//     }
//   };

//   // ✅ Redirect result (mobile) handle karna
//   useEffect(() => {
//     getRedirectResult(auth)
//       .then((result) => {
//         if (result?.user) {
//           console.log("Redirect login success:", result.user);
//           handleRedirectAfterLogin(result.user);
//         }
//       })
//       .catch((err) => {
//         console.error("Redirect login error:", err);
//       });
//   }, [router]);

//   return (
//     <div className="flex min-h-screen items-center justify-center bg-gray-100">
//       <div className="p-6 rounded-2xl bg-white shadow-md w-80 text-center">
//         <h1 className="text-xl font-bold mb-4">Login BrainFuel</h1>

//         {/* Google button */}
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
