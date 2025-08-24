"use client";
import { useEffect, useState, useMemo } from "react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { collection, getDocs, query, orderBy, doc, getDoc, setDoc, updateDoc } from "firebase/firestore";

export default function UserPage() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [content, setContent] = useState([]);
  const [error, setError] = useState("");
  const [linkProgress, setLinkProgress] = useState({});
  const [countdowns, setCountdowns] = useState({});
  const [userProgressDoc, setUserProgressDoc] = useState(null);

  // ✅ Enable Firestore persistence for caching
  useEffect(() => {
    const enablePersistence = async () => {
      try {
        await enableIndexedDbPersistence(db);
      } catch (err) {
        if (err.code == 'failed-precondition') {
          console.log("Multiple tabs open, persistence can only be enabled in one tab at a time.");
        } else if (err.code == 'unimplemented') {
          console.log("The current browser doesn't support persistence.");
        }
      }
    };
    enablePersistence();
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) {
        window.location.href = "/login";
      } else {
        setUser(u);
        setIsLoading(false);
        
        // ✅ Load from localStorage first for instant UI
        const savedProgress = localStorage.getItem(`progress_${u.uid}`);
        const savedCountdowns = localStorage.getItem(`countdowns_${u.uid}`);
        
        if (savedProgress) setLinkProgress(JSON.parse(savedProgress));
        if (savedCountdowns) setCountdowns(JSON.parse(savedCountdowns));
      }
    });
    return () => unsub();
  }, []);

  // ✅ Fetch user progress ONLY once when user logs in
  useEffect(() => {
    const fetchUserProgress = async () => {
      if (!user) return;
      
      try {
        const userProgressRef = doc(db, "userProgress", user.uid);
        const docSnap = await getDoc(userProgressRef);
        
        if (docSnap.exists()) {
          const userData = docSnap.data();
          setLinkProgress(userData.linkProgress || {});
          setCountdowns(userData.countdowns || {});
          
          // ✅ Save to localStorage for future visits
          localStorage.setItem(`progress_${user.uid}`, JSON.stringify(userData.linkProgress || {}));
          localStorage.setItem(`countdowns_${user.uid}`, JSON.stringify(userData.countdowns || {}));
        } else {
          await setDoc(userProgressRef, {
            userId: user.uid,
            linkProgress: {},
            countdowns: {},
            createdAt: new Date()
          });
        }
        setUserProgressDoc(userProgressRef);
      } catch (err) {
        console.error("Error fetching user progress:", err);
        setError("Failed to load user progress");
      }
    };

    if (user) {
      fetchUserProgress();
    }
  }, [user]);

  // ✅ Fetch content ONLY once (with caching)
  useEffect(() => {
    const fetchContent = async () => {
      // ✅ Check cache first
      const cachedContent = localStorage.getItem('cachedContent');
      const cachedTimestamp = localStorage.getItem('cachedContentTimestamp');
      
      // If cache exists and is less than 1 hour old, use it
      if (cachedContent && cachedTimestamp && (Date.now() - cachedTimestamp < 3600000)) {
        setContent(JSON.parse(cachedContent));
        return;
      }
      
      try {
        const q = query(collection(db, "adminContent"), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        const contentData = [];
        querySnapshot.forEach((doc) => {
          contentData.push({ id: doc.id, ...doc.data() });
        });
        
        setContent(contentData);
        // ✅ Cache the content
        localStorage.setItem('cachedContent', JSON.stringify(contentData));
        localStorage.setItem('cachedContentTimestamp', Date.now());
      } catch (err) {
        console.error("Error fetching content:", err);
        setError("Failed to load content");
      }
    };
    
    if (user) fetchContent();
  }, [user]);

  // ✅ Save progress to Firestore ONLY when changes occur (not on every render)
  useEffect(() => {
    const saveProgressToFirestore = async () => {
      if (!user || !userProgressDoc) return;
      
      try {
        await updateDoc(userProgressDoc, {
          linkProgress,
          countdowns,
          updatedAt: new Date()
        });
      } catch (err) {
        console.error("Error saving user progress:", err);
      }
    };

    // ✅ Debounce Firestore writes to prevent too many requests
    const timer = setTimeout(() => {
      if (Object.keys(linkProgress).length > 0 || Object.keys(countdowns).length > 0) {
        saveProgressToFirestore();
      }
    }, 2000); // Save every 2 seconds after changes

    return () => clearTimeout(timer);
  }, [linkProgress, countdowns, user, userProgressDoc]);

  // ✅ Handle countdown timers LOCALLY (no Firestore reads/writes)
  useEffect(() => {
    const timers = {};
    
    Object.entries(countdowns).forEach(([key, endTime]) => {
      const updateCountdown = () => {
        const now = new Date().getTime();
        const distance = endTime - now;
        
        if (distance <= 0) {
          // Timer finished - update locally only
          setCountdowns(prev => {
            const newCountdowns = { ...prev };
            delete newCountdowns[key];
            
            // ✅ Update localStorage
            if (user) {
              localStorage.setItem(`countdowns_${user.uid}`, JSON.stringify(newCountdowns));
            }
            return newCountdowns;
          });
        } else {
          // Just update the local state
          timers[key] = setTimeout(updateCountdown, 1000);
        }
      };
      
      timers[key] = setTimeout(updateCountdown, 1000);
    });
    
    return () => {
      Object.values(timers).forEach(timer => clearTimeout(timer));
    };
  }, [countdowns, user]);

  // ✅ Rest of your code remains exactly the same...
  // [Keep all your existing functions like handleLinkClick, openLink, etc.]
  // Only the optimization parts above have changed

  // ... (Your existing JSX rendering code)

  const groupedContent = useMemo(() => {
    const visibleContent = content.filter(item => item.visibility !== "hide");
    const groups = {};
    visibleContent.forEach(item => {
      const courseName = item.courseName || "Untitled Course";
      if (!groups[courseName]) groups[courseName] = [];
      groups[courseName].push(item);
    });
    Object.keys(groups).forEach(courseName => {
      groups[courseName].sort((a, b) => {
        const dateA = a.createdAt?.toDate() || new Date(0);
        const dateB = b.createdAt?.toDate() || new Date(0);
        return dateA - dateB;
      });
    });
    return groups;
  }, [content]);

  const handleLinkClick = (courseName, partIndex, linkIndex, url) => {
    const linkKey = `${courseName}_part${partIndex}_link${linkIndex}`;
    const prevLinkKey = linkIndex > 0 ? `${courseName}_part${partIndex}_link${linkIndex - 1}` : null;
    
    // Check if previous link has been accessed
    if (prevLinkKey && !linkProgress[prevLinkKey]) {
      alert("Please complete the previous resource first!");
      return;
    }
    
    // Check if this link is already unlocked
    if (linkProgress[linkKey]) {
      // Link is already unlocked, open it
      openLink(url);
      return;
    }
    
    // Check if there's an active countdown for this link
    if (countdowns[linkKey]) {
      const remainingTime = Math.ceil((countdowns[linkKey] - new Date().getTime()) / 1000);
      const minutes = Math.floor(remainingTime / 60);
      const seconds = remainingTime % 60;
      alert(`Please wait ${minutes}m ${seconds}s before accessing this resource.`);
      return;
    }
    
    // If this is the first link or previous is completed, unlock it
    if (linkIndex === 0 || linkProgress[prevLinkKey]) {
      // Start 20 minute countdown for next link
      if (linkIndex < 49) { // Assuming max 50 links
        const nextLinkKey = `${courseName}_part${partIndex}_link${linkIndex + 1}`;
        const endTime = new Date().getTime() + 20 * 60 * 1000; // 20 minutes from now
        setCountdowns(prev => ({ ...prev, [nextLinkKey]: endTime }));
      }
      
      // Mark current link as completed
      setLinkProgress(prev => ({ ...prev, [linkKey]: true }));
      
      // Open the link
      openLink(url);
    }
  };

  const openLink = (url) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const getLinkName = (url) => {
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      return 'YouTube Video';
    } else if (url.includes('github.com')) {
      return 'GitHub Repository';
    } else if (url.includes('drive.google.com')) {
      return 'Google Drive';
    } else if (url.includes('dropbox.com')) {
      return 'Dropbox File';
    } else if (url.includes('pdf')) {
      return 'PDF Document';
    } else {
      try {
        const domain = new URL(url).hostname.replace('www.', '');
        return domain.charAt(0).toUpperCase() + domain.slice(1);
      } catch (e) {
        return 'External Link';
      }
    }
  };

  // const formatCountdown = (milliseconds) => {
  //   const totalSeconds = Math.ceil(milliseconds / 1000);
  //   const minutes = Math.floor(totalSeconds / 60);
  //   const seconds = totalSeconds % 60;
    
  //   if (minutes > 0) {
  //     return `${minutes}m ${seconds}s`;
  //   } else {
  //     return `${seconds}s`;
  //   }
  // };

// const formatCountdown = (milliseconds) => {
//   const totalSeconds = Math.ceil(milliseconds / 1000);

//   const hours = Math.floor(totalSeconds / 3600); // 1 hour = 3600 seconds
//   const minutes = Math.floor((totalSeconds % 3600) / 60);
//   const seconds = totalSeconds % 60;

//   if (hours > 0) {
//     return `${hours}h ${minutes}m ${seconds}s`;
//   } else if (minutes > 0) {
//     return `${minutes}m ${seconds}s`;
//   } else {
//     return `${seconds}s`;
//   }
// };

