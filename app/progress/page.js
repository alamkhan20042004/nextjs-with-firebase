"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { motion } from "framer-motion";

function ProgressContent() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [buttonStates, setButtonStates] = useState({
    ad1: true,
    ad2: false,
    ad3: false,
    continue: false
  });

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

  const handleAdButtonClick = (buttonNumber) => {
    // Open Adsterra link in new tab
    const adLinks = {
      1: "https://www.revenuecpmgate.com/ux5skvyg?key=83356a761aa7ce60986ccf836290e715", // Replace with your Adsterra link 1
      2: "https://www.revenuecpmgate.com/ux5skvyg?key=83356a761aa7ce60986ccf836290e715", // Replace with your Adsterra link 2
      3: "https://www.revenuecpmgate.com/ux5skvyg?key=83356a761aa7ce60986ccf836290e715"  // Replace with your Adsterra link 3
    };
    
    window.open(adLinks[buttonNumber], "_blank", "noopener,noreferrer");
    
    // Enable next button
    if (buttonNumber === 1) {
      setButtonStates(prev => ({ ...prev, ad2: true }));
    } else if (buttonNumber === 2) {
      setButtonStates(prev => ({ ...prev, ad3: true }));
    } else if (buttonNumber === 3) {
      setButtonStates(prev => ({ ...prev, continue: true }));
    }
  };

  const handleContinue = () => {
    setLoading(true);
    // Button click animation ke baad thoda delay
    setTimeout(() => {
      // Redirect to step-2 without passing data in URL
      // window.open('/progress/step-2', "_blank", "noopener,noreferrer");
      window.open('https://brain-fuel-skills.blogspot.com/2025/09/nooo.html', "_blank", "noopener,noreferrer");

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
          <p className="text-gray-400 mb-6">
            Please complete the following steps to continue
          </p>
        </div>
        
        {/* Adsterra Buttons */}
        <div className="space-y-4 mb-8">
          {/* Ad Button 1 */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            whileHover={{ scale: buttonStates.ad1 ? 1.02 : 1 }}
            onClick={() => handleAdButtonClick(1)}
            disabled={!buttonStates.ad1}
            className={`w-full py-3 font-bold rounded-lg flex items-center justify-center gap-2 transform transition-all duration-300 ${
              buttonStates.ad1
                ? "bg-gradient-to-r from-green-600 to-emerald-600 hover:shadow-lg hover:shadow-green-500/30 cursor-pointer"
                : "bg-gradient-to-r from-gray-600 to-gray-700 cursor-not-allowed opacity-70"
            }`}
          >
            {buttonStates.ad1 ? (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                </svg>
                Click Ad 1 (Required)
              </>
            ) : (
              "Ad 1 - Click to Enable Next Step"
            )}
          </motion.button>

          {/* Ad Button 2 */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            whileHover={{ scale: buttonStates.ad2 ? 1.02 : 1 }}
            onClick={() => handleAdButtonClick(2)}
            disabled={!buttonStates.ad2}
            className={`w-full py-3 font-bold rounded-lg flex items-center justify-center gap-2 transform transition-all duration-300 ${
              buttonStates.ad2
                ? "bg-gradient-to-r from-orange-600 to-amber-600 hover:shadow-lg hover:shadow-orange-500/30 cursor-pointer"
                : "bg-gradient-to-r from-gray-600 to-gray-700 cursor-not-allowed opacity-70"
            }`}
          >
            {buttonStates.ad2 ? (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                </svg>
                Click Ad 2 (Required)
              </>
            ) : (
              "Ad 2 - Complete Step 1 First"
            )}
          </motion.button>

          {/* Ad Button 3 */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            whileHover={{ scale: buttonStates.ad3 ? 1.02 : 1 }}
            onClick={() => handleAdButtonClick(3)}
            disabled={!buttonStates.ad3}
            className={`w-full py-3 font-bold rounded-lg flex items-center justify-center gap-2 transform transition-all duration-300 ${
              buttonStates.ad3
                ? "bg-gradient-to-r from-red-600 to-pink-600 hover:shadow-lg hover:shadow-red-500/30 cursor-pointer"
                : "bg-gradient-to-r from-gray-600 to-gray-700 cursor-not-allowed opacity-70"
            }`}
          >
            {buttonStates.ad3 ? (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                </svg>
                Click Ad 3 (Required)
              </>
            ) : (
              "Ad 3 - Complete Step 2 First"
            )}
          </motion.button>
        </div>

        {/* Progress Indicator */}
        <div className="mb-6 p-4 bg-gray-800/50 rounded-lg">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-400">Progress:</span>
            <span className="text-sm font-medium">
              {Object.values(buttonStates).filter(Boolean).length - 1}/3 ads completed
            </span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-500"
              style={{ 
                width: `${((Object.values(buttonStates).filter(Boolean).length - 1) / 3) * 100}%` 
              }}
            ></div>
          </div>
        </div>
        
        {/* Original Continue Button */}
        <div className="flex justify-center">
          <motion.button
            whileTap={{ scale: 0.9 }}
            whileHover={{ scale: buttonStates.continue ? 1.05 : 1 }}
            onClick={handleContinue}
            disabled={!buttonStates.continue || loading}
            className={`px-8 py-3 font-bold rounded-full flex items-center justify-center gap-2 transform transition-all duration-300 ${
              buttonStates.continue && !loading
                ? "bg-gradient-to-r from-blue-600 to-purple-600 hover:shadow-lg hover:shadow-blue-500/30 cursor-pointer"
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






// "use client";
// import { useRouter } from "next/navigation";
// import { useEffect, useState, Suspense, useRef } from "react";
// import { motion } from "framer-motion";

// function ProgressContent() {
//   const router = useRouter();
//   const [loading, setLoading] = useState(false);
//   const [adBlockDetected, setAdBlockDetected] = useState(false);
//   const [buttonStates, setButtonStates] = useState({
//     ad1: false,
//     ad2: false,
//     ad3: false,
//     continue: false
//   });
//   const [adProgress, setAdProgress] = useState({
//     ad1: { completed: false, timeLeft: 0, loading: false },
//     ad2: { completed: false, timeLeft: 0, loading: false },
//     ad3: { completed: false, timeLeft: 0, loading: false }
//   });

//   const timerRefs = useRef({ ad1: null, ad2: null, ad3: null });
//   const progressIntervalRefs = useRef({ ad1: null, ad2: null, ad3: null });
//   const adTabs = useRef({ ad1: null, ad2: null, ad3: null });
//   const adStartTimes = useRef({ ad1: null, ad2: null, ad3: null });

//   // Minimum time user must stay on ad page (10 seconds)
//   const MIN_AD_TIME = 10000;

//   // Detect AdBlock
//   const detectAdBlock = () => {
//     return new Promise((resolve) => {
//       const ad = document.createElement('div');
//       ad.innerHTML = '&nbsp;';
//       ad.className = 'adsbox';
//       ad.style.position = 'absolute';
//       ad.style.left = '-999px';
//       ad.style.top = '-999px';
//       ad.style.width = '1px';
//       ad.style.height = '1px';
//       document.body.appendChild(ad);
      
//       setTimeout(() => {
//         const isBlocked = ad.offsetHeight === 0;
//         document.body.removeChild(ad);
//         resolve(isBlocked);
//       }, 100);
//     });
//   };

//   useEffect(() => {
//     const checkAdBlock = async () => {
//       const hasAdBlock = await detectAdBlock();
//       setAdBlockDetected(hasAdBlock);
      
//       // Only enable first button if no AdBlock
//       if (!hasAdBlock) {
//         setButtonStates(prev => ({ ...prev, ad1: true }));
//       }
//     };

//     checkAdBlock();

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
//     }

//     // Cleanup timers on unmount
//     return () => {
//       Object.values(timerRefs.current).forEach(timer => {
//         if (timer) clearTimeout(timer);
//       });
//       Object.values(progressIntervalRefs.current).forEach(interval => {
//         if (interval) clearInterval(interval);
//       });
//       Object.values(adTabs.current).forEach(tab => {
//         if (tab && !tab.closed) tab.close();
//       });
//     };
//   }, [router]);

//   // Check AdBlock periodically
//   useEffect(() => {
//     if (adBlockDetected) {
//       const interval = setInterval(async () => {
//         const hasAdBlock = await detectAdBlock();
//         if (!hasAdBlock) {
//           setAdBlockDetected(false);
//           setButtonStates(prev => ({ ...prev, ad1: true }));
//           clearInterval(interval);
//         }
//       }, 2000);
//       return () => clearInterval(interval);
//     }
//   }, [adBlockDetected]);

//   const startAdTimer = (buttonNumber) => {
//     const adKey = `ad${buttonNumber}`;
//     const startTime = Date.now();
//     adStartTimes.current[adKey] = startTime;
//     let timeLeft = MIN_AD_TIME;

//     // Update progress every 100ms for smooth countdown
//     progressIntervalRefs.current[adKey] = setInterval(() => {
//       timeLeft = Math.max(0, MIN_AD_TIME - (Date.now() - startTime));
//       setAdProgress(prev => ({
//         ...prev,
//         [adKey]: { ...prev[adKey], timeLeft, loading: timeLeft > 0 }
//       }));

//       if (timeLeft <= 0) {
//         clearInterval(progressIntervalRefs.current[adKey]);
//         completeAdStep(buttonNumber);
//       }
//     }, 100);

//     // Store timer reference
//     timerRefs.current[adKey] = setTimeout(() => {
//       completeAdStep(buttonNumber);
//     }, MIN_AD_TIME);
//   };

//   const completeAdStep = (buttonNumber) => {
//     const adKey = `ad${buttonNumber}`;
    
//     // Clear intervals and timers
//     if (progressIntervalRefs.current[adKey]) {
//       clearInterval(progressIntervalRefs.current[adKey]);
//     }
//     if (timerRefs.current[adKey]) {
//       clearTimeout(timerRefs.current[adKey]);
//     }

//     // Mark ad as completed
//     setAdProgress(prev => ({
//       ...prev,
//       [adKey]: { completed: true, timeLeft: 0, loading: false }
//     }));

//     // Enable next button
//     if (buttonNumber === 1) {
//       setButtonStates(prev => ({ ...prev, ad2: true }));
//     } else if (buttonNumber === 2) {
//       setButtonStates(prev => ({ ...prev, ad3: true }));
//     } else if (buttonNumber === 3) {
//       setButtonStates(prev => ({ ...prev, continue: true }));
//     }
//   };

//   const handleAdButtonClick = async (buttonNumber) => {
//     // Check AdBlock again before opening ad
//     const hasAdBlock = await detectAdBlock();
//     if (hasAdBlock) {
//       setAdBlockDetected(true);
//       return;
//     }

//     // Open Adsterra link in new tab
//     const adLinks = {
//       1: "https://www.revenuecpmgate.com/ux5skvyg?key=83356a761aa7ce60986ccf836290e715",
//       2: "https://www.revenuecpmgate.com/ux5skvyg?key=83356a761aa7ce60986ccf836290e715",
//       3: "https://www.revenuecpmgate.com/ux5skvyg?key=83356a761aa7ce60986ccf836290e715"
//     };
    
//     const adKey = `ad${buttonNumber}`;
//     const newTab = window.open(adLinks[buttonNumber], `ad_${buttonNumber}`, "width=800,height=600,noopener,noreferrer");
    
//     if (newTab) {
//       adTabs.current[adKey] = newTab;
      
//       // Disable current button and start timer
//       setButtonStates(prev => ({ ...prev, [adKey]: false }));
//       setAdProgress(prev => ({
//         ...prev,
//         [adKey]: { ...prev[adKey], loading: true, timeLeft: MIN_AD_TIME }
//       }));
//       startAdTimer(buttonNumber);

//       // Monitor tab closure
//       const checkTabClosed = setInterval(() => {
//         if (newTab.closed) {
//           clearInterval(checkTabClosed);
//           const timeSpent = Date.now() - adStartTimes.current[adKey];
//           if (timeSpent < MIN_AD_TIME) {
//             // User closed tab too early - reset progress
//             handleAdTabClosedEarly(buttonNumber, timeSpent);
//           }
//         }
//       }, 500);
//     }
//   };

//   const handleAdTabClosedEarly = (buttonNumber, timeSpent) => {
//     const adKey = `ad${buttonNumber}`;
    
//     // Clear timers
//     if (progressIntervalRefs.current[adKey]) {
//       clearInterval(progressIntervalRefs.current[adKey]);
//     }
//     if (timerRefs.current[adKey]) {
//       clearTimeout(timerRefs.current[adKey]);
//     }

//     // Reset progress for this ad
//     setAdProgress(prev => ({
//       ...prev,
//       [adKey]: { completed: false, timeLeft: 0, loading: false }
//     }));

//     // Re-enable current button
//     setButtonStates(prev => ({ ...prev, [adKey]: true }));

//     // Show warning message
//     alert(`⚠️ Ad tab closed too early! You only spent ${Math.round(timeSpent/1000)} seconds. Please view the ad for at least 10 seconds.`);
//   };

//   const handleContinue = () => {
//     setLoading(true);
//     setTimeout(() => {
//       window.open('/progress/step-2', "_blank", "noopener,noreferrer");
//     }, 1500);
//   };

//   const getAdButtonText = (buttonNumber) => {
//     const adKey = `ad${buttonNumber}`;
//     const progress = adProgress[adKey];
    
//     if (progress.completed) {
//       return `✓ Ad ${buttonNumber} Completed`;
//     } else if (progress.timeLeft > 0) {
//       const seconds = Math.ceil(progress.timeLeft / 1000);
//       return `Viewing Ad... ${seconds}s remaining`;
//     } else if (buttonStates[adKey]) {
//       return `Click Ad ${buttonNumber} (Required)`;
//     } else {
//       return `Complete Previous Ad First`;
//     }
//   };

//   const getAdButtonColor = (buttonNumber) => {
//     const adKey = `ad${buttonNumber}`;
//     const progress = adProgress[adKey];
    
//     if (progress.completed) {
//       return "from-green-600 to-emerald-600 shadow-green-500/30";
//     } else if (progress.timeLeft > 0) {
//       return "from-yellow-600 to-amber-600 shadow-yellow-500/30";
//     } else if (buttonStates[adKey]) {
//       const colors = {
//         1: "from-green-600 to-emerald-600 shadow-green-500/30",
//         2: "from-orange-600 to-amber-600 shadow-orange-500/30",
//         3: "from-red-600 to-pink-600 shadow-red-500/30"
//       };
//       return colors[buttonNumber];
//     } else {
//       return "from-gray-600 to-gray-700";
//     }
//   };

//   const isButtonDisabled = (buttonNumber) => {
//     const adKey = `ad${buttonNumber}`;
//     return adBlockDetected || !buttonStates[adKey] || adProgress[adKey].loading || adProgress[adKey].completed;
//   };

//   const completedAdsCount = Object.values(adProgress).filter(ad => ad.completed).length;

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white flex flex-col items-center justify-center p-4">
//       {/* AdBlock Blocking Modal */}
//       {adBlockDetected && (
//         <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
//           <motion.div
//             initial={{ scale: 0.9, opacity: 0 }}
//             animate={{ scale: 1, opacity: 1 }}
//             className="bg-gray-800 rounded-2xl border border-red-500/50 p-8 max-w-md w-full text-center"
//           >
//             <div className="text-red-400 text-6xl mb-4">⚠️</div>
//             <h2 className="text-2xl font-bold mb-4">AdBlock Detected</h2>
//             <p className="text-gray-300 mb-6">
//               Please disable AdBlock to continue. Ads are required to unlock access to the content.
//             </p>
//             <div className="bg-gray-700/50 rounded-lg p-4 mb-6">
//               <p className="text-sm text-gray-400">
//                 We need to verify ad views to provide free content. Please disable your ad blocker and refresh the page.
//               </p>
//             </div>
//             <button
//               onClick={() => window.location.reload()}
//               className="bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 px-6 py-3 rounded-lg font-bold transition-all duration-300"
//             >
//               I've Disabled AdBlock - Refresh Page
//             </button>
//           </motion.div>
//         </div>
//       )}

//       <div className="w-full max-w-2xl bg-gray-800/30 backdrop-blur-lg rounded-2xl border border-gray-700 p-8 shadow-2xl">
//         <div className="text-center mb-10">
//           <h1 className="text-3xl md:text-4xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
//             Content Access - Step 1
//           </h1>
//           <p className="text-gray-400">Verifying your access (Step 1 of 5)</p>
//         </div>
        
//         {/* Progress Stepper */}
//         <div className="mb-12">
//           <div className="flex items-center justify-between mb-8">
//             {[1, 2, 3, 4, 5].map((step, index) => (
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
//                 {index < 4 && (
//                   <div className="absolute top-6 left-12 w-[calc(100%+24px)] h-1 bg-gray-700 -z-10"></div>
//                 )}
//               </div>
//             ))}
//           </div>
//         </div>
        
//         <div className="text-center mb-10">
//           <h3 className="text-xl font-semibold mb-2">Ad Verification Required</h3>
//           <p className="text-gray-400 mb-6">
//             Please view each ad for 10 seconds to continue. Do not close the ad tabs early.
//           </p>
//         </div>
        
//         {/* Adsterra Buttons */}
//         <div className="space-y-4 mb-8">
//           {[1, 2, 3].map((buttonNumber) => {
//             const adKey = `ad${buttonNumber}`;
//             const progress = adProgress[adKey];
            
//             return (
//               <motion.button
//                 key={buttonNumber}
//                 whileTap={{ scale: !isButtonDisabled(buttonNumber) ? 0.95 : 1 }}
//                 whileHover={{ 
//                   scale: !isButtonDisabled(buttonNumber) ? 1.02 : 1 
//                 }}
//                 onClick={() => handleAdButtonClick(buttonNumber)}
//                 disabled={isButtonDisabled(buttonNumber)}
//                 className={`w-full py-4 font-bold rounded-lg flex items-center justify-center gap-3 transform transition-all duration-300 ${
//                   !isButtonDisabled(buttonNumber)
//                     ? `bg-gradient-to-r ${getAdButtonColor(buttonNumber)} hover:shadow-lg cursor-pointer`
//                     : "bg-gradient-to-r from-gray-600 to-gray-700 cursor-not-allowed opacity-70"
//                 }`}
//               >
//                 {progress.loading ? (
//                   <div className="flex items-center gap-3">
//                     <svg className="animate-spin h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
//                       <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
//                       <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a12 12 0 00-12 12h4z"></path>
//                     </svg>
//                     <span>{getAdButtonText(buttonNumber)}</span>
//                   </div>
//                 ) : progress.completed ? (
//                   <>
//                     <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
//                       <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
//                     </svg>
//                     <span>{getAdButtonText(buttonNumber)}</span>
//                   </>
//                 ) : (
//                   <>
//                     <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
//                       <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
//                     </svg>
//                     <span>{getAdButtonText(buttonNumber)}</span>
//                   </>
//                 )}
//               </motion.button>
//             );
//           })}
//         </div>

//         {/* Progress Indicator */}
//         <div className="mb-6 p-4 bg-gray-800/50 rounded-lg">
//           <div className="flex justify-between items-center mb-2">
//             <span className="text-sm text-gray-400">Ad Progress:</span>
//             <span className="text-sm font-medium">
//               {completedAdsCount}/3 ads completed
//             </span>
//           </div>
//           <div className="w-full bg-gray-700 rounded-full h-3">
//             <div 
//               className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all duration-500"
//               style={{ 
//                 width: `${(completedAdsCount / 3) * 100}%` 
//               }}
//             ></div>
//           </div>
//           <p className="text-xs text-gray-400 mt-2 text-center">
//             Each ad requires 10 seconds of viewing time. Do not close ad tabs early.
//           </p>
//         </div>
        
//         {/* Original Continue Button */}
//         <div className="flex justify-center">
//           <motion.button
//             whileTap={{ scale: 0.9 }}
//             whileHover={{ scale: buttonStates.continue && !adBlockDetected ? 1.05 : 1 }}
//             onClick={handleContinue}
//             disabled={!buttonStates.continue || loading || adBlockDetected}
//             className={`px-8 py-3 font-bold rounded-full flex items-center justify-center gap-2 transform transition-all duration-300 ${
//               buttonStates.continue && !loading && !adBlockDetected
//                 ? "bg-gradient-to-r from-blue-600 to-purple-600 hover:shadow-lg hover:shadow-blue-500/30 cursor-pointer"
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
// import { useRouter } from "next/navigation";
// import { useEffect, useState, Suspense, useRef } from "react";
// import { motion } from "framer-motion";

// function ProgressContent() {
//   const router = useRouter();
//   const [loading, setLoading] = useState(false);
//   const [buttonStates, setButtonStates] = useState({
//     ad1: true,
//     ad2: false,
//     ad3: false,
//     continue: false
//   });
//   const [adTimers, setAdTimers] = useState({
//     ad1: null,
//     ad2: null,
//     ad3: null
//   });
//   const [adProgress, setAdProgress] = useState({
//     ad1: { completed: false, timeLeft: 0 },
//     ad2: { completed: false, timeLeft: 0 },
//     ad3: { completed: false, timeLeft: 0 }
//   });

//   const timerRefs = useRef({
//     ad1: null,
//     ad2: null,
//     ad3: null
//   });
//   const progressIntervalRefs = useRef({
//     ad1: null,
//     ad2: null,
//     ad3: null
//   });

//   // Minimum time user must stay on ad page (10 seconds)
//   const MIN_AD_TIME = 10000;

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
//     }

//     // Cleanup timers on unmount
//     return () => {
//       Object.values(timerRefs.current).forEach(timer => {
//         if (timer) clearTimeout(timer);
//       });
//       Object.values(progressIntervalRefs.current).forEach(interval => {
//         if (interval) clearInterval(interval);
//       });
//     };
//   }, [router]);

//   const startAdTimer = (buttonNumber) => {
//     const adKey = `ad${buttonNumber}`;
//     const startTime = Date.now();
//     let timeLeft = MIN_AD_TIME;

//     // Update progress every second
//     progressIntervalRefs.current[adKey] = setInterval(() => {
//       timeLeft = Math.max(0, MIN_AD_TIME - (Date.now() - startTime));
//       setAdProgress(prev => ({
//         ...prev,
//         [adKey]: { ...prev[adKey], timeLeft }
//       }));

//       if (timeLeft <= 0) {
//         clearInterval(progressIntervalRefs.current[adKey]);
//         completeAdStep(buttonNumber);
//       }
//     }, 100);

//     // Store timer reference
//     timerRefs.current[adKey] = setTimeout(() => {
//       completeAdStep(buttonNumber);
//     }, MIN_AD_TIME);

//     setAdTimers(prev => ({
//       ...prev,
//       [adKey]: MIN_AD_TIME
//     }));
//   };

//   const completeAdStep = (buttonNumber) => {
//     const adKey = `ad${buttonNumber}`;
    
//     // Clear intervals
//     if (progressIntervalRefs.current[adKey]) {
//       clearInterval(progressIntervalRefs.current[adKey]);
//     }
//     if (timerRefs.current[adKey]) {
//       clearTimeout(timerRefs.current[adKey]);
//     }

//     // Mark ad as completed
//     setAdProgress(prev => ({
//       ...prev,
//       [adKey]: { completed: true, timeLeft: 0 }
//     }));

//     // Enable next button
//     if (buttonNumber === 1) {
//       setButtonStates(prev => ({ ...prev, ad2: true }));
//     } else if (buttonNumber === 2) {
//       setButtonStates(prev => ({ ...prev, ad3: true }));
//     } else if (buttonNumber === 3) {
//       setButtonStates(prev => ({ ...prev, continue: true }));
//     }
//   };

//   const handleAdButtonClick = (buttonNumber) => {
//     // Open Adsterra link in new tab
//     const adLinks = {
//       1: "https://www.revenuecpmgate.com/ux5skvyg?key=83356a761aa7ce60986ccf836290e715",
//       2: "https://www.revenuecpmgate.com/ux5skvyg?key=83356a761aa7ce60986ccf836290e715",
//       3: "https://www.revenuecpmgate.com/ux5skvyg?key=83356a761aa7ce60986ccf836290e715"
//     };
    
//     const newTab = window.open(adLinks[buttonNumber], "_blank", "noopener,noreferrer");
    
//     if (newTab) {
//       // Disable current button and start timer
//       setButtonStates(prev => ({ ...prev, [`ad${buttonNumber}`]: false }));
//       startAdTimer(buttonNumber);
//     }
//   };

//   const handleContinue = () => {
//     setLoading(true);
//     setTimeout(() => {
//       window.open('/progress/step-2', "_blank", "noopener,noreferrer");
//     }, 1500);
//   };

//   const getAdButtonText = (buttonNumber) => {
//     const adKey = `ad${buttonNumber}`;
//     const progress = adProgress[adKey];
    
//     if (progress.completed) {
//       return `✓ Ad ${buttonNumber} Completed`;
//     } else if (progress.timeLeft > 0) {
//       const seconds = Math.ceil(progress.timeLeft / 1000);
//       return `Please wait... ${seconds}s`;
//     } else if (buttonStates[adKey]) {
//       return `Click Ad ${buttonNumber} (Required)`;
//     } else {
//       const prevAd = `ad${buttonNumber - 1}`;
//       return buttonNumber === 1 ? "Click to Start" : `Complete Ad ${buttonNumber - 1} First`;
//     }
//   };

//   const getAdButtonColor = (buttonNumber) => {
//     const adKey = `ad${buttonNumber}`;
//     const progress = adProgress[adKey];
    
//     if (progress.completed) {
//       return "from-green-600 to-emerald-600 shadow-green-500/30";
//     } else if (progress.timeLeft > 0) {
//       return "from-yellow-600 to-amber-600 shadow-yellow-500/30";
//     } else if (buttonStates[adKey]) {
//       const colors = {
//         1: "from-green-600 to-emerald-600 shadow-green-500/30",
//         2: "from-orange-600 to-amber-600 shadow-orange-500/30",
//         3: "from-red-600 to-pink-600 shadow-red-500/30"
//       };
//       return colors[buttonNumber];
//     } else {
//       return "from-gray-600 to-gray-700";
//     }
//   };

//   const completedAdsCount = Object.values(adProgress).filter(ad => ad.completed).length;

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white flex flex-col items-center justify-center p-4">
//       <div className="w-full max-w-2xl bg-gray-800/30 backdrop-blur-lg rounded-2xl border border-gray-700 p-8 shadow-2xl">
//         <div className="text-center mb-10">
//           <h1 className="text-3xl md:text-4xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
//             Content Access - Step 1
//           </h1>
//           <p className="text-gray-400">Verifying your access (Step 1 of 5)</p>
//         </div>
        
//         {/* Progress Stepper */}
//         <div className="mb-12">
//           <div className="flex items-center justify-between mb-8">
//             {[1, 2, 3, 4, 5].map((step, index) => (
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
//                 {index < 4 && (
//                   <div className="absolute top-6 left-12 w-[calc(100%+24px)] h-1 bg-gray-700 -z-10"></div>
//                 )}
//               </div>
//             ))}
//           </div>
//         </div>
        
//         <div className="text-center mb-10">
//           <h3 className="text-xl font-semibold mb-2">Ad Verification Required</h3>
//           <p className="text-gray-400 mb-6">
//             Please view each ad for 10 seconds to continue. Do not close the ad tabs early.
//           </p>
//         </div>
        
//         {/* Adsterra Buttons */}
//         <div className="space-y-4 mb-8">
//           {/* Ad Button 1 */}
//           <motion.button
//             whileTap={{ scale: buttonStates.ad1 && !adProgress.ad1.timeLeft ? 0.95 : 1 }}
//             whileHover={{ 
//               scale: buttonStates.ad1 && !adProgress.ad1.timeLeft && !adProgress.ad1.completed ? 1.02 : 1 
//             }}
//             onClick={() => handleAdButtonClick(1)}
//             disabled={!buttonStates.ad1 || adProgress.ad1.timeLeft > 0 || adProgress.ad1.completed}
//             className={`w-full py-3 font-bold rounded-lg flex items-center justify-center gap-2 transform transition-all duration-300 ${
//               buttonStates.ad1 && !adProgress.ad1.timeLeft
//                 ? `bg-gradient-to-r ${getAdButtonColor(1)} hover:shadow-lg cursor-pointer`
//                 : "bg-gradient-to-r from-gray-600 to-gray-700 cursor-not-allowed opacity-70"
//             }`}
//           >
//             {adProgress.ad1.timeLeft > 0 ? (
//               <div className="flex items-center gap-2">
//                 <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
//                   <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
//                   <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a12 12 0 00-12 12h4z"></path>
//                 </svg>
//                 {getAdButtonText(1)}
//               </div>
//             ) : adProgress.ad1.completed ? (
//               <>
//                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
//                   <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
//                 </svg>
//                 {getAdButtonText(1)}
//               </>
//             ) : (
//               <>
//                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
//                   <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
//                 </svg>
//                 {getAdButtonText(1)}
//               </>
//             )}
//           </motion.button>

//           {/* Ad Button 2 */}
//           <motion.button
//             whileTap={{ scale: buttonStates.ad2 && !adProgress.ad2.timeLeft ? 0.95 : 1 }}
//             whileHover={{ 
//               scale: buttonStates.ad2 && !adProgress.ad2.timeLeft && !adProgress.ad2.completed ? 1.02 : 1 
//             }}
//             onClick={() => handleAdButtonClick(2)}
//             disabled={!buttonStates.ad2 || adProgress.ad2.timeLeft > 0 || adProgress.ad2.completed}
//             className={`w-full py-3 font-bold rounded-lg flex items-center justify-center gap-2 transform transition-all duration-300 ${
//               buttonStates.ad2 && !adProgress.ad2.timeLeft
//                 ? `bg-gradient-to-r ${getAdButtonColor(2)} hover:shadow-lg cursor-pointer`
//                 : "bg-gradient-to-r from-gray-600 to-gray-700 cursor-not-allowed opacity-70"
//             }`}
//           >
//             {adProgress.ad2.timeLeft > 0 ? (
//               <div className="flex items-center gap-2">
//                 <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
//                   <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
//                   <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a12 12 0 00-12 12h4z"></path>
//                 </svg>
//                 {getAdButtonText(2)}
//               </div>
//             ) : adProgress.ad2.completed ? (
//               <>
//                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
//                   <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
//                 </svg>
//                 {getAdButtonText(2)}
//               </>
//             ) : (
//               getAdButtonText(2)
//             )}
//           </motion.button>

//           {/* Ad Button 3 */}
//           <motion.button
//             whileTap={{ scale: buttonStates.ad3 && !adProgress.ad3.timeLeft ? 0.95 : 1 }}
//             whileHover={{ 
//               scale: buttonStates.ad3 && !adProgress.ad3.timeLeft && !adProgress.ad3.completed ? 1.02 : 1 
//             }}
//             onClick={() => handleAdButtonClick(3)}
//             disabled={!buttonStates.ad3 || adProgress.ad3.timeLeft > 0 || adProgress.ad3.completed}
//             className={`w-full py-3 font-bold rounded-lg flex items-center justify-center gap-2 transform transition-all duration-300 ${
//               buttonStates.ad3 && !adProgress.ad3.timeLeft
//                 ? `bg-gradient-to-r ${getAdButtonColor(3)} hover:shadow-lg cursor-pointer`
//                 : "bg-gradient-to-r from-gray-600 to-gray-700 cursor-not-allowed opacity-70"
//             }`}
//           >
//             {adProgress.ad3.timeLeft > 0 ? (
//               <div className="flex items-center gap-2">
//                 <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
//                   <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
//                   <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a12 12 0 00-12 12h4z"></path>
//                 </svg>
//                 {getAdButtonText(3)}
//               </div>
//             ) : adProgress.ad3.completed ? (
//               <>
//                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
//                   <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
//                 </svg>
//                 {getAdButtonText(3)}
//               </>
//             ) : (
//               getAdButtonText(3)
//             )}
//           </motion.button>
//         </div>

//         {/* Progress Indicator */}
//         <div className="mb-6 p-4 bg-gray-800/50 rounded-lg">
//           <div className="flex justify-between items-center mb-2">
//             <span className="text-sm text-gray-400">Ad Progress:</span>
//             <span className="text-sm font-medium">
//               {completedAdsCount}/3 ads completed
//             </span>
//           </div>
//           <div className="w-full bg-gray-700 rounded-full h-2">
//             <div 
//               className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-500"
//               style={{ 
//                 width: `${(completedAdsCount / 3) * 100}%` 
//               }}
//             ></div>
//           </div>
//           <p className="text-xs text-gray-400 mt-2 text-center">
//             Each ad requires 10 seconds of viewing time
//           </p>
//         </div>
        
//         {/* Original Continue Button */}
//         <div className="flex justify-center">
//           <motion.button
//             whileTap={{ scale: 0.9 }}
//             whileHover={{ scale: buttonStates.continue ? 1.05 : 1 }}
//             onClick={handleContinue}
//             disabled={!buttonStates.continue || loading}
//             className={`px-8 py-3 font-bold rounded-full flex items-center justify-center gap-2 transform transition-all duration-300 ${
//               buttonStates.continue && !loading
//                 ? "bg-gradient-to-r from-blue-600 to-purple-600 hover:shadow-lg hover:shadow-blue-500/30 cursor-pointer"
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


// this is not working







// "use client";
// import { useRouter } from "next/navigation";
// import { useEffect, useState, Suspense } from "react";
// import { motion } from "framer-motion";

// function ProgressContent() {
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
//     }
//   }, [router]);

//   const handleAdButtonClick = (buttonNumber) => {
//     // Open Adsterra link in new tab
//     const adLinks = {
//       1: "https://www.revenuecpmgate.com/ux5skvyg?key=83356a761aa7ce60986ccf836290e715", // Replace with your Adsterra link 1
//       2: "https://www.revenuecpmgate.com/ux5skvyg?key=83356a761aa7ce60986ccf836290e715", // Replace with your Adsterra link 2
//       3: "https://www.revenuecpmgate.com/ux5skvyg?key=83356a761aa7ce60986ccf836290e715"  // Replace with your Adsterra link 3
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
//     // Button click animation ke baad thoda delay
//     setTimeout(() => {
//       // Redirect to step-2 without passing data in URL
//       window.open('/progress/step-2', "_blank", "noopener,noreferrer");
//     }, 1500);
//   };

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white flex flex-col items-center justify-center p-4">
//       <div className="w-full max-w-2xl bg-gray-800/30 backdrop-blur-lg rounded-2xl border border-gray-700 p-8 shadow-2xl">
//         <div className="text-center mb-10">
//           <h1 className="text-3xl md:text-4xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
//             Content Access - Step 1
//           </h1>
//           <p className="text-gray-400">Verifying your access (Step 1 of 5)</p>
//         </div>
        
//         {/* Progress Stepper */}
//         <div className="mb-12">
//           <div className="flex items-center justify-between mb-8">
//             {[1, 2, 3, 4, 5].map((step, index) => (
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
//                 {index < 4 && (
//                   <div className="absolute top-6 left-12 w-[calc(100%+24px)] h-1 bg-gray-700 -z-10"></div>
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
//                 Click Ad 1 (Required)
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
//                 Click Ad 2 (Required)
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
//                 Click Ad 3 (Required)
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
        
//         {/* Original Continue Button */}
//         <div className="flex justify-center">
//           <motion.button
//             whileTap={{ scale: 0.9 }}
//             whileHover={{ scale: buttonStates.continue ? 1.05 : 1 }}
//             onClick={handleContinue}
//             disabled={!buttonStates.continue || loading}
//             className={`px-8 py-3 font-bold rounded-full flex items-center justify-center gap-2 transform transition-all duration-300 ${
//               buttonStates.continue && !loading
//                 ? "bg-gradient-to-r from-blue-600 to-purple-600 hover:shadow-lg hover:shadow-blue-500/30 cursor-pointer"
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












// --------------- Yeh Correct Code hai ----------------

// "use client";
// import { useRouter } from "next/navigation";
// import { useEffect, useState, Suspense } from "react";
// import { motion } from "framer-motion";

// function ProgressContent() {
//   const router = useRouter();
//   const [loading, setLoading] = useState(false);

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
//     }
//   }, [router]);














//   // const handleContinue = () => {
//   //   setLoading(true);
//   //   // Button click animation ke baad thoda delay
//   //   setTimeout(() => {
//   //     // Redirect to step-2 without passing data in URL
//   //     // router.push('https://brainfuel-poor-people.vercel.app/progress/step-2');
//   //     router.push('/step-2');
//   //     // window.open(`https://direct-link.net/1385470/z5z0uNQj8ImD`, "_blank", "noopener,noreferrer");
//   //   }, 1500);
//   // };


//   const handleContinue = () => {
//     setLoading(true);
//     // Button click animation ke baad thoda delay
//     setTimeout(() => {
//       // Redirect to step-2 without passing data in URL
//       // router.push("/progress/step-2");
//     window.open('/progress/step-2', "_blank", "noopener,noreferrer");



//     }, 1500);
//   };


//   // router.push('/step-2');

















//   return (
//     <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white flex flex-col items-center justify-center p-4">
//       <div className="w-full max-w-2xl bg-gray-800/30 backdrop-blur-lg rounded-2xl border border-gray-700 p-8 shadow-2xl">
//         <div className="text-center mb-10">
//           <h1 className="text-3xl md:text-4xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
//             Content Access - Step 1
//           </h1>
//           <p className="text-gray-400">Verifying your access (Step 1 of 5)</p>
//         </div>
        
//         {/* Progress Stepper */}
//         <div className="mb-12">
//           <div className="flex items-center justify-between mb-8">
//             {[1, 2, 3, 4, 5].map((step, index) => (
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
//                 {index < 4 && (
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

// --------------- Yeh Correct Code hai ----------------














































































































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
