"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { motion } from "framer-motion";

function ProgressPage5Content() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(12);
  const [isButtonEnabled, setIsButtonEnabled] = useState(false);

  useEffect(() => {
    const tempData = localStorage.getItem('tempDownloadUrl');
    if (tempData) {
      try {
        const data = JSON.parse(tempData);
        // Check if expired (30 minutes)
        const now = Date.now();
        if (now - data.timestamp > 30 * 60 * 1000) {
          localStorage.removeItem('tempDownloadUrl');
          router.push('/user');
          return;
        }
        setUrl(data.url);
      } catch (error) {
        console.error("Error parsing URL data:", error);
        router.push('/user');
      }
    } else {
      router.push('/user');
    }

    // Start countdown timer
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsButtonEnabled(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [router]);

  const handleDownload = () => {
    if (url) {
      setLoading(true);
      setTimeout(() => {
        // Remove the temp data
        localStorage.removeItem('tempDownloadUrl');
        window.open(url, "_blank", "noopener,noreferrer");
        setLoading(false);
      }, 1500);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-gray-800/30 backdrop-blur-lg rounded-2xl border border-gray-700 p-8 shadow-2xl">
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-emerald-500">
            Content Ready!
          </h1>
          <p className="text-gray-400">Your content is ready for download (Step 5 of 5)</p>
        </div>

        <div className="mb-12">
          <div className="flex items-center justify-between mb-8">
            {[1, 2, 3, 4, 5].map((step, index) => (
              <div key={index} className="flex flex-col items-center relative">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center z-10 transition-all duration-500 ${
                    step <= 5
                      ? "bg-gradient-to-r from-green-500 to-emerald-500 shadow-lg shadow-green-500/30"
                      : "bg-gray-700"
                  }`}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6 text-white"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="mt-3 text-center">
                  <div
                    className={`font-medium ${
                      step <= 5 ? "text-white" : "text-gray-400"
                    }`}
                  >
                    Step {step}
                  </div>
                </div>
                {index < 4 && (
                  <div className="absolute top-6 left-12 w-[calc(100%+24px)] h-1 bg-gray-700 -z-10">
                    <div
                      className={`h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-700 ${
                        step < 5 ? "w-full" : "w-0"
                      }`}
                    ></div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="text-center mb-10">
          <h3 className="text-xl font-semibold mb-2">Final Preparation</h3>
          <p className="text-gray-400 mb-6">
            Please wait while we prepare your download
          </p>
        </div>
        
        {/* Countdown Timer */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="mb-6"
          >
            <div className="text-6xl md:text-7xl font-bold bg-gradient-to-r from-green-500 to-emerald-500 bg-clip-text text-transparent mb-4">
              {countdown}
            </div>
            <p className="text-gray-400 text-sm">
              seconds remaining
            </p>
          </motion.div>
          
          {/* Progress Circle */}
          <div className="flex justify-center mb-6">
            <div className="relative w-24 h-24">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                {/* Background circle */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke="rgba(75, 85, 99, 0.3)"
                  strokeWidth="8"
                  fill="none"
                />
                {/* Progress circle */}
                <motion.circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke="url(#gradient)"
                  strokeWidth="8"
                  fill="none"
                  strokeLinecap="round"
                  initial={{ strokeDasharray: "251.2", strokeDashoffset: "251.2" }}
                  animate={{ strokeDashoffset: 251.2 * (1 - (12 - countdown) / 12) }}
                  transition={{ duration: 1 }}
                />
                <defs>
                  <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset="100%" stopColor="#059669" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-white font-bold text-lg">
                  {countdown}s
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Status Message */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="text-center mb-8"
        >
          {!isButtonEnabled ? (
            <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-4">
              <div className="flex items-center justify-center gap-3">
                <svg className="animate-spin h-5 w-5 text-green-400" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a12 12 0 00-12 12h4z"></path>
                </svg>
                <span className="text-green-300">Preparing your download...</span>
              </div>
            </div>
          ) : (
            <div className="bg-emerald-500/20 border border-emerald-500/30 rounded-lg p-4">
              <div className="flex items-center justify-center gap-3">
                <svg className="h-5 w-5 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span className="text-emerald-300">Your download is ready! Click below to access.</span>
              </div>
            </div>
          )}
        </motion.div>
        
        {/* Single Download Button */}
        <div className="flex justify-center">
          <motion.button
            whileTap={{ scale: isButtonEnabled ? 0.9 : 1 }}
            whileHover={{ 
              scale: isButtonEnabled ? 1.05 : 1,
              boxShadow: isButtonEnabled ? "0 20px 40px rgba(16, 185, 129, 0.3)" : "none"
            }}
            onClick={handleDownload}
            disabled={!isButtonEnabled || loading || !url}
            className={`px-8 py-4 font-bold rounded-full flex items-center justify-center gap-3 transform transition-all duration-300 ${
              isButtonEnabled && !loading && url
                ? "bg-gradient-to-r from-green-600 to-emerald-600 shadow-lg cursor-pointer"
                : "bg-gradient-to-r from-gray-600 to-gray-700 cursor-not-allowed"
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
                {isButtonEnabled ? (
                  <>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 mr-2"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Download Now
                  </>
                ) : (
                  `Please wait ${countdown}s`
                )}
              </>
            )}
          </motion.button>
        </div>

        {/* Additional Info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="text-center mt-6"
        >
          <p className="text-gray-500 text-sm">
            Your content will open in a new tab for download
          </p>
        </motion.div>
      </div>
    </div>
  );
}

export default function ProgressPage5() {
  return (
    <Suspense fallback={<div className="text-white p-10">Loading...</div>}>
      <ProgressPage5Content />
    </Suspense>
  );
}











// watching video here---------------------------------------

// "use client";
// import { useRouter } from "next/navigation";
// import { useEffect, useState, Suspense } from "react";
// import { motion } from "framer-motion";

// function ProgressPage5Content() {
//   const router = useRouter();
//   const [url, setUrl] = useState("");
//   const [loading, setLoading] = useState(false);
//   const [countdown, setCountdown] = useState(12);
//   const [isButtonEnabled, setIsButtonEnabled] = useState(false);

//   useEffect(() => {
//     const tempData = localStorage.getItem('tempDownloadUrl');
//     if (tempData) {
//       try {
//         const data = JSON.parse(tempData);
//         // Check if expired (30 minutes)
//         const now = Date.now();
//         if (now - data.timestamp > 30 * 60 * 1000) {
//           localStorage.removeItem('tempDownloadUrl');
//           router.push('/user');
//           return;
//         }
//         setUrl(data.url);
//       } catch (error) {
//         console.error("Error parsing URL data:", error);
//         router.push('/user');
//       }
//     } else {
//       router.push('/user');
//     }

//     // Start countdown timer
//     const timer = setInterval(() => {
//       setCountdown(prev => {
//         if (prev <= 1) {
//           clearInterval(timer);
//           setIsButtonEnabled(true);
//           return 0;
//         }
//         return prev - 1;
//       });
//     }, 1000);

//     return () => clearInterval(timer);
//   }, [router]);

//   const handleWatchVideo = () => {
//     if (url) {
//       setLoading(true);
//       setTimeout(() => {
//         // Remove loading state and redirect to watch page
//         // The video URL is already stored in localStorage, so watch page can access it
//         setLoading(false);
//         router.push('/watch');
//       }, 1000);
//     }
//   };

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white flex flex-col items-center justify-center p-4">
//       <div className="w-full max-w-2xl bg-gray-800/30 backdrop-blur-lg rounded-2xl border border-gray-700 p-8 shadow-2xl">
//         <div className="text-center mb-10">
//           <h1 className="text-3xl md:text-4xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-emerald-500">
//             Content Ready!
//           </h1>
//           <p className="text-gray-400">Your content is ready to watch (Step 5 of 5)</p>
//         </div>

//         <div className="mb-12">
//           <div className="flex items-center justify-between mb-8">
//             {[1, 2, 3, 4, 5].map((step, index) => (
//               <div key={index} className="flex flex-col items-center relative">
//                 <div
//                   className={`w-12 h-12 rounded-full flex items-center justify-center z-10 transition-all duration-500 ${
//                     step <= 5
//                       ? "bg-gradient-to-r from-green-500 to-emerald-500 shadow-lg shadow-green-500/30"
//                       : "bg-gray-700"
//                   }`}
//                 >
//                   <svg
//                     xmlns="http://www.w3.org/2000/svg"
//                     className="h-6 w-6 text-white"
//                     viewBox="0 0 20 20"
//                     fill="currentColor"
//                   >
//                     <path
//                       fillRule="evenodd"
//                       d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
//                       clipRule="evenodd"
//                     />
//                   </svg>
//                 </div>
//                 <div className="mt-3 text-center">
//                   <div
//                     className={`font-medium ${
//                       step <= 5 ? "text-white" : "text-gray-400"
//                     }`}
//                   >
//                     Step {step}
//                   </div>
//                 </div>
//                 {index < 4 && (
//                   <div className="absolute top-6 left-12 w-[calc(100%+24px)] h-1 bg-gray-700 -z-10">
//                     <div
//                       className={`h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-700 ${
//                         step < 5 ? "w-full" : "w-0"
//                       }`}
//                     ></div>
//                   </div>
//                 )}
//               </div>
//             ))}
//           </div>
//         </div>

//         <div className="text-center mb-10">
//           <h3 className="text-xl font-semibold mb-2">Final Preparation</h3>
//           <p className="text-gray-400 mb-6">
//             Please wait while we prepare your video stream
//           </p>
//         </div>
        
//         {/* Countdown Timer */}
//         <div className="text-center mb-8">
//           <motion.div
//             initial={{ scale: 0.8, opacity: 0 }}
//             animate={{ scale: 1, opacity: 1 }}
//             transition={{ duration: 0.5 }}
//             className="mb-6"
//           >
//             <div className="text-6xl md:text-7xl font-bold bg-gradient-to-r from-green-500 to-emerald-500 bg-clip-text text-transparent mb-4">
//               {countdown}
//             </div>
//             <p className="text-gray-400 text-sm">
//               seconds remaining
//             </p>
//           </motion.div>
          
//           {/* Progress Circle */}
//           <div className="flex justify-center mb-6">
//             <div className="relative w-24 h-24">
//               <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
//                 {/* Background circle */}
//                 <circle
//                   cx="50"
//                   cy="50"
//                   r="40"
//                   stroke="rgba(75, 85, 99, 0.3)"
//                   strokeWidth="8"
//                   fill="none"
//                 />
//                 {/* Progress circle */}
//                 <motion.circle
//                   cx="50"
//                   cy="50"
//                   r="40"
//                   stroke="url(#gradient)"
//                   strokeWidth="8"
//                   fill="none"
//                   strokeLinecap="round"
//                   initial={{ strokeDasharray: "251.2", strokeDashoffset: "251.2" }}
//                   animate={{ strokeDashoffset: 251.2 * (1 - (12 - countdown) / 12) }}
//                   transition={{ duration: 1 }}
//                 />
//                 <defs>
//                   <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
//                     <stop offset="0%" stopColor="#10b981" />
//                     <stop offset="100%" stopColor="#059669" />
//                   </linearGradient>
//                 </defs>
//               </svg>
//               <div className="absolute inset-0 flex items-center justify-center">
//                 <span className="text-white font-bold text-lg">
//                   {countdown}s
//                 </span>
//               </div>
//             </div>
//           </div>
//         </div>

//         {/* Status Message */}
//         <motion.div
//           initial={{ opacity: 0, y: 20 }}
//           animate={{ opacity: 1, y: 0 }}
//           transition={{ delay: 0.5 }}
//           className="text-center mb-8"
//         >
//           {!isButtonEnabled ? (
//             <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-4">
//               <div className="flex items-center justify-center gap-3">
//                 <svg className="animate-spin h-5 w-5 text-green-400" fill="none" viewBox="0 0 24 24">
//                   <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
//                   <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a12 12 0 00-12 12h4z"></path>
//                 </svg>
//                 <span className="text-green-300">Preparing your video stream...</span>
//               </div>
//             </div>
//           ) : (
//             <div className="bg-emerald-500/20 border border-emerald-500/30 rounded-lg p-4">
//               <div className="flex items-center justify-center gap-3">
//                 <svg className="h-5 w-5 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
//                   <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
//                 </svg>
//                 <span className="text-emerald-300">Your video is ready! Click below to watch.</span>
//               </div>
//             </div>
//           )}
//         </motion.div>
        
//         {/* Single Watch Button */}
//         <div className="flex justify-center">
//           <motion.button
//             whileTap={{ scale: isButtonEnabled ? 0.9 : 1 }}
//             whileHover={{ 
//               scale: isButtonEnabled ? 1.05 : 1,
//               boxShadow: isButtonEnabled ? "0 20px 40px rgba(16, 185, 129, 0.3)" : "none"
//             }}
//             onClick={handleWatchVideo}
//             disabled={!isButtonEnabled || loading || !url}
//             className={`px-8 py-4 font-bold rounded-full flex items-center justify-center gap-3 transform transition-all duration-300 ${
//               isButtonEnabled && !loading && url
//                 ? "bg-gradient-to-r from-green-600 to-emerald-600 shadow-lg cursor-pointer"
//                 : "bg-gradient-to-r from-gray-600 to-gray-700 cursor-not-allowed"
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
//                 Redirecting...
//               </>
//             ) : (
//               <>
//                 {isButtonEnabled ? (
//                   <>
//                     <svg
//                       xmlns="http://www.w3.org/2000/svg"
//                       className="h-5 w-5 mr-2"
//                       viewBox="0 0 20 20"
//                       fill="currentColor"
//                     >
//                       <path
//                         fillRule="evenodd"
//                         d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
//                         clipRule="evenodd"
//                       />
//                     </svg>
//                     Watch Now
//                   </>
//                 ) : (
//                   `Please wait ${countdown}s`
//                 )}
//               </>
//             )}
//           </motion.button>
//         </div>

//         {/* Additional Info */}
//         <motion.div
//           initial={{ opacity: 0 }}
//           animate={{ opacity: 1 }}
//           transition={{ delay: 1 }}
//           className="text-center mt-6"
//         >
//           <p className="text-gray-500 text-sm">
//             You will be redirected to the video player
//           </p>
//         </motion.div>
//       </div>
//     </div>
//   );
// }

// export default function ProgressPage5() {
//   return (
//     <Suspense fallback={<div className="text-white p-10">Loading...</div>}>
//       <ProgressPage5Content />
//     </Suspense>
//   );
// }




// Yessss ============================================

// "use client";
// import { useRouter } from "next/navigation";
// import { useEffect, useState, Suspense } from "react";
// import { motion } from "framer-motion";

// function ProgressPage5Content() {
//   const router = useRouter();
//   const [url, setUrl] = useState("");
//   const [loading, setLoading] = useState(false);
//   const [countdown, setCountdown] = useState(12);
//   const [isButtonEnabled, setIsButtonEnabled] = useState(false);

//   useEffect(() => {
//     const tempData = localStorage.getItem('tempDownloadUrl');
//     if (tempData) {
//       try {
//         const data = JSON.parse(tempData);
//         // Check if expired (30 minutes)
//         const now = Date.now();
//         if (now - data.timestamp > 30 * 60 * 1000) {
//           localStorage.removeItem('tempDownloadUrl');
//           router.push('/user');
//           return;
//         }
//         setUrl(data.url);
//       } catch (error) {
//         console.error("Error parsing URL data:", error);
//         router.push('/user');
//       }
//     } else {
//       router.push('/user');
//     }

//     // Start countdown timer
//     const timer = setInterval(() => {
//       setCountdown(prev => {
//         if (prev <= 1) {
//           clearInterval(timer);
//           setIsButtonEnabled(true);
//           return 0;
//         }
//         return prev - 1;
//       });
//     }, 1000);

//     return () => clearInterval(timer);
//   }, [router]);

//   const handleDownload = () => {
//     if (url) {
//       setLoading(true);
//       setTimeout(() => {
//         // Remove the temp data
//         localStorage.removeItem('tempDownloadUrl');
//         window.open(url, "_blank", "noopener,noreferrer");
//         setLoading(false);
//       }, 1500);
//     }
//   };

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white flex flex-col items-center justify-center p-4">
//       <div className="w-full max-w-2xl bg-gray-800/30 backdrop-blur-lg rounded-2xl border border-gray-700 p-8 shadow-2xl">
//         <div className="text-center mb-10">
//           <h1 className="text-3xl md:text-4xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-emerald-500">
//             Content Ready!
//           </h1>
//           <p className="text-gray-400">Your content is ready for download (Step 5 of 5)</p>
//         </div>

//         <div className="mb-12">
//           <div className="flex items-center justify-between mb-8">
//             {[1, 2, 3, 4, 5].map((step, index) => (
//               <div key={index} className="flex flex-col items-center relative">
//                 <div
//                   className={`w-12 h-12 rounded-full flex items-center justify-center z-10 transition-all duration-500 ${
//                     step <= 5
//                       ? "bg-gradient-to-r from-green-500 to-emerald-500 shadow-lg shadow-green-500/30"
//                       : "bg-gray-700"
//                   }`}
//                 >
//                   <svg
//                     xmlns="http://www.w3.org/2000/svg"
//                     className="h-6 w-6 text-white"
//                     viewBox="0 0 20 20"
//                     fill="currentColor"
//                   >
//                     <path
//                       fillRule="evenodd"
//                       d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
//                       clipRule="evenodd"
//                     />
//                   </svg>
//                 </div>
//                 <div className="mt-3 text-center">
//                   <div
//                     className={`font-medium ${
//                       step <= 5 ? "text-white" : "text-gray-400"
//                     }`}
//                   >
//                     Step {step}
//                   </div>
//                 </div>
//                 {index < 4 && (
//                   <div className="absolute top-6 left-12 w-[calc(100%+24px)] h-1 bg-gray-700 -z-10">
//                     <div
//                       className={`h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-700 ${
//                         step < 5 ? "w-full" : "w-0"
//                       }`}
//                     ></div>
//                   </div>
//                 )}
//               </div>
//             ))}
//           </div>
//         </div>

//         <div className="text-center mb-10">
//           <h3 className="text-xl font-semibold mb-2">Final Preparation</h3>
//           <p className="text-gray-400 mb-6">
//             Please wait while we prepare your download
//           </p>
//         </div>
        
//         {/* Countdown Timer */}
//         <div className="text-center mb-8">
//           <motion.div
//             initial={{ scale: 0.8, opacity: 0 }}
//             animate={{ scale: 1, opacity: 1 }}
//             transition={{ duration: 0.5 }}
//             className="mb-6"
//           >
//             <div className="text-6xl md:text-7xl font-bold bg-gradient-to-r from-green-500 to-emerald-500 bg-clip-text text-transparent mb-4">
//               {countdown}
//             </div>
//             <p className="text-gray-400 text-sm">
//               seconds remaining
//             </p>
//           </motion.div>
          
//           {/* Progress Circle */}
//           <div className="flex justify-center mb-6">
//             <div className="relative w-24 h-24">
//               <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
//                 {/* Background circle */}
//                 <circle
//                   cx="50"
//                   cy="50"
//                   r="40"
//                   stroke="rgba(75, 85, 99, 0.3)"
//                   strokeWidth="8"
//                   fill="none"
//                 />
//                 {/* Progress circle */}
//                 <motion.circle
//                   cx="50"
//                   cy="50"
//                   r="40"
//                   stroke="url(#gradient)"
//                   strokeWidth="8"
//                   fill="none"
//                   strokeLinecap="round"
//                   initial={{ strokeDasharray: "251.2", strokeDashoffset: "251.2" }}
//                   animate={{ strokeDashoffset: 251.2 * (1 - (12 - countdown) / 12) }}
//                   transition={{ duration: 1 }}
//                 />
//                 <defs>
//                   <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
//                     <stop offset="0%" stopColor="#10b981" />
//                     <stop offset="100%" stopColor="#059669" />
//                   </linearGradient>
//                 </defs>
//               </svg>
//               <div className="absolute inset-0 flex items-center justify-center">
//                 <span className="text-white font-bold text-lg">
//                   {countdown}s
//                 </span>
//               </div>
//             </div>
//           </div>
//         </div>

//         {/* Status Message */}
//         <motion.div
//           initial={{ opacity: 0, y: 20 }}
//           animate={{ opacity: 1, y: 0 }}
//           transition={{ delay: 0.5 }}
//           className="text-center mb-8"
//         >
//           {!isButtonEnabled ? (
//             <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-4">
//               <div className="flex items-center justify-center gap-3">
//                 <svg className="animate-spin h-5 w-5 text-green-400" fill="none" viewBox="0 0 24 24">
//                   <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
//                   <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a12 12 0 00-12 12h4z"></path>
//                 </svg>
//                 <span className="text-green-300">Preparing your download...</span>
//               </div>
//             </div>
//           ) : (
//             <div className="bg-emerald-500/20 border border-emerald-500/30 rounded-lg p-4">
//               <div className="flex items-center justify-center gap-3">
//                 <svg className="h-5 w-5 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
//                   <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
//                 </svg>
//                 <span className="text-emerald-300">Your download is ready! Click below to access.</span>
//               </div>
//             </div>
//           )}
//         </motion.div>
        
//         {/* Single Download Button */}
//         <div className="flex justify-center">
//           <motion.button
//             whileTap={{ scale: isButtonEnabled ? 0.9 : 1 }}
//             whileHover={{ 
//               scale: isButtonEnabled ? 1.05 : 1,
//               boxShadow: isButtonEnabled ? "0 20px 40px rgba(16, 185, 129, 0.3)" : "none"
//             }}
//             onClick={handleDownload}
//             disabled={!isButtonEnabled || loading || !url}
//             className={`px-8 py-4 font-bold rounded-full flex items-center justify-center gap-3 transform transition-all duration-300 ${
//               isButtonEnabled && !loading && url
//                 ? "bg-gradient-to-r from-green-600 to-emerald-600 shadow-lg cursor-pointer"
//                 : "bg-gradient-to-r from-gray-600 to-gray-700 cursor-not-allowed"
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
//                 {isButtonEnabled ? (
//                   <>
//                     <svg
//                       xmlns="http://www.w3.org/2000/svg"
//                       className="h-5 w-5 mr-2"
//                       viewBox="0 0 20 20"
//                       fill="currentColor"
//                     >
//                       <path
//                         fillRule="evenodd"
//                         d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
//                         clipRule="evenodd"
//                       />
//                     </svg>
//                     Download Now
//                   </>
//                 ) : (
//                   `Please wait ${countdown}s`
//                 )}
//               </>
//             )}
//           </motion.button>
//         </div>

//         {/* Additional Info */}
//         <motion.div
//           initial={{ opacity: 0 }}
//           animate={{ opacity: 1 }}
//           transition={{ delay: 1 }}
//           className="text-center mt-6"
//         >
//           <p className="text-gray-500 text-sm">
//             Your content will open in a new tab for download
//           </p>
//         </motion.div>
//       </div>
//     </div>
//   );
// }

// export default function ProgressPage5() {
//   return (
//     <Suspense fallback={<div className="text-white p-10">Loading...</div>}>
//       <ProgressPage5Content />
//     </Suspense>
//   );
// }





































// "use client";
// import { useRouter } from "next/navigation";
// import { useEffect, useState, Suspense } from "react";
// import { motion } from "framer-motion";

// function ProgressPage5Content() {
//   const router = useRouter();
//   const [url, setUrl] = useState("");
//   const [loading, setLoading] = useState(false);
//   const [buttonStates, setButtonStates] = useState({
//     ad1: true,
//     ad2: false,
//     ad3: false,
//     continue: false
//   });

//   useEffect(() => {
//     const tempData = localStorage.getItem('tempDownloadUrl');
//     if (tempData) {
//       try {
//         const data = JSON.parse(tempData);
//         // Check if expired (30 minutes)
//         const now = Date.now();
//         if (now - data.timestamp > 30 * 60 * 1000) {
//           localStorage.removeItem('tempDownloadUrl');
//           router.push('/user');
//           return;
//         }
//         setUrl(data.url);
//       } catch (error) {
//         console.error("Error parsing URL data:", error);
//         router.push('/user');
//       }
//     } else {
//       router.push('/user');
//     }
//   }, [router]);

//   const handleAdButtonClick = (buttonNumber) => {
//     // Open Partnerhouse link in new tab
//     const adLinks = {
//       1: "https://hotbzepefa.cc/tds?id=1483675431&p1=sub1&p2=sub2&p3=sub3&p4=sub4",
//       2: "https://hotbzepefa.cc/tds?id=1483698232&p1=sub1&p2=sub2&p3=sub3&p4=sub4",
//       3: "https://hotbzepefa.cc/tds?id=1483675431&p1=sub1&p2=sub2&p3=sub3&p4=sub4"
//     };
    
//     window.open(adLinks[buttonNumber], "_blank", "noopener,noreferrer");
    
//     // Enable next button
//     if (buttonNumber === 1) {
//       setButtonStates(prev => ({ ...prev, ad2: true }));
//     } else if (buttonNumber === 2) {
//       setButtonStates(prev => ({ ...prev, ad3: true }));
//     } else if (buttonNumber === 3) {
//       setButtonStates(prev => ({ ...prev, continue: true }));
//     }
//   };

//   const handleDownload = () => {
//     if (url) {
//       setLoading(true);
//       setTimeout(() => {
//         // Remove the temp data
//         localStorage.removeItem('tempDownloadUrl');
//         window.open(url, "_blank", "noopener,noreferrer");
//         setLoading(false);
//       }, 1500);
//     }
//   };

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white flex flex-col items-center justify-center p-4">
//       <div className="w-full max-w-2xl bg-gray-800/30 backdrop-blur-lg rounded-2xl border border-gray-700 p-8 shadow-2xl">
//         <div className="text-center mb-10">
//           <h1 className="text-3xl md:text-4xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-emerald-500">
//             Content Ready!
//           </h1>
//           <p className="text-gray-400">Your content is ready for download (Step 5 of 5)</p>
//         </div>

//         <div className="mb-12">
//           <div className="flex items-center justify-between mb-8">
//             {[1, 2, 3, 4, 5].map((step, index) => (
//               <div key={index} className="flex flex-col items-center relative">
//                 <div
//                   className={`w-12 h-12 rounded-full flex items-center justify-center z-10 transition-all duration-500 ${
//                     step <= 5
//                       ? "bg-gradient-to-r from-green-500 to-emerald-500 shadow-lg shadow-green-500/30"
//                       : "bg-gray-700"
//                   }`}
//                 >
//                   <svg
//                     xmlns="http://www.w3.org/2000/svg"
//                     className="h-6 w-6 text-white"
//                     viewBox="0 0 20 20"
//                     fill="currentColor"
//                   >
//                     <path
//                       fillRule="evenodd"
//                       d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
//                       clipRule="evenodd"
//                     />
//                   </svg>
//                 </div>
//                 <div className="mt-3 text-center">
//                   <div
//                     className={`font-medium ${
//                       step <= 5 ? "text-white" : "text-gray-400"
//                     }`}
//                   >
//                     Step {step}
//                   </div>
//                 </div>
//                 {index < 4 && (
//                   <div className="absolute top-6 left-12 w-[calc(100%+24px)] h-1 bg-gray-700 -z-10">
//                     <div
//                       className={`h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-700 ${
//                         step < 5 ? "w-full" : "w-0"
//                       }`}
//                     ></div>
//                   </div>
//                 )}
//               </div>
//             ))}
//           </div>
//         </div>

//         <div className="text-center mb-10">
//           <h3 className="text-xl font-semibold mb-2">Final Verification</h3>
//           <p className="text-gray-400 mb-6">
//             Please complete the final steps to access your download
//           </p>
//         </div>
        
//         {/* Adsterra Buttons */}
//         <div className="space-y-4 mb-8">
//           {/* Ad Button 1 */}
//           <motion.button
//             whileTap={{ scale: 0.95 }}
//             whileHover={{ scale: buttonStates.ad1 ? 1.02 : 1 }}
//             onClick={() => handleAdButtonClick(1)}
//             disabled={!buttonStates.ad1}
//             className={`w-full py-3 font-bold rounded-lg flex items-center justify-center gap-2 transform transition-all duration-300 ${
//               buttonStates.ad1
//                 ? "bg-gradient-to-r from-green-600 to-emerald-600 hover:shadow-lg hover:shadow-green-500/30 cursor-pointer"
//                 : "bg-gradient-to-r from-gray-600 to-gray-700 cursor-not-allowed opacity-70"
//             }`}
//           >
//             {buttonStates.ad1 ? (
//               <>
//                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
//                   <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
//                 </svg>
//                 {/* Click Ad 1 (Required) */}
//                 Click (Required-1)
//               </>
//             ) : (
//               "Ad 1 - Click to Enable Next Step"
//             )}
//           </motion.button>

//           {/* Ad Button 2 */}
//           <motion.button
//             whileTap={{ scale: 0.95 }}
//             whileHover={{ scale: buttonStates.ad2 ? 1.02 : 1 }}
//             onClick={() => handleAdButtonClick(2)}
//             disabled={!buttonStates.ad2}
//             className={`w-full py-3 font-bold rounded-lg flex items-center justify-center gap-2 transform transition-all duration-300 ${
//               buttonStates.ad2
//                 ? "bg-gradient-to-r from-orange-600 to-amber-600 hover:shadow-lg hover:shadow-orange-500/30 cursor-pointer"
//                 : "bg-gradient-to-r from-gray-600 to-gray-700 cursor-not-allowed opacity-70"
//             }`}
//           >
//             {buttonStates.ad2 ? (
//               <>
//                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
//                   <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
//                 </svg>
//                 {/* Click Ad 2 (Required) */}
//                 Click (Required-2)

//               </>
//             ) : (
//               "Ad 2 - Complete Step 1 First"
//             )}
//           </motion.button>

//           {/* Ad Button 3 */}
//           <motion.button
//             whileTap={{ scale: 0.95 }}
//             whileHover={{ scale: buttonStates.ad3 ? 1.02 : 1 }}
//             onClick={() => handleAdButtonClick(3)}
//             disabled={!buttonStates.ad3}
//             className={`w-full py-3 font-bold rounded-lg flex items-center justify-center gap-2 transform transition-all duration-300 ${
//               buttonStates.ad3
//                 ? "bg-gradient-to-r from-red-600 to-pink-600 hover:shadow-lg hover:shadow-red-500/30 cursor-pointer"
//                 : "bg-gradient-to-r from-gray-600 to-gray-700 cursor-not-allowed opacity-70"
//             }`}
//           >
//             {buttonStates.ad3 ? (
//               <>
//                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
//                   <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
//                 </svg>
//                 {/* Click Ad 3 (Required) */}
//                 Click (Required-3)
//               </>
//             ) : (
//               "Ad 3 - Complete Step 2 First"
//             )}
//           </motion.button>
//         </div>

//         {/* Progress Indicator */}
//         <div className="mb-6 p-4 bg-gray-800/50 rounded-lg">
//           <div className="flex justify-between items-center mb-2">
//             <span className="text-sm text-gray-400">Progress:</span>
//             <span className="text-sm font-medium">
//               {Object.values(buttonStates).filter(Boolean).length - 1}/3 ads completed
//             </span>
//           </div>
//           <div className="w-full bg-gray-700 rounded-full h-2">
//             <div 
//               className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full transition-all duration-500"
//               style={{ 
//                 width: `${((Object.values(buttonStates).filter(Boolean).length - 1) / 3) * 100}%` 
//               }}
//             ></div>
//           </div>
//         </div>
        
//         {/* Download Button */}
//         <div className="flex justify-center">
//           <motion.button
//             whileTap={{ scale: 0.9 }}
//             whileHover={{ scale: buttonStates.continue ? 1.05 : 1 }}
//             onClick={handleDownload}
//             disabled={!buttonStates.continue || loading || !url}
//             className={`px-8 py-3 font-bold rounded-full flex items-center justify-center gap-2 transform transition-all duration-300 ${
//               buttonStates.continue && !loading && url
//                 ? "bg-gradient-to-r from-green-600 to-emerald-600 hover:shadow-lg hover:shadow-green-500/30 cursor-pointer"
//                 : "bg-gradient-to-r from-gray-600 to-gray-700 cursor-not-allowed"
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
//                 <svg
//                   xmlns="http://www.w3.org/2000/svg"
//                   className="h-5 w-5 mr-2"
//                   viewBox="0 0 20 20"
//                   fill="currentColor"
//                 >
//                   <path
//                     fillRule="evenodd"
//                     d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
//                     clipRule="evenodd"
//                   />
//                 </svg>
//                 Download Now
//               </>
//             )}
//           </motion.button>
//         </div>
//       </div>
//     </div>
//   );
// }

// export default function ProgressPage5() {
//   return (
//     <Suspense fallback={<div className="text-white p-10">Loading...</div>}>
//       <ProgressPage5Content />
//     </Suspense>
//   );
// }




























// --------------- this is correct code ---------------


// "use client";
// import { useRouter } from "next/navigation";
// import { useEffect, useState, Suspense } from "react";

// function ProgressPage5Content() {
//   const router = useRouter();
//   const [url, setUrl] = useState("");

//   useEffect(() => {
//     const tempData = localStorage.getItem('tempDownloadUrl');
//     if (tempData) {
//       try {
//         const data = JSON.parse(tempData);
//         // Check if expired (30 minutes)
//         const now = Date.now();
//         if (now - data.timestamp > 30 * 60 * 1000) {
//           localStorage.removeItem('tempDownloadUrl');
//           router.push('/user');
//           return;
//         }
//         setUrl(data.url);
//       } catch (error) {
//         console.error("Error parsing URL data:", error);
//         router.push('/user');
//       }
//     } else {
//       router.push('/user');
//     }
//   }, [router]);

//   const handleDownload = () => {
//     if (url) {
//       // Remove the temp data
//       localStorage.removeItem('tempDownloadUrl');
//       window.open(url, "_blank", "noopener,noreferrer");
//     }
//   };

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white flex flex-col items-center justify-center p-4">
//       <div className="w-full max-w-2xl bg-gray-800/30 backdrop-blur-lg rounded-2xl border border-gray-700 p-8 shadow-2xl">
//         <div className="text-center mb-10">
//           <h1 className="text-3xl md:text-4xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-emerald-500">
//             Content Ready!
//           </h1>
//           <p className="text-gray-400">Your content is ready for download (Step 5 of 5)</p>
//         </div>

//         <div className="mb-12">
//           <div className="flex items-center justify-between mb-8">
//             {[1, 2, 3, 4, 5].map((step, index) => (
//               <div key={index} className="flex flex-col items-center relative">
//                 <div
//                   className={`w-12 h-12 rounded-full flex items-center justify-center z-10 transition-all duration-500 ${
//                     step <= 5
//                       ? "bg-gradient-to-r from-green-500 to-emerald-500 shadow-lg shadow-green-500/30"
//                       : "bg-gray-700"
//                   }`}
//                 >
//                   <svg
//                     xmlns="http://www.w3.org/2000/svg"
//                     className="h-6 w-6 text-white"
//                     viewBox="0 0 20 20"
//                     fill="currentColor"
//                   >
//                     <path
//                       fillRule="evenodd"
//                       d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
//                       clipRule="evenodd"
//                     />
//                   </svg>
//                 </div>
//                 <div className="mt-3 text-center">
//                   <div
//                     className={`font-medium ${
//                       step <= 5 ? "text-white" : "text-gray-400"
//                     }`}
//                   >
//                     Step {step}
//                   </div>
//                 </div>
//                 {index < 4 && (
//                   <div className="absolute top-6 left-12 w-[calc(100%+24px)] h-1 bg-gray-700 -z-10">
//                     <div
//                       className={`h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-700 ${
//                         step < 5 ? "w-full" : "w-0"
//                       }`}
//                     ></div>
//                   </div>
//                 )}
//               </div>
//             ))}
//           </div>
//         </div>

//         <div className="text-center mb-10">
//           <h3 className="text-xl font-semibold mb-2">Access Granted!</h3>
//           <p className="text-gray-400 mb-6">
//             Click the button below to download your content
//           </p>
//         </div>

//         <div className="flex justify-center">
//           <button
//             onClick={handleDownload}
//             className="px-8 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold rounded-full transform transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-green-500/30 flex items-center"
//           >
//             <svg
//               xmlns="http://www.w3.org/2000/svg"
//               className="h-5 w-5 mr-2"
//               viewBox="0 0 20 20"
//               fill="currentColor"
//             >
//               <path
//                 fillRule="evenodd"
//                 d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
//                 clipRule="evenodd"
//               />
//             </svg>
//             Download Now
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// }

// export default function ProgressPage5() {
//   return (
//     <Suspense fallback={<div className="text-white p-10">Loading...</div>}>
//       <ProgressPage5Content />
//     </Suspense>
//   );
// }


// --------------- this is correct code ---------------
