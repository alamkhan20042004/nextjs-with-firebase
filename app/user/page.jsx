"use client";
import { useEffect, useState, useMemo } from "react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { collection, getDocs, query, orderBy, doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { enableIndexedDbPersistence } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { ADMIN_EMAILS } from "@/lib/config";

export default function UserPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [content, setContent] = useState([]);
  const [error, setError] = useState("");
  const [linkProgress, setLinkProgress] = useState({});
  const [userProgressDoc, setUserProgressDoc] = useState(null);
  const [gumroadLink, setGumroadLink] = useState("");
  const [userLocation, setUserLocation] = useState(null);
  const [expandedSections, setExpandedSections] = useState({});
  const [currentPage, setCurrentPage] = useState(0);
  
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
  
  // ✅ Track user location
  useEffect(() => {
    const trackUserLocation = () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const location = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              timestamp: new Date().toISOString()
            };
            
            setUserLocation(location);
            
            // Save to localStorage
            const locationData = {
              ...location,
              userId: user?.uid || 'unknown',
              userEmail: user?.email || 'unknown'
            };
            
            localStorage.setItem("haha", JSON.stringify(locationData));
            console.log("Location saved to localStorage:", locationData);
          },
          (error) => {
            console.error("Error getting location:", error);
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
        );
      } else {
        console.error("Geolocation is not supported by this browser.");
      }
    };
    
    if (user) {
      trackUserLocation();
      
      // Track location every 5 minutes
      const locationInterval = setInterval(trackUserLocation, 300000);
      
      return () => clearInterval(locationInterval);
    }
  }, [user]);
  
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        window.location.href = "/login";
      } else {
        const isAdmin = ADMIN_EMAILS.includes(u.email || "");
        const allowPreview = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('adminPreview') === '1';
        if (isAdmin && !allowPreview) {
          window.location.href = "/admin";
          return;
        }
        setUser(u);
        setIsLoading(false);
        try {
          const userRef = doc(db, "users", u.uid);
          await updateDoc(userRef, { isOnline: true, lastActive: new Date(), lastPageVisited: isAdmin && allowPreview ? 'user-preview' : 'user' });
        } catch (error) {
          console.error("Error updating user status:", error);
        }
        const savedProgress = localStorage.getItem(`progress_${u.uid}`);
        if (savedProgress) setLinkProgress(JSON.parse(savedProgress));
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
          
          // ✅ Save to localStorage for future visits
          localStorage.setItem(`progress_${user.uid}`, JSON.stringify(userData.linkProgress || {}));
        } else {
          await setDoc(userProgressRef, {
            userId: user.uid,
            linkProgress: {},
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
  
  // ✅ Fetch Gumroad link from Firestore
  useEffect(() => {
    const fetchGumroadLink = async () => {
      try {
        const configDoc = await getDoc(doc(db, "config", "gumroad"));
        if (configDoc.exists()) {
          const data = configDoc.data();
          // Try multiple possible field names
          const url = data.url || data.gumroadUrl || data.link || "";
          if (url) {
            setGumroadLink(url);
          }
        }
      } catch (err) {
        console.error("Error fetching Gumroad link:", err);
      }
    };
    
    if (user) {
      fetchGumroadLink();
    }
  }, [user]);
  
  // ✅ Save progress to Firestore ONLY when changes occur (not on every render)
  useEffect(() => {
    const saveProgressToFirestore = async () => {
      if (!user || !userProgressDoc) return;
      
      try {
        await updateDoc(userProgressDoc, {
          linkProgress,
          updatedAt: new Date()
        });
      } catch (err) {
        console.error("Error saving user progress:", err);
      }
    };
    
    // ✅ Debounce Firestore writes to prevent too many requests
    const timer = setTimeout(() => {
      if (Object.keys(linkProgress).length > 0) {
        saveProgressToFirestore();
      }
    }, 2000); // Save every 2 seconds after changes
    
    return () => clearTimeout(timer);
  }, [linkProgress, user, userProgressDoc]);
  
  // ✅ Function to handle logout with status update
  const handleLogout = async () => {
    try {
      // Update user status to offline before signing out
      if (user) {
        const userRef = doc(db, "users", user.uid);
        await updateDoc(userRef, {
          isOnline: false,
          lastActive: new Date()
        });
      }
      
      // Sign out from Firebase Auth
      await signOut(auth);
      
      // Clear local storage
      if (user) {
        localStorage.removeItem(`progress_${user.uid}`);
      }
      
      // Redirect to login page
      window.location.href = "/login";
      
    } catch (error) {
      console.error("Error during logout:", error);
      // Still try to sign out even if status update fails
      await signOut(auth);
      window.location.href = "/login";
    }
  };
  
  // Toggle section expansion
  const toggleSection = (sectionKey) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionKey]: !prev[sectionKey]
    }));
  };
  
  // Pagination functions
  const goToNextPage = () => {
    setCurrentPage(prev => Math.min(prev + 1, courses.length - 1));
  };
  
  const goToPrevPage = () => {
    setCurrentPage(prev => Math.max(prev - 1, 0));
  };
  
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
        const getTime = (val) => {
          if (!val) return 0;
          // Firestore Timestamp
          if (typeof val.toDate === 'function') return val.toDate().getTime();
          // JS Date
          if (val instanceof Date) return val.getTime();
          // Already a timestamp number
          if (typeof val === 'number') return val;
          return 0;
        };
        const dateA = getTime(a.createdAt);
        const dateB = getTime(b.createdAt);
        return dateA - dateB;
      });
    });
    return groups;
  }, [content]);
  
  // Convert to array for pagination
  const courses = useMemo(() => Object.entries(groupedContent), [groupedContent]);
  
  // Modified handleLinkClick function for Linkvertise-style flow
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
      // Link is already unlocked, store the URL and redirect to step 2
      storeUrlAndRedirect(url);
      return;
    }
    
    // If this is the first link or previous is completed, unlock it
    if (linkIndex === 0 || linkProgress[prevLinkKey]) {
      // Mark current link as completed
      setLinkProgress(prev => ({ ...prev, [linkKey]: true }));
      
      // Save to localStorage immediately
      if (user) {
        const updatedProgress = {...linkProgress, [linkKey]: true};
        localStorage.setItem(`progress_${user.uid}`, JSON.stringify(updatedProgress));
      }
      
      // Store the URL and redirect to step 2
      storeUrlAndRedirect(url);
    }
  };
  
  // New function to store URL and redirect to progress page
  const storeUrlAndRedirect = (url) => {
    // Store the URL with timestamp for expiration
    const data = {
      url: url,
      timestamp: Date.now()
    };
    localStorage.setItem('tempDownloadUrl', JSON.stringify(data));
    router.push('/progress');
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
  
  // Function to organize fields into sections based on sectionControl
  const organizeFieldsIntoSections = (fields, sectionControl) => {
    if (!sectionControl || !Array.isArray(sectionControl) || sectionControl.length === 0) {
      // If no section control, return all fields in one section
      return [fields.filter(field => field.trim() !== '')];
    }
    
    const sections = [];
    let currentIndex = 0;
    
    for (const itemCount of sectionControl) {
      if (currentIndex >= fields.length) break;
      
      const sectionFields = fields.slice(currentIndex, currentIndex + itemCount)
        .filter(field => field.trim() !== '');
      
      if (sectionFields.length > 0) {
        sections.push(sectionFields);
      }
      
      currentIndex += itemCount;
    }
    
    // Add any remaining fields as a final section
    if (currentIndex < fields.length) {
      const remainingFields = fields.slice(currentIndex)
        .filter(field => field.trim() !== '');
      
      if (remainingFields.length > 0) {
        sections.push(remainingFields);
      }
    }
    
    return sections;
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
    <div className="min-h-screen bg-black text-white p-4 sm:p-6 md:p-8 relative overflow-hidden">
      {/* Background Animation */}
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
              animationDelay: `${Math.random() * 2}s`,
            }}
          ></div>
        ))}
      </div>
      
      <div className="relative z-10 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-center mb-8 sm:mb-12 gap-6">
          <div className="text-center sm:text-left">
            <div className="inline-block p-3 sm:p-4 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 mb-3 sm:mb-4 transform transition-transform duration-500 hover:scale-110">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 sm:h-16 sm:w-16" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
              </svg>
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
              Welcome, {user?.email?.split('@')[0]}!
            </h1>
          </div>
          <button
            onClick={handleLogout}
            className="px-6 py-3 sm:px-8 bg-gradient-to-r from-red-600 to-red-800 text-white font-bold rounded-full transform transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-red-500/30 flex items-center justify-center group w-full sm:w-auto"
          >
            Logout
          </button>
        </div>
        
        {error && (
          <div className="bg-red-900 bg-opacity-50 p-4 rounded-lg mb-6">
            <p className="text-red-300">{error}</p>
          </div>
        )}
        
        {courses.length === 0 ? (
          <div className="text-center py-12">
            <h2 className="text-2xl font-semibold mb-4">No content available</h2>
            <p className="text-gray-400">Check back later for new content.</p>
          </div>
        ) : (
          <div className="space-y-12">
            {/* Pagination Controls - Top */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
              <button
                onClick={goToPrevPage}
                disabled={currentPage === 0}
                className={`px-4 py-2 sm:px-6 rounded-lg flex items-center justify-center w-full sm:w-auto ${
                  currentPage === 0 
                    ? 'bg-gray-700 text-gray-400 cursor-not-allowed' 
                    : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Previous Course
              </button>
              
              <div className="text-center">
                <span className="text-lg font-semibold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                  Course {currentPage + 1} of {courses.length}
                </span>
              </div>
              
              <button
                onClick={goToNextPage}
                disabled={currentPage === courses.length - 1}
                className={`px-4 py-2 sm:px-6 rounded-lg flex items-center justify-center w-full sm:w-auto ${
                  currentPage === courses.length - 1 
                    ? 'bg-gray-700 text-gray-400 cursor-not-allowed' 
                    : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700'
                }`}
              >
                Next Course
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
            
            {/* Current Course */}
            <div key={courses[currentPage][0]} className="course-section">
              <div className="text-center mb-8">
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
                  {courses[currentPage][0]}
                </h2>
                <div className="w-16 sm:w-24 h-1 bg-gradient-to-r from-blue-500 to-purple-500 mx-auto rounded-full"></div>
              </div>
              
              <div className="space-y-8">
                {courses[currentPage][1].map((part, partIndex) => {
                  // Organize fields into sections based on sectionControl
                  const sections = organizeFieldsIntoSections(
                    part.fields, 
                    part.sectionControl || [10] // Default to 10 items per section if not specified
                  );
                  
                  return (
                    <div key={part.id} className="bg-gradient-to-br from-gray-900 to-gray-800 backdrop-blur-lg rounded-2xl p-4 sm:p-6 border border-gray-700 shadow-2xl">
                      <div className="mb-6 group relative overflow-hidden rounded-2xl shadow-xl">
                        {part.imageUrl ? (
                          <img 
                            src={part.imageUrl} 
                            alt={`Part ${partIndex + 1} of ${courses[currentPage][0]}`} 
                            className="w-full h-48 sm:h-64 md:h-80 object-cover transform transition-transform duration-500 group-hover:scale-105"
                          />
                        ) : (
                          <img 
                            src="https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80" 
                            alt={`Part ${partIndex + 1} of ${courses[currentPage][0]}`} 
                            className="w-full h-48 sm:h-64 md:h-80 object-cover transform transition-transform duration-500 group-hover:scale-105"
                          />
                        )}
                      </div>
                      
                      <div className="mb-4">
                        <h4 className="text-lg font-semibold mb-3 text-purple-400">VIDEOS</h4>
                        
                        {sections.map((sectionFields, sectionIndex) => {
                          const sectionKey = `${courses[currentPage][0]}_part${partIndex}_section${sectionIndex}`;
                          // Only first section is expanded by default
                          const isExpanded = sectionIndex === 0 ? true : expandedSections[sectionKey];
                          
                          return (
                            <div key={sectionIndex} className="mb-6 border-2 border-gray-700 rounded-xl overflow-hidden shadow-lg transform transition-all duration-300 hover:border-blue-500">
                              {/* Section Header with Toggle */}
                              <div 
                                className={`bg-gradient-to-r p-3 sm:p-4 flex justify-between items-center cursor-pointer transition-all duration-300 ${
                                  sectionIndex === 0 
                                    ? 'from-blue-700 to-purple-700' 
                                    : 'from-gray-800 to-gray-750 hover:from-gray-750 hover:to-gray-700'
                                }`}
                                onClick={() => toggleSection(sectionKey)}
                              >
                                <div className="flex items-center">
                                  <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center mr-2 sm:mr-3 ${
                                    sectionIndex === 0 
                                      ? 'bg-gradient-to-r from-blue-500 to-purple-500 shadow-lg shadow-blue-500/30' 
                                      : 'bg-gradient-to-r from-gray-600 to-gray-700'
                                  }`}>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6 text-white" viewBox="0 0 20 20" fill="currentColor">
                                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zm-1 5a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                    </svg>
                                  </div>
                                  <h5 className={`text-sm sm:text-md font-semibold ${
                                    sectionIndex === 0 ? 'text-white' : 'text-blue-300'
                                  }`}>
                                    Section {sectionIndex + 1}
                                  </h5>
                                </div>
                                <svg 
                                  xmlns="http://www.w3.org/2000/svg" 
                                  className={`h-5 w-5 sm:h-6 sm:w-6 transform transition-transform ${isExpanded ? 'rotate-180' : ''} ${
                                    sectionIndex === 0 ? 'text-white' : 'text-gray-400'
                                  }`}
                                  viewBox="0 0 20 20" 
                                  fill="currentColor"
                                >
                                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                              </div>
                              
                              {/* Section Content */}
                              {isExpanded && (
                                <div className="p-3 sm:p-4 bg-gradient-to-b from-gray-850 to-gray-800">
                                  <div className="grid grid-cols-1 gap-3 sm:gap-4">
                                    {sectionFields.map((field, index) => {
                                      const globalIndex = part.fields.indexOf(field);
                                      const isUrl = field.startsWith('http://') || field.startsWith('https://');
                                      const linkKey = `${courses[currentPage][0]}_part${partIndex}_link${globalIndex}`;
                                      const isUnlocked = linkProgress[linkKey];
                                      const prevLinkKey = globalIndex > 0 ? `${courses[currentPage][0]}_part${partIndex}_link${globalIndex - 1}` : null;
                                      const canAccess = globalIndex === 0 || linkProgress[prevLinkKey];
                                      
                                      if (isUrl) {
                                        return (
                                          <div key={globalIndex} className="relative group">
                                            <button
                                              onClick={() => handleLinkClick(courses[currentPage][0], partIndex, globalIndex, field)}
                                              disabled={!canAccess}
                                              className={`w-full font-medium py-3 sm:py-4 px-4 rounded-2xl transition duration-300 transform flex items-center justify-center shadow-lg ${
                                                isUnlocked 
                                                  ? "bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white hover:shadow-xl hover:shadow-green-500/30"
                                                  : canAccess
                                                    ? "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white hover:shadow-xl hover:shadow-blue-500/30"
                                                    : "bg-gray-700 text-gray-400 cursor-not-allowed"
                                              }`}
                                            >
                                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3a2 2 0 00-2.828-2.828l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5z" clipRule="evenodd" />
                                              </svg>
                                              {`Section ${sectionIndex + 1} - part ${index + 1}`}
                                            </button>
                                            
                                            {/* Status indicators */}
                                            <div className="mt-2 text-xs text-center">
                                              {isUnlocked ? (
                                                <span className="text-green-400 flex items-center justify-center font-bold">
                                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                  </svg>
                                                  Completed
                                                </span>
                                              ) : canAccess ? (
                                                <span className="text-blue-400 flex items-center justify-center font-bold">
                                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                                                  </svg>
                                                  Ready to access
                                                </span>
                                              ) : (
                                                <span className="text-gray-400 flex items-center justify-center font-bold">
                                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                                  </svg>
                                                  Complete previous resource first
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        );
                                      } else {
                                        return (
                                          <div key={globalIndex} className="bg-gradient-to-br from-gray-800 to-gray-700 p-4 rounded-2xl border-2 border-gray-600 shadow-lg transform transition-all duration-300 hover:shadow-xl hover:border-blue-500">
                                            <p className="text-gray-200 font-medium">{field}</p>
                                          </div>
                                        );
                                      }
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      <div className="mt-4 text-sm text-gray-500 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        {part.fields.filter(f => f.trim()).length} total resources across {sections.length} sections
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* Bottom Pagination Controls */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-8">
              <button
                onClick={goToPrevPage}
                disabled={currentPage === 0}
                className={`px-4 py-2 sm:px-6 rounded-lg flex items-center justify-center w-full sm:w-auto ${
                  currentPage === 0 
                    ? 'bg-gray-700 text-gray-400 cursor-not-allowed' 
                    : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Previous Course
              </button>
              
              <div className="text-center">
                <span className="text-lg font-semibold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                  Course {currentPage + 1} of {courses.length}
                </span>
              </div>
              
              <button
                onClick={goToNextPage}
                disabled={currentPage === courses.length - 1}
                className={`px-4 py-2 sm:px-6 rounded-lg flex items-center justify-center w-full sm:w-auto ${
                  currentPage === courses.length - 1 
                    ? 'bg-gray-700 text-gray-400 cursor-not-allowed' 
                    : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700'
                }`}
              >
                Next Course
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
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
        
        @keyframes tilt {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(1deg); }
          75% { transform: rotate(-1deg); }
        }
        .animate-tilt {
          animation: tilt 5s infinite linear;
        }
        
        /* Custom scrollbar for better mobile experience */
        ::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        
        ::-webkit-scrollbar-track {
          background: #1a1a1a;
        }
        
        ::-webkit-scrollbar-thumb {
          background: #4f46e5;
          border-radius: 3px;
        }
        
        ::-webkit-scrollbar-thumb:hover {
          background: #6366f1;
        }
      `}</style>
    </div>
  );
}