const formatCountdown = (milliseconds) => {
  const totalSeconds = Math.ceil(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600); // 1 hour = 3600 seconds

  return `${hours}h`;
};



  const getCountdownTime = (key) => {
    if (!countdowns[key]) return null;
    const distance = countdowns[key] - new Date().getTime();
    return Math.max(0, distance);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-blue-500 rounded-full animate-spin"></div>
          <div className="absolute top-0 left-0 w-16 h-16 border-4 border-transparent border-t-blue-300 rounded-full animate-ping"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-4 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <div 
            key={i}
            className="absolute rounded-full bg-blue-500 opacity-10 animate-pulse"
            style={{
              width: `${Math.random() * 100 + 20}px`,
              height: `${Math.random() * 100 + 20}px`,
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              animationDuration: `${Math.random() * 5 + 3}s`,
              animationDelay: `${Math.random() * 2}s`
            }}
          ></div>
        ))}
      </div>
      
      <div className="relative z-10 max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div className="text-center">
            <div className="inline-block p-4 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 mb-4 transform transition-transform duration-500 hover:scale-110">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
              </svg>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
              Welcome, {user?.email?.split('@')[0]}!
            </h1>
          </div>
          <button
            onClick={() => signOut(auth)}
            className="px-8 py-3 bg-gradient-to-r from-red-600 to-red-800 text-white font-bold rounded-full transform transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-red-500/30 flex items-center justify-center group"
          >
            Logout
          </button>
        </div>
        
        {error && (
          <div className="bg-red-900 bg-opacity-50 p-4 rounded-lg mb-6">
            <p className="text-red-300">{error}</p>
          </div>
        )}
        
        {Object.keys(groupedContent).length === 0 ? (
          <div className="text-center py-12">
            <h2 className="text-2xl font-semibold mb-4">No content available</h2>
            <p className="text-gray-400">Check back later for new content.</p>
          </div>
        ) : (
          <div className="space-y-12">
            {Object.entries(groupedContent).map(([courseName, parts]) => (
              <div key={courseName} className="course-section">
                <div className="text-center mb-8">
                  <h2 className="text-3xl md:text-4xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
                    {courseName}
                  </h2>
                  <div className="w-24 h-1 bg-gradient-to-r from-blue-500 to-purple-500 mx-auto rounded-full"></div>
                </div>
                
                <div className="space-y-8">
                  {parts.map((part, partIndex) => (
                    <div key={part.id} className="bg-gray-900 bg-opacity-70 backdrop-blur-lg rounded-2xl p-6 border border-gray-800 shadow-2xl">
                      <div className="mb-6 group relative overflow-hidden rounded-2xl shadow-xl">
                        {part.imageUrl ? (
                          <img 
                            src={part.imageUrl} 
                            alt={`Part ${partIndex + 1} of ${courseName}`} 
                            className="w-full h-80 object-cover transform transition-transform duration-500 group-hover:scale-105"
                          />
                        ) : (
                          <img 
                            src="https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80" 
                            alt={`Part ${partIndex + 1} of ${courseName}`} 
                            className="w-full h-80 object-cover transform transition-transform duration-500 group-hover:scale-105"
                          />
                        )}
                      </div>
                      
                      <div className="mb-4">
                        <h4 className="text-lg font-semibold mb-3 text-purple-400">Resources for Part {partIndex + 1}:</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {part.fields
                            .filter(field => field.trim() !== '') 
                            .map((field, index) => {
                              const isUrl = field.startsWith('http://') || field.startsWith('https://');
                              const linkKey = `${courseName}_part${partIndex}_link${index}`;
                              const isUnlocked = linkProgress[linkKey];
                              const prevLinkKey = index > 0 ? `${courseName}_part${partIndex}_link${index - 1}` : null;
                              const canAccess = index === 0 || linkProgress[prevLinkKey];
                              const countdownTime = getCountdownTime(linkKey);
                              
                              if (isUrl) {
                                return (
                                  <div key={index} className="relative">
                                    <button
                                      onClick={() => handleLinkClick(courseName, partIndex, index, field)}
                                      disabled={!canAccess || countdownTime !== null}
                                      className={`w-full font-medium py-3 px-4 rounded-lg transition duration-300 transform flex items-center justify-center ${
                                        isUnlocked 
                                          ? "bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
                                          : canAccess && countdownTime === null
                                            ? "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                                            : "bg-gray-700 text-gray-400 cursor-not-allowed"
                                      }`}
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd" />
                                      </svg>
                                      {getLinkName(field)}
                                    </button>
                                    
                                    {/* Status indicators */}
                                    <div className="mt-2 text-xs text-center">
                                      {isUnlocked ? (
                                        <span className="text-green-400">✓ Completed</span>
                                      ) : countdownTime !== null ? (
                                        <span className="text-yellow-400">Available in {formatCountdown(countdownTime)}</span>
                                      ) : canAccess ? (
                                        <span className="text-blue-400">Ready to access</span>
                                      ) : (
                                        <span className="text-gray-400">Complete previous resource first</span>
                                      )}
                                    </div>
                                  </div>
                                );
                              } else {
                                return (
                                  <div key={index} className="bg-gray-800 p-4 rounded-lg">
                                    <p className="text-gray-300">{field}</p>
                                  </div>
                                );
                              }
                            })}
                        </div>
                      </div>
                      
                      <div className="mt-4 text-sm text-gray-500">
                        {part.nonEmptyCount || part.fields.filter(f => f.trim()).length} resources
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
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

//  upper code iss very very efficient for not loss reads of firebase




























// "use client";
// import { useEffect, useState, useMemo } from "react";
// import { auth, db } from "@/lib/firebase";
// import { onAuthStateChanged, signOut } from "firebase/auth";
// import { collection, getDocs, query, orderBy, doc, getDoc, setDoc, updateDoc, arrayUnion } from "firebase/firestore";

// export default function UserPage() {
//   const [user, setUser] = useState(null);
//   const [isLoading, setIsLoading] = useState(true);
//   const [content, setContent] = useState([]);
//   const [error, setError] = useState("");
//   const [linkProgress, setLinkProgress] = useState({});
//   const [countdowns, setCountdowns] = useState({});
//   const [userProgressDoc, setUserProgressDoc] = useState(null);

//   useEffect(() => {
//     const unsub = onAuthStateChanged(auth, (u) => {
//       if (!u) {
//         window.location.href = "/login";
//       } else {
//         setUser(u);
//         setIsLoading(false);
//       }
//     });
//     return () => unsub();
//   }, []);

//   // Fetch user progress from Firestore when user logs in
//   useEffect(() => {
//     const fetchUserProgress = async () => {
//       if (!user) return;
      
//       try {
//         const userProgressRef = doc(db, "userProgress", user.uid);
//         const docSnap = await getDoc(userProgressRef);
        
//         if (docSnap.exists()) {
//           const userData = docSnap.data();
//           setLinkProgress(userData.linkProgress || {});
//           setCountdowns(userData.countdowns || {});
//           setUserProgressDoc(userProgressRef);
//         } else {
//           // Create a new document for the user
//           await setDoc(userProgressRef, {
//             userId: user.uid,
//             linkProgress: {},
//             countdowns: {},
//             createdAt: new Date()
//           });
//           setLinkProgress({});
//           setCountdowns({});
//           setUserProgressDoc(userProgressRef);
//         }
//       } catch (err) {
//         console.error("Error fetching user progress:", err);
//         setError("Failed to load user progress");
//       }
//     };

//     if (user) {
//       fetchUserProgress();
//     }
//   }, [user]);

//   useEffect(() => {
//     const fetchContent = async () => {
//       try {
//         const q = query(collection(db, "adminContent"), orderBy("createdAt", "desc"));
//         const querySnapshot = await getDocs(q);
//         const contentData = [];
//         querySnapshot.forEach((doc) => {
//           contentData.push({ id: doc.id, ...doc.data() });
//         });
//         setContent(contentData);
//       } catch (err) {
//         console.error("Error fetching content:", err);
//         setError("Failed to load content");
//       }
//     };
//     if (user) fetchContent();
//   }, [user]);

//   // Save progress to Firestore whenever it changes
//   useEffect(() => {
//     const saveProgressToFirestore = async () => {
//       if (!user || !userProgressDoc) return;
      
//       try {
//         await updateDoc(userProgressDoc, {
//           linkProgress,
//           countdowns,
//           updatedAt: new Date()
//         });
//       } catch (err) {
//         console.error("Error saving user progress:", err);
//       }
//     };

//     if (user && userProgressDoc) {
//       saveProgressToFirestore();
//     }
//   }, [linkProgress, countdowns, user, userProgressDoc]);

//   // Handle countdown timers
//   useEffect(() => {
//     const timers = {};
    
//     Object.entries(countdowns).forEach(([key, endTime]) => {
//       const updateCountdown = () => {
//         const now = new Date().getTime();
//         const distance = endTime - now;
        
//         if (distance <= 0) {
//           // Timer finished
//           setCountdowns(prev => {
//             const newCountdowns = { ...prev };
//             delete newCountdowns[key];
//             return newCountdowns;
//           });
//         } else {
//           // Update countdown display
//           setCountdowns(prev => ({
//             ...prev,
//             [key]: endTime
//           }));
//           timers[key] = setTimeout(updateCountdown, 1000);
//         }
//       };
      
//       timers[key] = setTimeout(updateCountdown, 1000);
//     });
    
//     return () => {
//       // Clean up timers
//       Object.values(timers).forEach(timer => clearTimeout(timer));
//     };
//   }, [countdowns]);







//   const groupedContent = useMemo(() => {
//     const visibleContent = content.filter(item => item.visibility !== "hide");
//     const groups = {};
//     visibleContent.forEach(item => {
//       const courseName = item.courseName || "Untitled Course";
//       if (!groups[courseName]) groups[courseName] = [];
//       groups[courseName].push(item);
//     });
//     Object.keys(groups).forEach(courseName => {
//       groups[courseName].sort((a, b) => {
//         const dateA = a.createdAt?.toDate() || new Date(0);
//         const dateB = b.createdAt?.toDate() || new Date(0);
//         return dateA - dateB;
//       });
//     });
//     return groups;
//   }, [content]);

//   const handleLinkClick = (courseName, partIndex, linkIndex, url) => {
//     const linkKey = `${courseName}_part${partIndex}_link${linkIndex}`;
//     const prevLinkKey = linkIndex > 0 ? `${courseName}_part${partIndex}_link${linkIndex - 1}` : null;
    
//     // Check if previous link has been accessed
//     if (prevLinkKey && !linkProgress[prevLinkKey]) {
//       alert("Please complete the previous resource first!");
//       return;
//     }
    
//     // Check if this link is already unlocked
//     if (linkProgress[linkKey]) {
//       // Link is already unlocked, open it
//       openLink(url);
//       return;
//     }
    
//     // Check if there's an active countdown for this link
//     if (countdowns[linkKey]) {
//       const remainingTime = Math.ceil((countdowns[linkKey] - new Date().getTime()) / 1000);
//       const minutes = Math.floor(remainingTime / 60);
//       const seconds = remainingTime % 60;
//       alert(`Please wait ${minutes}m ${seconds}s before accessing this resource.`);
//       return;
//     }
    
//     // If this is the first link or previous is completed, unlock it
//     if (linkIndex === 0 || linkProgress[prevLinkKey]) {
//       // Start 20 minute countdown for next link
//       if (linkIndex < 49) { // Assuming max 50 links
//         const nextLinkKey = `${courseName}_part${partIndex}_link${linkIndex + 1}`;
//         const endTime = new Date().getTime() + 20 * 60 * 1000; // 20 minutes from now
//         setCountdowns(prev => ({ ...prev, [nextLinkKey]: endTime }));
//       }
      
//       // Mark current link as completed
//       setLinkProgress(prev => ({ ...prev, [linkKey]: true }));
      
//       // Open the link
//       openLink(url);
//     }
//   };

//   const openLink = (url) => {
//     window.open(url, "_blank", "noopener,noreferrer");
//   };

//   const getLinkName = (url) => {
//     if (url.includes('youtube.com') || url.includes('youtu.be')) {
//       return 'YouTube Video';
//     } else if (url.includes('github.com')) {
//       return 'GitHub Repository';
//     } else if (url.includes('drive.google.com')) {
//       return 'Google Drive';
//     } else if (url.includes('dropbox.com')) {
//       return 'Dropbox File';
//     } else if (url.includes('pdf')) {
//       return 'PDF Document';
//     } else {
//       try {
//         const domain = new URL(url).hostname.replace('www.', '');
//         return domain.charAt(0).toUpperCase() + domain.slice(1);
//       } catch (e) {
//         return 'External Link';
//       }
//     }
//   };

//   const formatCountdown = (milliseconds) => {
//     const totalSeconds = Math.ceil(milliseconds / 1000);
//     const minutes = Math.floor(totalSeconds / 60);
//     const seconds = totalSeconds % 60;
    
//     if (minutes > 0) {
//       return `${minutes}m ${seconds}s`;
//     } else {
//       return `${seconds}s`;
//     }
//   };

//   const getCountdownTime = (key) => {
//     if (!countdowns[key]) return null;
//     const distance = countdowns[key] - new Date().getTime();
//     return Math.max(0, distance);
//   };

//   if (isLoading) {
//     return (
//       <div className="flex min-h-screen items-center justify-center bg-black">
//         <div className="relative">
//           <div className="w-16 h-16 border-4 border-blue-500 rounded-full animate-spin"></div>
//           <div className="absolute top-0 left-0 w-16 h-16 border-4 border-transparent border-t-blue-300 rounded-full animate-ping"></div>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="min-h-screen bg-black text-white p-4 relative overflow-hidden">
//       <div className="absolute inset-0 overflow-hidden">
//         {[...Array(20)].map((_, i) => (
//           <div 
//             key={i}
//             className="absolute rounded-full bg-blue-500 opacity-10 animate-pulse"
//             style={{
//               width: `${Math.random() * 100 + 20}px`,
//               height: `${Math.random() * 100 + 20}px`,
//               top: `${Math.random() * 100}%`,
//               left: `${Math.random() * 100}%`,
//               animationDuration: `${Math.random() * 5 + 3}s`,
//               animationDelay: `${Math.random() * 2}s`
//             }}
//           ></div>
//         ))}
//       </div>
      
//       <div className="relative z-10 max-w-6xl mx-auto">
//         <div className="flex justify-between items-center mb-8">
//           <div className="text-center">
//             <div className="inline-block p-4 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 mb-4 transform transition-transform duration-500 hover:scale-110">
//               <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" viewBox="0 0 20 20" fill="currentColor">
//                 <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
//               </svg>
//             </div>
//             <h1 className="text-4xl md:text-5xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
//               Welcome, {user?.email?.split('@')[0]}!
//             </h1>
//           </div>
//           <button
//             onClick={() => signOut(auth)}
//             className="px-8 py-3 bg-gradient-to-r from-red-600 to-red-800 text-white font-bold rounded-full transform transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-red-500/30 flex items-center justify-center group"
//           >
//             Logout
//           </button>
//         </div>
        
//         {error && (
//           <div className="bg-red-900 bg-opacity-50 p-4 rounded-lg mb-6">
//             <p className="text-red-300">{error}</p>
//           </div>
//         )}
        
//         {Object.keys(groupedContent).length === 0 ? (
//           <div className="text-center py-12">
//             <h2 className="text-2xl font-semibold mb-4">No content available</h2>
//             <p className="text-gray-400">Check back later for new content.</p>
//           </div>
//         ) : (
//           <div className="space-y-12">
//             {Object.entries(groupedContent).map(([courseName, parts]) => (
//               <div key={courseName} className="course-section">
//                 <div className="text-center mb-8">
//                   <h2 className="text-3xl md:text-4xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
//                     {courseName}
//                   </h2>
//                   <div className="w-24 h-1 bg-gradient-to-r from-blue-500 to-purple-500 mx-auto rounded-full"></div>
//                 </div>
                
//                 <div className="space-y-8">
//                   {parts.map((part, partIndex) => (
//                     <div key={part.id} className="bg-gray-900 bg-opacity-70 backdrop-blur-lg rounded-2xl p-6 border border-gray-800 shadow-2xl">
//                       <div className="mb-6 group relative overflow-hidden rounded-2xl shadow-xl">
//                         {part.imageUrl ? (
//                           <img 
//                             src={part.imageUrl} 
//                             alt={`Part ${partIndex + 1} of ${courseName}`} 
//                             className="w-full h-80 object-cover transform transition-transform duration-500 group-hover:scale-105"
//                           />
//                         ) : (
//                           <img 
//                             src="https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80" 
//                             alt={`Part ${partIndex + 1} of ${courseName}`} 
//                             className="w-full h-80 object-cover transform transition-transform duration-500 group-hover:scale-105"
//                           />
//                         )}
//                       </div>
                      
//                       <div className="mb-4">
//                         <h4 className="text-lg font-semibold mb-3 text-purple-400">Resources for Part {partIndex + 1}:</h4>
//                         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
//                           {part.fields
//                             .filter(field => field.trim() !== '') 
//                             .map((field, index) => {
//                               const isUrl = field.startsWith('http://') || field.startsWith('https://');
//                               const linkKey = `${courseName}_part${partIndex}_link${index}`;
//                               const isUnlocked = linkProgress[linkKey];
//                               const prevLinkKey = index > 0 ? `${courseName}_part${partIndex}_link${index - 1}` : null;
//                               const canAccess = index === 0 || linkProgress[prevLinkKey];
//                               const countdownTime = getCountdownTime(linkKey);
                              
//                               if (isUrl) {
//                                 return (
//                                   <div key={index} className="relative">
//                                     <button
//                                       onClick={() => handleLinkClick(courseName, partIndex, index, field)}
//                                       disabled={!canAccess || countdownTime !== null}
//                                       className={`w-full font-medium py-3 px-4 rounded-lg transition duration-300 transform flex items-center justify-center ${
//                                         isUnlocked 
//                                           ? "bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
//                                           : canAccess && countdownTime === null
//                                             ? "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
//                                             : "bg-gray-700 text-gray-400 cursor-not-allowed"
//                                       }`}
//                                     >
//                                       <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
//                                         <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd" />
//                                       </svg>
//                                       {getLinkName(field)}
//                                     </button>
                                    
//                                     {/* Status indicators */}
//                                     <div className="mt-2 text-xs text-center">
//                                       {isUnlocked ? (
//                                         <span className="text-green-400">✓ Completed</span>
//                                       ) : countdownTime !== null ? (
//                                         <span className="text-yellow-400">Available in {formatCountdown(countdownTime)}</span>
//                                       ) : canAccess ? (
//                                         <span className="text-blue-400">Ready to access</span>
//                                       ) : (
//                                         <span className="text-gray-400">Complete previous resource first</span>
//                                       )}
//                                     </div>
//                                   </div>
//                                 );
//                               } else {
//                                 return (
//                                   <div key={index} className="bg-gray-800 p-4 rounded-lg">
//                                     <p className="text-gray-300">{field}</p>
//                                   </div>
//                                 );
//                               }
//                             })}
//                         </div>
//                       </div>
                      
//                       <div className="mt-4 text-sm text-gray-500">
//                         {part.nonEmptyCount || part.fields.filter(f => f.trim()).length} resources
//                       </div>
//                     </div>
//                   ))}
//                 </div>
//               </div>
//             ))}
//           </div>
//         )}
//       </div>
      
//       <style jsx global>{`
//         @keyframes fadeIn {
//           from { opacity: 0; transform: translateY(20px); }
//           to { opacity: 1; transform: translateY(0); }
//         }
//         .animate-fadeIn {
//           animation: fadeIn 0.8s ease-out forwards;
//         }
//       `}</style>
//     </div>
//   );
// }



















// ========================================================================








// ===============================================================
// isko rehnee doo yeh khalat code hai 

// "use client";
// import { useEffect, useState, useMemo } from "react";
// import { auth, db } from "@/lib/firebase";
// import { onAuthStateChanged, signOut } from "firebase/auth";
// import { 
//   collection, getDocs, query, orderBy, 
//   doc, getDoc, setDoc, updateDoc 
// } from "firebase/firestore";

// export default function UserPage() {
//   const [user, setUser] = useState(null);
//   const [isLoading, setIsLoading] = useState(true);
//   const [content, setContent] = useState([]);
//   const [error, setError] = useState("");
//   const [linkProgress, setLinkProgress] = useState({});
//   const [countdowns, setCountdowns] = useState({});
//   const [userProgressDoc, setUserProgressDoc] = useState(null);

//   // 🔹 User Auth State
//   useEffect(() => {
//     const unsub = onAuthStateChanged(auth, (u) => {
//       if (!u) {
//         window.location.href = "/login";
//       } else {
//         setUser(u);
//         setIsLoading(false);
//       }
//     });
//     return () => unsub();
//   }, []);

//   // 🔹 Fetch user progress (only once per login)
//   useEffect(() => {
//     const fetchUserProgress = async () => {
//       if (!user) return;
//       try {
//         const userProgressRef = doc(db, "userProgress", user.uid);
//         const docSnap = await getDoc(userProgressRef);

//         if (docSnap.exists()) {
//           const userData = docSnap.data();
//           setLinkProgress(userData.linkProgress || {});
//           setCountdowns(userData.countdowns || {});
//           setUserProgressDoc(userProgressRef);
//         } else {
//           await setDoc(userProgressRef, {
//             userId: user.uid,
//             linkProgress: {},
//             countdowns: {},
//             createdAt: new Date()
//           });
//           setLinkProgress({});
//           setCountdowns({});
//           setUserProgressDoc(userProgressRef);
//         }
//       } catch (err) {
//         console.error("Error fetching user progress:", err);
//         setError("Failed to load user progress");
//       }
//     };

//     fetchUserProgress();
//   }, [user]);

//   // 🔹 Fetch Content (read once per session)
//   useEffect(() => {
//     const fetchContent = async () => {
//       try {
//         const q = query(collection(db, "adminContent"), orderBy("createdAt", "desc"));
//         const querySnapshot = await getDocs(q);
//         const contentData = [];
//         querySnapshot.forEach((doc) => {
//           contentData.push({ id: doc.id, ...doc.data() });
//         });
//         setContent(contentData);
//       } catch (err) {
//         console.error("Error fetching content:", err);
//         setError("Failed to load content");
//       }
//     };

//     if (user && content.length === 0) fetchContent();
//   }, [user, content.length]);

//   // 🔹 Save progress (only when state changes)
//   useEffect(() => {
//     const saveProgressToFirestore = async () => {
//       if (!user || !userProgressDoc) return;
//       try {
//         await updateDoc(userProgressDoc, {
//           linkProgress,
//           countdowns,
//           updatedAt: new Date()
//         });
//       } catch (err) {
//         console.error("Error saving user progress:", err);
//       }
//     };
//     if (user && userProgressDoc) saveProgressToFirestore();
//   }, [linkProgress, countdowns, user, userProgressDoc]);

//   // 🔹 Countdown Timers (local updates only, no extra reads)
//   useEffect(() => {
//     const timers = {};
//     Object.entries(countdowns).forEach(([key, endTime]) => {
//       const updateCountdown = () => {
//         const now = Date.now();
//         const distance = endTime - now;
//         if (distance <= 0) {
//           setCountdowns(prev => {
//             const newCountdowns = { ...prev };
//             delete newCountdowns[key];
//             return newCountdowns;
//           });
//         } else {
//           timers[key] = setTimeout(updateCountdown, 1000);
//         }
//       };
//       timers[key] = setTimeout(updateCountdown, 1000);
//     });
//     return () => Object.values(timers).forEach(timer => clearTimeout(timer));
//   }, [countdowns]);

//   // 🔹 Group content for display
//   const groupedContent = useMemo(() => {
//     const visibleContent = content.filter(item => item.visibility !== "hide");
//     const groups = {};
//     visibleContent.forEach(item => {
//       const courseName = item.courseName || "Untitled Course";
//       if (!groups[courseName]) groups[courseName] = [];
//       groups[courseName].push(item);
//     });
//     Object.keys(groups).forEach(courseName => {
//       groups[courseName].sort((a, b) => {
//         const dateA = a.createdAt?.toDate() || new Date(0);
//         const dateB = b.createdAt?.toDate() || new Date(0);
//         return dateA - dateB;
//       });
//     });
//     return groups;
//   }, [content]);

//   // 🔹 Handle Link Click
//   const handleLinkClick = (courseName, partIndex, linkIndex, url) => {
//     const linkKey = `${courseName}_part${partIndex}_link${linkIndex}`;
//     const prevLinkKey = linkIndex > 0 ? `${courseName}_part${partIndex}_link${linkIndex - 1}` : null;

//     if (prevLinkKey && !linkProgress[prevLinkKey]) {
//       alert("Please complete the previous resource first!");
//       return;
//     }
//     if (linkProgress[linkKey]) {
//       openLink(url);
//       return;
//     }
//     if (countdowns[linkKey]) {
//       const remainingTime = Math.ceil((countdowns[linkKey] - Date.now()) / 1000);
//       const minutes = Math.floor(remainingTime / 60);
//       const seconds = remainingTime % 60;
//       alert(`Please wait ${minutes}m ${seconds}s before accessing this resource.`);
//       return;
//     }
//     if (linkIndex === 0 || linkProgress[prevLinkKey]) {
//       if (linkIndex < 49) {
//         const nextLinkKey = `${courseName}_part${partIndex}_link${linkIndex + 1}`;
//         const endTime = Date.now() + 24 * 60 * 60 * 1000; // 🔥 24hr timeout
//         setCountdowns(prev => ({ ...prev, [nextLinkKey]: endTime }));
//       }
//       setLinkProgress(prev => ({ ...prev, [linkKey]: true }));
//       openLink(url);
//     }
//   };

//   const openLink = (url) => {
//     window.open(url, "_blank", "noopener,noreferrer");
//   };

//   // 🔹 Utils
//   const getLinkName = (url) => {
//     if (url.includes("youtube.com") || url.includes("youtu.be")) return "YouTube Video";
//     if (url.includes("github.com")) return "GitHub Repository";
//     if (url.includes("drive.google.com")) return "Google Drive";
//     if (url.includes("dropbox.com")) return "Dropbox File";
//     if (url.includes("pdf")) return "PDF Document";
//     try {
//       const domain = new URL(url).hostname.replace("www.", "");
//       return domain.charAt(0).toUpperCase() + domain.slice(1);
//     } catch (e) {
//       return "External Link";
//     }
//   };

//   const formatCountdown = (milliseconds) => {
//     const totalSeconds = Math.ceil(milliseconds / 1000);
//     const minutes = Math.floor(totalSeconds / 60);
//     const seconds = totalSeconds % 60;
//     return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
//   };

//   const getCountdownTime = (key) => {
//     if (!countdowns[key]) return null;
//     const distance = countdowns[key] - Date.now();
//     return Math.max(0, distance);
//   };

//   // 🔹 Loading UI
//   if (isLoading) {
//     return (
//       <div className="flex min-h-screen items-center justify-center bg-black">
//         <div className="relative">
//           <div className="w-16 h-16 border-4 border-blue-500 rounded-full animate-spin"></div>
//           <div className="absolute top-0 left-0 w-16 h-16 border-4 border-transparent border-t-blue-300 rounded-full animate-ping"></div>
//         </div>
//       </div>
//     );
//   }

//   // 🔹 Main UI
//   return (
//     <div className="min-h-screen bg-black text-white p-4 relative overflow-hidden">
//       <div className="relative z-10 max-w-6xl mx-auto">
//         <div className="flex justify-between items-center mb-8">
//           <div className="text-center">
//             <h1 className="text-4xl md:text-5xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
//               Welcome, {user?.email?.split("@")[0]}!
//             </h1>
//           </div>
//           <button
//             onClick={() => signOut(auth)}
//             className="px-8 py-3 bg-gradient-to-r from-red-600 to-red-800 text-white font-bold rounded-full hover:scale-105 hover:shadow-lg hover:shadow-red-500/30"
//           >
//             Logout
//           </button>
//         </div>

//         {error && <div className="bg-red-900 p-4 rounded-lg mb-6">{error}</div>}

//         {Object.keys(groupedContent).length === 0 ? (
//           <div className="text-center py-12">No content available</div>
//         ) : (
//           <div className="space-y-12">
//             {Object.entries(groupedContent).map(([courseName, parts]) => (
//               <div key={courseName}>
//                 <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
//                   {courseName}
//                 </h2>
//                 {parts.map((part, partIndex) => (
//                   <div key={part.id} className="bg-gray-900 p-6 rounded-2xl mb-6">
//                     <h4 className="text-lg font-semibold mb-3 text-purple-400">Part {partIndex + 1}</h4>
//                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
//                       {part.fields.filter(f => f.trim() !== "").map((field, index) => {
//                         const isUrl = field.startsWith("http://") || field.startsWith("https://");
//                         const linkKey = `${courseName}_part${partIndex}_link${index}`;
//                         const isUnlocked = linkProgress[linkKey];
//                         const prevLinkKey = index > 0 ? `${courseName}_part${partIndex}_link${index - 1}` : null;
//                         const canAccess = index === 0 || linkProgress[prevLinkKey];
//                         const countdownTime = getCountdownTime(linkKey);

//                         return isUrl ? (
//                           <div key={index}>
//                             <button
//                               onClick={() => handleLinkClick(courseName, partIndex, index, field)}
//                               disabled={!canAccess || countdownTime !== null}
//                               className={`w-full py-3 px-4 rounded-lg ${
//                                 isUnlocked
//                                   ? "bg-green-600"
//                                   : canAccess && countdownTime === null
//                                   ? "bg-blue-600"
//                                   : "bg-gray-700 cursor-not-allowed"
//                               }`}
//                             >
//                               {getLinkName(field)}
//                             </button>
//                             <div className="mt-2 text-xs text-center">
//                               {isUnlocked
//                                 ? "✓ Completed"
//                                 : countdownTime !== null
//                                 ? `Available in ${formatCountdown(countdownTime)}`
//                                 : canAccess
//                                 ? "Ready to access"
//                                 : "Complete previous resource first"}
//                             </div>
//                           </div>
//                         ) : (
//                           <div key={index} className="bg-gray-800 p-4 rounded-lg">{field}</div>
//                         );
//                       })}
//                     </div>
//                   </div>
//                 ))}
//               </div>
//             ))}
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }
















// ===================================================================



// "use client";
// import { useEffect, useState, useMemo } from "react";
// import { auth, db } from "@/lib/firebase";
// import { onAuthStateChanged, signOut } from "firebase/auth";
// import { collection, getDocs, query, orderBy } from "firebase/firestore";

// export default function UserPage() {
//   const [user, setUser] = useState(null);
//   const [isLoading, setIsLoading] = useState(true);
//   const [content, setContent] = useState([]);
//   const [error, setError] = useState("");
//   const [linkProgress, setLinkProgress] = useState({});
//   const [countdowns, setCountdowns] = useState({});

//   useEffect(() => {
//     const unsub = onAuthStateChanged(auth, (u) => {
//       if (!u) {
//         window.location.href = "/login";
//       } else {
//         setUser(u);
//         // Load progress from localStorage
//         const savedProgress = localStorage.getItem(`linkProgress_${u.uid}`);
//         if (savedProgress) {
//           setLinkProgress(JSON.parse(savedProgress));
//         }
//         setIsLoading(false);
//       }
//     });
//     return () => unsub();
//   }, []);

//   useEffect(() => {
//     const fetchContent = async () => {
//       try {
//         const q = query(collection(db, "adminContent"), orderBy("createdAt", "desc"));
//         const querySnapshot = await getDocs(q);
//         const contentData = [];
//         querySnapshot.forEach((doc) => {
//           contentData.push({ id: doc.id, ...doc.data() });
//         });
//         setContent(contentData);
//       } catch (err) {
//         console.error("Error fetching content:", err);
//         setError("Failed to load content");
//       }
//     };
//     if (user) fetchContent();
//   }, [user]);

//   // Save progress to localStorage whenever it changes
//   useEffect(() => {
//     if (user) {
//       localStorage.setItem(`linkProgress_${user.uid}`, JSON.stringify(linkProgress));
//     }
//   }, [linkProgress, user]);

//   // Handle countdown timers
//   useEffect(() => {
//     const timers = {};
    
//     Object.entries(countdowns).forEach(([key, endTime]) => {
//       const updateCountdown = () => {
//         const now = new Date().getTime();
//         const distance = endTime - now;
        
//         if (distance <= 0) {
//           // Timer finished
//           setCountdowns(prev => {
//             const newCountdowns = { ...prev };
//             delete newCountdowns[key];
//             return newCountdowns;
//           });
//         } else {
//           // Update countdown display
//           const seconds = Math.floor(distance / 1000);
//           setCountdowns(prev => ({
//             ...prev,
//             [key]: endTime
//           }));
//           timers[key] = setTimeout(updateCountdown, 1000);
//         }
//       };
      
//       timers[key] = setTimeout(updateCountdown, 1000);
//     });
    
//     return () => {
//       // Clean up timers
//       Object.values(timers).forEach(timer => clearTimeout(timer));
//     };
//   }, [countdowns]);

//   const groupedContent = useMemo(() => {
//     const visibleContent = content.filter(item => item.visibility !== "hide");
//     const groups = {};
//     visibleContent.forEach(item => {
//       const courseName = item.courseName || "Untitled Course";
//       if (!groups[courseName]) groups[courseName] = [];
//       groups[courseName].push(item);
//     });
//     Object.keys(groups).forEach(courseName => {
//       groups[courseName].sort((a, b) => {
//         const dateA = a.createdAt?.toDate() || new Date(0);
//         const dateB = b.createdAt?.toDate() || new Date(0);
//         return dateA - dateB;
//       });
//     });
//     return groups;
//   }, [content]);

//   const handleLinkClick = (courseName, partIndex, linkIndex, url) => {
//     const linkKey = `${courseName}_part${partIndex}_link${linkIndex}`;
//     const prevLinkKey = linkIndex > 0 ? `${courseName}_part${partIndex}_link${linkIndex - 1}` : null;
    
//     // Check if previous link has been accessed
//     if (prevLinkKey && !linkProgress[prevLinkKey]) {
//       alert("Please complete the previous resource first!");
//       return;
//     }
    
//     // Check if this link is already unlocked
//     if (linkProgress[linkKey]) {
//       // Link is already unlocked, open it
//       openLink(url);
//       return;
//     }
    
//     // Check if there's an active countdown for this link
//     if (countdowns[linkKey]) {
//       const remainingTime = Math.ceil((countdowns[linkKey] - new Date().getTime()) / 1000);
//       alert(`Please wait ${remainingTime} seconds before accessing this resource.`);
//       return;
//     }
    
//     // If this is the first link or previous is completed, unlock it
//     if (linkIndex === 0 || linkProgress[prevLinkKey]) {
//       // Start 10 second countdown for next link
//       if (linkIndex < 49) { // Assuming max 50 links
//         const nextLinkKey = `${courseName}_part${partIndex}_link${linkIndex + 1}`;
//         const endTime = new Date().getTime() + 10000; // 10 seconds from now
//         setCountdowns(prev => ({ ...prev, [nextLinkKey]: endTime }));
//       }
      
//       // Mark current link as completed
//       setLinkProgress(prev => ({ ...prev, [linkKey]: true }));
      
//       // Open the link
//       openLink(url);
//     }
//   };

//   const openLink = (url) => {
//     window.open(url, "_blank", "noopener,noreferrer");
//   };

//   const getLinkName = (url) => {
//     if (url.includes('youtube.com') || url.includes('youtu.be')) {
//       return 'YouTube Video';
//     } else if (url.includes('github.com')) {
//       return 'GitHub Repository';
//     } else if (url.includes('drive.google.com')) {
//       return 'Google Drive';
//     } else if (url.includes('dropbox.com')) {
//       return 'Dropbox File';
//     } else if (url.includes('pdf')) {
//       return 'PDF Document';
//     } else {
//       try {
//         const domain = new URL(url).hostname.replace('www.', '');
//         return domain.charAt(0).toUpperCase() + domain.slice(1);
//       } catch (e) {
//         return 'External Link';
//       }
//     }
//   };

//   const getCountdownTime = (key) => {
//     if (!countdowns[key]) return null;
//     const distance = countdowns[key] - new Date().getTime();
//     return Math.max(0, Math.ceil(distance / 1000));
//   };

//   if (isLoading) {
//     return (
//       <div className="flex min-h-screen items-center justify-center bg-black">
//         <div className="relative">
//           <div className="w-16 h-16 border-4 border-blue-500 rounded-full animate-spin"></div>
//           <div className="absolute top-0 left-0 w-16 h-16 border-4 border-transparent border-t-blue-300 rounded-full animate-ping"></div>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="min-h-screen bg-black text-white p-4 relative overflow-hidden">
//       <div className="absolute inset-0 overflow-hidden">
//         {[...Array(20)].map((_, i) => (
//           <div 
//             key={i}
//             className="absolute rounded-full bg-blue-500 opacity-10 animate-pulse"
//             style={{
//               width: `${Math.random() * 100 + 20}px`,
//               height: `${Math.random() * 100 + 20}px`,
//               top: `${Math.random() * 100}%`,
//               left: `${Math.random() * 100}%`,
//               animationDuration: `${Math.random() * 5 + 3}s`,
//               animationDelay: `${Math.random() * 2}s`
//             }}
//           ></div>
//         ))}
//       </div>
      
//       <div className="relative z-10 max-w-6xl mx-auto">
//         <div className="flex justify-between items-center mb-8">
//           <div className="text-center">
//             <div className="inline-block p-4 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 mb-4 transform transition-transform duration-500 hover:scale-110">
//               <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" viewBox="0 0 20 20" fill="currentColor">
//                 <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
//               </svg>
//             </div>
//             <h1 className="text-4xl md:text-5xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
//               Welcome, {user?.email?.split('@')[0]}!
//             </h1>
//           </div>
//           <button
//             onClick={() => signOut(auth)}
//             className="px-8 py-3 bg-gradient-to-r from-red-600 to-red-800 text-white font-bold rounded-full transform transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-red-500/30 flex items-center justify-center group"
//           >
//             Logout
//           </button>
//         </div>
        
//         {error && (
//           <div className="bg-red-900 bg-opacity-50 p-4 rounded-lg mb-6">
//             <p className="text-red-300">{error}</p>
//           </div>
//         )}
        
//         {Object.keys(groupedContent).length === 0 ? (
//           <div className="text-center py-12">
//             <h2 className="text-2xl font-semibold mb-4">No content available</h2>
//             <p className="text-gray-400">Check back later for new content.</p>
//           </div>
//         ) : (
//           <div className="space-y-12">
//             {Object.entries(groupedContent).map(([courseName, parts]) => (
//               <div key={courseName} className="course-section">
//                 <div className="text-center mb-8">
//                   <h2 className="text-3xl md:text-4xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
//                     {courseName}
//                   </h2>
//                   <div className="w-24 h-1 bg-gradient-to-r from-blue-500 to-purple-500 mx-auto rounded-full"></div>
//                 </div>
                
//                 <div className="space-y-8">
//                   {parts.map((part, partIndex) => (
//                     <div key={part.id} className="bg-gray-900 bg-opacity-70 backdrop-blur-lg rounded-2xl p-6 border border-gray-800 shadow-2xl">
//                       <div className="mb-6 group relative overflow-hidden rounded-2xl shadow-xl">
//                         {part.imageUrl ? (
//                           <img 
//                             src={part.imageUrl} 
//                             alt={`Part ${partIndex + 1} of ${courseName}`} 
//                             className="w-full h-80 object-cover transform transition-transform duration-500 group-hover:scale-105"
//                           />
//                         ) : (
//                           <img 
//                             src="https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80" 
//                             alt={`Part ${partIndex + 1} of ${courseName}`} 
//                             className="w-full h-80 object-cover transform transition-transform duration-500 group-hover:scale-105"
//                           />
//                         )}
//                       </div>
                      
//                       <div className="mb-4">
//                         <h4 className="text-lg font-semibold mb-3 text-purple-400">Resources for Part {partIndex + 1}:</h4>
//                         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
//                           {part.fields
//                             .filter(field => field.trim() !== '') 
//                             .map((field, index) => {
//                               const isUrl = field.startsWith('http://') || field.startsWith('https://');
//                               const linkKey = `${courseName}_part${partIndex}_link${index}`;
//                               const isUnlocked = linkProgress[linkKey];
//                               const prevLinkKey = index > 0 ? `${courseName}_part${partIndex}_link${index - 1}` : null;
//                               const canAccess = index === 0 || linkProgress[prevLinkKey];
//                               const countdown = getCountdownTime(linkKey);
                              
//                               if (isUrl) {
//                                 return (
//                                   <div key={index} className="relative">
//                                     <button
//                                       onClick={() => handleLinkClick(courseName, partIndex, index, field)}
//                                       disabled={!canAccess || countdown !== null}
//                                       className={`w-full font-medium py-3 px-4 rounded-lg transition duration-300 transform flex items-center justify-center ${
//                                         isUnlocked 
//                                           ? "bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
//                                           : canAccess && countdown === null
//                                             ? "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
//                                             : "bg-gray-700 text-gray-400 cursor-not-allowed"
//                                       }`}
//                                     >
//                                       <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
//                                         <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd" />
//                                       </svg>
//                                       {getLinkName(field)}
//                                     </button>
                                    
//                                     {/* Status indicators */}
//                                     <div className="mt-2 text-xs text-center">
//                                       {isUnlocked ? (
//                                         <span className="text-green-400">✓ Completed</span>
//                                       ) : countdown !== null ? (
//                                         <span className="text-yellow-400">Available in {countdown}s</span>
//                                       ) : canAccess ? (
//                                         <span className="text-blue-400">Ready to access</span>
//                                       ) : (
//                                         <span className="text-gray-400">Complete previous resource first</span>
//                                       )}
//                                     </div>
//                                   </div>
//                                 );
//                               } else {
//                                 return (
//                                   <div key={index} className="bg-gray-800 p-4 rounded-lg">
//                                     <p className="text-gray-300">{field}</p>
//                                   </div>
//                                 );
//                               }
//                             })}
//                         </div>
//                       </div>
                      
//                       <div className="mt-4 text-sm text-gray-500">
//                         {part.nonEmptyCount || part.fields.filter(f => f.trim()).length} resources
//                       </div>
//                     </div>
//                   ))}
//                 </div>
//               </div>
//             ))}
//           </div>
//         )}
//       </div>
      
//       <style jsx global>{`
//         @keyframes fadeIn {
//           from { opacity: 0; transform: translateY(20px); }
//           to { opacity: 1; transform: translateY(0); }
//         }
//         .animate-fadeIn {
//           animation: fadeIn 0.8s ease-out forwards;
//         }
//       `}</style>
//     </div>
//   );
// }



























// ===================================================================

// "use client";
// import { useEffect, useState, useMemo } from "react";
// import { auth, db } from "@/lib/firebase";
// import { onAuthStateChanged, signOut } from "firebase/auth";
// import { collection, getDocs, query, orderBy } from "firebase/firestore";

// export default function UserPage() {
//   const [user, setUser] = useState(null);
//   const [isLoading, setIsLoading] = useState(true);
//   const [content, setContent] = useState([]);
//   const [error, setError] = useState("");

//   useEffect(() => {
//     const unsub = onAuthStateChanged(auth, (u) => {
//       if (!u) {
//         window.location.href = "/login"; // not logged in -> login
//       } else {
//         setUser(u);
//         setIsLoading(false);
//       }
//     });
//     return () => unsub();
//   }, []);

//   useEffect(() => {
//     const fetchContent = async () => {
//       try {
//         const q = query(collection(db, "adminContent"), orderBy("createdAt", "desc"));
//         const querySnapshot = await getDocs(q);
//         const contentData = [];
//         querySnapshot.forEach((doc) => {
//           contentData.push({ id: doc.id, ...doc.data() });
//         });
//         setContent(contentData);
//       } catch (err) {
//         console.error("Error fetching content:", err);
//         setError("Failed to load content");
//       }
//     };
//     if (user) fetchContent();
//   }, [user]);

//   const groupedContent = useMemo(() => {
//     const visibleContent = content.filter(item => item.visibility !== "hide");
//     const groups = {};
//     visibleContent.forEach(item => {
//       const courseName = item.courseName || "Untitled Course";
//       if (!groups[courseName]) groups[courseName] = [];
//       groups[courseName].push(item);
//     });
//     Object.keys(groups).forEach(courseName => {
//       groups[courseName].sort((a, b) => {
//         const dateA = a.createdAt?.toDate() || new Date(0);
//         const dateB = b.createdAt?.toDate() || new Date(0);
//         return dateA - dateB;
//       });
//     });
//     return groups;
//   }, [content]);

//   const openLink = (url) => {
//     window.open(url, "_blank", "noopener,noreferrer");
//   };

//   if (isLoading) {
//     return (
//       <div className="flex min-h-screen items-center justify-center bg-black">
//         <div className="relative">
//           <div className="w-16 h-16 border-4 border-blue-500 rounded-full animate-spin"></div>
//           <div className="absolute top-0 left-0 w-16 h-16 border-4 border-transparent border-t-blue-300 rounded-full animate-ping"></div>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="min-h-screen bg-black text-white p-4 relative overflow-hidden">
//       <div className="absolute inset-0 overflow-hidden">
//         {[...Array(20)].map((_, i) => (
//           <div 
//             key={i}
//             className="absolute rounded-full bg-blue-500 opacity-10 animate-pulse"
//             style={{
//               width: `${Math.random() * 100 + 20}px`,
//               height: `${Math.random() * 100 + 20}px`,
//               top: `${Math.random() * 100}%`,
//               left: `${Math.random() * 100}%`,
//               animationDuration: `${Math.random() * 5 + 3}s`,
//               animationDelay: `${Math.random() * 2}s`
//             }}
//           ></div>
//         ))}
//       </div>
      
//       <div className="relative z-10 max-w-6xl mx-auto">
//         <div className="flex justify-between items-center mb-8">
//           <div className="text-center">
//             <div className="inline-block p-4 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 mb-4 transform transition-transform duration-500 hover:scale-110">
//               <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" viewBox="0 0 20 20" fill="currentColor">
//                 <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
//               </svg>
//             </div>
//             <h1 className="text-4xl md:text-5xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
//               Welcome, {user?.email?.split('@')[0]}!
//             </h1>
//           </div>
//           <button
//             onClick={() => signOut(auth)}
//             className="px-8 py-3 bg-gradient-to-r from-red-600 to-red-800 text-white font-bold rounded-full transform transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-red-500/30 flex items-center justify-center group"
//           >
//             Logout
//           </button>
//         </div>
        
//         {error && (
//           <div className="bg-red-900 bg-opacity-50 p-4 rounded-lg mb-6">
//             <p className="text-red-300">{error}</p>
//           </div>
//         )}
        
//         {Object.keys(groupedContent).length === 0 ? (
//           <div className="text-center py-12">
//             <h2 className="text-2xl font-semibold mb-4">No content available</h2>
//             <p className="text-gray-400">Check back later for new content.</p>
//           </div>
//         ) : (
//           <div className="space-y-12">
//             {Object.entries(groupedContent).map(([courseName, parts]) => (
//               <div key={courseName} className="course-section">
//                 <div className="text-center mb-8">
//                   <h2 className="text-3xl md:text-4xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
//                     {courseName}
//                   </h2>
//                   <div className="w-24 h-1 bg-gradient-to-r from-blue-500 to-purple-500 mx-auto rounded-full"></div>
//                 </div>
                
//                 <div className="space-y-8">
//                   {parts.map((part, partIndex) => (
//                     <div key={part.id} className="bg-gray-900 bg-opacity-70 backdrop-blur-lg rounded-2xl p-6 border border-gray-800 shadow-2xl">
//                       <div className="flex justify-between items-start mb-4">
//                         {/* <h3 className="text-xl font-bold text-blue-400">
//                           Part {partIndex + 1}
//                         </h3> */}
//                         {/* <span className="text-sm text-gray-400">
//                           {new Date(part.createdAt?.toDate()).toLocaleString()}
//                         </span> */}
//                       </div>

//                       <div className="mb-6 group relative overflow-hidden rounded-2xl shadow-xl">
//                         {part.imageUrl ? (
//                           <img 
//                             src={part.imageUrl} 
//                             alt={`Part ${partIndex + 1} of ${courseName}`} 
//                             className="w-full h-80 object-cover transform transition-transform duration-500 group-hover:scale-105"
//                           />
//                         ) : (
//                           <img 
//                             src="https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80" 
//                             alt={`Part ${partIndex + 1} of ${courseName}`} 
//                             className="w-full h-80 object-cover transform transition-transform duration-500 group-hover:scale-105"
//                           />
//                         )}
//                       </div>

//                       <div className="mb-4">
//                         {/* <h4 className="text-lg font-semibold mb-3 text-purple-400">Resources for Part {partIndex + 1}:</h4> */}
//                         <h4 className="text-lg font-semibold mb-3 text-purple-400">Resources :</h4>

//                         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
//                           {part.fields
//                             .filter(field => field.trim() !== '') 
//                             .map((field, index) => {
//                               const isUrl = field.startsWith('http://') || field.startsWith('https://');
//                               if (isUrl) {
//                                 return (
//                                   <button
//                                     key={index}
//                                     onClick={() => openLink(field)}
//                                     className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium py-3 px-4 rounded-lg transition duration-300 transform hover:scale-105 flex items-center justify-center"
//                                   >
//                                     {`${courseName} - Part ${partIndex + 1}`} {/* ✅ Updated button text */}
//                                   </button>
//                                 );
//                               } else {
//                                 return (
//                                   <div key={index} className="bg-gray-800 p-4 rounded-lg">
//                                     <p className="text-gray-300">{field}</p>
//                                   </div>
//                                 );
//                               }
//                           })}
//                         </div>
//                       </div>

//                       <div className="mt-4 text-sm text-gray-500">
//                         {part.nonEmptyCount || part.fields.filter(f => f.trim()).length} resources
//                       </div>
//                     </div>
//                   ))}
//                 </div>
//               </div>
//             ))}
//           </div>
//         )}
//       </div>

//       <style jsx global>{`
//         @keyframes fadeIn {
//           from { opacity: 0; transform: translateY(20px); }
//           to { opacity: 1; transform: translateY(0); }
//         }
//         .animate-fadeIn {
//           animation: fadeIn 0.8s ease-out forwards;
//         }
//       `}</style>
//     </div>
//   );
// }
























// "use client";
// import { useEffect, useState, useMemo } from "react";
// import { auth, db } from "@/lib/firebase";
// import { onAuthStateChanged, signOut } from "firebase/auth";
// import { collection, getDocs, query, orderBy } from "firebase/firestore";

// export default function UserPage() {
//   const [user, setUser] = useState(null);
//   const [isLoading, setIsLoading] = useState(true);
//   const [content, setContent] = useState([]);
//   const [error, setError] = useState("");

//   useEffect(() => {
//     const unsub = onAuthStateChanged(auth, (u) => {
//       if (!u) {
//         window.location.href = "/login"; // not logged in -> login
//       } else {
//         setUser(u);
//         setIsLoading(false);
//       }
//     });
//     return () => unsub();
//   }, []);

//   useEffect(() => {
//     const fetchContent = async () => {
//       try {
//         const q = query(collection(db, "adminContent"), orderBy("createdAt", "desc"));
//         const querySnapshot = await getDocs(q);
//         const contentData = [];
//         querySnapshot.forEach((doc) => {
//           contentData.push({ id: doc.id, ...doc.data() });
//         });
//         setContent(contentData);
//       } catch (err) {
//         console.error("Error fetching content:", err);
//         setError("Failed to load content");
//       }
//     };
//     if (user) {
//       fetchContent();
//     }
//   }, [user]);

//   // Group content by course name and filter hidden content
//   const groupedContent = useMemo(() => {
//     // Filter out hidden content
//     const visibleContent = content.filter(item => item.visibility !== "hide");
    
//     // Group by course name
//     const groups = {};
//     visibleContent.forEach(item => {
//       const courseName = item.courseName || "Untitled Course";
//       if (!groups[courseName]) {
//         groups[courseName] = [];
//       }
//       groups[courseName].push(item);
//     });
    
//     // Sort each group by creation date (oldest first)
//     Object.keys(groups).forEach(courseName => {
//       groups[courseName].sort((a, b) => {
//         const dateA = a.createdAt?.toDate() || new Date(0);
//         const dateB = b.createdAt?.toDate() || new Date(0);
//         return dateA - dateB;
//       });
//     });
    
//     return groups;
//   }, [content]);

//   // Function to open a link in a new tab
//   const openLink = (url) => {
//     window.open(url, '_blank', 'noopener,noreferrer');
//   };

//   // Function to generate a user-friendly name from URL
//   const getLinkName = (url) => {
//     if (url.includes('youtube.com') || url.includes('youtu.be')) {
//       return 'YouTube Video';
//     } else if (url.includes('github.com')) {
//       return 'GitHub Repository';
//     } else if (url.includes('drive.google.com')) {
//       return 'Google Drive';
//     } else if (url.includes('dropbox.com')) {
//       return 'Dropbox File';
//     } else if (url.includes('pdf')) {
//       return 'PDF Document';
//     } else {
//       // Extract domain name as a fallback
//       try {
//         const domain = new URL(url).hostname.replace('www.', '');
//         return domain.charAt(0).toUpperCase() + domain.slice(1);
//       } catch (e) {
//         return 'External Link';
//       }
//     }
//   };

//   if (isLoading) {
//     return (
//       <div className="flex min-h-screen items-center justify-center bg-black">
//         <div className="relative">
//           <div className="w-16 h-16 border-4 border-blue-500 rounded-full animate-spin"></div>
//           <div className="absolute top-0 left-0 w-16 h-16 border-4 border-transparent border-t-blue-300 rounded-full animate-ping"></div>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="min-h-screen bg-black text-white p-4 relative overflow-hidden">
//       {/* Animated background elements */}
//       <div className="absolute inset-0 overflow-hidden">
//         {[...Array(20)].map((_, i) => (
//           <div 
//             key={i}
//             className="absolute rounded-full bg-blue-500 opacity-10 animate-pulse"
//             style={{
//               width: `${Math.random() * 100 + 20}px`,
//               height: `${Math.random() * 100 + 20}px`,
//               top: `${Math.random() * 100}%`,
//               left: `${Math.random() * 100}%`,
//               animationDuration: `${Math.random() * 5 + 3}s`,
//               animationDelay: `${Math.random() * 2}s`
//             }}
//           ></div>
//         ))}
//       </div>
      
//       <div className="relative z-10 max-w-6xl mx-auto">
//         <div className="flex justify-between items-center mb-8">
//           <div className="text-center">
//             <div className="inline-block p-4 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 mb-4 transform transition-transform duration-500 hover:scale-110">
//               <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" viewBox="0 0 20 20" fill="currentColor">
//                 <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
//               </svg>
//             </div>
//             <h1 className="text-4xl md:text-5xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
//               Welcome, {user?.email?.split('@')[0]}!
//             </h1>
//           </div>
//           <button
//             onClick={() => signOut(auth)}
//             className="px-8 py-3 bg-gradient-to-r from-red-600 to-red-800 text-white font-bold rounded-full transform transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-red-500/30 flex items-center justify-center group"
//           >
//             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 group-hover:animate-bounce" viewBox="0 0 20 20" fill="currentColor">
//               <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
//             </svg>
//             Logout
//           </button>
//         </div>
        
//         {error && (
//           <div className="bg-red-900 bg-opacity-50 p-4 rounded-lg mb-6">
//             <p className="text-red-300">{error}</p>
//           </div>
//         )}
        
//         {Object.keys(groupedContent).length === 0 ? (
//           <div className="text-center py-12">
//             <h2 className="text-2xl font-semibold mb-4">No content available</h2>
//             <p className="text-gray-400">Check back later for new content.</p>
//           </div>
//         ) : (
//           <div className="space-y-12">
//             {Object.entries(groupedContent).map(([courseName, parts]) => (
//               <div key={courseName} className="course-section">
//                 {/* Course Header */}
//                 <div className="text-center mb-8">
//                   <h2 className="text-3xl md:text-4xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
//                     {courseName}
//                   </h2>
//                   <div className="w-24 h-1 bg-gradient-to-r from-blue-500 to-purple-500 mx-auto rounded-full"></div>
//                 </div>
                
//                 {/* Course Parts */}
//                 <div className="space-y-8">
//                   {parts.map((part, partIndex) => (
//                     <div key={part.id} className="bg-gray-900 bg-opacity-70 backdrop-blur-lg rounded-2xl p-6 border border-gray-800 shadow-2xl">
//                       <div className="flex justify-between items-start mb-4">
//                         <h3 className="text-xl font-bold text-blue-400">
//                           Part {partIndex + 1}
//                         </h3>
//                         <span className="text-sm text-gray-400">
//                           {new Date(part.createdAt?.toDate()).toLocaleString()}
//                         </span>
//                       </div>
                      
//                       {/* Dynamic image from Firestore */}
//                       <div className="mb-6 group relative overflow-hidden rounded-2xl shadow-xl">
//                         {part.imageUrl ? (
//                           <img 
//                             src={part.imageUrl} 
//                             alt={`Part ${partIndex + 1} of ${courseName}`} 
//                             className="w-full h-80 object-cover transform transition-transform duration-500 group-hover:scale-105"
//                             onError={(e) => {
//                               e.target.onerror = null;
//                               e.target.src = "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80";
//                             }}
//                           />
//                         ) : (
//                           <img 
//                             src="https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80" 
//                             alt={`Part ${partIndex + 1} of ${courseName}`} 
//                             className="w-full h-80 object-cover transform transition-transform duration-500 group-hover:scale-105"
//                           />
//                         )}
//                         {/* Overlay effect */}
//                         <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
//                       </div>
                      
//                       {/* Part description */}
//                       <div className="mb-6">
//                         <p className="text-gray-300 mb-4">
//                           This is Part {partIndex + 1} of the {courseName} course. 
//                           Access the resources below to continue your learning journey.
//                         </p>
//                       </div>
                      
//                       {/* User-friendly links section */}
//                       <div className="mb-4">
//                         <h4 className="text-lg font-semibold mb-3 text-purple-400">Resources for Part {partIndex + 1}:</h4>
//                         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
//                           {part.fields
//                             .filter(field => field.trim() !== '') // Remove empty fields
//                             .map((field, index) => {
//                               // Check if it's a URL
//                               const isUrl = field.startsWith('http://') || field.startsWith('https://');
                              
//                               if (isUrl) {

//                                 return (
//                                   <button
//                                     key={index}
//                                     onClick={() => openLink(field)}
//                                     className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium py-3 px-4 rounded-lg transition duration-300 transform hover:scale-105 flex items-center justify-center"
//                                   >
//                                     <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
//                                       <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd" />
//                                     </svg>
//                                     {getLinkName(field)}
//                                   </button>
//                                 );
//                               } else {
//                                 // For non-URL text, display as text
//                                 return (
//                                   <div key={index} className="bg-gray-800 p-4 rounded-lg">
//                                     <p className="text-gray-300">{field}</p>
//                                   </div>
//                                 );
//                               }
//                             })}
//                         </div>
//                       </div>
                      
//                       <div className="mt-4 text-sm text-gray-500">
//                         {part.nonEmptyCount || part.fields.filter(f => f.trim()).length} resources
//                       </div>
//                     </div>
//                   ))}
//                 </div>
//               </div>
//             ))}
//           </div>
//         )}
//       </div>
      
//       <style jsx global>{`
//         @keyframes fadeIn {
//           from { opacity: 0; transform: translateY(20px); }
//           to { opacity: 1; transform: translateY(0); }
//         }
//         .animate-fadeIn {
//           animation: fadeIn 0.8s ease-out forwards;
//         }
//       `}</style>
//     </div>
//   );
// }

























// "use client";
// import { useEffect, useState } from "react";
// import { auth, db } from "@/lib/firebase";
// import { onAuthStateChanged, signOut } from "firebase/auth";
// import { collection, getDocs, query, orderBy } from "firebase/firestore";

// export default function UserPage() {
//   const [user, setUser] = useState(null);
//   const [isLoading, setIsLoading] = useState(true);
//   const [content, setContent] = useState([]);
//   const [error, setError] = useState("");

//   useEffect(() => {
//     const unsub = onAuthStateChanged(auth, (u) => {
//       if (!u) {
//         window.location.href = "/login"; // not logged in -> login
//       } else {
//         setUser(u);
//         setIsLoading(false);
//       }
//     });
//     return () => unsub();
//   }, []);

//   useEffect(() => {
//     const fetchContent = async () => {
//       try {
//         const q = query(collection(db, "adminContent"), orderBy("createdAt", "desc"));
//         const querySnapshot = await getDocs(q);
//         const contentData = [];
//         querySnapshot.forEach((doc) => {
//           contentData.push({ id: doc.id, ...doc.data() });
//         });
//         setContent(contentData);
//       } catch (err) {
//         console.error("Error fetching content:", err);
//         setError("Failed to load content");
//       }
//     };
//     if (user) {
//       fetchContent();
//     }
//   }, [user]);

//   // Function to open a link in a new tab
//   const openLink = (url) => {
//     window.open(url, '_blank', 'noopener,noreferrer');
//   };

//   // Function to generate a user-friendly name from URL
//   const getLinkName = (url) => {
//     if (url.includes('youtube.com') || url.includes('youtu.be')) {
//       return 'YouTube Video';
//     } else if (url.includes('github.com')) {
//       return 'GitHub Repository';
//     } else if (url.includes('drive.google.com')) {
//       return 'Google Drive';
//     } else if (url.includes('dropbox.com')) {
//       return 'Dropbox File';
//     } else if (url.includes('pdf')) {
//       return 'PDF Document';
//     } else {
//       // Extract domain name as a fallback
//       try {
//         const domain = new URL(url).hostname.replace('www.', '');
//         return domain.charAt(0).toUpperCase() + domain.slice(1);
//       } catch (e) {
//         return 'External Link';
//       }
//     }
//   };

//   if (isLoading) {
//     return (
//       <div className="flex min-h-screen items-center justify-center bg-black">
//         <div className="relative">
//           <div className="w-16 h-16 border-4 border-blue-500 rounded-full animate-spin"></div>
//           <div className="absolute top-0 left-0 w-16 h-16 border-4 border-transparent border-t-blue-300 rounded-full animate-ping"></div>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="min-h-screen bg-black text-white p-4 relative overflow-hidden">
//       {/* Animated background elements */}
//       <div className="absolute inset-0 overflow-hidden">
//         {[...Array(20)].map((_, i) => (
//           <div 
//             key={i}
//             className="absolute rounded-full bg-blue-500 opacity-10 animate-pulse"
//             style={{
//               width: `${Math.random() * 100 + 20}px`,
//               height: `${Math.random() * 100 + 20}px`,
//               top: `${Math.random() * 100}%`,
//               left: `${Math.random() * 100}%`,
//               animationDuration: `${Math.random() * 5 + 3}s`,
//               animationDelay: `${Math.random() * 2}s`
//             }}
//           ></div>
//         ))}
//       </div>
      
//       <div className="relative z-10 max-w-6xl mx-auto">
//         <div className="flex justify-between items-center mb-8">
//           <div className="text-center">
//             <div className="inline-block p-4 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 mb-4 transform transition-transform duration-500 hover:scale-110">
//               <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" viewBox="0 0 20 20" fill="currentColor">
//                 <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
//               </svg>
//             </div>
//             <h1 className="text-4xl md:text-5xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
//               Welcome, {user?.email?.split('@')[0]}!
//             </h1>
//           </div>
//           <button
//             onClick={() => signOut(auth)}
//             className="px-8 py-3 bg-gradient-to-r from-red-600 to-red-800 text-white font-bold rounded-full transform transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-red-500/30 flex items-center justify-center group"
//           >
//             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 group-hover:animate-bounce" viewBox="0 0 20 20" fill="currentColor">
//               <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
//             </svg>
//             Logout
//           </button>
//         </div>
        
//         {error && (
//           <div className="bg-red-900 bg-opacity-50 p-4 rounded-lg mb-6">
//             <p className="text-red-300">{error}</p>
//           </div>
//         )}
        
//         {content.length === 0 ? (
//           <div className="text-center py-12">
//             <h2 className="text-2xl font-semibold mb-4">No content available</h2>
//             <p className="text-gray-400">Check back later for new content.</p>
//           </div>
//         ) : (
//           <div className="space-y-8">
//             {content
//               // Filter out content with visibility set to "hide"
//               .filter(item => item.visibility !== "hide")
//               .map((item) => (
//               <div key={item.id} className="bg-gray-900 bg-opacity-70 backdrop-blur-lg rounded-2xl p-6 border border-gray-800 shadow-2xl">
//                 <div className="flex justify-between items-start mb-4">
//                   <h2 className="text-xl font-bold text-blue-400">
//                     Content by BrainFuel
//                   </h2>
//                   <span className="text-sm text-gray-400">
//                     {new Date(item.createdAt?.toDate()).toLocaleString()}
//                   </span>
//                 </div>
                
//                 {/* Dynamic image from Firestore */}
//                 <div className="mb-6 group relative overflow-hidden rounded-2xl shadow-xl">
//                   {item.imageUrl ? (
//                     <img 
//                       src={item.imageUrl} 
//                       alt="Course Content" 
//                       className="w-full h-80 object-cover transform transition-transform duration-500 group-hover:scale-105"
//                       onError={(e) => {
//                         e.target.onerror = null;
//                         e.target.src = "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80";
//                       }}
//                     />
//                   ) : (
//                     <img 
//                       src="https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80" 
//                       alt="Course Content" 
//                       className="w-full h-80 object-cover transform transition-transform duration-500 group-hover:scale-105"
//                     />
//                   )}
//                   {/* Overlay effect */}
//                   <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
//                 </div>
                
//                 {/* Course Name with Part 1 */}
//                 <div className="mb-6">
//                   <h3 className="text-2xl font-bold text-purple-400 mb-2">
//                     {item.courseName ? `${item.courseName} - Part 1` : "Course - Part 1"}
//                   </h3>
//                 </div>
                
//                 {/* Content description */}
//                 <div className="mb-6">
//                   <p className="text-gray-300 mb-4">
//                     This course contains valuable content to help you learn and grow. 
//                     Access all the materials and resources to get the most out of your learning experience.
//                   </p>
//                   <p className="text-gray-300">
//                     Click on the resources below to access the course materials:
//                   </p>
//                 </div>
                
//                 {/* User-friendly links section */}
//                 <div className="mb-4">
//                   <h3 className="text-lg font-semibold mb-3 text-purple-400">Course Resources:</h3>
//                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
//                     {item.fields
//                       .filter(field => field.trim() !== '') // Remove empty fields
//                       .map((field, index) => {
//                         // Check if it's a URL
//                         const isUrl = field.startsWith('http://') || field.startsWith('https://');
                        
//                         if (isUrl) {
//                           return (
//                             <button
//                               key={index}
//                               onClick={() => openLink(field)}
//                               className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium py-3 px-4 rounded-lg transition duration-300 transform hover:scale-105 flex items-center justify-center"
//                             >
//                               <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
//                                 <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd" />
//                               </svg>
//                               {getLinkName(field)}
//                             </button>
//                           );
//                         } else {
//                           // For non-URL text, display as text
//                           return (
//                             <div key={index} className="bg-gray-800 p-4 rounded-lg">
//                               <p className="text-gray-300">{field}</p>
//                             </div>
//                           );
//                         }
//                       })}
//                   </div>
//                 </div>
                
//                 <div className="mt-4 text-sm text-gray-500">
//                   {item.nonEmptyCount || item.fields.filter(f => f.trim()).length} items
//                 </div>
//               </div>
//             ))}
//           </div>
//         )}
//       </div>
      
//       <style jsx global>{`
//         @keyframes fadeIn {
//           from { opacity: 0; transform: translateY(20px); }
//           to { opacity: 1; transform: translateY(0); }
//         }
//         .animate-fadeIn {
//           animation: fadeIn 0.8s ease-out forwards;
//         }
//       `}</style>
//     </div>
//   );
// }

















// "use client";
// import { useEffect, useState } from "react";
// import { auth, db } from "@/lib/firebase";
// import { onAuthStateChanged, signOut } from "firebase/auth";
// import { collection, getDocs, query, orderBy } from "firebase/firestore";

// export default function UserPage() {
//   const [user, setUser] = useState(null);
//   const [isLoading, setIsLoading] = useState(true);
//   const [content, setContent] = useState([]);
//   const [error, setError] = useState("");

//   useEffect(() => {
//     const unsub = onAuthStateChanged(auth, (u) => {
//       if (!u) {
//         window.location.href = "/login"; // not logged in -> login
//       } else {
//         setUser(u);
//         setIsLoading(false);
//       }
//     });
//     return () => unsub();
//   }, []);

//   useEffect(() => {
//     const fetchContent = async () => {
//       try {
//         const q = query(collection(db, "adminContent"), orderBy("createdAt", "desc"));
//         const querySnapshot = await getDocs(q);
//         const contentData = [];
//         querySnapshot.forEach((doc) => {
//           contentData.push({ id: doc.id, ...doc.data() });
//         });
//         setContent(contentData);
//       } catch (err) {
//         console.error("Error fetching content:", err);
//         setError("Failed to load content");
//       }
//     };
//     if (user) {
//       fetchContent();
//     }
//   }, [user]);

//   if (isLoading) {
//     return (
//       <div className="flex min-h-screen items-center justify-center bg-black">
//         <div className="relative">
//           <div className="w-16 h-16 border-4 border-blue-500 rounded-full animate-spin"></div>
//           <div className="absolute top-0 left-0 w-16 h-16 border-4 border-transparent border-t-blue-300 rounded-full animate-ping"></div>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="min-h-screen bg-black text-white p-4 relative overflow-hidden">
//       {/* Animated background elements */}
//       <div className="absolute inset-0 overflow-hidden">
//         {[...Array(20)].map((_, i) => (
//           <div 
//             key={i}
//             className="absolute rounded-full bg-blue-500 opacity-10 animate-pulse"
//             style={{
//               width: `${Math.random() * 100 + 20}px`,
//               height: `${Math.random() * 100 + 20}px`,
//               top: `${Math.random() * 100}%`,
//               left: `${Math.random() * 100}%`,
//               animationDuration: `${Math.random() * 5 + 3}s`,
//               animationDelay: `${Math.random() * 2}s`
//             }}
//           ></div>
//         ))}
//       </div>
      
//       <div className="relative z-10 max-w-6xl mx-auto">
//         <div className="flex justify-between items-center mb-8">
//           <div className="text-center">
//             <div className="inline-block p-4 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 mb-4 transform transition-transform duration-500 hover:scale-110">
//               <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" viewBox="0 0 20 20" fill="currentColor">
//                 <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
//               </svg>
//             </div>
//             <h1 className="text-4xl md:text-5xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
//               Welcome, {user?.email?.split('@')[0]}!
//             </h1>
//           </div>
//           <button
//             onClick={() => signOut(auth)}
//             className="px-8 py-3 bg-gradient-to-r from-red-600 to-red-800 text-white font-bold rounded-full transform transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-red-500/30 flex items-center justify-center group"
//           >
//             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 group-hover:animate-bounce" viewBox="0 0 20 20" fill="currentColor">
//               <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
//             </svg>
//             Logout
//           </button>
//         </div>
        
//         {error && (
//           <div className="bg-red-900 bg-opacity-50 p-4 rounded-lg mb-6">
//             <p className="text-red-300">{error}</p>
//           </div>
//         )}
        
//         {content.length === 0 ? (
//           <div className="text-center py-12">
//             <h2 className="text-2xl font-semibold mb-4">No content available</h2>
//             <p className="text-gray-400">Check back later for new content.</p>
//           </div>
//         ) : (
//           <div className="space-y-8">
//             {content
//               // Filter out content with visibility set to "hide"
//               .filter(item => item.visibility !== "hide")
//               .map((item) => (
//               <div key={item.id} className="bg-gray-900 bg-opacity-70 backdrop-blur-lg rounded-2xl p-6 border border-gray-800 shadow-2xl">
//                 <div className="flex justify-between items-start mb-4">
//                   <h2 className="text-xl font-bold text-blue-400">
//                     Content by BrainFuel
//                   </h2>
//                   <span className="text-sm text-gray-400">
//                     {new Date(item.createdAt?.toDate()).toLocaleString()}
//                   </span>
//                 </div>
                
//                 {/* Dynamic image from Firestore */}
//                 <div className="mb-6 group relative overflow-hidden rounded-2xl shadow-xl">
//                   {item.imageUrl ? (
//                     <img 
//                       src={item.imageUrl} 
//                       alt="Course Content" 
//                       className="w-full h-80 object-cover transform transition-transform duration-500 group-hover:scale-105"
//                       onError={(e) => {
//                         e.target.onerror = null;
//                         e.target.src = "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80";
//                       }}
//                     />
//                   ) : (
//                     <img 
//                       src="https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80" 
//                       alt="Course Content" 
//                       className="w-full h-80 object-cover transform transition-transform duration-500 group-hover:scale-105"
//                     />
//                   )}
//                   {/* Overlay effect */}
//                   <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
//                 </div>
                
//                 {/* Course Name with Part 1 */}
//                 <div className="mb-6">
//                   <h3 className="text-2xl font-bold text-purple-400 mb-2">
//                     {item.courseName ? `${item.courseName} - Part 1` : "Course - Part 1"}
//                   </h3>
//                 </div>
                
//                 {/* Content description instead of links */}
//                 <div className="mb-4">
//                   <p className="text-gray-300 mb-4">
//                     This course contains valuable content to help you learn and grow. 
//                     Access all the materials and resources to get the most out of your learning experience.
//                   </p>
//                   <p className="text-gray-300">
//                     Stay tuned for more parts of this course series coming soon!
//                   </p>
//                 </div>
                
//                 <div className="mt-4 text-sm text-gray-500">
//                   {item.nonEmptyCount || item.fields.filter(f => f.trim()).length} items
//                 </div>
//               </div>
//             ))}
//           </div>
//         )}
//       </div>
      
//       <style jsx global>{`
//         @keyframes fadeIn {
//           from { opacity: 0; transform: translateY(20px); }
//           to { opacity: 1; transform: translateY(0); }
//         }
//         .animate-fadeIn {
//           animation: fadeIn 0.8s ease-out forwards;
//         }
//       `}</style>
//     </div>
//   );
// }














// ========================================================

// "use client";
// import { useEffect, useState } from "react";
// import { auth, db } from "@/lib/firebase";
// import { onAuthStateChanged, signOut } from "firebase/auth";
// import { collection, getDocs, query, orderBy } from "firebase/firestore";

// export default function UserPage() {
//   const [user, setUser] = useState(null);
//   const [isLoading, setIsLoading] = useState(true);
//   const [content, setContent] = useState([]);
//   const [error, setError] = useState("");

//   useEffect(() => {
//     const unsub = onAuthStateChanged(auth, (u) => {
//       if (!u) {
//         window.location.href = "/login"; // not logged in -> login
//       } else {
//         setUser(u);
//         setIsLoading(false);
//       }
//     });
//     return () => unsub();
//   }, []);

//   useEffect(() => {
//     const fetchContent = async () => {
//       try {
//         const q = query(collection(db, "adminContent"), orderBy("createdAt", "desc"));
//         const querySnapshot = await getDocs(q);
//         const contentData = [];
//         querySnapshot.forEach((doc) => {
//           contentData.push({ id: doc.id, ...doc.data() });
//         });
//         setContent(contentData);
//       } catch (err) {
//         console.error("Error fetching content:", err);
//         setError("Failed to load content");
//       }
//     };

//     if (user) {
//       fetchContent();
//     }
//   }, [user]);

//   if (isLoading) {
//     return (
//       <div className="flex min-h-screen items-center justify-center bg-black">
//         <div className="relative">
//           <div className="w-16 h-16 border-4 border-blue-500 rounded-full animate-spin"></div>
//           <div className="absolute top-0 left-0 w-16 h-16 border-4 border-transparent border-t-blue-300 rounded-full animate-ping"></div>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="min-h-screen bg-black text-white p-4 relative overflow-hidden">
//       {/* Animated background elements */}
//       <div className="absolute inset-0 overflow-hidden">
//         {[...Array(20)].map((_, i) => (
//           <div 
//             key={i}
//             className="absolute rounded-full bg-blue-500 opacity-10 animate-pulse"
//             style={{
//               width: `${Math.random() * 100 + 20}px`,
//               height: `${Math.random() * 100 + 20}px`,
//               top: `${Math.random() * 100}%`,
//               left: `${Math.random() * 100}%`,
//               animationDuration: `${Math.random() * 5 + 3}s`,
//               animationDelay: `${Math.random() * 2}s`
//             }}
//           ></div>
//         ))}
//       </div>
      
//       <div className="relative z-10 max-w-6xl mx-auto">
//         <div className="flex justify-between items-center mb-8">
//           <div className="text-center">
//             <div className="inline-block p-4 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 mb-4 transform transition-transform duration-500 hover:scale-110">
//               <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" viewBox="0 0 20 20" fill="currentColor">
//                 <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
//               </svg>
//             </div>
//             <h1 className="text-4xl md:text-5xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
//               Welcome, {user?.email?.split('@')[0]}!
//             </h1>
//           </div>
//           <button
//             onClick={() => signOut(auth)}
//             className="px-8 py-3 bg-gradient-to-r from-red-600 to-red-800 text-white font-bold rounded-full transform transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-red-500/30 flex items-center justify-center group"
//           >
//             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 group-hover:animate-bounce" viewBox="0 0 20 20" fill="currentColor">
//               <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
//             </svg>
//             Logout
//           </button>
//         </div>
        
//         {error && (
//           <div className="bg-red-900 bg-opacity-50 p-4 rounded-lg mb-6">
//             <p className="text-red-300">{error}</p>
//           </div>
//         )}
        
//         {content.length === 0 ? (
//           <div className="text-center py-12">
//             <h2 className="text-2xl font-semibold mb-4">No content available</h2>
//             <p className="text-gray-400">Check back later for new content.</p>
//           </div>
//         ) : (
//           <div className="space-y-8">
//             {content.map((item) => (
//               <div key={item.id} className="bg-gray-900 bg-opacity-70 backdrop-blur-lg rounded-2xl p-6 border border-gray-800 shadow-2xl">
//                 <div className="flex justify-between items-start mb-4">
//                   <h2 className="text-xl font-bold text-blue-400">
//                     Content by BrainFuel
//                   </h2>
//                   <span className="text-sm text-gray-400">
//                     {new Date(item.createdAt?.toDate()).toLocaleString()}
//                   </span>
//                 </div>
                
//                 {/* Image from internet */}
//                 <div className="mb-6">
//                   {/* <img 
//                     src="https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80" 
//                     alt="Content" 
//                     className="w-full h-64 object-cover rounded-xl"
//                   /> */}
//                   <img 
//                         src="https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80" 
//                         alt="Content" 
//                         className="w-full h-80 object-cover transform transition-transform duration-500 group-hover:scale-105"
//                       />
//                   <h3 className="text-lg font-semibold mb-3 text-purple-400">Course Name:</h3>
//                 </div>
                
//                 {/* Dynamic links section */}
//                 <div className="mb-4">
//                   <h3 className="text-lg font-semibold mb-3 text-purple-400">Links:</h3>
//                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
//                     {item.fields
//                       .filter(field => field.trim() !== '') // Remove empty fields
//                       .map((field, index) => {
//                         // Check if it's a URL
//                         const isUrl = field.startsWith('http://') || field.startsWith('https://');
                        
//                         if (isUrl) {
//                           return (
//                             <a
//                               key={index}
//                               href={field}
//                               target="_blank"
//                               rel="noopener noreferrer"
//                               className="block bg-gray-800 hover:bg-gray-700 p-3 rounded-lg transition duration-300 transform hover:scale-105"
//                             >
//                               <div className="flex items-center">
//                                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-400 mr-2" viewBox="0 0 20 20" fill="currentColor">
//                                   <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd" />
//                                 </svg>
//                                 <span className="text-blue-300 truncate">
//                                   {field.includes('youtube.com') ? 'YouTube Video' : field}
//                                 </span>
//                               </div>
//                             </a>
//                           );
//                         } else {
//                           // For non-URL text, display as text
//                           return (
//                             <div key={index} className="bg-gray-800 p-3 rounded-lg">
//                               <p className="text-gray-300">{field}</p>
//                             </div>
//                           );
//                         }
//                       })}
//                   </div>
//                 </div>
                
//                 <div className="mt-4 text-sm text-gray-500">
//                   {item.nonEmptyCount || item.fields.filter(f => f.trim()).length} items
//                 </div>
//               </div>
//             ))}
//           </div>
//         )}
//       </div>
      
//       <style jsx global>{`
//         @keyframes fadeIn {
//           from { opacity: 0; transform: translateY(20px); }
//           to { opacity: 1; transform: translateY(0); }
//         }
//         .animate-fadeIn {
//           animation: fadeIn 0.8s ease-out forwards;
//         }
//       `}</style>
//     </div>
//   );
// }













// ============================================

// "use client";
// import { useEffect, useState } from "react";
// import { auth } from "@/lib/firebase";
// import { onAuthStateChanged, signOut } from "firebase/auth";

// export default function UserPage() {
//   const [user, setUser] = useState(null);
//   const [isLoading, setIsLoading] = useState(true);

//   useEffect(() => {
//     const unsub = onAuthStateChanged(auth, (u) => {
//       if (!u) {
//         window.location.href = "/login"; // not logged in -> login
//       } else {
//         setUser(u);
//         setIsLoading(false);
//       }
//     });
//     return () => unsub();
//   }, []);

//   if (isLoading) {
//     return (
//       <div className="flex min-h-screen items-center justify-center bg-black">
//         <div className="relative">
//           <div className="w-16 h-16 border-4 border-blue-500 rounded-full animate-spin"></div>
//           <div className="absolute top-0 left-0 w-16 h-16 border-4 border-transparent border-t-blue-300 rounded-full animate-ping"></div>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4 relative overflow-hidden">
//       {/* Animated background elements */}
//       <div className="absolute inset-0 overflow-hidden">
//         {[...Array(20)].map((_, i) => (
//           <div 
//             key={i}
//             className="absolute rounded-full bg-blue-500 opacity-10 animate-pulse"
//             style={{
//               width: `${Math.random() * 100 + 20}px`,
//               height: `${Math.random() * 100 + 20}px`,
//               top: `${Math.random() * 100}%`,
//               left: `${Math.random() * 100}%`,
//               animationDuration: `${Math.random() * 5 + 3}s`,
//               animationDelay: `${Math.random() * 2}s`
//             }}
//           ></div>
//         ))}
//       </div>
      
//       {/* Content with animation */}
//       <div className="relative z-10 text-center max-w-2xl px-4 transform transition-all duration-700 animate-fadeIn">
//         <div className="mb-8">
//           <div className="inline-block p-4 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 mb-6 transform transition-transform duration-500 hover:scale-110">
//             <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" viewBox="0 0 20 20" fill="currentColor">
//               <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
//             </svg>
//           </div>
//           <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
//             Welcome, {user?.email?.split('@')[0]}!
//           </h1>
//           {/* <p className="text-xl text-gray-300 mb-8">You've successfully accessed your exclusive dashboard</p> */}
//         </div>
        
//         {/* <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
//           {['Profile', 'Settings', 'Analytics'].map((item, index) => (
//             <div 
//               key={index}
//               className="bg-gray-900 bg-opacity-50 backdrop-blur-sm rounded-xl p-6 border border-gray-800 transform transition-all duration-300 hover:border-blue-500 hover:scale-105 hover:shadow-lg hover:shadow-blue-500/20"
//             >
//               <div className="text-blue-400 mb-3">
//                 <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
//                 </svg>
//               </div>
//               <h3 className="text-lg font-semibold mb-2">{item}</h3>
//               <p className="text-gray-400 text-sm">Manage your {item.toLowerCase()} and preferences</p>
//             </div>
//           ))}
//         </div> */}
        
//         <button
//           onClick={() => signOut(auth)}
//           className="px-8 py-3 bg-gradient-to-r from-red-600 to-red-800 text-white font-bold rounded-full transform transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-red-500/30 flex items-center justify-center mx-auto group"
//         >
//           <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 group-hover:animate-bounce" viewBox="0 0 20 20" fill="currentColor">
//             <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
//           </svg>
//           Logout
//         </button>
//       </div>
      
//       <style jsx global>{`
//         @keyframes fadeIn {
//           from { opacity: 0; transform: translateY(20px); }
//           to { opacity: 1; transform: translateY(0); }
//         }
//         .animate-fadeIn {
//           animation: fadeIn 0.8s ease-out forwards;
//         }
//       `}</style>
//     </div>
//   );
// }
















// "use client";
// import { useEffect, useState } from "react";
// import { auth } from "@/lib/firebase";
// import { onAuthStateChanged, signOut } from "firebase/auth";



// export default function UserPage() {
//   const [user, setUser] = useState(null);

//   useEffect(() => {
//     const unsub = onAuthStateChanged(auth, (u) => {
//       if (!u) {
//         window.location.href = "/login"; // not logged in -> login
//       } else {
//         setUser(u);
//       }
//     });
//     return () => unsub();
//   }, []);

//   if (!user) return <p className="text-center mt-20">Loading...</p>;

//   return (
//     <div className="flex flex-col items-center justify-center min-h-screen bg-green-100">
//       <h1 className="text-2xl font-bold">Welcome user, {user.email} 🎉</h1>
//       <button
//         onClick={() => signOut(auth)}
//         className="mt-4 bg-red-600 text-white px-4 py-2 rounded"
//       >
//         Logout
//       </button>

//     </div>
//   );
// }