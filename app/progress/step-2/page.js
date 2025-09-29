"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";

export default function ProgressPage2() {
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
      return;
    }
  }, [router]);

  const handleAdButtonClick = (buttonNumber) => {
    // Open Adsterra link in new tab
    // const adLinks = {
    //   1: "https://www.revenuecpmgate.com/ux5skvyg?key=83356a761aa7ce60986ccf836290e715",
    //   2: "https://www.revenuecpmgate.com/ux5skvyg?key=83356a761aa7ce60986ccf836290e715", 
    //   3: "https://www.revenuecpmgate.com/ux5skvyg?key=83356a761aa7ce60986ccf836290e715"
    // };

    const adLinks = {
      1: "https://hotbzepefa.cc/tds?id=1483675431&p1=sub1&p2=sub2&p3=sub3&p4=sub4", // Replace with your Partnerhouse link 1
      2: "https://hotbzepefa.cc/tds?id=1483698232&p1=sub1&p2=sub2&p3=sub3&p4=sub4", // Replace with your Partnerhouse link 2
      3: "https://hotbzepefa.cc/tds?id=1483675431&p1=sub1&p2=sub2&p3=sub3&p4=sub4"  // Replace with your Partnerhouse link 3
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
    setTimeout(() => {
      window.open('/progress/step-3', "_blank", "noopener,noreferrer");
      // window.open('https://brain-fuel-skills.blogspot.com/2025/09/lalal.html', "_blank", "noopener,noreferrer");
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-gray-800/30 backdrop-blur-lg rounded-2xl border border-gray-700 p-8 shadow-2xl">
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
            Verification Required
          </h1>
          <p className="text-gray-400">Please verify to continue (Step 2 of 5)</p>
        </div>
        
        <div className="mb-12">
          <div className="flex items-center justify-between mb-8">
            {[1, 2, 3, 4, 5].map((step, index) => (
              <div key={index} className="flex flex-col items-center relative">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center z-10 transition-all duration-500 ${
                    step <= 2
                      ? "bg-gradient-to-r from-blue-500 to-purple-500 shadow-lg shadow-blue-500/30"
                      : "bg-gray-700"
                  }`}
                >
                  {step <= 2 ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <span className="text-gray-400">{step}</span>
                  )}
                </div>
                <div className="mt-3 text-center">
                  <div className={`font-medium ${step <= 2 ? "text-white" : "text-gray-400"}`}>
                    Step {step}
                  </div>
                </div>
                {index < 4 && (
                  <div className="absolute top-6 left-12 w-[calc(100%+24px)] h-1 bg-gray-700 -z-10">
                    <div className={`h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-700 ${
                      step < 2 ? "w-full" : 
                      step === 2 ? "w-1/4" : 
                      step === 3 ? "w-2/4" : 
                      step === 4 ? "w-3/4" : "w-0"
                    }`}></div>
                  </div>
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
                {/* Click Ad 1 (Required) */}
                Click (Required-1)
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
                {/* Click Ad 2 (Required) */}
                Click (Required-2)
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
                {/* Click Ad 3 (Required) */}
                Click (Required-3)
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
        
        {/* Continue Button */}
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
                Continue to Step 3
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









// --------------- Yeh Correct Code hai ----------------

// "use client";
// import { useRouter } from "next/navigation";
// import { useEffect, useState } from "react";

// export default function ProgressPage2() {
//   const router = useRouter();
// //   const [countdown, setCountdown] = useState(10); // 10 seconds countdown

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
//     // const timer = setInterval(() => {
//     //   setCountdown(prev => {
//     //     if (prev <= 1) {
//     //       clearInterval(timer);
//     //       // Auto redirect to step-3 after countdown
//     //       router.push('/progress/step-3');
//     //       return 0;
//     //     }
//     //     return prev - 1;
//     //   });
//     // }, 1000);
    
//     return () => clearInterval(timer);
//   }, [router]);







//   const handleContinue = () => {
//     // router.push('/progress/step-3');

//     // https://brainfuel-poor-people.vercel.app/progress/step-3

//     // window.open(`https://link-center.net/1385470/93h1BN5XqlrF`, "_blank", "noopener,noreferrer");
//     window.open('/progress/step-3', "_blank", "noopener,noreferrer");


//   };












//   return (
//     <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white flex flex-col items-center justify-center p-4">
//       <div className="w-full max-w-2xl bg-gray-800/30 backdrop-blur-lg rounded-2xl border border-gray-700 p-8 shadow-2xl">
//         <div className="text-center mb-10">
//           <h1 className="text-3xl md:text-4xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
//             Verification Required
//           </h1>
//           <p className="text-gray-400">Please verify to continue (Step 2 of 5)</p>
//         </div>
        
//         <div className="mb-12">
//           <div className="flex items-center justify-between mb-8">
//             {[1, 2, 3, 4, 5].map((step, index) => (
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
//                 {index < 4 && (
//                   <div className="absolute top-6 left-12 w-[calc(100%+24px)] h-1 bg-gray-700 -z-10">
//                     <div className={`h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-700 ${
//                       step < 2 ? "w-full" : 
//                       step === 2 ? "w-1/4" : 
//                       step === 3 ? "w-2/4" : 
//                       step === 4 ? "w-3/4" : "w-0"
//                     }`}></div>
//                   </div>
//                 )}
//               </div>
//             ))}
//           </div>
//         </div>
        
//         <div className="text-center mb-10">
//           {/* <h3 className="text-xl font-semibold mb-4">Verify with Linkvertise</h3> */}
//           <p className="text-gray-400 mb-6">
//             Please complete the verification below to access your content
//           </p>
          
//           {/* Here you would integrate the Linkvertise widget */}
//           <div className="bg-gray-700 rounded-lg p-4 mb-6">
//             {/* <p className="text-gray-300">Linkvertise verification would go here</p> */}
//             {/* Example: <iframe src="your-linkvertise-url" ... /> */}
//           </div>
          
//           {/* <p className="text-gray-400 text-sm mb-4">
//             Redirecting in {countdown} seconds...
//           </p> */}
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

// --------------- Yeh Correct Code hai ----------------




















































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

//     // Parse the data to check expiration (optional)
//     const data = JSON.parse(tempData);
//     const now = Date.now();
//     if (now - data.timestamp > 30 * 60 * 1000) { // 30 minutes
//       localStorage.removeItem('tempDownloadUrl');
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

// function ProgressPage2Content() {
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

//     setTimeout(() => {
//       router.push(`https://brainfuel-poor-people.vercel.app/progress/step-3?data=${searchParams.get("data")}`);
//     }, 1500);
//   };

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white flex flex-col items-center justify-center p-4">
//       <div className="w-full max-w-2xl bg-gray-800/30 backdrop-blur-lg rounded-2xl border border-gray-700 p-8 shadow-2xl">
//         <div className="text-center mb-10">
//           <h1 className="text-3xl md:text-4xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
//             Content Access - Step 2
//           </h1>
//           <p className="text-gray-400">Processing your request</p>
//         </div>

//         {/* Stepper */}
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
//                   {step < 2 ? (
//                     <svg
//                       xmlns="http://www.w3.org/2000/svg"
//                       className="h-6 w-6 text-white"
//                       viewBox="0 0 20 20"
//                       fill="currentColor"
//                     >
//                       <path
//                         fillRule="evenodd"
//                         d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
//                         clipRule="evenodd"
//                       />
//                     </svg>
//                   ) : (
//                     <span className="text-white font-bold">{step}</span>
//                   )}
//                 </div>
//                 <div className="mt-3 text-center">
//                   <div
//                     className={`font-medium ${
//                       step <= 2 ? "text-white" : "text-gray-400"
//                     }`}
//                   >
//                     Step {step}
//                   </div>
//                 </div>
//                 {index < 3 && (
//                   <div className="absolute top-6 left-12 w-[calc(100%+24px)] h-1 bg-gray-700 -z-10">
//                     <div
//                       className={`h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-700 ${
//                         step < 2 ? "w-full" : "w-0"
//                       }`}
//                     ></div>
//                   </div>
//                 )}
//               </div>
//             ))}
//           </div>
//         </div>

//         <div className="text-center mb-10">
//           <h3 className="text-xl font-semibold mb-2">Processing</h3>
//           <p className="text-gray-400">We are processing your request</p>
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
//                 Continue to Step 3
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

// export default function ProgressPage2() {
//   return (
//     <Suspense fallback={<div className="text-white p-10">Loading...</div>}>
//       <ProgressPage2Content />
//     </Suspense>
//   );
// }













// "use client";
// import { useRouter, useSearchParams } from "next/navigation";
// import { useEffect, useState, Suspense } from "react";

// function ProgressPage2Content() {
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
//     router.push(`/progress/step-3?data=${searchParams.get("data")}`);
//   };

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white flex flex-col items-center justify-center p-4">
//       <div className="w-full max-w-2xl bg-gray-800/30 backdrop-blur-lg rounded-2xl border border-gray-700 p-8 shadow-2xl">
//         <div className="text-center mb-10">
//           <h1 className="text-3xl md:text-4xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
//             Content Access - Step 2
//           </h1>
//           <p className="text-gray-400">Processing your request</p>
//         </div>

//         {/* Stepper */}
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
//                   {step < 2 ? (
//                     <svg
//                       xmlns="http://www.w3.org/2000/svg"
//                       className="h-6 w-6 text-white"
//                       viewBox="0 0 20 20"
//                       fill="currentColor"
//                     >
//                       <path
//                         fillRule="evenodd"
//                         d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
//                         clipRule="evenodd"
//                       />
//                     </svg>
//                   ) : (
//                     <span className="text-white font-bold">{step}</span>
//                   )}
//                 </div>
//                 <div className="mt-3 text-center">
//                   <div
//                     className={`font-medium ${
//                       step <= 2 ? "text-white" : "text-gray-400"
//                     }`}
//                   >
//                     Step {step}
//                   </div>
//                 </div>
//                 {index < 3 && (
//                   <div className="absolute top-6 left-12 w-[calc(100%+24px)] h-1 bg-gray-700 -z-10">
//                     <div
//                       className={`h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-700 ${
//                         step < 2 ? "w-full" : "w-0"
//                       }`}
//                     ></div>
//                   </div>
//                 )}
//               </div>
//             ))}
//           </div>
//         </div>

//         <div className="text-center mb-10">
//           <h3 className="text-xl font-semibold mb-2">Processing</h3>
//           <p className="text-gray-400">We are processing your request</p>
//         </div>

//         <div className="flex justify-center">
//           <button
//             onClick={handleContinue}
//             className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-full transform transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-blue-500/30 flex items-center"
//           >
//             Continue to Step 3
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

// export default function ProgressPage2() {
//   return (
//     <Suspense fallback={<div className="text-white p-10">Loading...</div>}>
//       <ProgressPage2Content />
//     </Suspense>
//   );
// }







// "use client";
// import { useRouter, useSearchParams } from "next/navigation";
// import { useEffect, useState } from "react";

// export default function ProgressPage2() {
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
//     router.push(`/progress/step-3?data=${searchParams.get("data")}`);
//   };

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white flex flex-col items-center justify-center p-4">
//       <div className="w-full max-w-2xl bg-gray-800/30 backdrop-blur-lg rounded-2xl border border-gray-700 p-8 shadow-2xl">
//         <div className="text-center mb-10">
//           <h1 className="text-3xl md:text-4xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
//             Content Access - Step 2
//           </h1>
//           <p className="text-gray-400">Processing your request</p>
//         </div>

//         {/* Progress Stepper */}
//         <div className="mb-12">
//           <div className="flex items-center justify-between mb-8">
//             {[1, 2, 3, 4].map((step, index) => (
//               <div key={index} className="flex flex-col items-center relative">
//                 <div 
//                   className={`w-12 h-12 rounded-full flex items-center justify-center z-10 transition-all duration-500 ${
//                     step <= 2 
//                       ? 'bg-gradient-to-r from-blue-500 to-purple-500 shadow-lg shadow-blue-500/30' 
//                       : 'bg-gray-700'
//                   }`}
//                 >
//                   {step < 2 ? (
//                     <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" viewBox="0 0 20 20" fill="currentColor">
//                       <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
//                     </svg>
//                   ) : (
//                     <span className="text-white font-bold">{step}</span>
//                   )}
//                 </div>
//                 <div className="mt-3 text-center">
//                   <div className={`font-medium ${step <= 2 ? 'text-white' : 'text-gray-400'}`}>
//                     Step {step}
//                   </div>
//                 </div>
//                 {index < 3 && (
//                   <div className="absolute top-6 left-12 w-[calc(100%+24px)] h-1 bg-gray-700 -z-10">
//                     <div 
//                       className={`h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-700 ${
//                         step < 2 ? 'w-full' : 'w-0'
//                       }`}
//                     ></div>
//                   </div>
//                 )}
//               </div>
//             ))}
//           </div>
//         </div>

//         <div className="text-center mb-10">
//           <h3 className="text-xl font-semibold mb-2">Processing</h3>
//           <p className="text-gray-400">We are processing your request</p>
//         </div>

//         <div className="flex justify-center">
//           <button
//             onClick={handleContinue}
//             className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-full transform transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-blue-500/30 flex items-center"
//           >
//             Continue to Step 3
//             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" viewBox="0 0 20 20" fill="currentColor">
//               <path fillRule="evenodd" d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
//             </svg>
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// }











// "use client";
// import { useRouter, useSearchParams } from "next/navigation";
// import { useEffect, useState } from "react";

// export default function ProgressPage2() {
//   const router = useRouter();
//   const searchParams = useSearchParams();
//   const [url, setUrl] = useState("");
//   const [linkvertiseUrl, setLinkvertiseUrl] = useState("");

//   useEffect(() => {
//     const encryptedUrl = searchParams.get("data");
//     if (encryptedUrl) {
//       try {
//         const decodedUrl = atob(encryptedUrl);
//         setUrl(decodedUrl);
        
//         // Create Linkvertise URL
//         const mockLinkvertiseUrl = `https://link-to.net/your-linkvertise-id?${new URLSearchParams({ url: decodedUrl })}`;
//         setLinkvertiseUrl(mockLinkvertiseUrl);
//       } catch (error) {
//         console.error("Error decoding URL:", error);
//         router.push("/user");
//       }
//     } else {
//       router.push("/user");
//     }
//   }, [searchParams, router]);

//   const handleContinue = () => {
//     router.push(`/progress/step-3?data=${searchParams.get("data")}`);
//   };

//   const openLinkvertise = () => {
//     if (linkvertiseUrl) {
//       window.open(linkvertiseUrl, "_blank", "noopener,noreferrer");
//     }
//   };

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white flex flex-col items-center justify-center p-4">
//       {/* Add Linkvertise Script */}
//       <script src="https://publisher.linkvertise.com/cdn/linkvertise.js"></script>
//       <script dangerouslySetInnerHTML={{
//         __html: `linkvertise(1385470, {whitelist: [], blacklist: [""]});`
//       }} />
      
//       <div className="w-full max-w-2xl bg-gray-800/30 backdrop-blur-lg rounded-2xl border border-gray-700 p-8 shadow-2xl">
//         <div className="text-center mb-10">
//           <h1 className="text-3xl md:text-4xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
//             Content Access - Step 2
//           </h1>
//           <p className="text-gray-400">Complete the Linkvertise verification</p>
//         </div>

//         {/* Progress Stepper */}
//         <div className="mb-12">
//           <div className="flex items-center justify-between mb-8">
//             {[1, 2, 3, 4].map((step, index) => (
//               <div key={index} className="flex flex-col items-center relative">
//                 <div 
//                   className={`w-12 h-12 rounded-full flex items-center justify-center z-10 transition-all duration-500 ${
//                     step <= 2 
//                       ? 'bg-gradient-to-r from-blue-500 to-purple-500 shadow-lg shadow-blue-500/30' 
//                       : 'bg-gray-700'
//                   }`}
//                 >
//                   {step < 2 ? (
//                     <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" viewBox="0 0 20 20" fill="currentColor">
//                       <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
//                     </svg>
//                   ) : (
//                     <span className="text-white font-bold">{step}</span>
//                   )}
//                 </div>
//                 <div className="mt-3 text-center">
//                   <div className={`font-medium ${step <= 2 ? 'text-white' : 'text-gray-400'}`}>
//                     Step {step}
//                   </div>
//                 </div>
//                 {index < 3 && (
//                   <div className="absolute top-6 left-12 w-[calc(100%+24px)] h-1 bg-gray-700 -z-10">
//                     <div 
//                       className={`h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-700 ${
//                         step < 2 ? 'w-full' : 'w-0'
//                       }`}
//                     ></div>
//                   </div>
//                 )}
//               </div>
//             ))}
//           </div>
//         </div>

//         <div className="text-center mb-10">
//           <h3 className="text-xl font-semibold mb-2">Linkvertise Verification</h3>
//           <p className="text-gray-400 mb-6">Please complete the verification step to continue</p>
          
//           {linkvertiseUrl && (
//             <div className="mb-6">
//               <button
//                 onClick={openLinkvertise}
//                 className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-full transform transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-blue-500/30"
//               >
//                 Open Linkvertise Verification
//               </button>
              
//               <div className="mt-4 p-3 bg-gray-700/50 rounded-lg">
//                 <p className="text-xs text-gray-400 mb-1">Linkvertise URL:</p>
//                 <p className="text-sm text-blue-300 break-all">{linkvertiseUrl}</p>
//                 <p className="text-xs text-gray-400 mt-2">Complete the verification in the new tab, then return here and click Continue</p>
//               </div>
//             </div>
//           )}
//         </div>

//         <div className="flex justify-center">
//           <button
//             onClick={handleContinue}
//             className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-full transform transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-blue-500/30 flex items-center"
//           >
//             Continue to Step 3
//             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" viewBox="0 0 20 20" fill="currentColor">
//               <path fillRule="evenodd" d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
//             </svg>
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// }