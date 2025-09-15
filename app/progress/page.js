"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { motion } from "framer-motion";

function ProgressContent() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Check if we have the tempDownloadUrl in localStorage
    const tempData = localStorage.getItem('tempDownloadUrl');
    if (!tempData) {
      router.push('/user');
      return;
    }
    
    // Parse the data to check expiration
    try {
      const data = JSON.parse(tempData);
      const now = Date.now();
      if (now - data.timestamp > 30 * 60 * 1000) { // 30 minutes
        localStorage.removeItem('tempDownloadUrl');
        router.push('/user');
        return;
      }
    } catch (error) {
      console.error("Error parsing URL data:", error);
      router.push('/user');
    }
  }, [router]);














  const handleContinue = () => {
    setLoading(true);
    // Button click animation ke baad thoda delay
    setTimeout(() => {
      // Redirect to step-2 without passing data in URL
      // router.push('https://brainfuel-poor-people.vercel.app/progress/step-2');
      window.open(`https://direct-link.net/1385470/z5z0uNQj8ImD`, "_blank", "noopener,noreferrer");
    }, 1500);
  };



















  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-gray-800/30 backdrop-blur-lg rounded-2xl border border-gray-700 p-8 shadow-2xl">
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
            Content Access - Step 1
          </h1>
          <p className="text-gray-400">Verifying your access (Step 1 of 5)</p>
        </div>
        
        {/* Progress Stepper */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-8">
            {[1, 2, 3, 4, 5].map((step, index) => (
              <div key={index} className="flex flex-col items-center relative">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center z-10 transition-all duration-500 ${
                    step === 1
                      ? "bg-gradient-to-r from-blue-500 to-purple-500 shadow-lg shadow-blue-500/30"
                      : "bg-gray-700"
                  }`}
                >
                  <span className="text-white font-bold">{step}</span>
                </div>
                <div className="mt-3 text-center">
                  <div
                    className={`font-medium ${
                      step === 1 ? "text-white" : "text-gray-400"
                    }`}
                  >
                    Step {step}
                  </div>
                </div>
                {index < 4 && (
                  <div className="absolute top-6 left-12 w-[calc(100%+24px)] h-1 bg-gray-700 -z-10"></div>
                )}
              </div>
            ))}
          </div>
        </div>
        
        <div className="text-center mb-10">
          <h3 className="text-xl font-semibold mb-2">Verification</h3>
          <p className="text-gray-400">
            We are verifying your access to this content
          </p>
        </div>
        
        {/* Animated Button */}
        <div className="flex justify-center">
          <motion.button
            whileTap={{ scale: 0.9 }}
            whileHover={{ scale: 1.05 }}
            onClick={handleContinue}
            disabled={loading}
            className={`px-8 py-3 font-bold rounded-full flex items-center justify-center gap-2 transform transition-all duration-300 ${
              loading
                ? "bg-gradient-to-r from-gray-600 to-gray-700 cursor-not-allowed"
                : "bg-gradient-to-r from-blue-600 to-purple-600 hover:shadow-lg hover:shadow-blue-500/30"
            }`}
          >
            {loading ? (
              <>
                <svg
                  className="animate-spin h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v4l3-3-3-3v4a12 12 0 00-12 12h4z"
                  ></path>
                </svg>
                Processing...
              </>
            ) : (
              <>
                Continue to Step 2
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 ml-1"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </>
            )}
          </motion.button>
        </div>
      </div>
    </div>
  );
}

// Suspense wrapper zaroori hai
export default function ProgressPage() {
  return (
    <Suspense
      fallback={<div className="text-white text-center p-10">Loading...</div>}
    >
      <ProgressContent />
    </Suspense>
  );
}













// // ProgressPage2.js (Step 2)
// "use client";
// import { useRouter } from "next/navigation";
// import { useEffect, useState } from "react";

// export default function ProgressPage2() {
//   const router = useRouter();
//   const [countdown, setCountdown] = useState(10); // 10 seconds countdown

//   useEffect(() => {
//     // Check if we have the tempDownloadUrl in localStorage
//     const tempData = localStorage.getItem('tempDownloadUrl');
//     if (!tempData) {
//       router.push('/user');
//       return;
//     }
    
//     // Parse the data to check expiration
//     try {
//       const data = JSON.parse(tempData);
//       const now = Date.now();
//       if (now - data.timestamp > 30 * 60 * 1000) { // 30 minutes
//         localStorage.removeItem('tempDownloadUrl');
//         router.push('/user');
//         return;
//       }
//     } catch (error) {
//       console.error("Error parsing URL data:", error);
//       router.push('/user');
//       return;
//     }

//     // Start countdown
//     const timer = setInterval(() => {
//       setCountdown(prev => {
//         if (prev <= 1) {
//           clearInterval(timer);
//           // Auto redirect to step-3 after countdown
//           router.push('/progress/step-3');
//           return 0;
//         }
//         return prev - 1;
//       });
//     }, 1000);

//     return () => clearInterval(timer);
//   }, [router]);

//   const handleContinue = () => {
//     router.push('/progress/step-3');
//   };

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white flex flex-col items-center justify-center p-4">
//       <div className="w-full max-w-2xl bg-gray-800/30 backdrop-blur-lg rounded-2xl border border-gray-700 p-8 shadow-2xl">
//         <div className="text-center mb-10">
//           <h1 className="text-3xl md:text-4xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
//             Verification Required
//           </h1>
//           <p className="text-gray-400">Please verify to continue</p>
//         </div>
        
//         <div className="mb-12">
//           <div className="flex items-center justify-between mb-8">
//             {[1, 2, 3, 4].map((step, index) => (
//               <div key={index} className="flex flex-col items-center relative">
//                 <div
//                   className={`w-12 h-12 rounded-full flex items-center justify-center z-10 transition-all duration-500 ${
//                     step <= 2
//                       ? "bg-gradient-to-r from-blue-500 to-purple-500 shadow-lg shadow-blue-500/30"
//                       : "bg-gray-700"
//                   }`}
//                 >
//                   {step <= 2 ? (
//                     <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" viewBox="0 0 20 20" fill="currentColor">
//                       <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
//                     </svg>
//                   ) : (
//                     <span className="text-gray-400">{step}</span>
//                   )}
//                 </div>
//                 <div className="mt-3 text-center">
//                   <div className={`font-medium ${step <= 2 ? "text-white" : "text-gray-400"}`}>
//                     Step {step}
//                   </div>
//                 </div>
//                 {index < 3 && (
//                   <div className="absolute top-6 left-12 w-[calc(100%+24px)] h-1 bg-gray-700 -z-10">
//                     <div className={`h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-700 ${step < 2 ? "w-full" : step === 2 ? "w-1/2" : "w-0"}`}></div>
//                   </div>
//                 )}
//               </div>
//             ))}
//           </div>
//         </div>
        
//         <div className="text-center mb-10">
//           <h3 className="text-xl font-semibold mb-4">Verify with Linkvertise</h3>
//           <p className="text-gray-400 mb-6">
//             Please complete the verification below to access your content
//           </p>
          
//           {/* Here you would integrate the Linkvertise widget */}
//           <div className="bg-gray-700 rounded-lg p-4 mb-6">
//             <p className="text-gray-300">Linkvertise verification would go here</p>
//             {/* Example: <iframe src="your-linkvertise-url" ... /> */}
//           </div>
          
//           <p className="text-gray-400 text-sm mb-4">
//             Redirecting in {countdown} seconds...
//           </p>
//         </div>
        
//         <div className="flex justify-center">
//           <button
//             onClick={handleContinue}
//             className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-full transform transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-blue-500/30 flex items-center"
//           >
//             Continue to Step 3
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// }










// "use client";

// import { useRouter, useSearchParams } from "next/navigation";
// import { useEffect, useState, Suspense } from "react";
// import { motion } from "framer-motion";

// function ProgressContent() {
//   const router = useRouter();
//   const searchParams = useSearchParams();
//   const [url, setUrl] = useState("");
//   const [loading, setLoading] = useState(false);

//   useEffect(() => {
//     const encryptedUrl = searchParams.get("data");

//     if (encryptedUrl) {
//       try {
//         const decodedUrl = atob(encryptedUrl);
//         setUrl(decodedUrl);
//       } catch (error) {
//         console.error("Error decoding URL:", error);
//         router.push("/user");
//       }
//     } else {
//       router.push("/user");
//     }
//   }, [searchParams, router]);

//   const handleContinue = () => {
//     setLoading(true);

//     // Button click animation ke baad thoda delay
//     setTimeout(() => {
//       router.push(`/progress/step-2?data=${searchParams.get("data")}`);
//     }, 1500);
//   };

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white flex flex-col items-center justify-center p-4">
//       <div className="w-full max-w-2xl bg-gray-800/30 backdrop-blur-lg rounded-2xl border border-gray-700 p-8 shadow-2xl">
//         <div className="text-center mb-10">
//           <h1 className="text-3xl md:text-4xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
//             Content Access - Step 1
//           </h1>
//           <p className="text-gray-400">Verifying your access</p>
//         </div>

//         {/* Progress Stepper */}
//         <div className="mb-12">
//           <div className="flex items-center justify-between mb-8">
//             {[1, 2, 3, 4].map((step, index) => (
//               <div key={index} className="flex flex-col items-center relative">
//                 <div
//                   className={`w-12 h-12 rounded-full flex items-center justify-center z-10 transition-all duration-500 ${
//                     step === 1
//                       ? "bg-gradient-to-r from-blue-500 to-purple-500 shadow-lg shadow-blue-500/30"
//                       : "bg-gray-700"
//                   }`}
//                 >
//                   <span className="text-white font-bold">{step}</span>
//                 </div>
//                 <div className="mt-3 text-center">
//                   <div
//                     className={`font-medium ${
//                       step === 1 ? "text-white" : "text-gray-400"
//                     }`}
//                   >
//                     Step {step}
//                   </div>
//                 </div>
//                 {index < 3 && (
//                   <div className="absolute top-6 left-12 w-[calc(100%+24px)] h-1 bg-gray-700 -z-10"></div>
//                 )}
//               </div>
//             ))}
//           </div>
//         </div>

//         <div className="text-center mb-10">
//           <h3 className="text-xl font-semibold mb-2">Verification</h3>
//           <p className="text-gray-400">
//             We are verifying your access to this content
//           </p>
//         </div>

//         {/* Animated Button */}
//         <div className="flex justify-center">
//           <motion.button
//             whileTap={{ scale: 0.9 }}
//             whileHover={{ scale: 1.05 }}
//             onClick={handleContinue}
//             disabled={loading}
//             className={`px-8 py-3 font-bold rounded-full flex items-center justify-center gap-2 transform transition-all duration-300 ${
//               loading
//                 ? "bg-gradient-to-r from-gray-600 to-gray-700 cursor-not-allowed"
//                 : "bg-gradient-to-r from-blue-600 to-purple-600 hover:shadow-lg hover:shadow-blue-500/30"
//             }`}
//           >
//             {loading ? (
//               <>
//                 <svg
//                   className="animate-spin h-5 w-5 text-white"
//                   xmlns="http://www.w3.org/2000/svg"
//                   fill="none"
//                   viewBox="0 0 24 24"
//                 >
//                   <circle
//                     className="opacity-25"
//                     cx="12"
//                     cy="12"
//                     r="10"
//                     stroke="currentColor"
//                     strokeWidth="4"
//                   ></circle>
//                   <path
//                     className="opacity-75"
//                     fill="currentColor"
//                     d="M4 12a8 8 0 018-8v4l3-3-3-3v4a12 12 0 00-12 12h4z"
//                   ></path>
//                 </svg>
//                 Processing...
//               </>
//             ) : (
//               <>
//                 Continue to Step 2
//                 <svg
//                   xmlns="http://www.w3.org/2000/svg"
//                   className="h-5 w-5 ml-1"
//                   viewBox="0 0 20 20"
//                   fill="currentColor"
//                 >
//                   <path
//                     fillRule="evenodd"
//                     d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z"
//                     clipRule="evenodd"
//                   />
//                 </svg>
//               </>
//             )}
//           </motion.button>
//         </div>
//       </div>
//     </div>
//   );
// }

// // Suspense wrapper zaroori hai
// export default function ProgressPage() {
//   return (
//     <Suspense
//       fallback={<div className="text-white text-center p-10">Loading...</div>}
//     >
//       <ProgressContent />
//     </Suspense>
//   );
// }








// "use client";

// import { useRouter, useSearchParams } from "next/navigation";
// import { useEffect, useState, Suspense } from "react";

// function ProgressContent() {
//   const router = useRouter();
//   const searchParams = useSearchParams();
//   const [url, setUrl] = useState("");

//   useEffect(() => {
//     const encryptedUrl = searchParams.get("data");

//     if (encryptedUrl) {
//       try {
//         const decodedUrl = atob(encryptedUrl);
//         setUrl(decodedUrl);
//       } catch (error) {
//         console.error("Error decoding URL:", error);
//         router.push("/user");
//       }
//     } else {
//       router.push("/user");
//     }
//   }, [searchParams, router]);

//   const handleContinue = () => {
//     // router.push(`https://brainfuel-poor-people.vercel.app/progress/step-2?data=${searchParams.get("data")}`);
//     router.push(`/progress/step-2?data=${searchParams.get("data")}`);

//   };

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white flex flex-col items-center justify-center p-4">
//       <div className="w-full max-w-2xl bg-gray-800/30 backdrop-blur-lg rounded-2xl border border-gray-700 p-8 shadow-2xl">
//         <div className="text-center mb-10">
//           <h1 className="text-3xl md:text-4xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
//             Content Access - Step 1
//           </h1>
//           <p className="text-gray-400">Verifying your access</p>
//         </div>

//         {/* Progress Stepper */}
//         <div className="mb-12">
//           <div className="flex items-center justify-between mb-8">
//             {[1, 2, 3, 4].map((step, index) => (
//               <div key={index} className="flex flex-col items-center relative">
//                 <div
//                   className={`w-12 h-12 rounded-full flex items-center justify-center z-10 transition-all duration-500 ${
//                     step === 1
//                       ? "bg-gradient-to-r from-blue-500 to-purple-500 shadow-lg shadow-blue-500/30"
//                       : "bg-gray-700"
//                   }`}
//                 >
//                   <span className="text-white font-bold">{step}</span>
//                 </div>
//                 <div className="mt-3 text-center">
//                   <div
//                     className={`font-medium ${
//                       step === 1 ? "text-white" : "text-gray-400"
//                     }`}
//                   >
//                     Step {step}
//                   </div>
//                 </div>
//                 {index < 3 && (
//                   <div className="absolute top-6 left-12 w-[calc(100%+24px)] h-1 bg-gray-700 -z-10"></div>
//                 )}
//               </div>
//             ))}
//           </div>
//         </div>

//         <div className="text-center mb-10">
//           <h3 className="text-xl font-semibold mb-2">Verification</h3>
//           <p className="text-gray-400">
//             We are verifying your access to this content
//           </p>
//         </div>

//         <div className="flex justify-center">
//           <button
//             onClick={handleContinue}
//             className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-full transform transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-blue-500/30 flex items-center"
//           >
//             Continue to Step 2
//             <svg
//               xmlns="http://www.w3.org/2000/svg"
//               className="h-5 w-5 ml-2"
//               viewBox="0 0 20 20"
//               fill="currentColor"
//             >
//               <path
//                 fillRule="evenodd"
//                 d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z"
//                 clipRule="evenodd"
//               />
//             </svg>
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// }

// // Yeh Suspense wrapper zaroori hai
// export default function ProgressPage() {
//   return (
//     <Suspense fallback={<div className="text-white text-center p-10">Loading...</div>}>
//       <ProgressContent />
//     </Suspense>
//   );
// }









// "use client";
// import { Suspense } from "react";
// import { useSearchParams } from "next/navigation";

// function ProgressStep2Content() {
//   const searchParams = useSearchParams();
//   const data = searchParams.get("data");

//   return (
//     <div className="text-white p-4">
//       <h1>Progress Step 2</h1>
//       <p>Data: {data}</p>
//     </div>
//   );
// }

// export default function ProgressStep2Page() {
//   return (
//     <Suspense fallback={<div className="text-white">Loading step 2...</div>}>
//       <ProgressStep2Content />
//     </Suspense>
//   );
// }










// // app/page.js
// export default function Home() {
//   return (
//     <div className="flex h-screen items-center justify-center">
//       <h1 className="text-4xl font-bold text-blue-600">Hello World</h1>
//     </div>
//   );
// }
