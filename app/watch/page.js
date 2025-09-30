"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState, Suspense, useRef } from "react";
import { motion } from "framer-motion";

function WatchPageContent() {
  const router = useRouter();
  const [videoUrl, setVideoUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoError, setVideoError] = useState("");
  const videoRef = useRef(null);

  useEffect(() => {
    // Get video URL from localStorage
    const tempData = localStorage.getItem('tempDownloadUrl');
    console.log('Retrieved from localStorage:', tempData);
    
    if (tempData) {
      try {
        const data = JSON.parse(tempData);
        // Check if expired (30 minutes)
        const now = Date.now();
        if (now - data.timestamp > 30 * 60 * 1000) {
          localStorage.removeItem('tempDownloadUrl');
          setError("Video URL has expired. Please generate a new one.");
          setLoading(false);
          return;
        }
        
        console.log('Video URL found:', data.url);
        setVideoUrl(data.url);
        setLoading(false);
        
      } catch (error) {
        console.error("Error parsing video URL data:", error);
        setError("Invalid video data format");
        setLoading(false);
      }
    } else {
      setError("No video found. Please go back and generate a video first.");
      setLoading(false);
    }
  }, []);

  const handleVideoPlay = () => {
    setIsPlaying(true);
    setVideoError("");
  };

  const handleVideoError = (e) => {
    console.error('Video error:', e);
    setVideoError("Failed to load video. The URL may be invalid or the video format is not supported.");
    setIsPlaying(false);
  };

  const handleVideoLoadStart = () => {
    console.log('Video load started');
  };

  const handleVideoLoadedData = () => {
    console.log('Video data loaded');
    setVideoError("");
  };

  const handleBackToUser = () => {
    router.push('/user');
  };

  const handleRetry = () => {
    setLoading(true);
    setError("");
    setVideoError("");
    // Re-check for video URL
    const tempData = localStorage.getItem('tempDownloadUrl');
    if (tempData) {
      try {
        const data = JSON.parse(tempData);
        setVideoUrl(data.url + '?retry=' + Date.now()); // Add cache busting
        setError("");
      } catch (error) {
        setError("Invalid video data");
      }
    }
    setLoading(false);
  };

  const handleManualPlay = () => {
    if (videoRef.current) {
      videoRef.current.play().catch(err => {
        console.error('Manual play failed:', err);
        setVideoError("Auto-play was blocked. Please click the play button in the video controls.");
      });
    }
  };

  // Test if URL is a direct video file
  const isDirectVideoUrl = (url) => {
    if (!url) return false;
    const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.mkv'];
    return videoExtensions.some(ext => url.toLowerCase().includes(ext));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-4xl bg-gray-800/30 backdrop-blur-lg rounded-2xl border border-gray-700 p-8 shadow-2xl">
          <div className="text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center py-20"
            >
              <svg className="animate-spin h-12 w-12 text-green-400 mb-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a12 12 0 00-12 12h4z"></path>
              </svg>
              <h3 className="text-xl font-semibold text-white mb-2">Loading Video Player</h3>
              <p className="text-gray-400">Setting up your video stream...</p>
            </motion.div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-2xl bg-gray-800/30 backdrop-blur-lg rounded-2xl border border-gray-700 p-8 shadow-2xl">
          <div className="text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="py-8"
            >
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Unable to Load Video</h2>
              <p className="text-gray-400 mb-4">{error}</p>
              <div className="bg-gray-700/50 rounded-lg p-4 mb-6 text-left">
                <p className="text-sm text-gray-300 mb-2">Debug Info:</p>
                <p className="text-xs text-gray-400 break-all">URL: {videoUrl || 'No URL'}</p>
                <p className="text-xs text-gray-400">Is Direct Video: {isDirectVideoUrl(videoUrl) ? 'Yes' : 'No'}</p>
              </div>
              <div className="flex gap-4 justify-center">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleRetry}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors"
                >
                  Try Again
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleBackToUser}
                  className="px-6 py-3 bg-gray-600 hover:bg-gray-700 rounded-lg font-medium transition-colors"
                >
                  Back to Dashboard
                </motion.button>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white">
      {/* Header */}
      <div className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleBackToUser}
              className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
              </svg>
              Back to Dashboard
            </motion.button>
            
            <motion.h1 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-emerald-500"
            >
              Watch Video
            </motion.h1>
            
            <div className="w-20"></div>
          </div>
        </div>
      </div>

      {/* Video Player Section */}
      <div className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="max-w-6xl mx-auto"
        >
          {/* Debug Info */}
          <div className="mb-4 p-4 bg-gray-800/50 rounded-lg">
            <details className="text-sm">
              <summary className="cursor-pointer text-gray-300">Debug Information</summary>
              <div className="mt-2 space-y-1 text-xs text-gray-400">
                <p>URL: {videoUrl}</p>
                <p>URL Type: {isDirectVideoUrl(videoUrl) ? 'Direct Video File' : 'Unknown/Stream URL'}</p>
                <p>Status: {loading ? 'Loading' : error ? 'Error' : 'Ready'}</p>
              </div>
            </details>
          </div>

          {/* Video Player */}
          <div className="bg-black rounded-2xl overflow-hidden shadow-2xl mb-6">
            {videoUrl && (
              <div className="relative">
                <video
                  ref={videoRef}
                  key={videoUrl}
                  controls
                  autoPlay
                  muted
                  onPlay={handleVideoPlay}
                  onError={handleVideoError}
                  onLoadStart={handleVideoLoadStart}
                  onLoadedData={handleVideoLoadedData}
                  className="w-full h-auto max-h-[70vh] mx-auto"
                  playsInline
                  preload="auto"
                >
                  <source src={videoUrl} type="video/mp4" />
                  <source src={videoUrl} type="video/webm" />
                  <source src={videoUrl} type="video/ogg" />
                  Your browser does not support the video tag.
                </video>
                
                {videoError && (
                  <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
                    <div className="text-center p-8">
                      <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                      </div>
                      <h3 className="text-lg font-semibold text-white mb-2">Video Playback Error</h3>
                      <p className="text-gray-300 mb-4">{videoError}</p>
                      <button
                        onClick={handleRetry}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors"
                      >
                        Retry
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Manual Play Button for Auto-play Blocked Cases */}
          {!isPlaying && !videoError && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center mb-6"
            >
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleManualPlay}
                className="px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg font-medium flex items-center gap-2 mx-auto"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                </svg>
                Start Playing
              </motion.button>
              <p className="text-gray-400 text-sm mt-2">If video doesn't start automatically</p>
            </motion.div>
          )}

          {/* Video Info */}
          <div className="bg-gray-800/30 backdrop-blur-lg rounded-2xl border border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-white">Video Player</h2>
              {isPlaying && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="flex items-center gap-2 text-green-400"
                >
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium">Now Playing</span>
                </motion.div>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-300 mb-2">Stream Information</h3>
                <div className="space-y-2 text-sm text-gray-400">
                  <div className="flex justify-between">
                    <span>Status:</span>
                    <span className={videoError ? "text-red-400" : "text-green-400 font-medium"}>
                      {videoError ? 'Error' : 'Ready to stream'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>URL Type:</span>
                    <span>{isDirectVideoUrl(videoUrl) ? 'Direct Video' : 'Stream URL'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Auto-play:</span>
                    <span>{isPlaying ? 'Playing' : 'Waiting'}</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold text-gray-300 mb-2">Troubleshooting</h3>
                <div className="space-y-3">
                  <p className="text-sm text-gray-400">
                    If the video doesn't play, try these solutions:
                  </p>
                  <ul className="text-sm text-gray-400 space-y-1">
                    <li>• Click the play button in the video player</li>
                    <li>• Check if the URL is a direct video file</li>
                    <li>• Ensure you have internet connection</li>
                    <li>• Try refreshing the page</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default function WatchPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white flex items-center justify-center">
        <div className="text-center">
          <svg className="animate-spin h-8 w-8 text-green-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a12 12 0 00-12 12h4z"></path>
          </svg>
          <p className="text-gray-400">Loading video player...</p>
        </div>
      </div>
    }>
      <WatchPageContent />
    </Suspense>
  );
}






// "use client";
// import { useRouter } from "next/navigation";
// import { useEffect, useState, Suspense } from "react";
// import { motion } from "framer-motion";

// function WatchPageContent() {
//   const router = useRouter();
//   const [videoUrl, setVideoUrl] = useState("");
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState("");
//   const [isPlaying, setIsPlaying] = useState(false);

//   useEffect(() => {
//     // Get video URL from localStorage (same storage method as before)
//     const tempData = localStorage.getItem('tempDownloadUrl');
//     if (tempData) {
//       try {
//         const data = JSON.parse(tempData);
//         // Check if expired (30 minutes)
//         const now = Date.now();
//         if (now - data.timestamp > 30 * 60 * 1000) {
//           localStorage.removeItem('tempDownloadUrl');
//           setError("Video URL has expired");
//           setLoading(false);
//           return;
//         }
//         setVideoUrl(data.url);
//         setLoading(false);
//       } catch (error) {
//         console.error("Error parsing video URL data:", error);
//         setError("Invalid video data");
//         setLoading(false);
//       }
//     } else {
//       setError("No video found");
//       setLoading(false);
//     }
//   }, []);

//   const handleVideoPlay = () => {
//     setIsPlaying(true);
//   };

//   const handleBackToUser = () => {
//     router.push('/user');
//   };

//   const handleRetry = () => {
//     setLoading(true);
//     setError("");
//     // Re-check for video URL
//     const tempData = localStorage.getItem('tempDownloadUrl');
//     if (tempData) {
//       try {
//         const data = JSON.parse(tempData);
//         setVideoUrl(data.url);
//         setError("");
//       } catch (error) {
//         setError("Invalid video data");
//       }
//     }
//     setLoading(false);
//   };

//   if (loading) {
//     return (
//       <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white flex flex-col items-center justify-center p-4">
//         <div className="w-full max-w-4xl bg-gray-800/30 backdrop-blur-lg rounded-2xl border border-gray-700 p-8 shadow-2xl">
//           <div className="text-center">
//             <motion.div
//               initial={{ opacity: 0, scale: 0.8 }}
//               animate={{ opacity: 1, scale: 1 }}
//               className="flex flex-col items-center justify-center py-20"
//             >
//               <svg className="animate-spin h-12 w-12 text-green-400 mb-4" fill="none" viewBox="0 0 24 24">
//                 <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
//                 <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a12 12 0 00-12 12h4z"></path>
//               </svg>
//               <h3 className="text-xl font-semibold text-white mb-2">Loading Video</h3>
//               <p className="text-gray-400">Preparing your video stream...</p>
//             </motion.div>
//           </div>
//         </div>
//       </div>
//     );
//   }

//   if (error) {
//     return (
//       <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white flex flex-col items-center justify-center p-4">
//         <div className="w-full max-w-2xl bg-gray-800/30 backdrop-blur-lg rounded-2xl border border-gray-700 p-8 shadow-2xl">
//           <div className="text-center">
//             <motion.div
//               initial={{ opacity: 0, y: 20 }}
//               animate={{ opacity: 1, y: 0 }}
//               className="py-8"
//             >
//               <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
//                 <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
//                 </svg>
//               </div>
//               <h2 className="text-2xl font-bold text-white mb-2">Unable to Load Video</h2>
//               <p className="text-gray-400 mb-6">{error}</p>
//               <div className="flex gap-4 justify-center">
//                 <motion.button
//                   whileHover={{ scale: 1.05 }}
//                   whileTap={{ scale: 0.95 }}
//                   onClick={handleRetry}
//                   className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors"
//                 >
//                   Try Again
//                 </motion.button>
//                 <motion.button
//                   whileHover={{ scale: 1.05 }}
//                   whileTap={{ scale: 0.95 }}
//                   onClick={handleBackToUser}
//                   className="px-6 py-3 bg-gray-600 hover:bg-gray-700 rounded-lg font-medium transition-colors"
//                 >
//                   Back to Dashboard
//                 </motion.button>
//               </div>
//             </motion.div>
//           </div>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white">
//       {/* Header */}
//       <div className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm">
//         <div className="container mx-auto px-4 py-4">
//           <div className="flex items-center justify-between">
//             <motion.button
//               whileHover={{ scale: 1.05 }}
//               whileTap={{ scale: 0.95 }}
//               onClick={handleBackToUser}
//               className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors"
//             >
//               <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
//               </svg>
//               Back to Dashboard
//             </motion.button>
            
//             <motion.h1 
//               initial={{ opacity: 0 }}
//               animate={{ opacity: 1 }}
//               className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-emerald-500"
//             >
//               Watch Video
//             </motion.h1>
            
//             <div className="w-20"></div> {/* Spacer for balance */}
//           </div>
//         </div>
//       </div>

//       {/* Video Player Section */}
//       <div className="container mx-auto px-4 py-8">
//         <motion.div
//           initial={{ opacity: 0, y: 20 }}
//           animate={{ opacity: 1, y: 0 }}
//           transition={{ delay: 0.2 }}
//           className="max-w-6xl mx-auto"
//         >
//           {/* Video Player */}
//           <div className="bg-black rounded-2xl overflow-hidden shadow-2xl mb-6">
//             {videoUrl && (
//               <video
//                 key={videoUrl}
//                 controls
//                 autoPlay
//                 muted
//                 onPlay={handleVideoPlay}
//                 className="w-full h-auto max-h-[70vh] mx-auto"
//                 playsInline
//               >
//                 <source src={videoUrl} type="video/mp4" />
//                 <source src={videoUrl} type="video/webm" />
//                 <source src={videoUrl} type="video/ogg" />
//                 Your browser does not support the video tag.
//               </video>
//             )}
//           </div>

//           {/* Video Info */}
//           <div className="bg-gray-800/30 backdrop-blur-lg rounded-2xl border border-gray-700 p-6">
//             <div className="flex items-center justify-between mb-4">
//               <h2 className="text-2xl font-bold text-white">Now Playing</h2>
//               {isPlaying && (
//                 <motion.div
//                   initial={{ scale: 0 }}
//                   animate={{ scale: 1 }}
//                   className="flex items-center gap-2 text-green-400"
//                 >
//                   <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
//                   <span className="text-sm font-medium">Live</span>
//                 </motion.div>
//               )}
//             </div>
            
//             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//               <div>
//                 <h3 className="text-lg font-semibold text-gray-300 mb-2">Stream Information</h3>
//                 <div className="space-y-2 text-sm text-gray-400">
//                   <div className="flex justify-between">
//                     <span>Status:</span>
//                     <span className="text-green-400 font-medium">Ready to stream</span>
//                   </div>
//                   <div className="flex justify-between">
//                     <span>Quality:</span>
//                     <span>Auto (Adaptive)</span>
//                   </div>
//                   <div className="flex justify-between">
//                     <span>Format:</span>
//                     <span>MP4/WebM</span>
//                   </div>
//                 </div>
//               </div>
              
//               <div>
//                 <h3 className="text-lg font-semibold text-gray-300 mb-2">Player Controls</h3>
//                 <div className="space-y-3">
//                   <p className="text-sm text-gray-400">
//                     Use the player controls above to play, pause, adjust volume, and toggle fullscreen.
//                   </p>
//                   <div className="flex gap-2 flex-wrap">
//                     <span className="px-2 py-1 bg-gray-700 rounded text-xs text-gray-300">Space = Play/Pause</span>
//                     <span className="px-2 py-1 bg-gray-700 rounded text-xs text-gray-300">F = Fullscreen</span>
//                     <span className="px-2 py-1 bg-gray-700 rounded text-xs text-gray-300">M = Mute</span>
//                   </div>
//                 </div>
//               </div>
//             </div>
//           </div>

//           {/* Help Section */}
//           <motion.div
//             initial={{ opacity: 0 }}
//             animate={{ opacity: 1 }}
//             transition={{ delay: 0.4 }}
//             className="mt-6 bg-blue-500/10 border border-blue-500/20 rounded-2xl p-6"
//           >
//             <div className="flex items-start gap-4">
//               <div className="flex-shrink-0 w-6 h-6 text-blue-400 mt-1">
//                 <svg fill="currentColor" viewBox="0 0 20 20">
//                   <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"></path>
//                 </svg>
//               </div>
//               <div>
//                 <h3 className="text-lg font-semibold text-blue-400 mb-2">Having trouble playing the video?</h3>
//                 <ul className="text-blue-300 text-sm space-y-1">
//                   <li>• Ensure you have a stable internet connection</li>
//                   <li>• Video should start automatically. If not, click the play button</li>
//                   <li>• For best experience, use Chrome, Firefox, or Safari</li>
//                   <li>• Video will expire in 30 minutes from generation</li>
//                 </ul>
//               </div>
//             </div>
//           </motion.div>
//         </motion.div>
//       </div>
//     </div>
//   );
// }

// export default function WatchPage() {
//   return (
//     <Suspense fallback={
//       <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white flex items-center justify-center">
//         <div className="text-center">
//           <svg className="animate-spin h-8 w-8 text-green-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
//             <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
//             <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a12 12 0 00-12 12h4z"></path>
//           </svg>
//           <p className="text-gray-400">Loading video player...</p>
//         </div>
//       </div>
//     }>
//       <WatchPageContent />
//     </Suspense>
//   );
// }