"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";

function ProgressContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [url, setUrl] = useState("");

  useEffect(() => {
    const encryptedUrl = searchParams.get("data");

    if (encryptedUrl) {
      try {
        const decodedUrl = atob(encryptedUrl);
        setUrl(decodedUrl);
      } catch (error) {
        console.error("Error decoding URL:", error);
        router.push("/user");
      }
    } else {
      router.push("/user");
    }
  }, [searchParams, router]);

  const handleContinue = () => {
    router.push(`/progress/step-2?data=${searchParams.get("data")}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-gray-800/30 backdrop-blur-lg rounded-2xl border border-gray-700 p-8 shadow-2xl">
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
            Content Access - Step 1
          </h1>
          <p className="text-gray-400">Verifying your access</p>
        </div>

        {/* Progress Stepper */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-8">
            {[1, 2, 3, 4].map((step, index) => (
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
                  <div className={`font-medium ${step === 1 ? "text-white" : "text-gray-400"}`}>
                    Step {step}
                  </div>
                </div>
                {index < 3 && (
                  <div className="absolute top-6 left-12 w-[calc(100%+24px)] h-1 bg-gray-700 -z-10"></div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="text-center mb-10">
          <h3 className="text-xl font-semibold mb-2">Verification</h3>
          <p className="text-gray-400">We are verifying your access to this content</p>
        </div>

        <div className="flex justify-center">
          <button
            onClick={handleContinue}
            className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-full transform transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-blue-500/30 flex items-center"
          >
            Continue to Step 2
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ProgressPage() {
  return (
    <Suspense fallback={<div className="text-white text-center p-10">Loading...</div>}>
      <ProgressContent />
    </Suspense>
  );
}











// "use client";
// import { useRouter, useSearchParams } from "next/navigation";
// import { useEffect, useState } from "react";

// export default function ProgressPage1() {
//   const router = useRouter();
//   const searchParams = useSearchParams();
//   const [url, setUrl] = useState("");


// //   =============================


// //   useEffect(() => {
// //     const encryptedUrl = searchParams.get("data");
// //     if (encryptedUrl) {
// //       try {
// //         const decodedUrl = atob(encryptedUrl);
// //         setUrl(decodedUrl);
// //       } catch (error) {
// //         console.error("Error decoding URL:", error);
// //         router.push("/user");
// //       }
// //     } else {
// //       router.push("/user");
// //     }
// //   }, [searchParams, router]);

// useEffect(() => {
//   const checkForStoredUrl = () => {
//     // First, check if there's an original URL stored in localStorage
//     if (user) {
//       const storedUrl = localStorage.getItem(`originalContentUrl`);
//       if (storedUrl) {
//         setUrl(storedUrl);
//         // Clear the stored URL after using it
//         localStorage.removeItem(`originalContentUrl`);
//         return;
//       }
//     }
    
//     // Fallback: Check URL from query parameters
//     const encryptedUrl = searchParams.get("data");
//     if (encryptedUrl) {
//       try {
//         // Decode the URL from query parameters
//         const decodedUrl = atob(encryptedUrl);
//         setUrl(decodedUrl);
//       } catch (error) {
//         console.error("Error decoding URL:", error);
//         router.push("/user");
//       }
//     } else {
//       router.push("/user");
//     }
//   };
  
//   checkForStoredUrl();
// }, [searchParams, router, user]);  


// // =============================================

// const handleContinue = () => {
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
//                       ? 'bg-gradient-to-r from-blue-500 to-purple-500 shadow-lg shadow-blue-500/30' 
//                       : 'bg-gray-700'
//                   }`}
//                 >
//                   <span className="text-white font-bold">{step}</span>
//                 </div>
//                 <div className="mt-3 text-center">
//                   <div className={`font-medium ${step === 1 ? 'text-white' : 'text-gray-400'}`}>
//                     Step {step}
//                   </div>
//                 </div>
//                 {index < 3 && (
//                   <div className="absolute top-6 left-12 w-[calc(100%+24px)] h-1 bg-gray-700 -z-10">
//                     <div 
//                       className={`h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-700 ${
//                         step < 1 ? 'w-full' : 'w-0'
//                       }`}
//                     ></div>
//                   </div>
//                 )}
//               </div>
//             ))}
//           </div>
//         </div>

//         <div className="text-center mb-10">
//           <h3 className="text-xl font-semibold mb-2">Verification</h3>
//           <p className="text-gray-400">We are verifying your access to this content</p>
//         </div>

//         <div className="flex justify-center">
//           <button
//             onClick={handleContinue}
//             className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-full transform transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-blue-500/30 flex items-center"
//           >
//             Continue to Step 2
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

// export default function ProgressPage1() {
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
//                       ? 'bg-gradient-to-r from-blue-500 to-purple-500 shadow-lg shadow-blue-500/30' 
//                       : 'bg-gray-700'
//                   }`}
//                 >
//                   <span className="text-white font-bold">{step}</span>
//                 </div>
//                 <div className="mt-3 text-center">
//                   <div className={`font-medium ${step === 1 ? 'text-white' : 'text-gray-400'}`}>
//                     Step {step}
//                   </div>
//                 </div>
//                 {index < 3 && (
//                   <div className="absolute top-6 left-12 w-[calc(100%+24px)] h-1 bg-gray-700 -z-10">
//                     <div 
//                       className={`h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-700 ${
//                         step < 1 ? 'w-full' : 'w-0'
//                       }`}
//                     ></div>
//                   </div>
//                 )}
//               </div>
//             ))}
//           </div>
//         </div>

//         <div className="text-center mb-10">
//           <h3 className="text-xl font-semibold mb-2">Verification</h3>
//           <p className="text-gray-400">We are verifying your access to this content</p>
//         </div>

//         <div className="flex justify-center">
//           <button
//             onClick={handleContinue}
//             className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-full transform transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-blue-500/30 flex items-center"
//           >
//             Continue to Step 2
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
// import { useState, useEffect } from "react";
// import { useRouter, useSearchParams } from "next/navigation";
// import { auth } from "@/lib/firebase";

// export default function ProgressPage() {
//   const router = useRouter();
//   const searchParams = useSearchParams();
//   const [currentStep, setCurrentStep] = useState(0);
//   const [isLoading, setIsLoading] = useState(false);
//   const [url, setUrl] = useState("");
//   const [isCompleted, setIsCompleted] = useState(false);
//   const [linkvertiseUrl, setLinkvertiseUrl] = useState("");
//   const [isCheckingLinkvertise, setIsCheckingLinkvertise] = useState(false);
  
//   // Get the encrypted URL from query parameters
//   useEffect(() => {
//     const encryptedUrl = searchParams.get("data");
//     if (encryptedUrl) {
//       try {
//         // Decode the URL
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
  
//   // Check if user is authenticated
//   useEffect(() => {
//     const unsubscribe = auth.onAuthStateChanged((user) => {
//       if (!user) {
//         router.push("/login");
//       }
//     });
//     return () => unsubscribe();
//   }, [router]);
  
//   // Function to create Linkvertise URL
//   const createLinkvertiseUrl = async (originalUrl) => {
//     try {
//       // Make API call to Linkvertise
//       const response = await fetch('https://api.linkvertise.com/api/v1/link', {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//           'Authorization': 'Bearer YOUR_API_KEY' // Replace with your actual API key
//         },
//         body: JSON.stringify({
//           target: originalUrl,
//           title: 'Content Access', // Optional title
//           description: 'Complete verification to access content', // Optional description
//           // Add other parameters as needed
//         })
//       });
      
//       if (!response.ok) {
//         throw new Error('Failed to create Linkvertise URL');
//       }
      
//       const data = await response.json();
      
//       // Return the Linkvertise URL
//       return data.data.link;
//     } catch (error) {
//       console.error('Error creating Linkvertise URL:', error);
//       // Fallback to mock URL for development
//       return `https://link-to.net/your-linkvertise-id?${new URLSearchParams({ url: originalUrl })}`;
//     }
//   };
  
//   // Function to check if Linkvertise step is completed
//   const checkLinkvertiseCompletion = () => {
//     // This is a placeholder function - replace with actual Linkvertise completion check
//     // In a real implementation, you would check if the user has completed the Linkvertise step
    
//     // For demonstration, we'll just return true after a delay
//     // In production, replace this with actual completion check:
    
//     return new Promise((resolve) => {
//       setTimeout(() => {
//         resolve(true); // Assume completion after 2 seconds
//       }, 2000);
//     });
//   };
  
//   const handleNextStep = async () => {
//     if (currentStep < 3) {
//       setIsLoading(true);
      
//       try {
//         if (currentStep === 0) {
//           // Step 1: Create Linkvertise URL
//           const lvUrl = await createLinkvertiseUrl(url);
//           setLinkvertiseUrl(lvUrl);
          
//           // After creating the URL, redirect to Linkvertise
//           setTimeout(() => {
//             window.open(lvUrl, "_blank", "noopener,noreferrer");
//             setIsLoading(false);
//             setCurrentStep(1);
//           }, 1000);
//         } else if (currentStep === 1) {
//           // Step 2: Check if Linkvertise is completed
//           setIsCheckingLinkvertise(true);
          
//           const isCompleted = await checkLinkvertiseCompletion();
//           setIsCheckingLinkvertise(false);
          
//           if (isCompleted) {
//             setIsLoading(false);
//             setCurrentStep(2);
//           } else {
//             setIsLoading(false);
//             alert("Please complete the Linkvertise step first");
//           }
//         } else if (currentStep === 2) {
//           // Step 3: Final step before completion
//           setTimeout(() => {
//             setIsLoading(false);
//             setCurrentStep(3);
//             setIsCompleted(true);
//           }, 800);
//         }
//       } catch (error) {
//         console.error("Error in handleNextStep:", error);
//         setIsLoading(false);
//         alert("An error occurred. Please try again.");
//       }
//     }
//   };
  
//   const handleDownload = () => {
//     if (url) {
//       window.open(url, "_blank", "noopener,noreferrer");
//     }
//   };
  
//   const steps = [
//     { title: "Verification", description: "Verifying your access" },
//     { title: "Linkvertise", description: "Complete the verification step" },
//     { title: "Finalizing", description: "Finalizing your access" },
//     { title: "Complete", description: "Ready for download" }
//   ];
  
//   return (
//     <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white flex flex-col items-center justify-center p-4">
//       {/* Add Linkvertise Script - THIS IS WHERE YOU PASTE IT */}
//       <script src="https://publisher.linkvertise.com/cdn/linkvertise.js"></script>
//       <script dangerouslySetInnerHTML={{
//         __html: `linkvertise(1385470, {whitelist: [], blacklist: [""]});`
//       }} />
      
//       <div className="w-full max-w-2xl bg-gray-800/30 backdrop-blur-lg rounded-2xl border border-gray-700 p-8 shadow-2xl">
//         <div className="text-center mb-10">
//           <h1 className="text-3xl md:text-4xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
//             Content Access
//           </h1>
//           <p className="text-gray-400">Follow the steps to access your content</p>
//         </div>
        
//         {/* Progress Stepper */}
//         <div className="mb-12">
//           <div className="flex items-center justify-between mb-8">
//             {steps.map((step, index) => (
//               <div key={index} className="flex flex-col items-center relative">
//                 {/* Step Circle */}
//                 <div 
//                   className={`w-12 h-12 rounded-full flex items-center justify-center z-10 transition-all duration-500 ${
//                     index <= currentStep 
//                       ? 'bg-gradient-to-r from-blue-500 to-purple-500 shadow-lg shadow-blue-500/30' 
//                       : 'bg-gray-700'
//                   }`}
//                 >
//                   {index < currentStep ? (
//                     <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" viewBox="0 0 20 20" fill="currentColor">
//                       <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
//                     </svg>
//                   ) : (
//                     <span className="text-white font-bold">{index + 1}</span>
//                   )}
//                 </div>
                
//                 {/* Step Label */}
//                 <div className="mt-3 text-center">
//                   <div className={`font-medium ${index <= currentStep ? 'text-white' : 'text-gray-400'}`}>
//                     {step.title}
//                   </div>
//                   <div className="text-xs text-gray-500 mt-1 max-w-[100px]">
//                     {step.description}
//                   </div>
//                 </div>
                
//                 {/* Connector Line */}
//                 {index < steps.length - 1 && (
//                   <div className="absolute top-6 left-12 w-[calc(100%+24px)] h-1 bg-gray-700 -z-10">
//                     <div 
//                       className={`h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-700 ${
//                         index < currentStep ? 'w-full' : 'w-0'
//                       }`}
//                     ></div>
//                   </div>
//                 )}
//               </div>
//             ))}
//           </div>
//         </div>
        
//         {/* Step Content */}
//         <div className="mb-10 min-h-[120px] flex items-center justify-center">
//           {isLoading ? (
//             <div className="flex flex-col items-center">
//               <div className="relative">
//                 <div className="w-16 h-16 border-4 border-blue-200 rounded-full"></div>
//                 <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
//               </div>
//               <p className="mt-4 text-gray-300">
//                 {currentStep === 0 ? "Creating Linkvertise URL..." : 
//                  currentStep === 1 ? "Checking completion..." : 
//                  "Processing..."}
//               </p>
//             </div>
//           ) : (
//             <div className="text-center">
//               <h3 className="text-xl font-semibold mb-2">{steps[currentStep].title}</h3>
//               <p className="text-gray-400">{steps[currentStep].description}</p>
              
//               {/* Show Linkvertise URL when created */}
//               {currentStep === 1 && linkvertiseUrl && (
//                 <div className="mt-4 p-3 bg-gray-700/50 rounded-lg">
//                   <p className="text-xs text-gray-400 mb-1">Linkvertise URL:</p>
//                   <p className="text-sm text-blue-300 break-all">{linkvertiseUrl}</p>
//                   <p className="text-xs text-gray-400 mt-2">A new tab has been opened. Please complete the verification step there.</p>
//                 </div>
//               )}
//             </div>
//           )}
//         </div>
        
//         {/* Action Button */}
//         <div className="flex justify-center">
//           {isCompleted ? (
//             <button
//               onClick={handleDownload}
//               className="px-8 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold rounded-full transform transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-green-500/30 flex items-center"
//             >
//               <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
//                 <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
//               </svg>
//               Download Now
//             </button>
//           ) : (
//             <button
//               onClick={handleNextStep}
//               disabled={isLoading}
//               className={`px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-full transform transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-blue-500/30 flex items-center ${
//                 isLoading ? 'opacity-70 cursor-not-allowed' : ''
//               }`}
//             >
//               {isLoading ? (
//                 <>
//                   <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
//                     <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
//                     <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
//                   </svg>
//                   {currentStep === 0 ? "Creating URL..." : 
//                    currentStep === 1 ? "Checking..." : 
//                    "Processing..."}
//                 </>
//               ) : (
//                 <>
//                   {currentStep === 0 ? "Create Linkvertise URL" : 
//                    currentStep === 1 ? "Verify Completion" : 
//                    currentStep === 2 ? "Finalize Access" : 
//                    "Continue"}
//                   <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" viewBox="0 0 20 20" fill="currentColor">
//                     <path fillRule="evenodd" d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
//                   </svg>
//                 </>
//               )}
//             </button>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// }












// "use client";
// import { useState, useEffect } from "react";
// import { useRouter, useSearchParams } from "next/navigation";
// import { auth } from "@/lib/firebase";

// export default function ProgressPage() {
//   const router = useRouter();
//   const searchParams = useSearchParams();
//   const [currentStep, setCurrentStep] = useState(0);
//   const [isLoading, setIsLoading] = useState(false);
//   const [url, setUrl] = useState("");
//   const [isCompleted, setIsCompleted] = useState(false);

//   // Get the encrypted URL from query parameters
//   useEffect(() => {
//     const encryptedUrl = searchParams.get("data");
//     if (encryptedUrl) {
//       try {
//         // Decode the URL (simple base64 decode for example)
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

//   // Check if user is authenticated
//   useEffect(() => {
//     const unsubscribe = auth.onAuthStateChanged((user) => {
//       if (!user) {
//         router.push("/login");
//       }
//     });

//     return () => unsubscribe();
//   }, [router]);

//   const handleNextStep = () => {
//     if (currentStep < 3) {
//       setIsLoading(true);
//       // Simulate some processing time
//       setTimeout(() => {
//         setCurrentStep(currentStep + 1);
//         setIsLoading(false);
        
//         // If reaching the last step, mark as completed
//         if (currentStep === 2) {
//           setIsCompleted(true);
//         }
//       }, 800);
//     }
//   };

//   const handleDownload = () => {
//     if (url) {
//       window.open(url, "_blank", "noopener,noreferrer");
//     }
//   };

//   const steps = [
//     { title: "Verification", description: "Verifying your access" },
//     { title: "Processing", description: "Processing your request" },
//     { title: "Preparing", description: "Preparing your content" },
//     { title: "Complete", description: "Ready for download" }
//   ];

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white flex flex-col items-center justify-center p-4">
//       <div className="w-full max-w-2xl bg-gray-800/30 backdrop-blur-lg rounded-2xl border border-gray-700 p-8 shadow-2xl">
//         <div className="text-center mb-10">
//           <h1 className="text-3xl md:text-4xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
//             Content Access
//           </h1>
//           <p className="text-gray-400">Follow the steps to access your content</p>
//         </div>

//         {/* Progress Stepper */}
//         <div className="mb-12">
//           <div className="flex items-center justify-between mb-8">
//             {steps.map((step, index) => (
//               <div key={index} className="flex flex-col items-center relative">
//                 {/* Step Circle */}
//                 <div 
//                   className={`w-12 h-12 rounded-full flex items-center justify-center z-10 transition-all duration-500 ${
//                     index <= currentStep 
//                       ? 'bg-gradient-to-r from-blue-500 to-purple-500 shadow-lg shadow-blue-500/30' 
//                       : 'bg-gray-700'
//                   }`}
//                 >
//                   {index < currentStep ? (
//                     <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" viewBox="0 0 20 20" fill="currentColor">
//                       <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
//                     </svg>
//                   ) : (
//                     <span className="text-white font-bold">{index + 1}</span>
//                   )}
//                 </div>
                
//                 {/* Step Label */}
//                 <div className="mt-3 text-center">
//                   <div className={`font-medium ${index <= currentStep ? 'text-white' : 'text-gray-400'}`}>
//                     {step.title}
//                   </div>
//                   <div className="text-xs text-gray-500 mt-1 max-w-[100px]">
//                     {step.description}
//                   </div>
//                 </div>
                
//                 {/* Connector Line */}
//                 {index < steps.length - 1 && (
//                   <div className="absolute top-6 left-12 w-[calc(100%+24px)] h-1 bg-gray-700 -z-10">
//                     <div 
//                       className={`h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-700 ${
//                         index < currentStep ? 'w-full' : 'w-0'
//                       }`}
//                     ></div>
//                   </div>
//                 )}
//               </div>
//             ))}
//           </div>
//         </div>

//         {/* Step Content */}
//         <div className="mb-10 min-h-[120px] flex items-center justify-center">
//           {isLoading ? (
//             <div className="flex flex-col items-center">
//               <div className="relative">
//                 <div className="w-16 h-16 border-4 border-blue-200 rounded-full"></div>
//                 <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
//               </div>
//               <p className="mt-4 text-gray-300">Processing...</p>
//             </div>
//           ) : (
//             <div className="text-center">
//               <h3 className="text-xl font-semibold mb-2">{steps[currentStep].title}</h3>
//               <p className="text-gray-400">{steps[currentStep].description}</p>
//             </div>
//           )}
//         </div>

//         {/* Action Button */}
//         <div className="flex justify-center">
//           {isCompleted ? (
//             <button
//               onClick={handleDownload}
//               className="px-8 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold rounded-full transform transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-green-500/30 flex items-center"
//             >
//               <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
//                 <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
//               </svg>
//               Download Now
//             </button>
//           ) : (
//             <button
//               onClick={handleNextStep}
//               disabled={isLoading}
//               className={`px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-full transform transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-blue-500/30 flex items-center ${
//                 isLoading ? 'opacity-70 cursor-not-allowed' : ''
//               }`}
//             >
//               {isLoading ? (
//                 <>
//                   <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
//                     <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
//                     <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
//                   </svg>
//                   Processing...
//                 </>
//               ) : (
//                 <>
//                   Continue
//                   <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" viewBox="0 0 20 20" fill="currentColor">
//                     <path fillRule="evenodd" d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
//                   </svg>
//                 </>
//               )}
//             </button>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// }