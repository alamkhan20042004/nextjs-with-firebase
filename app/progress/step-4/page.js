"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { motion } from "framer-motion";

function ProgressPage4Content() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(12);
  const [isButtonEnabled, setIsButtonEnabled] = useState(false);

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
      return;
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

  const handleContinue = () => {
    setLoading(true);
    setTimeout(() => {
      window.open('/progress/step-5', "_blank", "noopener,noreferrer");
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-gray-800/30 backdrop-blur-lg rounded-2xl border border-gray-700 p-8 shadow-2xl">
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
            Almost Ready
          </h1>
          <p className="text-gray-400">Your content is almost ready (Step 4 of 5)</p>
        </div>

        <div className="mb-12">
          <div className="flex items-center justify-between mb-8">
            {[1, 2, 3, 4, 5].map((step, index) => (
              <div key={index} className="flex flex-col items-center relative">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center z-10 transition-all duration-500 ${
                    step <= 4
                      ? "bg-gradient-to-r from-blue-500 to-purple-500 shadow-lg shadow-blue-500/30"
                      : "bg-gray-700"
                  }`}
                >
                  {step <= 4 ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <span className="text-gray-400">{step}</span>
                  )}
                </div>
                <div className="mt-3 text-center">
                  <div className={`font-medium ${step <= 4 ? "text-white" : "text-gray-400"}`}>
                    Step {step}
                  </div>
                </div>
                {index < 4 && (
                  <div className="absolute top-6 left-12 w-[calc(100%+24px)] h-1 bg-gray-700 -z-10">
                    <div className={`h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-700 ${
                      step < 4 ? "w-full" : 
                      step === 4 ? "w-3/4" : "w-0"
                    }`}></div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="text-center mb-10">
          <h3 className="text-xl font-semibold mb-2">Final Preparation</h3>
          <p className="text-gray-400 mb-6">
            Please wait while we prepare your content
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
            <div className="text-6xl md:text-7xl font-bold bg-gradient-to-r from-purple-500 to-indigo-500 bg-clip-text text-transparent mb-4">
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
                    <stop offset="0%" stopColor="#8b5cf6" />
                    <stop offset="100%" stopColor="#4f46e5" />
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
            <div className="bg-purple-500/20 border border-purple-500/30 rounded-lg p-4">
              <div className="flex items-center justify-center gap-3">
                <svg className="animate-spin h-5 w-5 text-purple-400" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a12 12 0 00-12 12h4z"></path>
                </svg>
                <span className="text-purple-300">Preparing your content...</span>
              </div>
            </div>
          ) : (
            <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-4">
              <div className="flex items-center justify-center gap-3">
                <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span className="text-green-300">Preparation complete! Ready for final step.</span>
              </div>
            </div>
          )}
        </motion.div>
        
        {/* Single Continue Button */}
        <div className="flex justify-center">
          <motion.button
            whileTap={{ scale: isButtonEnabled ? 0.9 : 1 }}
            whileHover={{ 
              scale: isButtonEnabled ? 1.05 : 1,
              boxShadow: isButtonEnabled ? "0 20px 40px rgba(139, 92, 246, 0.3)" : "none"
            }}
            onClick={handleContinue}
            disabled={!isButtonEnabled || loading}
            className={`px-8 py-4 font-bold rounded-full flex items-center justify-center gap-3 transform transition-all duration-300 ${
              isButtonEnabled && !loading
                ? "bg-gradient-to-r from-purple-600 to-indigo-600 shadow-lg cursor-pointer"
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
                    Continue to Final Step
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
            Your download will be available in the final step
          </p>
        </motion.div>
      </div>
    </div>
  );
}

export default function ProgressPage4() {
  return (
    <Suspense fallback={<div className="text-white p-10">Loading...</div>}>
      <ProgressPage4Content />
    </Suspense>
  );
}
















// "use client";
// import { useRouter } from "next/navigation";
// import { useEffect, useState, Suspense } from "react";
// import { motion } from "framer-motion";

// function ProgressPage4Content() {
//   const router = useRouter();
//   const [loading, setLoading] = useState(false);
//   const [buttonStates, setButtonStates] = useState({
//     ad1: true,
//     ad2: false,
//     ad3: false,
//     continue: false
//   });

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
//   }, [router]);

//   const handleAdButtonClick = (buttonNumber) => {
//     // Open Partnerhouse link in new tab
//     // const adLinks = {
//     //   1: "https://hotbzepefa.cc/tds?id=1483675431&p1=sub1&p2=sub2&p3=sub3&p4=sub4",
//     //   2: "https://hotbzepefa.cc/tds?id=1483698232&p1=sub1&p2=sub2&p3=sub3&p4=sub4",
//     //   3: "https://hotbzepefa.cc/tds?id=1483675431&p1=sub1&p2=sub2&p3=sub3&p4=sub4"
//     // };

//     const adLinks = {
//       1: "https://hotbzepefa.cc/tds?id=1483675431&p1=sub1&p2=sub2&p3=sub3&p4=sub4", // Replace with your Partnerhouse link 1
//       2: "https://hotbzepefa.cc/tds?id=1483698232&p1=sub1&p2=sub2&p3=sub3&p4=sub4", // Replace with your Partnerhouse link 2
//       3: "https://hotbzepefa.cc/tds?id=1483675431&p1=sub1&p2=sub2&p3=sub3&p4=sub4"  // Replace with your Partnerhouse link 3
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

//   const handleContinue = () => {
//     setLoading(true);
//     setTimeout(() => {
//       window.open('/progress/step-5', "_blank", "noopener,noreferrer");
//     }, 1500);
//   };

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white flex flex-col items-center justify-center p-4">
//       <div className="w-full max-w-2xl bg-gray-800/30 backdrop-blur-lg rounded-2xl border border-gray-700 p-8 shadow-2xl">
//         <div className="text-center mb-10">
//           <h1 className="text-3xl md:text-4xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
//             Almost Ready
//           </h1>
//           <p className="text-gray-400">Your content is almost ready (Step 4 of 5)</p>
//         </div>

//         <div className="mb-12">
//           <div className="flex items-center justify-between mb-8">
//             {[1, 2, 3, 4, 5].map((step, index) => (
//               <div key={index} className="flex flex-col items-center relative">
//                 <div
//                   className={`w-12 h-12 rounded-full flex items-center justify-center z-10 transition-all duration-500 ${
//                     step <= 4
//                       ? "bg-gradient-to-r from-blue-500 to-purple-500 shadow-lg shadow-blue-500/30"
//                       : "bg-gray-700"
//                   }`}
//                 >
//                   {step <= 4 ? (
//                     <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" viewBox="0 0 20 20" fill="currentColor">
//                       <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
//                     </svg>
//                   ) : (
//                     <span className="text-gray-400">{step}</span>
//                   )}
//                 </div>
//                 <div className="mt-3 text-center">
//                   <div className={`font-medium ${step <= 4 ? "text-white" : "text-gray-400"}`}>
//                     Step {step}
//                   </div>
//                 </div>
//                 {index < 4 && (
//                   <div className="absolute top-6 left-12 w-[calc(100%+24px)] h-1 bg-gray-700 -z-10">
//                     <div className={`h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-700 ${
//                       step < 4 ? "w-full" : 
//                       step === 4 ? "w-3/4" : "w-0"
//                     }`}></div>
//                   </div>
//                 )}
//               </div>
//             ))}
//           </div>
//         </div>

//         <div className="text-center mb-10">
//           <h3 className="text-xl font-semibold mb-2">Verification</h3>
//           <p className="text-gray-400 mb-6">
//             Please complete the following steps to continue
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
//               className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-500"
//               style={{ 
//                 width: `${((Object.values(buttonStates).filter(Boolean).length - 1) / 3) * 100}%` 
//               }}
//             ></div>
//           </div>
//         </div>
        
//         {/* Continue Button */}
//         <div className="flex justify-center">
//           <motion.button
//             whileTap={{ scale: 0.9 }}
//             whileHover={{ scale: buttonStates.continue ? 1.05 : 1 }}
//             onClick={handleContinue}
//             disabled={!buttonStates.continue || loading}
//             className={`px-8 py-3 font-bold rounded-full flex items-center justify-center gap-2 transform transition-all duration-300 ${
//               buttonStates.continue && !loading
//                 ? "bg-gradient-to-r from-purple-600 to-indigo-600 hover:shadow-lg hover:shadow-purple-500/30 cursor-pointer"
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
//                 Continue to Final Step
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

// export default function ProgressPage4() {
//   return (
//     <Suspense fallback={<div className="text-white p-10">Loading...</div>}>
//       <ProgressPage4Content />
//     </Suspense>
//   );
// }




































// --------------- this is correct code ---------------


// "use client";
// import { useRouter } from "next/navigation";
// import { useEffect, useState, Suspense } from "react";

// function ProgressPage4Content() {
//   const router = useRouter();
// //   const [countdown, setCountdown] = useState(5); // 5 seconds countdown

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

//     // const timer = setInterval(() => {
//     //   setCountdown(prev => {
//     //     if (prev <= 1) {
//     //       clearInterval(timer);
//     //       router.push('/progress/step-5');
//     //       return 0;
//     //     }
//     //     return prev - 1;
//     //   });
//     // }, 1000);

//     return () => clearInterval(timer);
//   }, [router]);







//   const handleContinue = () => {
//     // router.push('/progress/step-5');

//     // https://brainfuel-poor-people.vercel.app/progress/step-5
//     // window.open(`https://link-hub.net/1385470/YfYRlLGwuecC`, "_blank", "noopener,noreferrer");
//     window.open('/progress/step-5', "_blank", "noopener,noreferrer");


//   };









//   return (
//     <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white flex flex-col items-center justify-center p-4">
//       <div className="w-full max-w-2xl bg-gray-800/30 backdrop-blur-lg rounded-2xl border border-gray-700 p-8 shadow-2xl">
//         <div className="text-center mb-10">
//           <h1 className="text-3xl md:text-4xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
//             Almost Ready
//           </h1>
//           <p className="text-gray-400">Your content is almost ready (Step 4 of 5)</p>
//         </div>

//         <div className="mb-12">
//           <div className="flex items-center justify-between mb-8">
//             {[1, 2, 3, 4, 5].map((step, index) => (
//               <div key={index} className="flex flex-col items-center relative">
//                 <div
//                   className={`w-12 h-12 rounded-full flex items-center justify-center z-10 transition-all duration-500 ${
//                     step <= 4
//                       ? "bg-gradient-to-r from-blue-500 to-purple-500 shadow-lg shadow-blue-500/30"
//                       : "bg-gray-700"
//                   }`}
//                 >
//                   {step <= 4 ? (
//                     <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" viewBox="0 0 20 20" fill="currentColor">
//                       <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
//                     </svg>
//                   ) : (
//                     <span className="text-gray-400">{step}</span>
//                   )}
//                 </div>
//                 <div className="mt-3 text-center">
//                   <div className={`font-medium ${step <= 4 ? "text-white" : "text-gray-400"}`}>
//                     Step {step}
//                   </div>
//                 </div>
//                 {index < 4 && (
//                   <div className="absolute top-6 left-12 w-[calc(100%+24px)] h-1 bg-gray-700 -z-10">
//                     <div className={`h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-700 ${
//                       step < 4 ? "w-full" : 
//                       step === 4 ? "w-3/4" : "w-0"
//                     }`}></div>
//                   </div>
//                 )}
//               </div>
//             ))}
//           </div>
//         </div>

//         <div className="text-center mb-10">
//           <div className="flex justify-center mb-6">
//             <div className="w-16 h-16 border-4 border-purple-500 rounded-full animate-pulse"></div>
//           </div>
//           <h3 className="text-xl font-semibold mb-2">Finalizing Your Download</h3>
//           {/* <p className="text-gray-400">
//             Just a few more seconds... {countdown}
//           </p> */}
//         </div>
        
//         <div className="flex justify-center">
//           <button
//             onClick={handleContinue}
//             className="px-8 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold rounded-full transform transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-purple-500/30 flex items-center"
//           >
//             Continue to Final Step
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// }

// export default function ProgressPage4() {
//   return (
//     <Suspense fallback={<div className="text-white p-10">Loading...</div>}>
//       <ProgressPage4Content />
//     </Suspense>
//   );
// }

// --------------- this is correct code ---------------























// ===========================================

// // app/progress/step-4/page.js
// "use client";
// import { useRouter } from "next/navigation";
// import { useEffect, useState, Suspense } from "react";

// function ProgressPage4Content() {
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
//         {/* Heading */}
//         <div className="text-center mb-10">
//           <h1 className="text-3xl md:text-4xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
//             Content Access - Complete
//           </h1>
//           <p className="text-gray-400">Your content is ready for download</p>
//         </div>
        
//         {/* ✅ Progress Stepper */}
//         <div className="mb-12">
//           <div className="flex items-center justify-between mb-8">
//             {[1, 2, 3, 4].map((step, index) => (
//               <div key={index} className="flex flex-col items-center relative">
//                 <div
//                   className={`w-12 h-12 rounded-full flex items-center justify-center z-10 transition-all duration-500 ${
//                     step <= 4
//                       ? "bg-gradient-to-r from-blue-500 to-purple-500 shadow-lg shadow-blue-500/30"
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
//                       step <= 4 ? "text-white" : "text-gray-400"
//                     }`}
//                   >
//                     Step {step}
//                   </div>
//                 </div>
//                 {index < 3 && (
//                   <div className="absolute top-6 left-12 w-[calc(100%+24px)] h-1 bg-gray-700 -z-10">
//                     <div
//                       className={`h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-700 ${
//                         step < 4 ? "w-full" : "w-0"
//                       }`}
//                     ></div>
//                   </div>
//                 )}
//               </div>
//             ))}
//           </div>
//         </div>
        
//         {/* ✅ Download Section */}
//         <div className="text-center mb-10">
//           <h3 className="text-xl font-semibold mb-2">Access Granted!</h3>
//           <p className="text-gray-400 mb-6">
//             Click the button below to download your content
//           </p>
//         </div>
        
//         {/* ✅ Download Button */}
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

// export default function ProgressPage4() {
//   return (
//     <Suspense fallback={<div className="text-white p-10">Loading...</div>}>
//       <ProgressPage4Content />
//     </Suspense>
//   );
// }












// "use client";
// import { useRouter, useSearchParams } from "next/navigation";
// import { useEffect, useState, Suspense } from "react";

// function ProgressPage4Content() {
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

//   const handleDownload = () => {
//     if (url) {
//       window.open(url, "_blank", "noopener,noreferrer");
//     }
//   };

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white flex flex-col items-center justify-center p-4">
//       <div className="w-full max-w-2xl bg-gray-800/30 backdrop-blur-lg rounded-2xl border border-gray-700 p-8 shadow-2xl">
//         {/* Heading */}
//         <div className="text-center mb-10">
//           <h1 className="text-3xl md:text-4xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
//             Content Access - Complete
//           </h1>
//           <p className="text-gray-400">Your content is ready for download</p>
//         </div>

//         {/* ✅ Progress Stepper */}
//         <div className="mb-12">
//           <div className="flex items-center justify-between mb-8">
//             {[1, 2, 3, 4].map((step, index) => (
//               <div key={index} className="flex flex-col items-center relative">
//                 <div
//                   className={`w-12 h-12 rounded-full flex items-center justify-center z-10 transition-all duration-500 ${
//                     step <= 4
//                       ? "bg-gradient-to-r from-blue-500 to-purple-500 shadow-lg shadow-blue-500/30"
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
//                       step <= 4 ? "text-white" : "text-gray-400"
//                     }`}
//                   >
//                     Step {step}
//                   </div>
//                 </div>
//                 {index < 3 && (
//                   <div className="absolute top-6 left-12 w-[calc(100%+24px)] h-1 bg-gray-700 -z-10">
//                     <div
//                       className={`h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-700 ${
//                         step < 4 ? "w-full" : "w-0"
//                       }`}
//                     ></div>
//                   </div>
//                 )}
//               </div>
//             ))}
//           </div>
//         </div>

//         {/* ✅ Download Section */}
//         <div className="text-center mb-10">
//           <h3 className="text-xl font-semibold mb-2">Access Granted!</h3>
//           <p className="text-gray-400 mb-6">
//             Click the button below to download your content
//           </p>
//         </div>

//         {/* ✅ Download Button */}
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

// export default function ProgressPage4() {
//   return (
//     <Suspense fallback={<div className="text-white p-10">Loading...</div>}>
//       <ProgressPage4Content />
//     </Suspense>
//   );
// }










// "use client";
// import { useRouter, useSearchParams } from "next/navigation";
// import { useEffect, useState, Suspense } from "react";

// function PageContent() {
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

//   const handleDownload = () => {
//     if (url) {
//       window.open(url, "_blank", "noopener,noreferrer");
//     }
//   };

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white flex flex-col items-center justify-center p-4">
//       <div className="w-full max-w-2xl bg-gray-800/30 backdrop-blur-lg rounded-2xl border border-gray-700 p-8 shadow-2xl">
//         <div className="text-center mb-10">
//           <h1 className="text-3xl md:text-4xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
//             Content Access - Complete
//           </h1>
//           <p className="text-gray-400">Your content is ready for download</p>
//         </div>

//         {/* Progress Stepper */}
//         <div className="mb-12">
//           <div className="flex items-center justify-between mb-8">
//             {[1, 2, 3, 4].map((step, index) => (
//               <div key={index} className="flex flex-col items-center relative">
//                 <div
//                   className={`w-12 h-12 rounded-full flex items-center justify-center z-10 transition-all duration-500 ${
//                     step <= 4
//                       ? "bg-gradient-to-r from-blue-500 to-purple-500 shadow-lg shadow-blue-500/30"
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
//                       step <= 4 ? "text-white" : "text-gray-400"
//                     }`}
//                   >
//                     Step {step}
//                   </div>
//                 </div>
//                 {index < 3 && (
//                   <div className="absolute top-6 left-12 w-[calc(100%+24px)] h-1 bg-gray-700 -z-10">
//                     <div
//                       className={`h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-700 ${
//                         step < 4 ? "w-full" : "w-0"
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

// // ✅ Wrap with Suspense
// export default function ProgressPage4() {
//   return (
//     <Suspense fallback={<div className="text-white p-8">Loading...</div>}>
//       <PageContent />
//     </Suspense>
//   );
// }













// "use client";
// import { useRouter, useSearchParams } from "next/navigation";
// import { useEffect, useState } from "react";

// export default function ProgressPage4() {
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

//   const handleDownload = () => {
//     if (url) {
//       window.open(url, "_blank", "noopener,noreferrer");
//     }
//   };

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white flex flex-col items-center justify-center p-4">
//       <div className="w-full max-w-2xl bg-gray-800/30 backdrop-blur-lg rounded-2xl border border-gray-700 p-8 shadow-2xl">
//         <div className="text-center mb-10">
//           <h1 className="text-3xl md:text-4xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
//             Content Access - Complete
//           </h1>
//           <p className="text-gray-400">Your content is ready for download</p>
//         </div>

//         {/* Progress Stepper */}
//         <div className="mb-12">
//           <div className="flex items-center justify-between mb-8">
//             {[1, 2, 3, 4].map((step, index) => (
//               <div key={index} className="flex flex-col items-center relative">
//                 <div 
//                   className={`w-12 h-12 rounded-full flex items-center justify-center z-10 transition-all duration-500 ${
//                     step <= 4 
//                       ? 'bg-gradient-to-r from-blue-500 to-purple-500 shadow-lg shadow-blue-500/30' 
//                       : 'bg-gray-700'
//                   }`}
//                 >
//                   <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" viewBox="0 0 20 20" fill="currentColor">
//                     <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
//                   </svg>
//                 </div>
//                 <div className="mt-3 text-center">
//                   <div className={`font-medium ${step <= 4 ? 'text-white' : 'text-gray-400'}`}>
//                     Step {step}
//                   </div>
//                 </div>
//                 {index < 3 && (
//                   <div className="absolute top-6 left-12 w-[calc(100%+24px)] h-1 bg-gray-700 -z-10">
//                     <div 
//                       className={`h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-700 ${
//                         step < 4 ? 'w-full' : 'w-0'
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
//           <p className="text-gray-400 mb-6">Click the button below to download your content</p>
//         </div>

//         <div className="flex justify-center">
//           <button
//             onClick={handleDownload}
//             className="px-8 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold rounded-full transform transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-green-500/30 flex items-center"
//           >
//             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
//               <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
//             </svg>
//             Download Now
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// }












// "use client";
// import { useRouter, useSearchParams } from "next/navigation";
// import { useEffect, useState } from "react";

// export default function ProgressPage4() {
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

//   const handleDownload = () => {
//     if (url) {
//       window.open(url, "_blank", "noopener,noreferrer");
//     }
//   };

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white flex flex-col items-center justify-center p-4">
//       <div className="w-full max-w-2xl bg-gray-800/30 backdrop-blur-lg rounded-2xl border border-gray-700 p-8 shadow-2xl">
//         <div className="text-center mb-10">
//           <h1 className="text-3xl md:text-4xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
//             Content Access - Complete
//           </h1>
//           <p className="text-gray-400">Your content is ready for download</p>
//         </div>

//         {/* Progress Stepper */}
//         <div className="mb-12">
//           <div className="flex items-center justify-between mb-8">
//             {[1, 2, 3, 4].map((step, index) => (
//               <div key={index} className="flex flex-col items-center relative">
//                 <div 
//                   className={`w-12 h-12 rounded-full flex items-center justify-center z-10 transition-all duration-500 ${
//                     step <= 4 
//                       ? 'bg-gradient-to-r from-blue-500 to-purple-500 shadow-lg shadow-blue-500/30' 
//                       : 'bg-gray-700'
//                   }`}
//                 >
//                   <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" viewBox="0 0 20 20" fill="currentColor">
//                     <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
//                   </svg>
//                 </div>
//                 <div className="mt-3 text-center">
//                   <div className={`font-medium ${step <= 4 ? 'text-white' : 'text-gray-400'}`}>
//                     Step {step}
//                   </div>
//                 </div>
//                 {index < 3 && (
//                   <div className="absolute top-6 left-12 w-[calc(100%+24px)] h-1 bg-gray-700 -z-10">
//                     <div 
//                       className={`h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-700 ${
//                         step < 4 ? 'w-full' : 'w-0'
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
//           <p className="text-gray-400 mb-6">Click the button below to download your content</p>
          
//           {url && (
//             <div className="p-3 bg-gray-700/50 rounded-lg">
//               <p className="text-xs text-gray-400 mb-1">Download URL:</p>
//               <p className="text-sm text-blue-300 break-all">{url}</p>
//             </div>
//           )}
//         </div>

//         <div className="flex justify-center">
//           <button
//             onClick={handleDownload}
//             className="px-8 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold rounded-full transform transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-green-500/30 flex items-center"
//           >
//             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
//               <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
//             </svg>
//             Download Now
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// }