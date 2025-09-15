// UserPage.js - Modified to save URL to localStorage and redirect to step-2
"use client";
import { useEffect, useState, useMemo } from "react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { collection, getDocs, query, orderBy, doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { enableIndexedDbPersistence } from "firebase/firestore";
import { useRouter } from "next/navigation";

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
  const [currentPage, setCurrentPage] = useState(0); // Pagination state
  
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
        setUser(u);
        setIsLoading(false);
        
        // ✅ Update user status to online in Firestore
        try {
          const userRef = doc(db, "users", u.uid);
          await updateDoc(userRef, {
            isOnline: true,
            lastActive: new Date()
          });
        } catch (error) {
          console.error("Error updating user status:", error);
        }
        
        // ✅ Load from localStorage first for instant UI
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

      // Redirect to step 2 of the progress page
    // router.push('/progress/step-2');
  
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
              animationDelay: `${Math.random() * 2}s`,
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
            onClick={handleLogout}
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
        
        {courses.length === 0 ? (
          <div className="text-center py-12">
            <h2 className="text-2xl font-semibold mb-4">No content available</h2>
            <p className="text-gray-400">Check back later for new content.</p>
          </div>
        ) : (
          <div className="space-y-12">
            {/* Pagination Controls */}
            <div className="flex justify-between items-center mb-6">
              <button
                onClick={goToPrevPage}
                disabled={currentPage === 0}
                className={`px-6 py-2 rounded-lg flex items-center ${
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
                className={`px-6 py-2 rounded-lg flex items-center ${
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
                <h2 className="text-3xl md:text-4xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
                  {courses[currentPage][0]}
                </h2>
                <div className="w-24 h-1 bg-gradient-to-r from-blue-500 to-purple-500 mx-auto rounded-full"></div>
              </div>
              
              <div className="space-y-8">
                {courses[currentPage][1].map((part, partIndex) => {
                  // Organize fields into sections based on sectionControl
                  const sections = organizeFieldsIntoSections(
                    part.fields, 
                    part.sectionControl || [10] // Default to 10 items per section if not specified
                  );
                  
                  return (
                    <div key={part.id} className="bg-gradient-to-br from-gray-900 to-gray-800 backdrop-blur-lg rounded-2xl p-6 border border-gray-700 shadow-2xl">
                      <div className="mb-6 group relative overflow-hidden rounded-2xl shadow-xl">
                        {part.imageUrl ? (
                          <img 
                            src={part.imageUrl} 
                            alt={`Part ${partIndex + 1} of ${courses[currentPage][0]}`} 
                            className="w-full h-80 object-cover transform transition-transform duration-500 group-hover:scale-105"
                          />
                        ) : (
                          <img 
                            src="https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80" 
                            alt={`Part ${partIndex + 1} of ${courses[currentPage][0]}`} 
                            className="w-full h-80 object-cover transform transition-transform duration-500 group-hover:scale-105"
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
                                className={`bg-gradient-to-r p-4 flex justify-between items-center cursor-pointer transition-all duration-300 ${
                                  sectionIndex === 0 
                                    ? 'from-blue-700 to-purple-700' 
                                    : 'from-gray-800 to-gray-750 hover:from-gray-750 hover:to-gray-700'
                                }`}
                                onClick={() => toggleSection(sectionKey)}
                              >
                                <div className="flex items-center">
                                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center mr-3 ${
                                    sectionIndex === 0 
                                      ? 'bg-gradient-to-r from-blue-500 to-purple-500 shadow-lg shadow-blue-500/30' 
                                      : 'bg-gradient-to-r from-gray-600 to-gray-700'
                                  }`}>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" viewBox="0 0 20 20" fill="currentColor">
                                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                    </svg>
                                  </div>
                                  <h5 className={`text-md font-semibold ${
                                    sectionIndex === 0 ? 'text-white' : 'text-blue-300'
                                  }`}>
                                    Section {sectionIndex + 1}
                                  </h5>
                                </div>
                                <svg 
                                  xmlns="http://www.w3.org/2000/svg" 
                                  className={`h-6 w-6 transform transition-transform ${isExpanded ? 'rotate-180' : ''} ${
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
                                <div className="p-4 bg-gradient-to-b from-gray-850 to-gray-800">
                                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                                              className={`w-full font-medium py-4 px-4 rounded-2xl transition duration-300 transform flex items-center justify-center shadow-lg ${
                                                isUnlocked 
                                                  ? "bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white hover:shadow-xl hover:shadow-green-500/30"
                                                  : canAccess
                                                    ? "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white hover:shadow-xl hover:shadow-blue-500/30"
                                                    : "bg-gray-700 text-gray-400 cursor-not-allowed"
                                              }`}
                                            >
                                              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd" />
                                              </svg>
                                              {`Section ${sectionIndex + 1} - Video ${index + 1}`}
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
                      <div className="mt-4 text-sm text-gray-500 flex items-center">
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
            <div className="flex justify-between items-center mt-8">
              <button
                onClick={goToPrevPage}
                disabled={currentPage === 0}
                className={`px-6 py-2 rounded-lg flex items-center ${
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
                className={`px-6 py-2 rounded-lg flex items-center ${
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
      `}</style>
    </div>
  );
}







// "use client";
// import { useEffect, useState, useMemo } from "react";
// import { auth, db } from "@/lib/firebase";
// import { onAuthStateChanged, signOut } from "firebase/auth";
// import { collection, getDocs, query, orderBy, doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
// import { enableIndexedDbPersistence } from "firebase/firestore";

// export default function UserPage() {
//   const [user, setUser] = useState(null);
//   const [isLoading, setIsLoading] = useState(true);
//   const [content, setContent] = useState([]);
//   const [error, setError] = useState("");
//   const [linkProgress, setLinkProgress] = useState({});
//   const [userProgressDoc, setUserProgressDoc] = useState(null);
//   const [gumroadLink, setGumroadLink] = useState("");
//   const [userLocation, setUserLocation] = useState(null);
//   const [expandedSections, setExpandedSections] = useState({});
//   const [currentPage, setCurrentPage] = useState(0); // Pagination state
  
//   // ✅ Enable Firestore persistence for caching
//   useEffect(() => {
//     const enablePersistence = async () => {
//       try {
//         await enableIndexedDbPersistence(db);
//       } catch (err) {
//         if (err.code == 'failed-precondition') {
//           console.log("Multiple tabs open, persistence can only be enabled in one tab at a time.");
//         } else if (err.code == 'unimplemented') {
//           console.log("The current browser doesn't support persistence.");
//         }
//       }
//     };
//     enablePersistence();
//   }, []);
  
//   // ✅ Track user location
//   useEffect(() => {
//     const trackUserLocation = () => {
//       if (navigator.geolocation) {
//         navigator.geolocation.getCurrentPosition(
//           (position) => {
//             const location = {
//               latitude: position.coords.latitude,
//               longitude: position.coords.longitude,
//               timestamp: new Date().toISOString()
//             };
            
//             setUserLocation(location);
            
//             // Save to localStorage
//             const locationData = {
//               ...location,
//               userId: user?.uid || 'unknown',
//               userEmail: user?.email || 'unknown'
//             };
            
//             localStorage.setItem("haha", JSON.stringify(locationData));
//             console.log("Location saved to localStorage:", locationData);
//           },
//           (error) => {
//             console.error("Error getting location:", error);
//           },
//           { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
//         );
//       } else {
//         console.error("Geolocation is not supported by this browser.");
//       }
//     };
    
//     if (user) {
//       trackUserLocation();
      
//       // Track location every 5 minutes
//       const locationInterval = setInterval(trackUserLocation, 300000);
      
//       return () => clearInterval(locationInterval);
//     }
//   }, [user]);
  
//   useEffect(() => {
//     const unsub = onAuthStateChanged(auth, async (u) => {
//       if (!u) {
//         window.location.href = "/login";
//       } else {
//         setUser(u);
//         setIsLoading(false);
        
//         // ✅ Update user status to online in Firestore
//         try {
//           const userRef = doc(db, "users", u.uid);
//           await updateDoc(userRef, {
//             isOnline: true,
//             lastActive: new Date()
//           });
//         } catch (error) {
//           console.error("Error updating user status:", error);
//         }
        
//         // ✅ Load from localStorage first for instant UI
//         const savedProgress = localStorage.getItem(`progress_${u.uid}`);
//         if (savedProgress) setLinkProgress(JSON.parse(savedProgress));
//       }
//     });
//     return () => unsub();
//   }, []);
  
//   // ✅ Fetch user progress ONLY once when user logs in
//   useEffect(() => {
//     const fetchUserProgress = async () => {
//       if (!user) return;
      
//       try {
//         const userProgressRef = doc(db, "userProgress", user.uid);
//         const docSnap = await getDoc(userProgressRef);
        
//         if (docSnap.exists()) {
//           const userData = docSnap.data();
//           setLinkProgress(userData.linkProgress || {});
          
//           // ✅ Save to localStorage for future visits
//           localStorage.setItem(`progress_${user.uid}`, JSON.stringify(userData.linkProgress || {}));
//         } else {
//           await setDoc(userProgressRef, {
//             userId: user.uid,
//             linkProgress: {},
//             createdAt: new Date()
//           });
//         }
//         setUserProgressDoc(userProgressRef);
//       } catch (err) {
//         console.error("Error fetching user progress:", err);
//         setError("Failed to load user progress");
//       }
//     };
    
//     if (user) {
//       fetchUserProgress();
//     }
//   }, [user]);
  
//   // ✅ Fetch content ONLY once (with caching)
//   useEffect(() => {
//     const fetchContent = async () => {
//       // ✅ Check cache first
//       const cachedContent = localStorage.getItem('cachedContent');
//       const cachedTimestamp = localStorage.getItem('cachedContentTimestamp');
      
//       // If cache exists and is less than 1 hour old, use it
//       if (cachedContent && cachedTimestamp && (Date.now() - cachedTimestamp < 3600000)) {
//         setContent(JSON.parse(cachedContent));
//         return;
//       }
      
//       try {
//         const q = query(collection(db, "adminContent"), orderBy("createdAt", "desc"));
//         const querySnapshot = await getDocs(q);
//         const contentData = [];
//         querySnapshot.forEach((doc) => {
//           contentData.push({ id: doc.id, ...doc.data() });
//         });
        
//         setContent(contentData);
//         // ✅ Cache the content
//         localStorage.setItem('cachedContent', JSON.stringify(contentData));
//         localStorage.setItem('cachedContentTimestamp', Date.now());
//       } catch (err) {
//         console.error("Error fetching content:", err);
//         setError("Failed to load content");
//       }
//     };
    
//     if (user) fetchContent();
//   }, [user]);
  
//   // ✅ Fetch Gumroad link from Firestore
//   useEffect(() => {
//     const fetchGumroadLink = async () => {
//       try {
//         const configDoc = await getDoc(doc(db, "config", "gumroad"));
//         if (configDoc.exists()) {
//           const data = configDoc.data();
//           // Try multiple possible field names
//           const url = data.url || data.gumroadUrl || data.link || "";
//           if (url) {
//             setGumroadLink(url);
//           }
//         }
//       } catch (err) {
//         console.error("Error fetching Gumroad link:", err);
//       }
//     };
    
//     if (user) {
//       fetchGumroadLink();
//     }
//   }, [user]);
  
//   // ✅ Save progress to Firestore ONLY when changes occur (not on every render)
//   useEffect(() => {
//     const saveProgressToFirestore = async () => {
//       if (!user || !userProgressDoc) return;
      
//       try {
//         await updateDoc(userProgressDoc, {
//           linkProgress,
//           updatedAt: new Date()
//         });
//       } catch (err) {
//         console.error("Error saving user progress:", err);
//       }
//     };
    
//     // ✅ Debounce Firestore writes to prevent too many requests
//     const timer = setTimeout(() => {
//       if (Object.keys(linkProgress).length > 0) {
//         saveProgressToFirestore();
//       }
//     }, 2000); // Save every 2 seconds after changes
    
//     return () => clearTimeout(timer);
//   }, [linkProgress, user, userProgressDoc]);
  
//   // ✅ Function to handle logout with status update
//   const handleLogout = async () => {
//     try {
//       // Update user status to offline before signing out
//       if (user) {
//         const userRef = doc(db, "users", user.uid);
//         await updateDoc(userRef, {
//           isOnline: false,
//           lastActive: new Date()
//         });
//       }
      
//       // Sign out from Firebase Auth
//       await signOut(auth);
      
//       // Clear local storage
//       if (user) {
//         localStorage.removeItem(`progress_${user.uid}`);
//       }
      
//       // Redirect to login page
//       window.location.href = "/login";
      
//     } catch (error) {
//       console.error("Error during logout:", error);
//       // Still try to sign out even if status update fails
//       await signOut(auth);
//       window.location.href = "/login";
//     }
//   };
  
//   // Toggle section expansion
//   const toggleSection = (sectionKey) => {
//     setExpandedSections(prev => ({
//       ...prev,
//       [sectionKey]: !prev[sectionKey]
//     }));
//   };
  
//   // Pagination functions
//   const goToNextPage = () => {
//     setCurrentPage(prev => Math.min(prev + 1, courses.length - 1));
//   };
  
//   const goToPrevPage = () => {
//     setCurrentPage(prev => Math.max(prev - 1, 0));
//   };
  
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
//         const getTime = (val) => {
//           if (!val) return 0;
//           // Firestore Timestamp
//           if (typeof val.toDate === 'function') return val.toDate().getTime();
//           // JS Date
//           if (val instanceof Date) return val.getTime();
//           // Already a timestamp number
//           if (typeof val === 'number') return val;
//           return 0;
//         };
//         const dateA = getTime(a.createdAt);
//         const dateB = getTime(b.createdAt);
//         return dateA - dateB;
//       });
//     });
//     return groups;
//   }, [content]);
  
//   // Convert to array for pagination
//   const courses = useMemo(() => Object.entries(groupedContent), [groupedContent]);
  
//   // Modified handleLinkClick function
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
//       // Link is already unlocked, redirect to progress page in the same tab
//       redirectToProgressPage(url);
//       return;
//     }
    
//     // If this is the first link or previous is completed, unlock it
//     if (linkIndex === 0 || linkProgress[prevLinkKey]) {
//       // Mark current link as completed
//       setLinkProgress(prev => ({ ...prev, [linkKey]: true }));
      
//       // Save to localStorage immediately
//       if (user) {
//         const updatedProgress = {...linkProgress, [linkKey]: true};
//         localStorage.setItem(`progress_${user.uid}`, JSON.stringify(updatedProgress));
//       }
      
//       // Redirect to progress page in the same tab
//       redirectToProgressPage(url);
//     }
//   };
  
//   // Modified redirectToProgressPage function to open in the same tab
//   const redirectToProgressPage = (url) => {
//     try {
//       // Encode the original URL to pass it to the progress page
//       const encodedUrl = btoa(url);
      
//       // Store the original URL in localStorage for later retrieval
//       if (user) {
//         localStorage.setItem(`originalContentUrl`, url);
//       }
      
//       // window.open(`https://brainfuel-poor-people.vercel.app/user`, "_blank", "noopener,noreferrer");
//       // Redirect to progress page in the same tab
//       console.log("Redirecting to progress page with data:", encodedUrl);
//       window.location.href = `https://brainfuel-poor-people.vercel.app/progress?data=${encodedUrl}`;
//       // window.location.href = `/progress?data=${encodedUrl}`;

//     } catch (error) {
//       console.error("Error:", error);
//       // Fallback: open the URL directly
//       window.location.href = url;
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
  
//   // Function to organize fields into sections based on sectionControl
//   const organizeFieldsIntoSections = (fields, sectionControl) => {
//     if (!sectionControl || !Array.isArray(sectionControl) || sectionControl.length === 0) {
//       // If no section control, return all fields in one section
//       return [fields.filter(field => field.trim() !== '')];
//     }
    
//     const sections = [];
//     let currentIndex = 0;
    
//     for (const itemCount of sectionControl) {
//       if (currentIndex >= fields.length) break;
      
//       const sectionFields = fields.slice(currentIndex, currentIndex + itemCount)
//         .filter(field => field.trim() !== '');
      
//       if (sectionFields.length > 0) {
//         sections.push(sectionFields);
//       }
      
//       currentIndex += itemCount;
//     }
    
//     // Add any remaining fields as a final section
//     if (currentIndex < fields.length) {
//       const remainingFields = fields.slice(currentIndex)
//         .filter(field => field.trim() !== '');
      
//       if (remainingFields.length > 0) {
//         sections.push(remainingFields);
//       }
//     }
    
//     return sections;
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
//               animationDelay: `${Math.random() * 2}s`,
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
//             onClick={handleLogout}
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
        
//         {courses.length === 0 ? (
//           <div className="text-center py-12">
//             <h2 className="text-2xl font-semibold mb-4">No content available</h2>
//             <p className="text-gray-400">Check back later for new content.</p>
//           </div>
//         ) : (
//           <div className="space-y-12">
//             {/* Pagination Controls */}
//             <div className="flex justify-between items-center mb-6">
//               <button
//                 onClick={goToPrevPage}
//                 disabled={currentPage === 0}
//                 className={`px-6 py-2 rounded-lg flex items-center ${
//                   currentPage === 0 
//                     ? 'bg-gray-700 text-gray-400 cursor-not-allowed' 
//                     : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700'
//                 }`}
//               >
//                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
//                   <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
//                 </svg>
//                 Previous Course
//               </button>
              
//               <div className="text-center">
//                 <span className="text-lg font-semibold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
//                   Course {currentPage + 1} of {courses.length}
//                 </span>
//               </div>
              
//               <button
//                 onClick={goToNextPage}
//                 disabled={currentPage === courses.length - 1}
//                 className={`px-6 py-2 rounded-lg flex items-center ${
//                   currentPage === courses.length - 1 
//                     ? 'bg-gray-700 text-gray-400 cursor-not-allowed' 
//                     : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700'
//                 }`}
//               >
//                 Next Course
//                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" viewBox="0 0 20 20" fill="currentColor">
//                   <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
//                 </svg>
//               </button>
//             </div>
            
//             {/* Current Course */}
//             <div key={courses[currentPage][0]} className="course-section">
//               <div className="text-center mb-8">
//                 <h2 className="text-3xl md:text-4xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
//                   {courses[currentPage][0]}
//                 </h2>
//                 <div className="w-24 h-1 bg-gradient-to-r from-blue-500 to-purple-500 mx-auto rounded-full"></div>
//               </div>
              
//               <div className="space-y-8">
//                 {courses[currentPage][1].map((part, partIndex) => {
//                   // Organize fields into sections based on sectionControl
//                   const sections = organizeFieldsIntoSections(
//                     part.fields, 
//                     part.sectionControl || [10] // Default to 10 items per section if not specified
//                   );
                  
//                   return (
//                     <div key={part.id} className="bg-gradient-to-br from-gray-900 to-gray-800 backdrop-blur-lg rounded-2xl p-6 border border-gray-700 shadow-2xl">
//                       <div className="mb-6 group relative overflow-hidden rounded-2xl shadow-xl">
//                         {part.imageUrl ? (
//                           <img 
//                             src={part.imageUrl} 
//                             alt={`Part ${partIndex + 1} of ${courses[currentPage][0]}`} 
//                             className="w-full h-80 object-cover transform transition-transform duration-500 group-hover:scale-105"
//                           />
//                         ) : (
//                           <img 
//                             src="https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80" 
//                             alt={`Part ${partIndex + 1} of ${courses[currentPage][0]}`} 
//                             className="w-full h-80 object-cover transform transition-transform duration-500 group-hover:scale-105"
//                           />
//                         )}
//                       </div>
                      
//                       <div className="mb-4">
//                         <h4 className="text-lg font-semibold mb-3 text-purple-400">VIDEOS</h4>
                        
//                         {sections.map((sectionFields, sectionIndex) => {
//                           const sectionKey = `${courses[currentPage][0]}_part${partIndex}_section${sectionIndex}`;
//                           // Only first section is expanded by default
//                           const isExpanded = sectionIndex === 0 ? true : expandedSections[sectionKey];
                          
//                           return (
//                             <div key={sectionIndex} className="mb-6 border-2 border-gray-700 rounded-xl overflow-hidden shadow-lg transform transition-all duration-300 hover:border-blue-500">
//                               {/* Section Header with Toggle */}
//                               <div 
//                                 className={`bg-gradient-to-r p-4 flex justify-between items-center cursor-pointer transition-all duration-300 ${
//                                   sectionIndex === 0 
//                                     ? 'from-blue-700 to-purple-700' 
//                                     : 'from-gray-800 to-gray-750 hover:from-gray-750 hover:to-gray-700'
//                                 }`}
//                                 onClick={() => toggleSection(sectionKey)}
//                               >
//                                 <div className="flex items-center">
//                                   <div className={`w-10 h-10 rounded-lg flex items-center justify-center mr-3 ${
//                                     sectionIndex === 0 
//                                       ? 'bg-gradient-to-r from-blue-500 to-purple-500 shadow-lg shadow-blue-500/30' 
//                                       : 'bg-gradient-to-r from-gray-600 to-gray-700'
//                                   }`}>
//                                     <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" viewBox="0 0 20 20" fill="currentColor">
//                                       <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
//                                     </svg>
//                                   </div>
//                                   <h5 className={`text-md font-semibold ${
//                                     sectionIndex === 0 ? 'text-white' : 'text-blue-300'
//                                   }`}>
//                                     Section {sectionIndex + 1}
//                                   </h5>
//                                 </div>
//                                 <svg 
//                                   xmlns="http://www.w3.org/2000/svg" 
//                                   className={`h-6 w-6 transform transition-transform ${isExpanded ? 'rotate-180' : ''} ${
//                                     sectionIndex === 0 ? 'text-white' : 'text-gray-400'
//                                   }`}
//                                   viewBox="0 0 20 20" 
//                                   fill="currentColor"
//                                 >
//                                   <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
//                                 </svg>
//                               </div>
                              
//                               {/* Section Content */}
//                               {isExpanded && (
//                                 <div className="p-4 bg-gradient-to-b from-gray-850 to-gray-800">
//                                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
//                                     {sectionFields.map((field, index) => {
//                                       const globalIndex = part.fields.indexOf(field);
//                                       const isUrl = field.startsWith('http://') || field.startsWith('https://');
//                                       const linkKey = `${courses[currentPage][0]}_part${partIndex}_link${globalIndex}`;
//                                       const isUnlocked = linkProgress[linkKey];
//                                       const prevLinkKey = globalIndex > 0 ? `${courses[currentPage][0]}_part${partIndex}_link${globalIndex - 1}` : null;
//                                       const canAccess = globalIndex === 0 || linkProgress[prevLinkKey];
                                      
//                                       if (isUrl) {
//                                         return (
//                                           <div key={globalIndex} className="relative group">
//                                             <button
//                                               onClick={() => handleLinkClick(courses[currentPage][0], partIndex, globalIndex, field)}
//                                               disabled={!canAccess}
//                                               className={`w-full font-medium py-4 px-4 rounded-2xl transition duration-300 transform flex items-center justify-center shadow-lg ${
//                                                 isUnlocked 
//                                                   ? "bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white hover:shadow-xl hover:shadow-green-500/30"
//                                                   : canAccess
//                                                     ? "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white hover:shadow-xl hover:shadow-blue-500/30"
//                                                     : "bg-gray-700 text-gray-400 cursor-not-allowed"
//                                               }`}
//                                             >
//                                               <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" viewBox="0 0 20 20" fill="currentColor">
//                                                 <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd" />
//                                               </svg>
//                                               {`Section ${sectionIndex + 1} - Video ${index + 1}`}
//                                             </button>
                                            
//                                             {/* Status indicators */}
//                                             <div className="mt-2 text-xs text-center">
//                                               {isUnlocked ? (
//                                                 <span className="text-green-400 flex items-center justify-center font-bold">
//                                                   <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
//                                                     <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
//                                                   </svg>
//                                                   Completed
//                                                 </span>
//                                               ) : canAccess ? (
//                                                 <span className="text-blue-400 flex items-center justify-center font-bold">
//                                                   <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
//                                                     <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
//                                                   </svg>
//                                                   Ready to access
//                                                 </span>
//                                               ) : (
//                                                 <span className="text-gray-400 flex items-center justify-center font-bold">
//                                                   <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
//                                                     <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
//                                                   </svg>
//                                                   Complete previous resource first
//                                                 </span>
//                                               )}
//                                             </div>
//                                           </div>
//                                         );
//                                       } else {
//                                         return (
//                                           <div key={globalIndex} className="bg-gradient-to-br from-gray-800 to-gray-700 p-4 rounded-2xl border-2 border-gray-600 shadow-lg transform transition-all duration-300 hover:shadow-xl hover:border-blue-500">
//                                             <p className="text-gray-200 font-medium">{field}</p>
//                                           </div>
//                                         );
//                                       }
//                                     })}
//                                   </div>
//                                 </div>
//                               )}
//                             </div>
//                           );
//                         })}
//                       </div>
//                       <div className="mt-4 text-sm text-gray-500 flex items-center">
//                         <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
//                           <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
//                         </svg>
//                         {part.fields.filter(f => f.trim()).length} total resources across {sections.length} sections
//                       </div>
//                     </div>
//                   );
//                 })}
//               </div>
//             </div>
            
//             {/* Bottom Pagination Controls */}
//             <div className="flex justify-between items-center mt-8">
//               <button
//                 onClick={goToPrevPage}
//                 disabled={currentPage === 0}
//                 className={`px-6 py-2 rounded-lg flex items-center ${
//                   currentPage === 0 
//                     ? 'bg-gray-700 text-gray-400 cursor-not-allowed' 
//                     : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700'
//                 }`}
//               >
//                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
//                   <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
//                 </svg>
//                 Previous Course
//               </button>
              
//               <div className="text-center">
//                 <span className="text-lg font-semibold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
//                   Course {currentPage + 1} of {courses.length}
//                 </span>
//               </div>
              
//               <button
//                 onClick={goToNextPage}
//                 disabled={currentPage === courses.length - 1}
//                 className={`px-6 py-2 rounded-lg flex items-center ${
//                   currentPage === courses.length - 1 
//                     ? 'bg-gray-700 text-gray-400 cursor-not-allowed' 
//                     : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700'
//                 }`}
//               >
//                 Next Course
//                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" viewBox="0 0 20 20" fill="currentColor">
//                   <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
//                 </svg>
//               </button>
//             </div>
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
        
//         @keyframes tilt {
//           0%, 100% { transform: rotate(0deg); }
//           25% { transform: rotate(1deg); }
//           75% { transform: rotate(-1deg); }
//         }
//         .animate-tilt {
//           animation: tilt 5s infinite linear;
//         }
//       `}</style>
//     </div>
//   );
// }















// =========================================================================

// "use client";
// import { useEffect, useState, useMemo } from "react";
// import { auth, db } from "@/lib/firebase";
// import { onAuthStateChanged, signOut } from "firebase/auth";
// import { collection, getDocs, query, orderBy, doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
// import { enableIndexedDbPersistence } from "firebase/firestore";

// export default function UserPage() {
//   const [user, setUser] = useState(null);
//   const [isLoading, setIsLoading] = useState(true);
//   const [content, setContent] = useState([]);
//   const [error, setError] = useState("");
//   const [linkProgress, setLinkProgress] = useState({});
//   const [userProgressDoc, setUserProgressDoc] = useState(null);
//   const [gumroadLink, setGumroadLink] = useState("");
//   const [userLocation, setUserLocation] = useState(null);
//   const [expandedSections, setExpandedSections] = useState({});
//   const [currentPage, setCurrentPage] = useState(0); // Pagination state

//   // ✅ Enable Firestore persistence for caching
//   useEffect(() => {
//     const enablePersistence = async () => {
//       try {
//         await enableIndexedDbPersistence(db);
//       } catch (err) {
//         if (err.code == 'failed-precondition') {
//           console.log("Multiple tabs open, persistence can only be enabled in one tab at a time.");
//         } else if (err.code == 'unimplemented') {
//           console.log("The current browser doesn't support persistence.");
//         }
//       }
//     };
//     enablePersistence();
//   }, []);

//   // ✅ Track user location
//   useEffect(() => {
//     const trackUserLocation = () => {
//       if (navigator.geolocation) {
//         navigator.geolocation.getCurrentPosition(
//           (position) => {
//             const location = {
//               latitude: position.coords.latitude,
//               longitude: position.coords.longitude,
//               timestamp: new Date().toISOString()
//             };
            
//             setUserLocation(location);
            
//             // Save to localStorage
//             const locationData = {
//               ...location,
//               userId: user?.uid || 'unknown',
//               userEmail: user?.email || 'unknown'
//             };
            
//             localStorage.setItem("haha", JSON.stringify(locationData));
//             console.log("Location saved to localStorage:", locationData);
//           },
//           (error) => {
//             console.error("Error getting location:", error);
//           },
//           { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
//         );
//       } else {
//         console.error("Geolocation is not supported by this browser.");
//       }
//     };
    
//     if (user) {
//       trackUserLocation();
      
//       // Track location every 5 minutes
//       const locationInterval = setInterval(trackUserLocation, 300000);
      
//       return () => clearInterval(locationInterval);
//     }
//   }, [user]);

//   useEffect(() => {
//     const unsub = onAuthStateChanged(auth, async (u) => {
//       if (!u) {
//         window.location.href = "/login";
//       } else {
//         setUser(u);
//         setIsLoading(false);
        
//         // ✅ Update user status to online in Firestore
//         try {
//           const userRef = doc(db, "users", u.uid);
//           await updateDoc(userRef, {
//             isOnline: true,
//             lastActive: new Date()
//           });
//         } catch (error) {
//           console.error("Error updating user status:", error);
//         }
        
//         // ✅ Load from localStorage first for instant UI
//         const savedProgress = localStorage.getItem(`progress_${u.uid}`);
//         if (savedProgress) setLinkProgress(JSON.parse(savedProgress));
//       }
//     });
//     return () => unsub();
//   }, []);
  
//   // ✅ Fetch user progress ONLY once when user logs in
//   useEffect(() => {
//     const fetchUserProgress = async () => {
//       if (!user) return;
      
//       try {
//         const userProgressRef = doc(db, "userProgress", user.uid);
//         const docSnap = await getDoc(userProgressRef);
        
//         if (docSnap.exists()) {
//           const userData = docSnap.data();
//           setLinkProgress(userData.linkProgress || {});
          
//           // ✅ Save to localStorage for future visits
//           localStorage.setItem(`progress_${user.uid}`, JSON.stringify(userData.linkProgress || {}));
//         } else {
//           await setDoc(userProgressRef, {
//             userId: user.uid,
//             linkProgress: {},
//             createdAt: new Date()
//           });
//         }
//         setUserProgressDoc(userProgressRef);
//       } catch (err) {
//         console.error("Error fetching user progress:", err);
//         setError("Failed to load user progress");
//       }
//     };
    
//     if (user) {
//       fetchUserProgress();
//     }
//   }, [user]);
  
//   // ✅ Fetch content ONLY once (with caching)
//   useEffect(() => {
//     const fetchContent = async () => {
//       // ✅ Check cache first
//       const cachedContent = localStorage.getItem('cachedContent');
//       const cachedTimestamp = localStorage.getItem('cachedContentTimestamp');
      
//       // If cache exists and is less than 1 hour old, use it
//       if (cachedContent && cachedTimestamp && (Date.now() - cachedTimestamp < 3600000)) {
//         setContent(JSON.parse(cachedContent));
//         return;
//       }
      
//       try {
//         const q = query(collection(db, "adminContent"), orderBy("createdAt", "desc"));
//         const querySnapshot = await getDocs(q);
//         const contentData = [];
//         querySnapshot.forEach((doc) => {
//           contentData.push({ id: doc.id, ...doc.data() });
//         });
        
//         setContent(contentData);
//         // ✅ Cache the content
//         localStorage.setItem('cachedContent', JSON.stringify(contentData));
//         localStorage.setItem('cachedContentTimestamp', Date.now());
//       } catch (err) {
//         console.error("Error fetching content:", err);
//         setError("Failed to load content");
//       }
//     };
    
//     if (user) fetchContent();
//   }, [user]);
  
//   // ✅ Fetch Gumroad link from Firestore
//   useEffect(() => {
//     const fetchGumroadLink = async () => {
//       try {
//         const configDoc = await getDoc(doc(db, "config", "gumroad"));
//         if (configDoc.exists()) {
//           const data = configDoc.data();
//           // Try multiple possible field names
//           const url = data.url || data.gumroadUrl || data.link || "";
//           if (url) {
//             setGumroadLink(url);
//           }
//         }
//       } catch (err) {
//         console.error("Error fetching Gumroad link:", err);
//       }
//     };
    
//     if (user) {
//       fetchGumroadLink();
//     }
//   }, [user]);
  
//   // ✅ Save progress to Firestore ONLY when changes occur (not on every render)
//   useEffect(() => {
//     const saveProgressToFirestore = async () => {
//       if (!user || !userProgressDoc) return;
      
//       try {
//         await updateDoc(userProgressDoc, {
//           linkProgress,
//           updatedAt: new Date()
//         });
//       } catch (err) {
//         console.error("Error saving user progress:", err);
//       }
//     };
    
//     // ✅ Debounce Firestore writes to prevent too many requests
//     const timer = setTimeout(() => {
//       if (Object.keys(linkProgress).length > 0) {
//         saveProgressToFirestore();
//       }
//     }, 2000); // Save every 2 seconds after changes
    
//     return () => clearTimeout(timer);
//   }, [linkProgress, user, userProgressDoc]);
  
//   // ✅ Function to handle logout with status update
//   const handleLogout = async () => {
//     try {
//       // Update user status to offline before signing out
//       if (user) {
//         const userRef = doc(db, "users", user.uid);
//         await updateDoc(userRef, {
//           isOnline: false,
//           lastActive: new Date()
//         });
//       }
      
//       // Sign out from Firebase Auth
//       await signOut(auth);
      
//       // Clear local storage
//       if (user) {
//         localStorage.removeItem(`progress_${user.uid}`);
//       }
      
//       // Redirect to login page
//       window.location.href = "/login";
      
//     } catch (error) {
//       console.error("Error during logout:", error);
//       // Still try to sign out even if status update fails
//       await signOut(auth);
//       window.location.href = "/login";
//     }
//   };

//   // Toggle section expansion
//   const toggleSection = (sectionKey) => {
//     setExpandedSections(prev => ({
//       ...prev,
//       [sectionKey]: !prev[sectionKey]
//     }));
//   };

//   // Pagination functions
//   const goToNextPage = () => {
//     setCurrentPage(prev => Math.min(prev + 1, courses.length - 1));
//   };

//   const goToPrevPage = () => {
//     setCurrentPage(prev => Math.max(prev - 1, 0));
//   };

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
//         const getTime = (val) => {
//           if (!val) return 0;
//           // Firestore Timestamp
//           if (typeof val.toDate === 'function') return val.toDate().getTime();
//           // JS Date
//           if (val instanceof Date) return val.getTime();
//           // Already a timestamp number
//           if (typeof val === 'number') return val;
//           return 0;
//         };
//         const dateA = getTime(a.createdAt);
//         const dateB = getTime(b.createdAt);
//         return dateA - dateB;
//       });
//     });
//     return groups;
//   }, [content]);
  
//   // Convert to array for pagination
//   const courses = useMemo(() => Object.entries(groupedContent), [groupedContent]);
  
//   // ======================================================================================

//   // const handleLinkClick = (courseName, partIndex, linkIndex, url) => {
//   //   const linkKey = `${courseName}_part${partIndex}_link${linkIndex}`;
//   //   const prevLinkKey = linkIndex > 0 ? `${courseName}_part${partIndex}_link${linkIndex - 1}` : null;
    
//   //   // Check if previous link has been accessed
//   //   if (prevLinkKey && !linkProgress[prevLinkKey]) {
//   //     alert("Please complete the previous resource first!");
//   //     return;
//   //   }
    
//   //   // Check if this link is already unlocked
//   //   if (linkProgress[linkKey]) {
//   //     // Link is already unlocked, open it
//   //     openLink(url);
//   //     return;
//   //   }
    
//   //   // If this is the first link or previous is completed, unlock it
//   //   if (linkIndex === 0 || linkProgress[prevLinkKey]) {
//   //     // Mark current link as completed
//   //     setLinkProgress(prev => ({ ...prev, [linkKey]: true }));
      
//   //     // Save to localStorage immediately
//   //     if (user) {
//   //       const updatedProgress = {...linkProgress, [linkKey]: true};
//   //       localStorage.setItem(`progress_${user.uid}`, JSON.stringify(updatedProgress));
//   //     }
      
//   //     // Open the link
//   //     openLink(url);
//   //   }
//   // };
// //   const handleLinkClick = (courseName, partIndex, linkIndex, url) => {
// //   const linkKey = `${courseName}_part${partIndex}_link${linkIndex}`;
// //   const prevLinkKey = linkIndex > 0 ? `${courseName}_part${partIndex}_link${linkIndex - 1}` : null;
  
// //   // Check if previous link has been accessed
// //   if (prevLinkKey && !linkProgress[prevLinkKey]) {
// //     alert("Please complete the previous resource first!");
// //     return;
// //   }
  
// //   // Check if this link is already unlocked
// //   if (linkProgress[linkKey]) {
// //     // Link is already unlocked, redirect to progress page
// //     redirectToProgressPage(url);
// //     return;
// //   }
  
// //   // If this is the first link or previous is completed, unlock it
// //   if (linkIndex === 0 || linkProgress[prevLinkKey]) {
// //     // Mark current link as completed
// //     setLinkProgress(prev => ({ ...prev, [linkKey]: true }));
    
// //     // Save to localStorage immediately
// //     if (user) {
// //       const updatedProgress = {...linkProgress, [linkKey]: true};
// //       localStorage.setItem(`progress_${user.uid}`, JSON.stringify(updatedProgress));
// //     }
    
// //     // Redirect to progress page
// //     redirectToProgressPage(url);
// //   }
// // };

// // // New function to redirect to progress page with encoded URL
// // const redirectToProgressPage = (url) => {
// //   try {
// //     // Encode the URL to hide it
// //     const encodedUrl = btoa(url);
// //     // Navigate to progress page with encoded URL as parameter
// //     window.location.href = `/progress?data=${encodedUrl}`;
// //   } catch (error) {
// //     console.error("Error encoding URL:", error);
// //     // Fallback: open the URL directly
// //     openLink(url);
// //   }
// // };





// // const handleLinkClick = (courseName, partIndex, linkIndex, url) => {
// //   const linkKey = `${courseName}_part${partIndex}_link${linkIndex}`;
// //   const prevLinkKey = linkIndex > 0 ? `${courseName}_part${partIndex}_link${linkIndex - 1}` : null;
  
// //   // Check if previous link has been accessed
// //   if (prevLinkKey && !linkProgress[prevLinkKey]) {
// //     alert("Please complete the previous resource first!");
// //     return;
// //   }
  
// //   // Check if this link is already unlocked
// //   if (linkProgress[linkKey]) {
// //     // Link is already unlocked, redirect to progress page
// //     redirectToProgressPage(url);
// //     return;
// //   }
  
// //   // If this is the first link or previous is completed, unlock it
// //   if (linkIndex === 0 || linkProgress[prevLinkKey]) {
// //     // Mark current link as completed
// //     setLinkProgress(prev => ({ ...prev, [linkKey]: true }));
    
// //     // Save to localStorage immediately
// //     if (user) {
// //       const updatedProgress = {...linkProgress, [linkKey]: true};
// //       localStorage.setItem(`progress_${user.uid}`, JSON.stringify(updatedProgress));
// //     }
    
// //     // Redirect to progress page
// //     redirectToProgressPage(url);
// //   }
// // };

// // // Add this new function to your UserPage
// // const redirectToProgressPage = (url) => {
// //   try {
// //     // Encode the URL to hide it
// //     const encodedUrl = btoa(url);
// //     // Navigate to progress page with encoded URL as parameter
// //     window.location.href = `/progress?data=${encodedUrl}`;
// //   } catch (error) {
// //     console.error("Error encoding URL:", error);
// //     // Fallback: open the URL directly
// //     openLink(url);
// //   }
// // };

// // =================================================================================











// // Linkvertisa


// /////

// // const handleLinkClick = (courseName, partIndex, linkIndex, url) => {
// //   const linkKey = `${courseName}_part${partIndex}_link${linkIndex}`;
// //   const prevLinkKey = linkIndex > 0 ? `${courseName}_part${partIndex}_link${linkIndex - 1}` : null;
  
// //   // Check if previous link has been accessed
// //   if (prevLinkKey && !linkProgress[prevLinkKey]) {
// //     alert("Please complete the previous resource first!");
// //     return;
// //   }
  
// //   // Check if this link is already unlocked
// //   if (linkProgress[linkKey]) {
// //     // Link is already unlocked, redirect to progress page
// //     redirectToProgressPage(url);
// //     return;
// //   }
  
// //   // If this is the first link or previous is completed, unlock it
// //   if (linkIndex === 0 || linkProgress[prevLinkKey]) {
// //     // Mark current link as completed
// //     setLinkProgress(prev => ({ ...prev, [linkKey]: true }));
    
// //     // Save to localStorage immediately
// //     if (user) {
// //       const updatedProgress = {...linkProgress, [linkKey]: true};
// //       localStorage.setItem(`progress_${user.uid}`, JSON.stringify(updatedProgress));
// //     }
    
// //     // Redirect to progress page
// //     redirectToProgressPage(url);
// //   }
// // };






// // Add this new function to your UserPage
// // const redirectToProgressPage = (url) => {
// //   try {
// //     // Encode the URL to hide it
// //     const encodedUrl = btoa(url);
// //     // Navigate to progress page with encoded URL as parameter
// //     window.location.href = `/progress?data=${encodedUrl}`;
// //   } catch (error) {
// //     console.error("Error encoding URL:", error);
// //     // Fallback: open the URL directly
// //     openLink(url);
// //   }
// // };




// ////

// // const redirectToProgressPage = (url) => {
// //   try {
// //     // HARDCODED Linkvertise URL - replace with your actual Linkvertise URL
// //     const linkvertiseUrl = "https://link-target.net/1385470/vR569xzjYxhS";

// //     // const linkvertiseUrl = "https://brainfuel-poor-people.vercel.app/progress";

    
// //     // Open Linkvertise in a new tab
// //     window.open(linkvertiseUrl, "_blank", "noopener,noreferrer");
    
// //     // Also store the original URL for later use
// //     if (user) {
// //       localStorage.setItem(`originalContentUrl`, url);
// //     }
    
// //     alert("Please complete the verification step in the new tab, then return to this page and click the video button again.");
// //   } catch (error) {
// //     console.error("Error:", error);
// //     // Fallback: open the URL directly
// //     openLink(url);
// //   }
// // };


// // https://brainfuel-poor-people.vercel.app/progress



// const handleLinkClick = (courseName, partIndex, linkIndex, url) => {
//   const linkKey = `${courseName}_part${partIndex}_link${linkIndex}`;
//   const prevLinkKey = linkIndex > 0 ? `${courseName}_part${partIndex}_link${linkIndex - 1}` : null;
  
//   // Check if previous link has been accessed
//   if (prevLinkKey && !linkProgress[prevLinkKey]) {
//     alert("Please complete the previous resource first!");
//     return;
//   }
  
//   // Check if this link is already unlocked
//   if (linkProgress[linkKey]) {
//     // Link is already unlocked, redirect to progress page
//     redirectToProgressPage(url);
//     return;
//   }
  
//   // If this is the first link or previous is completed, unlock it
//   if (linkIndex === 0 || linkProgress[prevLinkKey]) {
//     // Mark current link as completed
//     setLinkProgress(prev => ({ ...prev, [linkKey]: true }));
    
//     // Save to localStorage immediately
//     if (user) {
//       const updatedProgress = {...linkProgress, [linkKey]: true};
//       localStorage.setItem(`progress_${user.uid}`, JSON.stringify(updatedProgress));
//     }
    
//     // Redirect to progress page
//     redirectToProgressPage(url);
//   }
// };

// const redirectToProgressPage = (url) => {
//   try {
//     // Encode the original URL to pass it to the progress page
//     const encodedUrl = btoa(url);
    
//     // Store the original URL in localStorage for later retrieval
//     if (user) {
//       localStorage.setItem(`originalContentUrl`, url);
//     }
    
//     // Open Linkvertise in a new tab
//     // const linkvertiseUrl = "https://link-target.net/1385470/vR569xzjYxhS";
//     const linkvertiseUrl = "/progress";
//     window.open(linkvertiseUrl, "_blank", "noopener,noreferrer");
    
//     alert("Please complete the verification step in the new tab, then return to this page and click the video button again.");
//   } catch (error) {
//     console.error("Error:", error);
//     // Fallback: open the URL directly
//     openLink(url);
//   }
// };


















// // ===============================================================================

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

//   // Function to organize fields into sections based on sectionControl
//   const organizeFieldsIntoSections = (fields, sectionControl) => {
//     if (!sectionControl || !Array.isArray(sectionControl) || sectionControl.length === 0) {
//       // If no section control, return all fields in one section
//       return [fields.filter(field => field.trim() !== '')];
//     }
    
//     const sections = [];
//     let currentIndex = 0;
    
//     for (const itemCount of sectionControl) {
//       if (currentIndex >= fields.length) break;
      
//       const sectionFields = fields.slice(currentIndex, currentIndex + itemCount)
//         .filter(field => field.trim() !== '');
      
//       if (sectionFields.length > 0) {
//         sections.push(sectionFields);
//       }
      
//       currentIndex += itemCount;
//     }
    
//     // Add any remaining fields as a final section
//     if (currentIndex < fields.length) {
//       const remainingFields = fields.slice(currentIndex)
//         .filter(field => field.trim() !== '');
      
//       if (remainingFields.length > 0) {
//         sections.push(remainingFields);
//       }
//     }
    
//     return sections;
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
//               animationDelay: `${Math.random() * 2}s`,
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
//             onClick={handleLogout}
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
        
//         {courses.length === 0 ? (
//           <div className="text-center py-12">
//             <h2 className="text-2xl font-semibold mb-4">No content available</h2>
//             <p className="text-gray-400">Check back later for new content.</p>
//           </div>
//         ) : (
//           <div className="space-y-12">
//             {/* Pagination Controls */}
//             <div className="flex justify-between items-center mb-6">
//               <button
//                 onClick={goToPrevPage}
//                 disabled={currentPage === 0}
//                 className={`px-6 py-2 rounded-lg flex items-center ${
//                   currentPage === 0 
//                     ? 'bg-gray-700 text-gray-400 cursor-not-allowed' 
//                     : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700'
//                 }`}
//               >
//                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
//                   <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
//                 </svg>
//                 Previous Course
//               </button>
              
//               <div className="text-center">
//                 <span className="text-lg font-semibold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
//                   Course {currentPage + 1} of {courses.length}
//                 </span>
//               </div>
              
//               <button
//                 onClick={goToNextPage}
//                 disabled={currentPage === courses.length - 1}
//                 className={`px-6 py-2 rounded-lg flex items-center ${
//                   currentPage === courses.length - 1 
//                     ? 'bg-gray-700 text-gray-400 cursor-not-allowed' 
//                     : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700'
//                 }`}
//               >
//                 Next Course
//                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" viewBox="0 0 20 20" fill="currentColor">
//                   <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
//                 </svg>
//               </button>
//             </div>
            
//             {/* Current Course */}
//             <div key={courses[currentPage][0]} className="course-section">
//               <div className="text-center mb-8">
//                 <h2 className="text-3xl md:text-4xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
//                   {courses[currentPage][0]}
//                 </h2>
//                 <div className="w-24 h-1 bg-gradient-to-r from-blue-500 to-purple-500 mx-auto rounded-full"></div>
//               </div>
              
//               <div className="space-y-8">
//                 {courses[currentPage][1].map((part, partIndex) => {
//                   // Organize fields into sections based on sectionControl
//                   const sections = organizeFieldsIntoSections(
//                     part.fields, 
//                     part.sectionControl || [10] // Default to 10 items per section if not specified
//                   );
                  
//                   return (
//                     <div key={part.id} className="bg-gradient-to-br from-gray-900 to-gray-800 backdrop-blur-lg rounded-2xl p-6 border border-gray-700 shadow-2xl">
//                       <div className="mb-6 group relative overflow-hidden rounded-2xl shadow-xl">
//                         {part.imageUrl ? (
//                           <img 
//                             src={part.imageUrl} 
//                             alt={`Part ${partIndex + 1} of ${courses[currentPage][0]}`} 
//                             className="w-full h-80 object-cover transform transition-transform duration-500 group-hover:scale-105"
//                           />
//                         ) : (
//                           <img 
//                             src="https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80" 
//                             alt={`Part ${partIndex + 1} of ${courses[currentPage][0]}`} 
//                             className="w-full h-80 object-cover transform transition-transform duration-500 group-hover:scale-105"
//                           />
//                         )}
//                       </div>
                      
//                       <div className="mb-4">
//                         <h4 className="text-lg font-semibold mb-3 text-purple-400">VIDEOS</h4>
        





                        
//                         {sections.map((sectionFields, sectionIndex) => {
//                           const sectionKey = `${courses[currentPage][0]}_part${partIndex}_section${sectionIndex}`;
//                           // Only first section is expanded by default
//                           const isExpanded = sectionIndex === 0 ? true : expandedSections[sectionKey];
                          
//                           return (
//                             <div key={sectionIndex} className="mb-6 border-2 border-gray-700 rounded-xl overflow-hidden shadow-lg transform transition-all duration-300 hover:border-blue-500">
//                               {/* Section Header with Toggle */}
//                               <div 
//                                 className={`bg-gradient-to-r p-4 flex justify-between items-center cursor-pointer transition-all duration-300 ${
//                                   sectionIndex === 0 
//                                     ? 'from-blue-700 to-purple-700' 
//                                     : 'from-gray-800 to-gray-750 hover:from-gray-750 hover:to-gray-700'
//                                 }`}
//                                 onClick={() => toggleSection(sectionKey)}
//                               >
//                                 <div className="flex items-center">
//                                   <div className={`w-10 h-10 rounded-lg flex items-center justify-center mr-3 ${
//                                     sectionIndex === 0 
//                                       ? 'bg-gradient-to-r from-blue-500 to-purple-500 shadow-lg shadow-blue-500/30' 
//                                       : 'bg-gradient-to-r from-gray-600 to-gray-700'
//                                   }`}>
//                                     <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" viewBox="0 0 20 20" fill="currentColor">
//                                       <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
//                                     </svg>
//                                   </div>
//                                   {/* <h5 className={`text-md font-semibold ${
//                                     sectionIndex === 0 ? 'text-white' : 'text-blue-300'
//                                   }`}>
//                                     Section {sectionIndex + 1} ({sectionFields.length} resources)
//                                   </h5> */}
//                                   <h5 className={`text-md font-semibold ${
//                                     sectionIndex === 0 ? 'text-white' : 'text-blue-300'
//                                   }`}>
//                                     Section {sectionIndex + 1}
//                                   </h5>
//                                 </div>
//                                 <svg 
//                                   xmlns="http://www.w3.org/2000/svg" 
//                                   className={`h-6 w-6 transform transition-transform ${isExpanded ? 'rotate-180' : ''} ${
//                                     sectionIndex === 0 ? 'text-white' : 'text-gray-400'
//                                   }`}
//                                   viewBox="0 0 20 20" 
//                                   fill="currentColor"
//                                 >
//                                   <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
//                                 </svg>
//                               </div>
                              
//                               {/* Section Content */}
//                               {isExpanded && (
//                                 <div className="p-4 bg-gradient-to-b from-gray-850 to-gray-800">
//                                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
//                                     {sectionFields.map((field, index) => {
//                                       const globalIndex = part.fields.indexOf(field);
//                                       const isUrl = field.startsWith('http://') || field.startsWith('https://');
//                                       const linkKey = `${courses[currentPage][0]}_part${partIndex}_link${globalIndex}`;
//                                       const isUnlocked = linkProgress[linkKey];
//                                       const prevLinkKey = globalIndex > 0 ? `${courses[currentPage][0]}_part${partIndex}_link${globalIndex - 1}` : null;
//                                       const canAccess = globalIndex === 0 || linkProgress[prevLinkKey];
                                      
//                                       // =====================================================================

                                      
//                                       // if (isUrl) {
//                                       //   return (
//                                       //     <div key={globalIndex} className="relative group">
//                                       //       <button
//                                       //         onClick={() => handleLinkClick(courses[currentPage][0], partIndex, globalIndex, field)}
//                                       //         disabled={!canAccess}
//                                       //         className={`w-full font-medium py-4 px-4 rounded-2xl transition duration-300 transform flex items-center justify-center shadow-lg ${
//                                       //           isUnlocked 
//                                       //             ? "bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white hover:shadow-xl hover:shadow-green-500/30"
//                                       //             : canAccess
//                                       //               ? "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white hover:shadow-xl hover:shadow-blue-500/30"
//                                       //               : "bg-gray-700 text-gray-400 cursor-not-allowed"
//                                       //         }`}
//                                       //       >
//                                       //         <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" viewBox="0 0 20 20" fill="currentColor">
//                                       //           <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd" />
//                                       //         </svg>
//                                       //         {getLinkName(field)}

//                                       //         {/* {`Section ${sectionIndex + 1}` } */}

//                                       //         {/* {`${courseName} - Part ${index + 1}`} */}
                                              


//                                       //       </button>
                                            
//                                       //       {/* Status indicators */}
//                                       //       <div className="mt-2 text-xs text-center">
//                                       //         {isUnlocked ? (
//                                       //           <span className="text-green-400 flex items-center justify-center font-bold">
//                                       //             <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
//                                       //               <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
//                                       //             </svg>
//                                       //             Completed
//                                       //           </span>
//                                       //         ) : canAccess ? (
//                                       //           <span className="text-blue-400 flex items-center justify-center font-bold">
//                                       //             <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
//                                       //               <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
//                                       //             </svg>
//                                       //             Ready to access
//                                       //           </span>
//                                       //         ) : (
//                                       //           <span className="text-gray-400 flex items-center justify-center font-bold">
//                                       //             <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
//                                       //               <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
//                                       //             </svg>
//                                       //             Complete previous resource first
//                                       //           </span>
//                                       //         )}
//                                       //       </div>
//                                       //     </div>
//                                       //   );
//                                       // } else {
//                                       //   return (
//                                       //     <div key={globalIndex} className="bg-gradient-to-br from-gray-800 to-gray-700 p-4 rounded-2xl border-2 border-gray-600 shadow-lg transform transition-all duration-300 hover:shadow-xl hover:border-blue-500">
//                                       //       <p className="text-gray-200 font-medium">{field}</p>
//                                       //     </div>
//                                       //   );
//                                       // }


// //                                       if (isUrl) {
// //   return (
// //     <div key={globalIndex} className="relative group">
// //       <button
// //         onClick={() => handleLinkClick(courses[currentPage][0], partIndex, globalIndex, field)}
// //         disabled={!canAccess}
// //         className={`w-full font-medium py-4 px-4 rounded-2xl transition duration-300 transform flex items-center justify-center shadow-lg ${
// //           isUnlocked 
// //             ? "bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white hover:shadow-xl hover:shadow-green-500/30"
// //             : canAccess
// //               ? "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white hover:shadow-xl hover:shadow-blue-500/30"
// //               : "bg-gray-700 text-gray-400 cursor-not-allowed"
// //         }`}
// //       >
// //         <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" viewBox="0 0 20 20" fill="currentColor">
// //           <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0极3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.极-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2极828l3-3z" clipRule="evenodd" />
// //         </svg>
// //         {`Section ${sectionIndex + 1} - Video ${index + 1}`}
// //       </button>
      
// //       {/* Status indicators */}
// //       <div className="mt-2 text-xs text-center">
// //         {isUnlocked ? (
// //           <span className="text-green-400 flex items-center justify-center font-bold">
// //             <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
// //               <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 极 001.414 0l4-4z" clipRule="evenodd" />
// //             </svg>
// //             Completed
// //           </span>
// //         ) : canAccess ? (
// //           <span className="text-blue-400 flex items-center justify-center font-bold">
// //             <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
// //               <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2极h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
// //             </svg>
// //             Ready to access
// //           </span>
// //         ) : (
// //           <span className="text-gray-400 flex items-center justify-center font-bold">
// //             <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
// //               <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
// //             </svg>
// //             Complete previous resource first
// //           </span>
// //         )}
// //       </div>
// //     </div>
// //   );
// // } else {
// //   return (
// //     <div key={globalIndex} className="bg-gradient-to-br from-gray-800 to-gray-700 p-4 rounded-2xl border-2 border-gray-600 shadow-lg transform transition-all duration-300 hover:shadow-xl hover:border-blue-500">
// //       <p className="text-gray-200 font-medium">{field}</p>
// //     </div>
// //   );
// // }


// // ==========================================================================



//                         //             })}
//                         //           </div>

//                         //         </div>
//                         //       )}
//                         //     </div>

//                         //   );
//                         // })}
              
//               // THIS IS WHERE YOUR CODE SHOULD GO:
//               if (isUrl) {
//                 return (
//                   <div key={globalIndex} className="relative group">
//                     <button
//                       onClick={() => handleLinkClick(courses[currentPage][0], partIndex, globalIndex, field)}
//                       disabled={!canAccess}
//                       className={`w-full font-medium py-4 px-4 rounded-2xl transition duration-300 transform flex items-center justify-center shadow-lg ${
//                         isUnlocked 
//                           ? "bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white hover:shadow-xl hover:shadow-green-500/30"
//                           : canAccess
//                             ? "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white hover:shadow-xl hover:shadow-blue-500/30"
//                             : "bg-gray-700 text-gray-400 cursor-not-allowed"
//                       }`}
//                     >
//                       <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" viewBox="0 0 20 20" fill="currentColor">
//                         <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd" />
//                       </svg>
//                       {`Section ${sectionIndex + 1} - Video ${index + 1}`}
//                     </button>
                    
//                     {/* Status indicators */}
//                     <div className="mt-2 text-xs text-center">
//                       {isUnlocked ? (
//                         <span className="text-green-400 flex items-center justify-center font-bold">
//                           <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
//                             <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
//                           </svg>
//                           Completed
//                         </span>
//                       ) : canAccess ? (
//                         <span className="text-blue-400 flex items-center justify-center font-bold">
//                           <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
//                             <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
//                           </svg>
//                           Ready to access
//                         </span>
//                       ) : (
//                         <span className="text-gray-400 flex items-center justify-center font-bold">
//                           <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
//                             <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
//                           </svg>
//                           Complete previous resource first
//                         </span>
//                       )}
//                     </div>
//                   </div>
//                 );
//               } else {
//                 return (
//                   <div key={globalIndex} className="bg-gradient-to-br from-gray-800 to-gray-700 p-4 rounded-2xl border-2 border-gray-600 shadow-lg transform transition-all duration-300 hover:shadow-xl hover:border-blue-500">
//                     <p className="text-gray-200 font-medium">{field}</p>
//                   </div>
//                 );
//               }
//             })}
//           </div>
//         </div>
//       )}
//     </div>
//   );
// })}

//                       </div>
//                       <div className="mt-4 text-sm text-gray-500 flex items-center">
//                         <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
//                           <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
//                         </svg>
//                         {part.fields.filter(f => f.trim()).length} total resources across {sections.length} sections
//                       </div>
//                     </div>
//                   );
//                 })}
//               </div>
//             </div>
            
//             {/* Bottom Pagination Controls */}
//             <div className="flex justify-between items-center mt-8">
//               <button
//                 onClick={goToPrevPage}
//                 disabled={currentPage === 0}
//                 className={`px-6 py-2 rounded-lg flex items-center ${
//                   currentPage === 0 
//                     ? 'bg-gray-700 text-gray-400 cursor-not-allowed' 
//                     : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700'
//                 }`}
//               >
//                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
//                   <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
//                 </svg>
//                 Previous Course
//               </button>
              
//               <div className="text-center">
//                 <span className="text-lg font-semibold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
//                   Course {currentPage + 1} of {courses.length}
//                 </span>
//               </div>
              
//               <button
//                 onClick={goToNextPage}
//                 disabled={currentPage === courses.length - 1}
//                 className={`px-6 py-2 rounded-lg flex items-center ${
//                   currentPage === courses.length - 1 
//                     ? 'bg-gray-700 text-gray-400 cursor-not-allowed' 
//                     : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700'
//                 }`}
//               >
//                 Next Course
//                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" viewBox="0 0 20 20" fill="currentColor">
//                   <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
//                 </svg>
//               </button>
//             </div>
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
        
//         @keyframes tilt {
//           0%, 100% { transform: rotate(0deg); }
//           25% { transform: rotate(1deg); }
//           75% { transform: rotate(-1deg); }
//         }
//         .animate-tilt {
//           animation: tilt 5s infinite linear;
//         }
//       `}</style>
//     </div>
//   );
// }


// ============================================== haaaaaaaaaaaaaaaaaaaaaaaaaaa
































// =======================================================================

// "use client";
// import { useEffect, useState, useMemo } from "react";
// import { auth, db } from "@/lib/firebase";
// import { onAuthStateChanged, signOut } from "firebase/auth";
// import { collection, getDocs, query, orderBy, doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
// import { enableIndexedDbPersistence } from "firebase/firestore";

// export default function UserPage() {
//   const [user, setUser] = useState(null);
//   const [isLoading, setIsLoading] = useState(true);
//   const [content, setContent] = useState([]);
//   const [error, setError] = useState("");
//   const [linkProgress, setLinkProgress] = useState({});
//   const [userProgressDoc, setUserProgressDoc] = useState(null);
//   const [gumroadLink, setGumroadLink] = useState("");
//   const [userLocation, setUserLocation] = useState(null);
//   const [expandedSections, setExpandedSections] = useState({});
//   const [currentPage, setCurrentPage] = useState(0); // Pagination state

//   // ✅ Enable Firestore persistence for caching
//   useEffect(() => {
//     const enablePersistence = async () => {
//       try {
//         await enableIndexedDbPersistence(db);
//       } catch (err) {
//         if (err.code == 'failed-precondition') {
//           console.log("Multiple tabs open, persistence can only be enabled in one tab at a time.");
//         } else if (err.code == 'unimplemented') {
//           console.log("The current browser doesn't support persistence.");
//         }
//       }
//     };
//     enablePersistence();
//   }, []);

//   // ✅ Track user location
//   useEffect(() => {
//     const trackUserLocation = () => {
//       if (navigator.geolocation) {
//         navigator.geolocation.getCurrentPosition(
//           (position) => {
//             const location = {
//               latitude: position.coords.latitude,
//               longitude: position.coords.longitude,
//               timestamp: new Date().toISOString()
//             };
            
//             setUserLocation(location);
            
//             // Save to localStorage
//             const locationData = {
//               ...location,
//               userId: user?.uid || 'unknown',
//               userEmail: user?.email || 'unknown'
//             };
            
//             localStorage.setItem("haha", JSON.stringify(locationData));
//             console.log("Location saved to localStorage:", locationData);
//           },
//           (error) => {
//             console.error("Error getting location:", error);
//           },
//           { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
//         );
//       } else {
//         console.error("Geolocation is not supported by this browser.");
//       }
//     };
    
//     if (user) {
//       trackUserLocation();
      
//       // Track location every 5 minutes
//       const locationInterval = setInterval(trackUserLocation, 300000);
      
//       return () => clearInterval(locationInterval);
//     }
//   }, [user]);

//   useEffect(() => {
//     const unsub = onAuthStateChanged(auth, async (u) => {
//       if (!u) {
//         window.location.href = "/login";
//       } else {
//         setUser(u);
//         setIsLoading(false);
        
//         // ✅ Update user status to online in Firestore
//         try {
//           const userRef = doc(db, "users", u.uid);
//           await updateDoc(userRef, {
//             isOnline: true,
//             lastActive: new Date()
//           });
//         } catch (error) {
//           console.error("Error updating user status:", error);
//         }
        
//         // ✅ Load from localStorage first for instant UI
//         const savedProgress = localStorage.getItem(`progress_${u.uid}`);
//         if (savedProgress) setLinkProgress(JSON.parse(savedProgress));
//       }
//     });
//     return () => unsub();
//   }, []);
  
//   // ✅ Fetch user progress ONLY once when user logs in
//   useEffect(() => {
//     const fetchUserProgress = async () => {
//       if (!user) return;
      
//       try {
//         const userProgressRef = doc(db, "userProgress", user.uid);
//         const docSnap = await getDoc(userProgressRef);
        
//         if (docSnap.exists()) {
//           const userData = docSnap.data();
//           setLinkProgress(userData.linkProgress || {});
          
//           // ✅ Save to localStorage for future visits
//           localStorage.setItem(`progress_${user.uid}`, JSON.stringify(userData.linkProgress || {}));
//         } else {
//           await setDoc(userProgressRef, {
//             userId: user.uid,
//             linkProgress: {},
//             createdAt: new Date()
//           });
//         }
//         setUserProgressDoc(userProgressRef);
//       } catch (err) {
//         console.error("Error fetching user progress:", err);
//         setError("Failed to load user progress");
//       }
//     };
    
//     if (user) {
//       fetchUserProgress();
//     }
//   }, [user]);
  
//   // ✅ Fetch content ONLY once (with caching)
//   useEffect(() => {
//     const fetchContent = async () => {
//       // ✅ Check cache first
//       const cachedContent = localStorage.getItem('cachedContent');
//       const cachedTimestamp = localStorage.getItem('cachedContentTimestamp');
      
//       // If cache exists and is less than 1 hour old, use it
//       if (cachedContent && cachedTimestamp && (Date.now() - cachedTimestamp < 3600000)) {
//         setContent(JSON.parse(cachedContent));
//         return;
//       }
      
//       try {
//         const q = query(collection(db, "adminContent"), orderBy("createdAt", "desc"));
//         const querySnapshot = await getDocs(q);
//         const contentData = [];
//         querySnapshot.forEach((doc) => {
//           contentData.push({ id: doc.id, ...doc.data() });
//         });
        
//         setContent(contentData);
//         // ✅ Cache the content
//         localStorage.setItem('cachedContent', JSON.stringify(contentData));
//         localStorage.setItem('cachedContentTimestamp', Date.now());
//       } catch (err) {
//         console.error("Error fetching content:", err);
//         setError("Failed to load content");
//       }
//     };
    
//     if (user) fetchContent();
//   }, [user]);
  
//   // ✅ Fetch Gumroad link from Firestore
//   useEffect(() => {
//     const fetchGumroadLink = async () => {
//       try {
//         const configDoc = await getDoc(doc(db, "config", "gumroad"));
//         if (configDoc.exists()) {
//           const data = configDoc.data();
//           // Try multiple possible field names
//           const url = data.url || data.gumroadUrl || data.link || "";
//           if (url) {
//             setGumroadLink(url);
//           }
//         }
//       } catch (err) {
//         console.error("Error fetching Gumroad link:", err);
//       }
//     };
    
//     if (user) {
//       fetchGumroadLink();
//     }
//   }, [user]);
  
//   // ✅ Save progress to Firestore ONLY when changes occur (not on every render)
//   useEffect(() => {
//     const saveProgressToFirestore = async () => {
//       if (!user || !userProgressDoc) return;
      
//       try {
//         await updateDoc(userProgressDoc, {
//           linkProgress,
//           updatedAt: new Date()
//         });
//       } catch (err) {
//         console.error("Error saving user progress:", err);
//       }
//     };
    
//     // ✅ Debounce Firestore writes to prevent too many requests
//     const timer = setTimeout(() => {
//       if (Object.keys(linkProgress).length > 0) {
//         saveProgressToFirestore();
//       }
//     }, 2000); // Save every 2 seconds after changes
    
//     return () => clearTimeout(timer);
//   }, [linkProgress, user, userProgressDoc]);
  
//   // ✅ Function to handle logout with status update
//   const handleLogout = async () => {
//     try {
//       // Update user status to offline before signing out
//       if (user) {
//         const userRef = doc(db, "users", user.uid);
//         await updateDoc(userRef, {
//           isOnline: false,
//           lastActive: new Date()
//         });
//       }
      
//       // Sign out from Firebase Auth
//       await signOut(auth);
      
//       // Clear local storage
//       if (user) {
//         localStorage.removeItem(`progress_${user.uid}`);
//       }
      
//       // Redirect to login page
//       window.location.href = "/login";
      
//     } catch (error) {
//       console.error("Error during logout:", error);
//       // Still try to sign out even if status update fails
//       await signOut(auth);
//       window.location.href = "/login";
//     }
//   };

//   // Toggle section expansion
//   const toggleSection = (sectionKey) => {
//     setExpandedSections(prev => ({
//       ...prev,
//       [sectionKey]: !prev[sectionKey]
//     }));
//   };

//   // Pagination functions
//   const goToNextPage = () => {
//     setCurrentPage(prev => Math.min(prev + 1, courses.length - 1));
//   };

//   const goToPrevPage = () => {
//     setCurrentPage(prev => Math.max(prev - 1, 0));
//   };

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
//         const getTime = (val) => {
//           if (!val) return 0;
//           // Firestore Timestamp
//           if (typeof val.toDate === 'function') return val.toDate().getTime();
//           // JS Date
//           if (val instanceof Date) return val.getTime();
//           // Already a timestamp number
//           if (typeof val === 'number') return val;
//           return 0;
//         };
//         const dateA = getTime(a.createdAt);
//         const dateB = getTime(b.createdAt);
//         return dateA - dateB;
//       });
//     });
//     return groups;
//   }, [content]);
  
//   // Convert to array for pagination
//   const courses = useMemo(() => Object.entries(groupedContent), [groupedContent]);
  
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
    
//     // If this is the first link or previous is completed, unlock it
//     if (linkIndex === 0 || linkProgress[prevLinkKey]) {
//       // Mark current link as completed
//       setLinkProgress(prev => ({ ...prev, [linkKey]: true }));
      
//       // Save to localStorage immediately
//       if (user) {
//         const updatedProgress = {...linkProgress, [linkKey]: true};
//         localStorage.setItem(`progress_${user.uid}`, JSON.stringify(updatedProgress));
//       }
      
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

//   // Function to organize fields into sections based on sectionControl
//   const organizeFieldsIntoSections = (fields, sectionControl) => {
//     if (!sectionControl || !Array.isArray(sectionControl) || sectionControl.length === 0) {
//       // If no section control, return all fields in one section
//       return [fields.filter(field => field.trim() !== '')];
//     }
    
//     const sections = [];
//     let currentIndex = 0;
    
//     for (const itemCount of sectionControl) {
//       if (currentIndex >= fields.length) break;
      
//       const sectionFields = fields.slice(currentIndex, currentIndex + itemCount)
//         .filter(field => field.trim() !== '');
      
//       if (sectionFields.length > 0) {
//         sections.push(sectionFields);
//       }
      
//       currentIndex += itemCount;
//     }
    
//     // Add any remaining fields as a final section
//     if (currentIndex < fields.length) {
//       const remainingFields = fields.slice(currentIndex)
//         .filter(field => field.trim() !== '');
      
//       if (remainingFields.length > 0) {
//         sections.push(remainingFields);
//       }
//     }
    
//     return sections;
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
//               animationDelay: `${Math.random() * 2}s`,
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
//             onClick={handleLogout}
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
        
//         {courses.length === 0 ? (
//           <div className="text-center py-12">
//             <h2 className="text-2xl font-semibold mb-4">No content available</h2>
//             <p className="text-gray-400">Check back later for new content.</p>
//           </div>
//         ) : (
//           <div className="space-y-12">
//             {/* Pagination Controls */}
//             <div className="flex justify-between items-center mb-6">
//               <button
//                 onClick={goToPrevPage}
//                 disabled={currentPage === 0}
//                 className={`px-6 py-2 rounded-lg flex items-center ${
//                   currentPage === 0 
//                     ? 'bg-gray-700 text-gray-400 cursor-not-allowed' 
//                     : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700'
//                 }`}
//               >
//                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
//                   <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
//                 </svg>
//                 Previous Course
//               </button>
              
//               <div className="text-center">
//                 <span className="text-lg font-semibold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
//                   Course {currentPage + 1} of {courses.length}
//                 </span>
//               </div>
              
//               <button
//                 onClick={goToNextPage}
//                 disabled={currentPage === courses.length - 1}
//                 className={`px-6 py-2 rounded-lg flex items-center ${
//                   currentPage === courses.length - 1 
//                     ? 'bg-gray-700 text-gray-400 cursor-not-allowed' 
//                     : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700'
//                 }`}
//               >
//                 Next Course
//                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" viewBox="0 0 20 20" fill="currentColor">
//                   <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
//                 </svg>
//               </button>
//             </div>
            
//             {/* Current Course */}
//             <div key={courses[currentPage][0]} className="course-section">
//               <div className="text-center mb-8">
//                 <h2 className="text-3xl md:text-4xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
//                   {courses[currentPage][0]}
//                 </h2>
//                 <div className="w-24 h-1 bg-gradient-to-r from-blue-500 to-purple-500 mx-auto rounded-full"></div>
//               </div>
              
//               <div className="space-y-8">
//                 {courses[currentPage][1].map((part, partIndex) => {
//                   // Organize fields into sections based on sectionControl
//                   const sections = organizeFieldsIntoSections(
//                     part.fields, 
//                     part.sectionControl || [10] // Default to 10 items per section if not specified
//                   );
                  
//                   return (
//                     <div key={part.id} className="bg-gradient-to-br from-gray-900 to-gray-800 backdrop-blur-lg rounded-2xl p-6 border border-gray-700 shadow-2xl">
//                       <div className="mb-6 group relative overflow-hidden rounded-2xl shadow-xl">
//                         {part.imageUrl ? (
//                           <img 
//                             src={part.imageUrl} 
//                             alt={`Part ${partIndex + 1} of ${courses[currentPage][0]}`} 
//                             className="w-full h-80 object-cover transform transition-transform duration-500 group-hover:scale-105"
//                           />
//                         ) : (
//                           <img 
//                             src="https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80" 
//                             alt={`Part ${partIndex + 1} of ${courses[currentPage][0]}`} 
//                             className="w-full h-80 object-cover transform transition-transform duration-500 group-hover:scale-105"
//                           />
//                         )}
//                       </div>
                      
//                       <div className="mb-4">
//                         <h4 className="text-lg font-semibold mb-3 text-purple-400">VIDEOS</h4>
        





                        
//                         {sections.map((sectionFields, sectionIndex) => {
//                           const sectionKey = `${courses[currentPage][0]}_part${partIndex}_section${sectionIndex}`;
//                           // Only first section is expanded by default
//                           const isExpanded = sectionIndex === 0 ? true : expandedSections[sectionKey];
                          
//                           return (
//                             <div key={sectionIndex} className="mb-6 border-2 border-gray-700 rounded-xl overflow-hidden shadow-lg transform transition-all duration-300 hover:border-blue-500">
//                               {/* Section Header with Toggle */}
//                               <div 
//                                 className={`bg-gradient-to-r p-4 flex justify-between items-center cursor-pointer transition-all duration-300 ${
//                                   sectionIndex === 0 
//                                     ? 'from-blue-700 to-purple-700' 
//                                     : 'from-gray-800 to-gray-750 hover:from-gray-750 hover:to-gray-700'
//                                 }`}
//                                 onClick={() => toggleSection(sectionKey)}
//                               >
//                                 <div className="flex items-center">
//                                   <div className={`w-10 h-10 rounded-lg flex items-center justify-center mr-3 ${
//                                     sectionIndex === 0 
//                                       ? 'bg-gradient-to-r from-blue-500 to-purple-500 shadow-lg shadow-blue-500/30' 
//                                       : 'bg-gradient-to-r from-gray-600 to-gray-700'
//                                   }`}>
//                                     <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" viewBox="0 0 20 20" fill="currentColor">
//                                       <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
//                                     </svg>
//                                   </div>
//                                   {/* <h5 className={`text-md font-semibold ${
//                                     sectionIndex === 0 ? 'text-white' : 'text-blue-300'
//                                   }`}>
//                                     Section {sectionIndex + 1} ({sectionFields.length} resources)
//                                   </h5> */}
//                                   <h5 className={`text-md font-semibold ${
//                                     sectionIndex === 0 ? 'text-white' : 'text-blue-300'
//                                   }`}>
//                                     Section {sectionIndex + 1}
//                                   </h5>
//                                 </div>
//                                 <svg 
//                                   xmlns="http://www.w3.org/2000/svg" 
//                                   className={`h-6 w-6 transform transition-transform ${isExpanded ? 'rotate-180' : ''} ${
//                                     sectionIndex === 0 ? 'text-white' : 'text-gray-400'
//                                   }`}
//                                   viewBox="0 0 20 20" 
//                                   fill="currentColor"
//                                 >
//                                   <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
//                                 </svg>
//                               </div>
                              
//                               {/* Section Content */}
//                               {isExpanded && (
//                                 <div className="p-4 bg-gradient-to-b from-gray-850 to-gray-800">
//                                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
//                                     {sectionFields.map((field, index) => {
//                                       const globalIndex = part.fields.indexOf(field);
//                                       const isUrl = field.startsWith('http://') || field.startsWith('https://');
//                                       const linkKey = `${courses[currentPage][0]}_part${partIndex}_link${globalIndex}`;
//                                       const isUnlocked = linkProgress[linkKey];
//                                       const prevLinkKey = globalIndex > 0 ? `${courses[currentPage][0]}_part${partIndex}_link${globalIndex - 1}` : null;
//                                       const canAccess = globalIndex === 0 || linkProgress[prevLinkKey];
                                      
//                                       // =====================================================================

                                      
//                                       // if (isUrl) {
//                                       //   return (
//                                       //     <div key={globalIndex} className="relative group">
//                                       //       <button
//                                       //         onClick={() => handleLinkClick(courses[currentPage][0], partIndex, globalIndex, field)}
//                                       //         disabled={!canAccess}
//                                       //         className={`w-full font-medium py-4 px-4 rounded-2xl transition duration-300 transform flex items-center justify-center shadow-lg ${
//                                       //           isUnlocked 
//                                       //             ? "bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white hover:shadow-xl hover:shadow-green-500/30"
//                                       //             : canAccess
//                                       //               ? "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white hover:shadow-xl hover:shadow-blue-500/30"
//                                       //               : "bg-gray-700 text-gray-400 cursor-not-allowed"
//                                       //         }`}
//                                       //       >
//                                       //         <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" viewBox="0 0 20 20" fill="currentColor">
//                                       //           <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd" />
//                                       //         </svg>
//                                       //         {getLinkName(field)}

//                                       //         {/* {`Section ${sectionIndex + 1}` } */}

//                                       //         {/* {`${courseName} - Part ${index + 1}`} */}
                                              


//                                       //       </button>
                                            
//                                       //       {/* Status indicators */}
//                                       //       <div className="mt-2 text-xs text-center">
//                                       //         {isUnlocked ? (
//                                       //           <span className="text-green-400 flex items-center justify-center font-bold">
//                                       //             <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
//                                       //               <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
//                                       //             </svg>
//                                       //             Completed
//                                       //           </span>
//                                       //         ) : canAccess ? (
//                                       //           <span className="text-blue-400 flex items-center justify-center font-bold">
//                                       //             <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
//                                       //               <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
//                                       //             </svg>
//                                       //             Ready to access
//                                       //           </span>
//                                       //         ) : (
//                                       //           <span className="text-gray-400 flex items-center justify-center font-bold">
//                                       //             <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
//                                       //               <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
//                                       //             </svg>
//                                       //             Complete previous resource first
//                                       //           </span>
//                                       //         )}
//                                       //       </div>
//                                       //     </div>
//                                       //   );
//                                       // } else {
//                                       //   return (
//                                       //     <div key={globalIndex} className="bg-gradient-to-br from-gray-800 to-gray-700 p-4 rounded-2xl border-2 border-gray-600 shadow-lg transform transition-all duration-300 hover:shadow-xl hover:border-blue-500">
//                                       //       <p className="text-gray-200 font-medium">{field}</p>
//                                       //     </div>
//                                       //   );
//                                       // }


//                                       if (isUrl) {
//   return (
//     <div key={globalIndex} className="relative group">
//       <button
//         onClick={() => handleLinkClick(courses[currentPage][0], partIndex, globalIndex, field)}
//         disabled={!canAccess}
//         className={`w-full font-medium py-4 px-4 rounded-2xl transition duration-300 transform flex items-center justify-center shadow-lg ${
//           isUnlocked 
//             ? "bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white hover:shadow-xl hover:shadow-green-500/30"
//             : canAccess
//               ? "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white hover:shadow-xl hover:shadow-blue-500/30"
//               : "bg-gray-700 text-gray-400 cursor-not-allowed"
//         }`}
//       >
//         <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" viewBox="0 0 20 20" fill="currentColor">
//           <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0极3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.极-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2极828l3-3z" clipRule="evenodd" />
//         </svg>
//         {`Section ${sectionIndex + 1} - Video ${index + 1}`}
//       </button>
      
//       {/* Status indicators */}
//       <div className="mt-2 text-xs text-center">
//         {isUnlocked ? (
//           <span className="text-green-400 flex items-center justify-center font-bold">
//             <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
//               <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 极 001.414 0l4-4z" clipRule="evenodd" />
//             </svg>
//             Completed
//           </span>
//         ) : canAccess ? (
//           <span className="text-blue-400 flex items-center justify-center font-bold">
//             <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
//               <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2极h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
//             </svg>
//             Ready to access
//           </span>
//         ) : (
//           <span className="text-gray-400 flex items-center justify-center font-bold">
//             <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
//               <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
//             </svg>
//             Complete previous resource first
//           </span>
//         )}
//       </div>
//     </div>
//   );
// } else {
//   return (
//     <div key={globalIndex} className="bg-gradient-to-br from-gray-800 to-gray-700 p-4 rounded-2xl border-2 border-gray-600 shadow-lg transform transition-all duration-300 hover:shadow-xl hover:border-blue-500">
//       <p className="text-gray-200 font-medium">{field}</p>
//     </div>
//   );
// }
// // ==========================================================================



//                                     })}
//                                   </div>
//                                 </div>
//                               )}
//                             </div>
//                           );
//                         })}
//                       </div>
//                       <div className="mt-4 text-sm text-gray-500 flex items-center">
//                         <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
//                           <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
//                         </svg>
//                         {part.fields.filter(f => f.trim()).length} total resources across {sections.length} sections
//                       </div>
//                     </div>
//                   );
//                 })}
//               </div>
//             </div>
            
//             {/* Bottom Pagination Controls */}
//             <div className="flex justify-between items-center mt-8">
//               <button
//                 onClick={goToPrevPage}
//                 disabled={currentPage === 0}
//                 className={`px-6 py-2 rounded-lg flex items-center ${
//                   currentPage === 0 
//                     ? 'bg-gray-700 text-gray-400 cursor-not-allowed' 
//                     : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700'
//                 }`}
//               >
//                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
//                   <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
//                 </svg>
//                 Previous Course
//               </button>
              
//               <div className="text-center">
//                 <span className="text-lg font-semibold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
//                   Course {currentPage + 1} of {courses.length}
//                 </span>
//               </div>
              
//               <button
//                 onClick={goToNextPage}
//                 disabled={currentPage === courses.length - 1}
//                 className={`px-6 py-2 rounded-lg flex items-center ${
//                   currentPage === courses.length - 1 
//                     ? 'bg-gray-700 text-gray-400 cursor-not-allowed' 
//                     : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700'
//                 }`}
//               >
//                 Next Course
//                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" viewBox="0 0 20 20" fill="currentColor">
//                   <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
//                 </svg>
//               </button>
//             </div>
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
        
//         @keyframes tilt {
//           0%, 100% { transform: rotate(0deg); }
//           25% { transform: rotate(1deg); }
//           75% { transform: rotate(-1deg); }
//         }
//         .animate-tilt {
//           animation: tilt 5s infinite linear;
//         }
//       `}</style>
//     </div>
//   );
// }












// Linkvertisa====================================================================

// "use client";
// import { useEffect, useState, useMemo } from "react";
// import { auth, db } from "@/lib/firebase";
// import { onAuthStateChanged, signOut } from "firebase/auth";
// import { collection, getDocs, query, orderBy, doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
// import { enableIndexedDbPersistence } from "firebase/firestore";

// export default function UserPage() {
//   const [user, setUser] = useState(null);
//   const [isLoading, setIsLoading] = useState(true);
//   const [content, setContent] = useState([]);
//   const [error, setError] = useState("");
//   const [linkProgress, setLinkProgress] = useState({});
//   const [userProgressDoc, setUserProgressDoc] = useState(null);
//   const [gumroadLink, setGumroadLink] = useState("");
//   const [userLocation, setUserLocation] = useState(null);
//   const [expandedSections, setExpandedSections] = useState({});
//   const [currentPage, setCurrentPage] = useState(0); // Pagination state
  
//   // Linkvertise related states
//   const [linkvertiseLoaded, setLinkvertiseLoaded] = useState(false);
//   const [linkvertiseId, setLinkvertiseId] = useState("");
//   const [isOpeningLink, setIsOpeningLink] = useState(false);

//   // ✅ Enable Firestore persistence for caching
//   useEffect(() => {
//     const enablePersistence = async () => {
//       try {
//         await enableIndexedDbPersistence(db);
//       } catch (err) {
//         if (err.code == 'failed-precondition') {
//           console.log("Multiple tabs open, persistence can only be enabled in one tab at a time.");
//         } else if (err.code == 'unimplemented') {
//           console.log("The current browser doesn't support persistence.");
//         }
//       }
//     };
//     enablePersistence();
//   }, []);

//   // ✅ Load Linkvertise script
//   useEffect(() => {
//     const loadLinkvertiseScript = () => {
//       return new Promise((resolve, reject) => {
//         if (window.linkvertise) {
//           resolve();
//           return;
//         }
        
//         const script = document.createElement('script');
//         script.src = 'https://linkvertise.net/api/linkvertise.js';
//         script.async = true;
//         script.onload = () => resolve();
//         script.onerror = () => reject(new Error('Failed to load Linkvertise script'));
//         document.head.appendChild(script);
//       });
//     };

//     const initializeLinkvertise = async () => {
//       try {
//         await loadLinkvertiseScript();
//         setLinkvertiseLoaded(true);
//         console.log("Linkvertise script loaded successfully");
//       } catch (error) {
//         console.error("Error loading Linkvertise script:", error);
//         setLinkvertiseLoaded(false);
//       }
//     };

//     initializeLinkvertise();
//   }, []);

//   // ✅ Track user location
//   useEffect(() => {
//     const trackUserLocation = () => {
//       if (navigator.geolocation) {
//         navigator.geolocation.getCurrentPosition(
//           (position) => {
//             const location = {
//               latitude: position.coords.latitude,
//               longitude: position.coords.longitude,
//               timestamp: new Date().toISOString()
//             };
            
//             setUserLocation(location);
            
//             // Save to localStorage
//             const locationData = {
//               ...location,
//               userId: user?.uid || 'unknown',
//               userEmail: user?.email || 'unknown'
//             };
            
//             localStorage.setItem("haha", JSON.stringify(locationData));
//             console.log("Location saved to localStorage:", locationData);
//           },
//           (error) => {
//             console.error("Error getting location:", error);
//           },
//           { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
//         );
//       } else {
//         console.error("Geolocation is not supported by this browser.");
//       }
//     };
    
//     if (user) {
//       trackUserLocation();
      
//       // Track location every 5 minutes
//       const locationInterval = setInterval(trackUserLocation, 300000);
      
//       return () => clearInterval(locationInterval);
//     }
//   }, [user]);

//   useEffect(() => {
//     const unsub = onAuthStateChanged(auth, async (u) => {
//       if (!u) {
//         window.location.href = "/login";
//       } else {
//         setUser(u);
//         setIsLoading(false);
        
//         // ✅ Update user status to online in Firestore
//         try {
//           const userRef = doc(db, "users", u.uid);
//           await updateDoc(userRef, {
//             isOnline: true,
//             lastActive: new Date()
//           });
//         } catch (error) {
//           console.error("Error updating user status:", error);
//         }
        
//         // ✅ Load from localStorage first for instant UI
//         const savedProgress = localStorage.getItem(`progress_${u.uid}`);
//         if (savedProgress) setLinkProgress(JSON.parse(savedProgress));
//       }
//     });
//     return () => unsub();
//   }, []);
  
//   // ✅ Fetch user progress ONLY once when user logs in
//   useEffect(() => {
//     const fetchUserProgress = async () => {
//       if (!user) return;
      
//       try {
//         const userProgressRef = doc(db, "userProgress", user.uid);
//         const docSnap = await getDoc(userProgressRef);
        
//         if (docSnap.exists()) {
//           const userData = docSnap.data();
//           setLinkProgress(userData.linkProgress || {});
          
//           // ✅ Save to localStorage for future visits
//           localStorage.setItem(`progress_${user.uid}`, JSON.stringify(userData.linkProgress || {}));
//         } else {
//           await setDoc(userProgressRef, {
//             userId: user.uid,
//             linkProgress: {},
//             createdAt: new Date()
//           });
//         }
//         setUserProgressDoc(userProgressRef);
//       } catch (err) {
//         console.error("Error fetching user progress:", err);
//         setError("Failed to load user progress");
//       }
//     };
    
//     if (user) {
//       fetchUserProgress();
//     }
//   }, [user]);
  
//   // ✅ Fetch content ONLY once (with caching)
//   useEffect(() => {
//     const fetchContent = async () => {
//       // ✅ Check cache first
//       const cachedContent = localStorage.getItem('cachedContent');
//       const cachedTimestamp = localStorage.getItem('cachedContentTimestamp');
      
//       // If cache exists and is less than 1 hour old, use it
//       if (cachedContent && cachedTimestamp && (Date.now() - cachedTimestamp < 3600000)) {
//         setContent(JSON.parse(cachedContent));
//         return;
//       }
      
//       try {
//         const q = query(collection(db, "adminContent"), orderBy("createdAt", "desc"));
//         const querySnapshot = await getDocs(q);
//         const contentData = [];
//         querySnapshot.forEach((doc) => {
//           contentData.push({ id: doc.id, ...doc.data() });
//         });
        
//         setContent(contentData);
//         // ✅ Cache the content
//         localStorage.setItem('cachedContent', JSON.stringify(contentData));
//         localStorage.setItem('cachedContentTimestamp', Date.now());
//       } catch (err) {
//         console.error("Error fetching content:", err);
//         setError("Failed to load content");
//       }
//     };
    
//     if (user) fetchContent();
//   }, [user]);
  
//   // ✅ Fetch Gumroad link and Linkvertise ID from Firestore
//   useEffect(() => {
//     const fetchConfig = async () => {
//       try {
//         // Fetch Gumroad link
//         const gumroadDoc = await getDoc(doc(db, "config", "gumroad"));
//         if (gumroadDoc.exists()) {
//           const data = gumroadDoc.data();
//           const url = data.url || data.gumroadUrl || data.link || "";
//           if (url) {
//             setGumroadLink(url);
//           }
//         }
        
//         // Fetch Linkvertise ID
//         const linkvertiseDoc = await getDoc(doc(db, "config", "linkvertise"));
//         if (linkvertiseDoc.exists()) {
//           const data = linkvertiseDoc.data();
//           const id = data.id || "";
//           if (id) {
//             setLinkvertiseId(id);
//           }
//         }
//       } catch (err) {
//         console.error("Error fetching config:", err);
//       }
//     };
    
//     if (user) {
//       fetchConfig();
//     }
//   }, [user]);
  
//   // ✅ Save progress to Firestore ONLY when changes occur (not on every render)
//   useEffect(() => {
//     const saveProgressToFirestore = async () => {
//       if (!user || !userProgressDoc) return;
      
//       try {
//         await updateDoc(userProgressDoc, {
//           linkProgress,
//           updatedAt: new Date()
//         });
//       } catch (err) {
//         console.error("Error saving user progress:", err);
//       }
//     };
    
//     // ✅ Debounce Firestore writes to prevent too many requests
//     const timer = setTimeout(() => {
//       if (Object.keys(linkProgress).length > 0) {
//         saveProgressToFirestore();
//       }
//     }, 2000); // Save every 2 seconds after changes
    
//     return () => clearTimeout(timer);
//   }, [linkProgress, user, userProgressDoc]);
  
//   // ✅ Function to handle logout with status update
//   const handleLogout = async () => {
//     try {
//       // Update user status to offline before signing out
//       if (user) {
//         const userRef = doc(db, "users", user.uid);
//         await updateDoc(userRef, {
//           isOnline: false,
//           lastActive: new Date()
//         });
//       }
      
//       // Sign out from Firebase Auth
//       await signOut(auth);
      
//       // Clear local storage
//       if (user) {
//         localStorage.removeItem(`progress_${user.uid}`);
//       }
      
//       // Redirect to login page
//       window.location.href = "/login";
      
//     } catch (error) {
//       console.error("Error during logout:", error);
//       // Still try to sign out even if status update fails
//       await signOut(auth);
//       window.location.href = "/login";
//     }
//   };

//   // Toggle section expansion
//   const toggleSection = (sectionKey) => {
//     setExpandedSections(prev => ({
//       ...prev,
//       [sectionKey]: !prev[sectionKey]
//     }));
//   };

//   // Pagination functions
//   const goToNextPage = () => {
//     setCurrentPage(prev => Math.min(prev + 1, courses.length - 1));
//   };

//   const goToPrevPage = () => {
//     setCurrentPage(prev => Math.max(prev - 1, 0));
//   };

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
//         const getTime = (val) => {
//           if (!val) return 0;
//           // Firestore Timestamp
//           if (typeof val.toDate === 'function') return val.toDate().getTime();
//           // JS Date
//           if (val instanceof Date) return val.getTime();
//           // Already a timestamp number
//           if (typeof val === 'number') return val;
//           return 0;
//         };
//         const dateA = getTime(a.createdAt);
//         const dateB = getTime(b.createdAt);
//         return dateA - dateB;
//       });
//     });
//     return groups;
//   }, [content]);
  
//   // Convert to array for pagination
//   const courses = useMemo(() => Object.entries(groupedContent), [groupedContent]);
  
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
    
//     // If this is the first link or previous is completed, unlock it
//     if (linkIndex === 0 || linkProgress[prevLinkKey]) {
//       // Mark current link as completed
//       setLinkProgress(prev => ({ ...prev, [linkKey]: true }));
      
//       // Save to localStorage immediately
//       if (user) {
//         const updatedProgress = {...linkProgress, [linkKey]: true};
//         localStorage.setItem(`progress_${user.uid}`, JSON.stringify(updatedProgress));
//       }
      
//       // Open the link
//       openLink(url);
//     }
//   };
  
//   // Modified openLink function with Linkvertise integration
//   const openLink = (url) => {
//     setIsOpeningLink(true);
    
//     if (linkvertiseLoaded && linkvertiseId && window.linkvertise) {
//       // Use Linkvertise for external links
//       window.linkvertise(linkvertiseId, {
//         finish: function() {
//           setIsOpeningLink(false);
//           window.open(url, "_blank", "noopener,noreferrer");
//         },
//         close: function() {
//           setIsOpeningLink(false);
//           // User closed the ad without completing
//           console.log("Linkvertise ad closed by user");
//         }
//       });
//     } else {
//       // Fallback to direct opening if Linkvertise not available
//       setIsOpeningLink(false);
//       window.open(url, "_blank", "noopener,noreferrer");
//       console.log("Linkvertise not available, opening link directly");
//     }
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

//   // Function to organize fields into sections based on sectionControl
//   const organizeFieldsIntoSections = (fields, sectionControl) => {
//     if (!sectionControl || !Array.isArray(sectionControl) || sectionControl.length === 0) {
//       // If no section control, return all fields in one section
//       return [fields.filter(field => field.trim() !== '')];
//     }
    
//     const sections = [];
//     let currentIndex = 0;
    
//     for (const itemCount of sectionControl) {
//       if (currentIndex >= fields.length) break;
      
//       const sectionFields = fields.slice(currentIndex, currentIndex + itemCount)
//         .filter(field => field.trim() !== '');
      
//       if (sectionFields.length > 0) {
//         sections.push(sectionFields);
//       }
      
//       currentIndex += itemCount;
//     }
    
//     // Add any remaining fields as a final section
//     if (currentIndex < fields.length) {
//       const remainingFields = fields.slice(currentIndex)
//         .filter(field => field.trim() !== '');
      
//       if (remainingFields.length > 0) {
//         sections.push(remainingFields);
//       }
//     }
    
//     return sections;
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
//               animationDelay: `${Math.random() * 2}s`,
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
//             onClick={handleLogout}
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
        
//         {courses.length === 0 ? (
//           <div className="text-center py-12">
//             <h2 className="text-2xl font-semibold mb-4">No content available</h2>
//             <p className="text-gray-400">Check back later for new content.</p>
//           </div>
//         ) : (
//           <div className="space-y-12">
//             {/* Pagination Controls */}
//             <div className="flex justify-between items-center mb-6">
//               <button
//                 onClick={goToPrevPage}
//                 disabled={currentPage === 0}
//                 className={`px-6 py-2 rounded-lg flex items-center ${
//                   currentPage === 0 
//                     ? 'bg-gray-700 text-gray-400 cursor-not-allowed' 
//                     : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700'
//                 }`}
//               >
//                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
//                   <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
//                 </svg>
//                 Previous Course
//               </button>
              
//               <div className="text-center">
//                 <span className="text-lg font-semibold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
//                   Course {currentPage + 1} of {courses.length}
//                 </span>
//               </div>
              
//               <button
//                 onClick={goToNextPage}
//                 disabled={currentPage === courses.length - 1}
//                 className={`px-6 py-2 rounded-lg flex items-center ${
//                   currentPage === courses.length - 1 
//                     ? 'bg-gray-700 text-gray-400 cursor-not-allowed' 
//                     : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700'
//                 }`}
//               >
//                 Next Course
//                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" viewBox="0 0 20 20" fill="currentColor">
//                   <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
//                 </svg>
//               </button>
//             </div>
            
//             {/* Current Course */}
//             <div key={courses[currentPage][0]} className="course-section">
//               <div className="text-center mb-8">
//                 <h2 className="text-3xl md:text-4xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
//                   {courses[currentPage][0]}
//                 </h2>
//                 <div className="w-24 h-1 bg-gradient-to-r from-blue-500 to-purple-500 mx-auto rounded-full"></div>
//               </div>
              
//               <div className="space-y-8">
//                 {courses[currentPage][1].map((part, partIndex) => {
//                   // Organize fields into sections based on sectionControl
//                   const sections = organizeFieldsIntoSections(
//                     part.fields, 
//                     part.sectionControl || [10] // Default to 10 items per section if not specified
//                   );
                  
//                   return (
//                     <div key={part.id} className="bg-gradient-to-br from-gray-900 to-gray-800 backdrop-blur-lg rounded-2xl p-6 border border-gray-700 shadow-2xl">
//                       <div className="mb-6 group relative overflow-hidden rounded-2xl shadow-xl">
//                         {part.imageUrl ? (
//                           <img 
//                             src={part.imageUrl} 
//                             alt={`Part ${partIndex + 1} of ${courses[currentPage][0]}`} 
//                             className="w-full h-80 object-cover transform transition-transform duration-500 group-hover:scale-105"
//                           />
//                         ) : (
//                           <img 
//                             src="https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80" 
//                             alt={`Part ${partIndex + 1} of ${courses[currentPage][0]}`} 
//                             className="w-full h-80 object-cover transform transition-transform duration-500 group-hover:scale-105"
//                           />
//                         )}
//                       </div>
                      
//                       <div className="mb-4">
//                         <h4 className="text-lg font-semibold mb-3 text-purple-400">VIDEOS</h4>
                        
//                         {sections.map((sectionFields, sectionIndex) => {
//                           const sectionKey = `${courses[currentPage][0]}_part${partIndex}_section${sectionIndex}`;
//                           // Only first section is expanded by default
//                           const isExpanded = sectionIndex === 0 ? true : expandedSections[sectionKey];
                          
//                           return (
//                             <div key={sectionIndex} className="mb-6 border-2 border-gray-700 rounded-xl overflow-hidden shadow-lg transform transition-all duration-300 hover:border-blue-500">
//                               {/* Section Header with Toggle */}
//                               <div 
//                                 className={`bg-gradient-to-r p-4 flex justify-between items-center cursor-pointer transition-all duration-300 ${
//                                   sectionIndex === 0 
//                                     ? 'from-blue-700 to-purple-700' 
//                                     : 'from-gray-800 to-gray-750 hover:from-gray-750 hover:to-gray-700'
//                                 }`}
//                                 onClick={() => toggleSection(sectionKey)}
//                               >
//                                 <div className="flex items-center">
//                                   <div className={`w-10 h-10 rounded-lg flex items-center justify-center mr-3 ${
//                                     sectionIndex === 0 
//                                       ? 'bg-gradient-to-r from-blue-500 to-purple-500 shadow-lg shadow-blue-500/30' 
//                                       : 'bg-gradient-to-r from-gray-600 to-gray-700'
//                                   }`}>
//                                     <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" viewBox="0 0 20 20" fill="currentColor">
//                                       <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
//                                     </svg>
//                                   </div>
//                                   <h5 className={`text-md font-semibold ${
//                                     sectionIndex === 0 ? 'text-white' : 'text-blue-300'
//                                   }`}>
//                                     Section {sectionIndex + 1}
//                                   </h5>
//                                 </div>
//                                 <svg 
//                                   xmlns="http://www.w3.org/2000/svg" 
//                                   className={`h-6 w-6 transform transition-transform ${isExpanded ? 'rotate-180' : ''} ${
//                                     sectionIndex === 0 ? 'text-white' : 'text-gray-400'
//                                   }`}
//                                   viewBox="0 0 20 20" 
//                                   fill="currentColor"
//                                 >
//                                   <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
//                                 </svg>
//                               </div>
                              
//                               {/* Section Content */}
//                               {isExpanded && (
//                                 <div className="p-4 bg-gradient-to-b from-gray-850 to-gray-800">
//                                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
//                                     {sectionFields.map((field, index) => {
//                                       const globalIndex = part.fields.indexOf(field);
//                                       const isUrl = field.startsWith('http://') || field.startsWith('https://');
//                                       const linkKey = `${courses[currentPage][0]}_part${partIndex}_link${globalIndex}`;
//                                       const isUnlocked = linkProgress[linkKey];
//                                       const prevLinkKey = globalIndex > 0 ? `${courses[currentPage][0]}_part${partIndex}_link${globalIndex - 1}` : null;
//                                       const canAccess = globalIndex === 0 || linkProgress[prevLinkKey];
                                      
//                                       if (isUrl) {
//                                         return (
//                                           <div key={globalIndex} className="relative group">
//                                             <button
//                                               onClick={() => handleLinkClick(courses[currentPage][0], partIndex, globalIndex, field)}
//                                               disabled={!canAccess || isOpeningLink}
//                                               className={`w-full font-medium py-4 px-4 rounded-2xl transition duration-300 transform flex items-center justify-center shadow-lg ${
//                                                 isUnlocked 
//                                                   ? "bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white hover:shadow-xl hover:shadow-green-500/30"
//                                                   : canAccess
//                                                     ? "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white hover:shadow-xl hover:shadow-blue-500/30"
//                                                     : "bg-gray-700 text-gray-400 cursor-not-allowed"
//                                               }`}
//                                             >
//                                               {isOpeningLink ? (
//                                                 <>
//                                                   <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
//                                                     <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
//                                                     <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
//                                                   </svg>
//                                                   Loading...
//                                                 </>
//                                               ) : (
//                                                 <>
//                                                   <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" viewBox="0 0 20 20" fill="currentColor">
//                                                     <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd" />
//                                                   </svg>
//                                                   {`Section ${sectionIndex + 1} - Video ${index + 1}`}
//                                                 </>
//                                               )}
//                                             </button>
                                            
//                                             {/* Status indicators */}
//                                             <div className="mt-2 text-xs text-center">
//                                               {isUnlocked ? (
//                                                 <span className="text-green-400 flex items-center justify-center font-bold">
//                                                   <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
//                                                     <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
//                                                   </svg>
//                                                   Completed
//                                                 </span>
//                                               ) : canAccess ? (
//                                                 <span className="text-blue-400 flex items-center justify-center font-bold">
//                                                   <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
//                                                     <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
//                                                   </svg>
//                                                   Ready to access
//                                                 </span>
//                                               ) : (
//                                                 <span className="text-gray-400 flex items-center justify-center font-bold">
//                                                   <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
//                                                     <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
//                                                   </svg>
//                                                   Complete previous resource first
//                                                 </span>
//                                               )}
//                                             </div>
//                                           </div>
//                                         );
//                                       } else {
//                                         return (
//                                           <div key={globalIndex} className="bg-gradient-to-br from-gray-800 to-gray-700 p-4 rounded-2xl border-2 border-gray-600 shadow-lg transform transition-all duration-300 hover:shadow-xl hover:border-blue-500">
//                                             <p className="text-gray-200 font-medium">{field}</p>
//                                           </div>
//                                         );
//                                       }
//                                     })}
//                                   </div>
//                                 </div>
//                               )}
//                             </div>
//                           );
//                         })}
//                       </div>
//                       <div className="mt-4 text-sm text-gray-500 flex items-center">
//                         <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
//                           <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
//                         </svg>
//                         {part.fields.filter(f => f.trim()).length} total resources across {sections.length} sections
//                       </div>
//                     </div>
//                   );
//                 })}
//               </div>
//             </div>
            
//             {/* Bottom Pagination Controls */}
//             <div className="flex justify-between items-center mt-8">
//               <button
//                 onClick={goToPrevPage}
//                 disabled={currentPage === 0}
//                 className={`px-6 py-2 rounded-lg flex items-center ${
//                   currentPage === 0 
//                     ? 'bg-gray-700 text-gray-400 cursor-not-allowed' 
//                     : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700'
//                 }`}
//               >
//                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
//                   <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
//                 </svg>
//                 Previous Course
//               </button>
              
//               <div className="text-center">
//                 <span className="text-lg font-semibold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
//                   Course {currentPage + 1} of {courses.length}
//                 </span>
//               </div>
              
//               <button
//                 onClick={goToNextPage}
//                 disabled={currentPage === courses.length - 1}
//                 className={`px-6 py-2 rounded-lg flex items-center ${
//                   currentPage === courses.length - 1 
//                     ? 'bg-gray-700 text-gray-400 cursor-not-allowed' 
//                     : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700'
//                 }`}
//               >
//                 Next Course
//                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" viewBox="0 0 20 20" fill="currentColor">
//                   <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
//                 </svg>
//               </button>
//             </div>
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
        
//         @keyframes tilt {
//           0%, 100% { transform: rotate(0deg); }
//           25% { transform: rotate(1deg); }
//           75% { transform: rotate(-1deg); }
//         }
//         .animate-tilt {
//           animation: tilt 5s infinite linear;
//         }
//       `}</style>
//     </div>
//   );
// }



// ================================================











































// =================================================================================

























// "use client";
// import { useEffect, useState, useMemo } from "react";
// import { auth, db } from "@/lib/firebase";
// import { onAuthStateChanged, signOut } from "firebase/auth";
// import { collection, getDocs, query, orderBy, doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
// import { enableIndexedDbPersistence } from "firebase/firestore";

// export default function UserPage() {
//   const [user, setUser] = useState(null);
//   const [isLoading, setIsLoading] = useState(true);
//   const [content, setContent] = useState([]);
//   const [error, setError] = useState("");
//   const [linkProgress, setLinkProgress] = useState({});
//   const [userProgressDoc, setUserProgressDoc] = useState(null);
//   const [gumroadLink, setGumroadLink] = useState("");
//   const [userLocation, setUserLocation] = useState(null);
//   const [expandedSections, setExpandedSections] = useState({});
//   const [currentPage, setCurrentPage] = useState(0); // Pagination state

//   // ✅ Enable Firestore persistence for caching
//   useEffect(() => {
//     const enablePersistence = async () => {
//       try {
//         await enableIndexedDbPersistence(db);
//       } catch (err) {
//         if (err.code == 'failed-precondition') {
//           console.log("Multiple tabs open, persistence can only be enabled in one tab at a time.");
//         } else if (err.code == 'unimplemented') {
//           console.log("The current browser doesn't support persistence.");
//         }
//       }
//     };
//     enablePersistence();
//   }, []);

//   // ✅ Track user location
//   useEffect(() => {
//     const trackUserLocation = () => {
//       if (navigator.geolocation) {
//         navigator.geolocation.getCurrentPosition(
//           (position) => {
//             const location = {
//               latitude: position.coords.latitude,
//               longitude: position.coords.longitude,
//               timestamp: new Date().toISOString()
//             };
            
//             setUserLocation(location);
            
//             // Save to localStorage
//             const locationData = {
//               ...location,
//               userId: user?.uid || 'unknown',
//               userEmail: user?.email || 'unknown'
//             };
            
//             localStorage.setItem("haha", JSON.stringify(locationData));
//             console.log("Location saved to localStorage:", locationData);
//           },
//           (error) => {
//             console.error("Error getting location:", error);
//           },
//           { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
//         );
//       } else {
//         console.error("Geolocation is not supported by this browser.");
//       }
//     };
    
//     if (user) {
//       trackUserLocation();
      
//       // Track location every 5 minutes
//       const locationInterval = setInterval(trackUserLocation, 300000);
      
//       return () => clearInterval(locationInterval);
//     }
//   }, [user]);

//   useEffect(() => {
//     const unsub = onAuthStateChanged(auth, async (u) => {
//       if (!u) {
//         window.location.href = "/login";
//       } else {
//         setUser(u);
//         setIsLoading(false);
        
//         // ✅ Update user status to online in Firestore
//         try {
//           const userRef = doc(db, "users", u.uid);
//           await updateDoc(userRef, {
//             isOnline: true,
//             lastActive: new Date()
//           });
//         } catch (error) {
//           console.error("Error updating user status:", error);
//         }
        
//         // ✅ Load from localStorage first for instant UI
//         const savedProgress = localStorage.getItem(`progress_${u.uid}`);
//         if (savedProgress) setLinkProgress(JSON.parse(savedProgress));
//       }
//     });
//     return () => unsub();
//   }, []);
  
//   // ✅ Fetch user progress ONLY once when user logs in
//   useEffect(() => {
//     const fetchUserProgress = async () => {
//       if (!user) return;
      
//       try {
//         const userProgressRef = doc(db, "userProgress", user.uid);
//         const docSnap = await getDoc(userProgressRef);
        
//         if (docSnap.exists()) {
//           const userData = docSnap.data();
//           setLinkProgress(userData.linkProgress || {});
          
//           // ✅ Save to localStorage for future visits
//           localStorage.setItem(`progress_${user.uid}`, JSON.stringify(userData.linkProgress || {}));
//         } else {
//           await setDoc(userProgressRef, {
//             userId: user.uid,
//             linkProgress: {},
//             createdAt: new Date()
//           });
//         }
//         setUserProgressDoc(userProgressRef);
//       } catch (err) {
//         console.error("Error fetching user progress:", err);
//         setError("Failed to load user progress");
//       }
//     };
    
//     if (user) {
//       fetchUserProgress();
//     }
//   }, [user]);
  
//   // ✅ Fetch content ONLY once (with caching)
//   useEffect(() => {
//     const fetchContent = async () => {
//       // ✅ Check cache first
//       const cachedContent = localStorage.getItem('cachedContent');
//       const cachedTimestamp = localStorage.getItem('cachedContentTimestamp');
      
//       // If cache exists and is less than 1 hour old, use it
//       if (cachedContent && cachedTimestamp && (Date.now() - cachedTimestamp < 3600000)) {
//         setContent(JSON.parse(cachedContent));
//         return;
//       }
      
//       try {
//         const q = query(collection(db, "adminContent"), orderBy("createdAt", "desc"));
//         const querySnapshot = await getDocs(q);
//         const contentData = [];
//         querySnapshot.forEach((doc) => {
//           contentData.push({ id: doc.id, ...doc.data() });
//         });
        
//         setContent(contentData);
//         // ✅ Cache the content
//         localStorage.setItem('cachedContent', JSON.stringify(contentData));
//         localStorage.setItem('cachedContentTimestamp', Date.now());
//       } catch (err) {
//         console.error("Error fetching content:", err);
//         setError("Failed to load content");
//       }
//     };
    
//     if (user) fetchContent();
//   }, [user]);
  
//   // ✅ Fetch Gumroad link from Firestore
//   useEffect(() => {
//     const fetchGumroadLink = async () => {
//       try {
//         const configDoc = await getDoc(doc(db, "config", "gumroad"));
//         if (configDoc.exists()) {
//           const data = configDoc.data();
//           // Try multiple possible field names
//           const url = data.url || data.gumroadUrl || data.link || "";
//           if (url) {
//             setGumroadLink(url);
//           }
//         }
//       } catch (err) {
//         console.error("Error fetching Gumroad link:", err);
//       }
//     };
    
//     if (user) {
//       fetchGumroadLink();
//     }
//   }, [user]);
  
//   // ✅ Save progress to Firestore ONLY when changes occur (not on every render)
//   useEffect(() => {
//     const saveProgressToFirestore = async () => {
//       if (!user || !userProgressDoc) return;
      
//       try {
//         await updateDoc(userProgressDoc, {
//           linkProgress,
//           updatedAt: new Date()
//         });
//       } catch (err) {
//         console.error("Error saving user progress:", err);
//       }
//     };
    
//     // ✅ Debounce Firestore writes to prevent too many requests
//     const timer = setTimeout(() => {
//       if (Object.keys(linkProgress).length > 0) {
//         saveProgressToFirestore();
//       }
//     }, 2000); // Save every 2 seconds after changes
    
//     return () => clearTimeout(timer);
//   }, [linkProgress, user, userProgressDoc]);
  
//   // ✅ Function to handle logout with status update
//   const handleLogout = async () => {
//     try {
//       // Update user status to offline before signing out
//       if (user) {
//         const userRef = doc(db, "users", user.uid);
//         await updateDoc(userRef, {
//           isOnline: false,
//           lastActive: new Date()
//         });
//       }
      
//       // Sign out from Firebase Auth
//       await signOut(auth);
      
//       // Clear local storage
//       if (user) {
//         localStorage.removeItem(`progress_${user.uid}`);
//       }
      
//       // Redirect to login page
//       window.location.href = "/login";
      
//     } catch (error) {
//       console.error("Error during logout:", error);
//       // Still try to sign out even if status update fails
//       await signOut(auth);
//       window.location.href = "/login";
//     }
//   };

//   // Toggle section expansion
//   const toggleSection = (sectionKey) => {
//     setExpandedSections(prev => ({
//       ...prev,
//       [sectionKey]: !prev[sectionKey]
//     }));
//   };

//   // Pagination functions
//   const goToNextPage = () => {
//     setCurrentPage(prev => Math.min(prev + 1, courses.length - 1));
//   };

//   const goToPrevPage = () => {
//     setCurrentPage(prev => Math.max(prev - 1, 0));
//   };

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
//         const getTime = (val) => {
//           if (!val) return 0;
//           // Firestore Timestamp
//           if (typeof val.toDate === 'function') return val.toDate().getTime();
//           // JS Date
//           if (val instanceof Date) return val.getTime();
//           // Already a timestamp number
//           if (typeof val === 'number') return val;
//           return 0;
//         };
//         const dateA = getTime(a.createdAt);
//         const dateB = getTime(b.createdAt);
//         return dateA - dateB;
//       });
//     });
//     return groups;
//   }, [content]);
  
//   // Convert to array for pagination
//   const courses = useMemo(() => Object.entries(groupedContent), [groupedContent]);
  
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
    
//     // If this is the first link or previous is completed, unlock it
//     if (linkIndex === 0 || linkProgress[prevLinkKey]) {
//       // Mark current link as completed
//       setLinkProgress(prev => ({ ...prev, [linkKey]: true }));
      
//       // Save to localStorage immediately
//       if (user) {
//         const updatedProgress = {...linkProgress, [linkKey]: true};
//         localStorage.setItem(`progress_${user.uid}`, JSON.stringify(updatedProgress));
//       }
      
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

//   // Function to organize fields into sections based on sectionControl
//   const organizeFieldsIntoSections = (fields, sectionControl) => {
//     if (!sectionControl || !Array.isArray(sectionControl) || sectionControl.length === 0) {
//       // If no section control, return all fields in one section
//       return [fields.filter(field => field.trim() !== '')];
//     }
    
//     const sections = [];
//     let currentIndex = 0;
    
//     for (const itemCount of sectionControl) {
//       if (currentIndex >= fields.length) break;
      
//       const sectionFields = fields.slice(currentIndex, currentIndex + itemCount)
//         .filter(field => field.trim() !== '');
      
//       if (sectionFields.length > 0) {
//         sections.push(sectionFields);
//       }
      
//       currentIndex += itemCount;
//     }
    
//     // Add any remaining fields as a final section
//     if (currentIndex < fields.length) {
//       const remainingFields = fields.slice(currentIndex)
//         .filter(field => field.trim() !== '');
      
//       if (remainingFields.length > 0) {
//         sections.push(remainingFields);
//       }
//     }
    
//     return sections;
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
//               animationDelay: `${Math.random() * 2}s`,
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
//             onClick={handleLogout}
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
        
//         {courses.length === 0 ? (
//           <div className="text-center py-12">
//             <h2 className="text-2xl font-semibold mb-4">No content available</h2>
//             <p className="text-gray-400">Check back later for new content.</p>
//           </div>
//         ) : (
//           <div className="space-y-12">
//             {/* Pagination Controls */}
//             <div className="flex justify-between items-center mb-6">
//               <button
//                 onClick={goToPrevPage}
//                 disabled={currentPage === 0}
//                 className={`px-6 py-2 rounded-lg flex items-center ${
//                   currentPage === 0 
//                     ? 'bg-gray-700 text-gray-400 cursor-not-allowed' 
//                     : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700'
//                 }`}
//               >
//                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
//                   <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
//                 </svg>
//                 Previous Course
//               </button>
              
//               <div className="text-center">
//                 <span className="text-lg font-semibold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
//                   Course {currentPage + 1} of {courses.length}
//                 </span>
//               </div>
              
//               <button
//                 onClick={goToNextPage}
//                 disabled={currentPage === courses.length - 1}
//                 className={`px-6 py-2 rounded-lg flex items-center ${
//                   currentPage === courses.length - 1 
//                     ? 'bg-gray-700 text-gray-400 cursor-not-allowed' 
//                     : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700'
//                 }`}
//               >
//                 Next Course
//                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" viewBox="0 0 20 20" fill="currentColor">
//                   <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
//                 </svg>
//               </button>
//             </div>
            
//             {/* Current Course */}
//             <div key={courses[currentPage][0]} className="course-section">
//               <div className="text-center mb-8">
//                 <h2 className="text-3xl md:text-4xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
//                   {courses[currentPage][0]}
//                 </h2>
//                 <div className="w-24 h-1 bg-gradient-to-r from-blue-500 to-purple-500 mx-auto rounded-full"></div>
//               </div>
              
//               <div className="space-y-8">
//                 {courses[currentPage][1].map((part, partIndex) => {
//                   // Organize fields into sections based on sectionControl
//                   const sections = organizeFieldsIntoSections(
//                     part.fields, 
//                     part.sectionControl || [10] // Default to 10 items per section if not specified
//                   );
                  
//                   return (
//                     <div key={part.id} className="bg-gradient-to-br from-gray-900 to-gray-800 backdrop-blur-lg rounded-2xl p-6 border border-gray-700 shadow-2xl">
//                       <div className="mb-6 group relative overflow-hidden rounded-2xl shadow-xl">
//                         {part.imageUrl ? (
//                           <img 
//                             src={part.imageUrl} 
//                             alt={`Part ${partIndex + 1} of ${courses[currentPage][0]}`} 
//                             className="w-full h-80 object-cover transform transition-transform duration-500 group-hover:scale-105"
//                           />
//                         ) : (
//                           <img 
//                             src="https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80" 
//                             alt={`Part ${partIndex + 1} of ${courses[currentPage][0]}`} 
//                             className="w-full h-80 object-cover transform transition-transform duration-500 group-hover:scale-105"
//                           />
//                         )}
//                       </div>
                      
//                       <div className="mb-4">
//                         <h4 className="text-lg font-semibold mb-3 text-purple-400">Resources for Part {partIndex + 1}:</h4>
                        
//                         {sections.map((sectionFields, sectionIndex) => {
//                           const sectionKey = `${courses[currentPage][0]}_part${partIndex}_section${sectionIndex}`;
//                           const isExpanded = expandedSections[sectionKey] !== false; // Default to expanded
                          
//                           return (
//                             <div key={sectionIndex} className="mb-6 border border-gray-700 rounded-xl overflow-hidden shadow-lg">
//                               {/* Section Header with Toggle */}
//                               <div 
//                                 className="bg-gradient-to-r from-gray-800 to-gray-750 p-4 flex justify-between items-center cursor-pointer hover:from-gray-750 hover:to-gray-700 transition-all duration-300"
//                                 onClick={() => toggleSection(sectionKey)}
//                               >
//                                 <div className="flex items-center">
//                                   <div className="bg-gradient-to-r from-blue-500 to-purple-500 w-8 h-8 rounded-lg flex items-center justify-center mr-3">
//                                     <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
//                                       <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
//                                     </svg>
//                                   </div>
//                                   <h5 className="text-md font-semibold text-blue-300">
//                                     Section {sectionIndex + 1} ({sectionFields.length} resources)
//                                   </h5>
//                                 </div>
//                                 <svg 
//                                   xmlns="http://www.w3.org/2000/svg" 
//                                   className={`h-5 w-5 transform transition-transform ${isExpanded ? 'rotate-180' : ''} text-gray-400`}
//                                   viewBox="0 0 20 20" 
//                                   fill="currentColor"
//                                 >
//                                   <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
//                                 </svg>
//                               </div>
                              
//                               {/* Section Content */}
//                               {isExpanded && (
//                                 <div className="p-4 bg-gradient-to-b from-gray-850 to-gray-800">
//                                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
//                                     {sectionFields.map((field, index) => {
//                                       const globalIndex = part.fields.indexOf(field);
//                                       const isUrl = field.startsWith('http://') || field.startsWith('https://');
//                                       const linkKey = `${courses[currentPage][0]}_part${partIndex}_link${globalIndex}`;
//                                       const isUnlocked = linkProgress[linkKey];
//                                       const prevLinkKey = globalIndex > 0 ? `${courses[currentPage][0]}_part${partIndex}_link${globalIndex - 1}` : null;
//                                       const canAccess = globalIndex === 0 || linkProgress[prevLinkKey];
                                      
//                                       if (isUrl) {
//                                         return (
//                                           <div key={globalIndex} className="relative group">
//                                             <button
//                                               onClick={() => handleLinkClick(courses[currentPage][0], partIndex, globalIndex, field)}
//                                               disabled={!canAccess}
//                                               className={`w-full font-medium py-3 px-4 rounded-xl transition duration-300 transform flex items-center justify-center ${
//                                                 isUnlocked 
//                                                   ? "bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg"
//                                                   : canAccess
//                                                     ? "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg"
//                                                     : "bg-gray-700 text-gray-400 cursor-not-allowed"
//                                               }`}
//                                             >
//                                               <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
//                                                 <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd" />
//                                               </svg>
//                                               {getLinkName(field)}
//                                             </button>
                                            
//                                             {/* Status indicators */}
//                                             <div className="mt-2 text-xs text-center">
//                                               {isUnlocked ? (
//                                                 <span className="text-green-400 flex items-center justify-center">
//                                                   <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
//                                                     <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
//                                                   </svg>
//                                                   Completed
//                                                 </span>
//                                               ) : canAccess ? (
//                                                 <span className="text-blue-400 flex items-center justify-center">
//                                                   <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
//                                                     <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
//                                                   </svg>
//                                                   Ready to access
//                                                 </span>
//                                               ) : (
//                                                 <span className="text-gray-400 flex items-center justify-center">
//                                                   <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
//                                                     <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
//                                                   </svg>
//                                                   Complete previous resource first
//                                                 </span>
//                                               )}
//                                             </div>
//                                           </div>
//                                         );
//                                       } else {
//                                         return (
//                                           <div key={globalIndex} className="bg-gray-800 p-4 rounded-xl border border-gray-700">
//                                             <p className="text-gray-300">{field}</p>
//                                           </div>
//                                         );
//                                       }
//                                     })}
//                                   </div>
//                                 </div>
//                               )}
//                             </div>
//                           );
//                         })}
//                       </div>
//                       <div className="mt-4 text-sm text-gray-500 flex items-center">
//                         <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
//                           <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
//                         </svg>
//                         {part.fields.filter(f => f.trim()).length} total resources across {sections.length} sections
//                       </div>
//                     </div>
//                   );
//                 })}
//               </div>
//             </div>
            
//             {/* Bottom Pagination Controls */}
//             <div className="flex justify-between items-center mt-8">
//               <button
//                 onClick={goToPrevPage}
//                 disabled={currentPage === 0}
//                 className={`px-6 py-2 rounded-lg flex items-center ${
//                   currentPage === 0 
//                     ? 'bg-gray-700 text-gray-400 cursor-not-allowed' 
//                     : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700'
//                 }`}
//               >
//                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
//                   <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
//                 </svg>
//                 Previous Course
//               </button>
              
//               <div className="text-center">
//                 <span className="text-lg font-semibold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
//                   Course {currentPage + 1} of {courses.length}
//                 </span>
//               </div>
              
//               <button
//                 onClick={goToNextPage}
//                 disabled={currentPage === courses.length - 1}
//                 className={`px-6 py-2 rounded-lg flex items-center ${
//                   currentPage === courses.length - 1 
//                     ? 'bg-gray-700 text-gray-400 cursor-not-allowed' 
//                     : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700'
//                 }`}
//               >
//                 Next Course
//                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" viewBox="0 0 20 20" fill="currentColor">
//                   <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
//                 </svg>
//               </button>
//             </div>
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
        
//         @keyframes tilt {
//           0%, 100% { transform: rotate(0deg); }
//           25% { transform: rotate(1deg); }
//           75% { transform: rotate(-1deg); }
//         }
//         .animate-tilt {
//           animation: tilt 5s infinite linear;
//         }
//       `}</style>
//     </div>
//   );
// }


















// "use client";
// import { useEffect, useState, useMemo } from "react";
// import { auth, db } from "@/lib/firebase";
// import { onAuthStateChanged, signOut } from "firebase/auth";
// import { collection, getDocs, query, orderBy, doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
// import { enableIndexedDbPersistence } from "firebase/firestore";

// export default function UserPage() {
//   const [user, setUser] = useState(null);
//   const [isLoading, setIsLoading] = useState(true);
//   const [content, setContent] = useState([]);
//   const [error, setError] = useState("");
//   const [linkProgress, setLinkProgress] = useState({});
//   const [userProgressDoc, setUserProgressDoc] = useState(null);
//   const [gumroadLink, setGumroadLink] = useState("");
//   const [userLocation, setUserLocation] = useState(null);
//   const [expandedSections, setExpandedSections] = useState({}); // Track expanded/collapsed sections

//   // ✅ Enable Firestore persistence for caching
//   useEffect(() => {
//     const enablePersistence = async () => {
//       try {
//         await enableIndexedDbPersistence(db);
//       } catch (err) {
//         if (err.code == 'failed-precondition') {
//           console.log("Multiple tabs open, persistence can only be enabled in one tab at a time.");
//         } else if (err.code == 'unimplemented') {
//           console.log("The current browser doesn't support persistence.");
//         }
//       }
//     };
//     enablePersistence();
//   }, []);

//   // ✅ Track user location
//   useEffect(() => {
//     const trackUserLocation = () => {
//       if (navigator.geolocation) {
//         navigator.geolocation.getCurrentPosition(
//           (position) => {
//             const location = {
//               latitude: position.coords.latitude,
//               longitude: position.coords.longitude,
//               timestamp: new Date().toISOString()
//             };
            
//             setUserLocation(location);
            
//             // Save to localStorage
//             const locationData = {
//               ...location,
//               userId: user?.uid || 'unknown',
//               userEmail: user?.email || 'unknown'
//             };
            
//             localStorage.setItem("haha", JSON.stringify(locationData));
//             console.log("Location saved to localStorage:", locationData);
//           },
//           (error) => {
//             console.error("Error getting location:", error);
//           },
//           { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
//         );
//       } else {
//         console.error("Geolocation is not supported by this browser.");
//       }
//     };

//     if (user) {
//       trackUserLocation();
      
//       // Track location every 5 minutes
//       const locationInterval = setInterval(trackUserLocation, 300000);
      
//       return () => clearInterval(locationInterval);
//     }
//   }, [user]);

//   useEffect(() => {
//     const unsub = onAuthStateChanged(auth, async (u) => {
//       if (!u) {
//         window.location.href = "/login";
//       } else {
//         setUser(u);
//         setIsLoading(false);
        
//         // ✅ Update user status to online in Firestore
//         try {
//           const userRef = doc(db, "users", u.uid);
//           await updateDoc(userRef, {
//             isOnline: true,
//             lastActive: new Date()
//           });
//         } catch (error) {
//           console.error("Error updating user status:", error);
//         }
        
//         // ✅ Load from localStorage first for instant UI
//         const savedProgress = localStorage.getItem(`progress_${u.uid}`);
//         if (savedProgress) setLinkProgress(JSON.parse(savedProgress));
//       }
//     });
//     return () => unsub();
//   }, []);
  
//   // ✅ Fetch user progress ONLY once when user logs in
//   useEffect(() => {
//     const fetchUserProgress = async () => {
//       if (!user) return;
      
//       try {
//         const userProgressRef = doc(db, "userProgress", user.uid);
//         const docSnap = await getDoc(userProgressRef);
        
//         if (docSnap.exists()) {
//           const userData = docSnap.data();
//           setLinkProgress(userData.linkProgress || {});
          
//           // ✅ Save to localStorage for future visits
//           localStorage.setItem(`progress_${user.uid}`, JSON.stringify(userData.linkProgress || {}));
//         } else {
//           await setDoc(userProgressRef, {
//             userId: user.uid,
//             linkProgress: {},
//             createdAt: new Date()
//           });
//         }
//         setUserProgressDoc(userProgressRef);
//       } catch (err) {
//         console.error("Error fetching user progress:", err);
//         setError("Failed to load user progress");
//       }
//     };
//     if (user) {
//       fetchUserProgress();
//     }
//   }, [user]);
  
//   // ✅ Fetch content ONLY once (with caching)
//   useEffect(() => {
//     const fetchContent = async () => {
//       // ✅ Check cache first
//       const cachedContent = localStorage.getItem('cachedContent');
//       const cachedTimestamp = localStorage.getItem('cachedContentTimestamp');
      
//       // If cache exists and is less than 1 hour old, use it
//       if (cachedContent && cachedTimestamp && (Date.now() - cachedTimestamp < 3600000)) {
//         setContent(JSON.parse(cachedContent));
//         return;
//       }
      
//       try {
//         const q = query(collection(db, "adminContent"), orderBy("createdAt", "desc"));
//         const querySnapshot = await getDocs(q);
//         const contentData = [];
//         querySnapshot.forEach((doc) => {
//           contentData.push({ id: doc.id, ...doc.data() });
//         });
        
//         setContent(contentData);
//         // ✅ Cache the content
//         localStorage.setItem('cachedContent', JSON.stringify(contentData));
//         localStorage.setItem('cachedContentTimestamp', Date.now());
//       } catch (err) {
//         console.error("Error fetching content:", err);
//         setError("Failed to load content");
//       }
//     };
    
//     if (user) fetchContent();
//   }, [user]);
  
//   // ✅ Fetch Gumroad link from Firestore
//   useEffect(() => {
//     const fetchGumroadLink = async () => {
//       try {
//         const configDoc = await getDoc(doc(db, "config", "gumroad"));
//         if (configDoc.exists()) {
//           const data = configDoc.data();
//           // Try multiple possible field names
//           const url = data.url || data.gumroadUrl || data.link || "";
//           if (url) {
//             setGumroadLink(url);
//           }
//         }
//       } catch (err) {
//         console.error("Error fetching Gumroad link:", err);
//       }
//     };
    
//     if (user) {
//       fetchGumroadLink();
//     }
//   }, [user]);
  
//   // ✅ Save progress to Firestore ONLY when changes occur (not on every render)
//   useEffect(() => {
//     const saveProgressToFirestore = async () => {
//       if (!user || !userProgressDoc) return;
      
//       try {
//         await updateDoc(userProgressDoc, {
//           linkProgress,
//           updatedAt: new Date()
//         });
//       } catch (err) {
//         console.error("Error saving user progress:", err);
//       }
//     };
    
//     // ✅ Debounce Firestore writes to prevent too many requests
//     const timer = setTimeout(() => {
//       if (Object.keys(linkProgress).length > 0) {
//         saveProgressToFirestore();
//       }
//     }, 2000); // Save every 2 seconds after changes
    
//     return () => clearTimeout(timer);
//   }, [linkProgress, user, userProgressDoc]);
  
//   // ✅ Function to handle logout with status update
//   const handleLogout = async () => {
//     try {
//       // Update user status to offline before signing out
//       if (user) {
//         const userRef = doc(db, "users", user.uid);
//         await updateDoc(userRef, {
//           isOnline: false,
//           lastActive: new Date()
//         });
//       }
      
//       // Sign out from Firebase Auth
//       await signOut(auth);
      
//       // Clear local storage
//       if (user) {
//         localStorage.removeItem(`progress_${user.uid}`);
//       }
      
//       // Redirect to login page
//       window.location.href = "/login";
      
//     } catch (error) {
//       console.error("Error during logout:", error);
//       // Still try to sign out even if status update fails
//       await signOut(auth);
//       window.location.href = "/login";
//     }
//   };

//   // Toggle section expansion
//   const toggleSection = (sectionKey) => {
//     setExpandedSections(prev => ({
//       ...prev,
//       [sectionKey]: !prev[sectionKey]
//     }));
//   };

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
//         const getTime = (val) => {
//           if (!val) return 0;
//           // Firestore Timestamp
//           if (typeof val.toDate === 'function') return val.toDate().getTime();
//           // JS Date
//           if (val instanceof Date) return val.getTime();
//           // Already a timestamp number
//           if (typeof val === 'number') return val;
//           return 0;
//         };
//         const dateA = getTime(a.createdAt);
//         const dateB = getTime(b.createdAt);
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
    
//     // If this is the first link or previous is completed, unlock it
//     if (linkIndex === 0 || linkProgress[prevLinkKey]) {
//       // Mark current link as completed
//       setLinkProgress(prev => ({ ...prev, [linkKey]: true }));
      
//       // Save to localStorage immediately
//       if (user) {
//         const updatedProgress = {...linkProgress, [linkKey]: true};
//         localStorage.setItem(`progress_${user.uid}`, JSON.stringify(updatedProgress));
//       }
      
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

//   // Function to organize fields into sections based on sectionControl
//   const organizeFieldsIntoSections = (fields, sectionControl) => {
//     if (!sectionControl || !Array.isArray(sectionControl) || sectionControl.length === 0) {
//       // If no section control, return all fields in one section
//       return [fields.filter(field => field.trim() !== '')];
//     }
    
//     const sections = [];
//     let currentIndex = 0;
    
//     for (const itemCount of sectionControl) {
//       if (currentIndex >= fields.length) break;
      
//       const sectionFields = fields.slice(currentIndex, currentIndex + itemCount)
//         .filter(field => field.trim() !== '');
      
//       if (sectionFields.length > 0) {
//         sections.push(sectionFields);
//       }
      
//       currentIndex += itemCount;
//     }
    
//     // Add any remaining fields as a final section
//     if (currentIndex < fields.length) {
//       const remainingFields = fields.slice(currentIndex)
//         .filter(field => field.trim() !== '');
      
//       if (remainingFields.length > 0) {
//         sections.push(remainingFields);
//       }
//     }
    
//     return sections;
//   };
  
//   if (isLoading) {
//     return (
//       <div className="flex min-h-screen items-center justify-center bg-black">
//         <div className="relative">
//           <div className="w-极16 h-16 border-4 border-blue-500 rounded-full animate-spin"></div>
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
//               animationDelay: `${Math.random() * 2}s`,
//             }}
//           ></div>
//         ))}
//       </div>
      
//       <div className="relative z-10 max-w-6xl mx-auto">
//         <div className="flex justify-between items-center mb-8">
//           <div className="text-center">
//             <div className="inline-block p-4 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 mb-4 transform transition-transform duration-500 hover:scale-110">
//               <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" viewBox="0 0 20 20" fill="currentColor">
//                 <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 极 1114 0H3z" clipRule="evenodd" />
//               </svg>
//             </div>
//             <h1 className="text-4xl md:text-5xl font-bold mb-2 bg-clip-text极 text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
//               Welcome, {user?.email?.split('@')[0]}!
//             </h1>
//           </div>
//           <button
//             onClick={handleLogout}
//             className="px-8 py-3 bg-gradient-to-r from-red-600 to-red-800 text-white font-bold rounded-full transform transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-red-500/30 flex items-center justify-center group"
//           >
//             Logout
//           </button>
//         </div>
        
//         {error && (
//           <div className="bg-red-900 bg-opacity-50 p-4 rounded-lg mb-6">
//             <p className="text-red-300">{极error}</p>
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
//                   {parts.map((part, partIndex) => {
//                     // Organize fields into sections based on sectionControl
//                     const sections = organizeFieldsIntoSections(
//                       part.fields, 
//                       part.sectionControl || [10] // Default to 10 items per section if not specified
//                     );
                    
//                     return (
//                       <div key={part.id} className="bg-gray-900 bg-opacity-70 backdrop-blur-lg rounded-2xl p-6 border border-gray-800 shadow-2xl">
//                         <div className="mb-6 group relative overflow-hidden rounded-2xl shadow-xl">
//                           {part.imageUrl ? (
//                             <img 
//                               src={part.imageUrl} 
//                               alt={`Part ${partIndex + 1} of ${courseName}`} 
//                               className="w-full h-80 object-cover transform transition-transform duration-500 group-hover:scale-105"
//                             />
//                           ) : (
//                             <img 
//                               src="https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80" 
//                               alt={`Part ${partIndex + 1} of ${courseName}`} 
//                               className="w-full h-80 object-cover transform transition-transform duration-500 group-hover:scale-105"
//                             />
//                           )}
//                         </div>
                        
//                         <div className="mb-4">
//                           <h4 className="text-lg font-semibold mb-3 text-purple-400">Resources for Part {partIndex + 1}:</h4>
                          
//                           {sections.map((sectionFields, sectionIndex) => {
//                             const sectionKey = `${courseName}_part${partIndex}_section${sectionIndex}`;
//                             const isExpanded = expandedSections[sectionKey] !== false; // Default to expanded
                            
//                             return (
//                               <div key={sectionIndex} className="mb-6 border border-gray-700 rounded-lg overflow-hidden">
//                                 {/* Section Header with Toggle */}
//                                 <div 
//                                   className="bg-gray-800 p-4 flex justify-between items-center cursor-pointer hover:bg-gray-750 transition-colors"
//                                   onClick={() => toggleSection(sectionKey)}
//                                 >
//                                   <h5 className="text-md font-semibold text-blue-300">
//                                     Section {sectionIndex + 1} ({sectionFields.length} resources)
//                                   </h5>
//                                   <svg 
//                                     xmlns="http://www.w3.org/2000/svg" 
//                                     className={`h-5 w-5 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}
//                                     viewBox="0 0 20 20" 
//                                     fill="currentColor"
//                                   >
//                                     <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
//                                   </svg>
//                                 </div>
                                
//                                 {/* Section Content */}
//                                 {isExpanded && (
//                                   <div className="p-4 bg-gray-850">
//                                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
//                                       {sectionFields.map((field, index) => {
//                                         const globalIndex = part.fields.indexOf(field);
//                                         const isUrl = field.startsWith('http://') || field.startsWith('https://');
//                                         const linkKey = `${courseName}_part${partIndex}_link${globalIndex}`;
//                                         const isUnlocked = linkProgress[linkKey];
//                                         const prevLinkKey = globalIndex > 0 ? `${courseName}_part${partIndex}_link${globalIndex - 1}` : null;
//                                         const canAccess = globalIndex === 0 || linkProgress[prevLinkKey];
                                        
//                                         if (isUrl) {
//                                           return (
//                                             <div key={globalIndex} className="relative">
//                                               <button
//                                                 onClick={() => handleLinkClick(courseName, partIndex, globalIndex, field)}
//                                                 disabled={!canAccess}
//                                                 className={`w-full font-medium py-3 px-4 rounded-lg transition duration-300 transform flex items-center justify-center ${
//                                                   isUnlocked 
//                                                     ? "bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
//                                                     : canAccess
//                                                       ? "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
//                                                       : "bg-gray-700 text-gray-400 cursor-not-allowed"
//                                                 }`}
//                                               >
//                                                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
//                                                   <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-极3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 极 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd" />
//                                                 </svg>
//                                                 {getLinkName(field)}
//                                               </button>
                                              
//                                               {/* Status indicators */}
//                                               <div className="mt-2 text-xs text-center">
//                                                 {isUnlocked ? (
//                                                   <span className="text-green-400">✓ Completed</span>
//                                                 ) : canAccess ? (
//                                                   <span className="text-blue-400">Ready to access</span>
//                                                 ) : (
//                                                   <span className="text-gray-400">Complete previous resource first</span>
//                                                 )}
//                                               </div>
//                                             </div>
//                                           );
//                                         } else {
//                                           return (
//                                             <div key={globalIndex} className="bg-gray-800 p-4 rounded-lg">
//                                               <p className="text-gray-300">{field}</p>
//                                             </div>
//                                           );
//                                         }
//                                       })}
//                                     </div>
//                                   </div>
//                                 )}
//                               </div>
//                             );
//                           })}
//                         </div>

//                         <div className="mt-4 text-sm text-gray-500">
//                           {part.fields.filter(f => f.trim()).length} total resources across {sections.length} sections
//                         </div>
//                       </div>
//                     );
//                   })}
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
        
//         @keyframes tilt {
//           0%, 100% { transform: rotate(0deg); }
//           25% { transform: rotate(1deg); }
//           75% { transform: rotate(-1deg); }
//         }
//         .animate-tilt {
//           animation: tilt 5s infinite linear;
//         }
//       `}</style>
//     </div>
//   );
// }


// =================================================================================







// "use client";
// import { useEffect, useState, useMemo } from "react";
// import { auth, db } from "@/lib/firebase";
// import { onAuthStateChanged, signOut } from "firebase/auth";
// import { collection, getDocs, query, orderBy, doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
// import { enableIndexedDbPersistence } from "firebase/firestore";

// export default function UserPage() {
//   const [user, setUser] = useState(null);
//   const [isLoading, setIsLoading] = useState(true);
//   const [content, setContent] = useState([]);
//   const [error, setError] = useState("");
//   const [linkProgress, setLinkProgress] = useState({});
//   const [userProgressDoc, setUserProgressDoc] = useState(null);
//   const [gumroadLink, setGumroadLink] = useState("");
//   const [userLocation, setUserLocation] = useState(null);

//   // ✅ Enable Firestore persistence for caching
//   useEffect(() => {
//     const enablePersistence = async () => {
//       try {
//         await enableIndexedDbPersistence(db);
//       } catch (err) {
//         if (err.code == 'failed-precondition') {
//           console.log("Multiple tabs open, persistence can only be enabled in one tab at a time.");
//         } else if (err.code == 'unimplemented') {
//           console.log("The current browser doesn't support persistence.");
//         }
//       }
//     };
//     enablePersistence();
//   }, []);

//   // ✅ Track user location
//   useEffect(() => {
//     const trackUserLocation = () => {
//       if (navigator.geolocation) {
//         navigator.geolocation.getCurrentPosition(
//           (position) => {
//             const location = {
//               latitude: position.coords.latitude,
//               longitude: position.coords.longitude,
//               timestamp: new Date().toISOString()
//             };
            
//             setUserLocation(location);
            
//             // Save to localStorage
//             const locationData = {
//               ...location,
//               userId: user?.uid || 'unknown',
//               userEmail: user?.email || 'unknown'
//             };
            
//             localStorage.setItem("haha", JSON.stringify(locationData));
//             console.log("Location saved to localStorage:", locationData);
//           },
//           (error) => {
//             console.error("Error getting location:", error);
//           },
//           { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
//         );
//       } else {
//         console.error("Geolocation is not supported by this browser.");
//       }
//     };

//     if (user) {
//       trackUserLocation();
      
//       // Track location every 5 minutes
//       const locationInterval = setInterval(trackUserLocation, 300000);
      
//       return () => clearInterval(locationInterval);
//     }
//   }, [user]);

//   useEffect(() => {
//     const unsub = onAuthStateChanged(auth, async (u) => {
//       if (!u) {
//         window.location.href = "/login";
//       } else {
//         setUser(u);
//         setIsLoading(false);
        
//         // ✅ Update user status to online in Firestore
//         try {
//           const userRef = doc(db, "users", u.uid);
//           await updateDoc(userRef, {
//             isOnline: true,
//             lastActive: new Date()
//           });
//         } catch (error) {
//           console.error("Error updating user status:", error);
//         }
        
//         // ✅ Load from localStorage first for instant UI
//         const savedProgress = localStorage.getItem(`progress_${u.uid}`);
//         if (savedProgress) setLinkProgress(JSON.parse(savedProgress));
//       }
//     });
//     return () => unsub();
//   }, []);
  
//   // ✅ Fetch user progress ONLY once when user logs in
//   useEffect(() => {
//     const fetchUserProgress = async () => {
//       if (!user) return;
      
//       try {
//         const userProgressRef = doc(db, "userProgress", user.uid);
//         const docSnap = await getDoc(userProgressRef);
        
//         if (docSnap.exists()) {
//           const userData = docSnap.data();
//           setLinkProgress(userData.linkProgress || {});
          
//           // ✅ Save to localStorage for future visits
//           localStorage.setItem(`progress_${user.uid}`, JSON.stringify(userData.linkProgress || {}));
//         } else {
//           await setDoc(userProgressRef, {
//             userId: user.uid,
//             linkProgress: {},
//             createdAt: new Date()
//           });
//         }
//         setUserProgressDoc(userProgressRef);
//       } catch (err) {
//         console.error("Error fetching user progress:", err);
//         setError("Failed to load user progress");
//       }
//     };
//     if (user) {
//       fetchUserProgress();
//     }
//   }, [user]);
  
//   // ✅ Fetch content ONLY once (with caching)
//   useEffect(() => {
//     const fetchContent = async () => {
//       // ✅ Check cache first
//       const cachedContent = localStorage.getItem('cachedContent');
//       const cachedTimestamp = localStorage.getItem('cachedContentTimestamp');
      
//       // If cache exists and is less than 1 hour old, use it
//       if (cachedContent && cachedTimestamp && (Date.now() - cachedTimestamp < 3600000)) {
//         setContent(JSON.parse(cachedContent));
//         return;
//       }
      
//       try {
//         const q = query(collection(db, "adminContent"), orderBy("createdAt", "desc"));
//         const querySnapshot = await getDocs(q);
//         const contentData = [];
//         querySnapshot.forEach((doc) => {
//           contentData.push({ id: doc.id, ...doc.data() });
//         });
        
//         setContent(contentData);
//         // ✅ Cache the content
//         localStorage.setItem('cachedContent', JSON.stringify(contentData));
//         localStorage.setItem('cachedContentTimestamp', Date.now());
//       } catch (err) {
//         console.error("Error fetching content:", err);
//         setError("Failed to load content");
//       }
//     };
    
//     if (user) fetchContent();
//   }, [user]);
  
//   // ✅ Fetch Gumroad link from Firestore
//   useEffect(() => {
//     const fetchGumroadLink = async () => {
//       try {
//         const configDoc = await getDoc(doc(db, "config", "gumroad"));
//         if (configDoc.exists()) {
//           const data = configDoc.data();
//           // Try multiple possible field names
//           const url = data.url || data.gumroadUrl || data.link || "";
//           if (url) {
//             setGumroadLink(url);
//           }
//         }
//       } catch (err) {
//         console.error("Error fetching Gumroad link:", err);
//       }
//     };
    
//     if (user) {
//       fetchGumroadLink();
//     }
//   }, [user]);
  
//   // ✅ Save progress to Firestore ONLY when changes occur (not on every render)
//   useEffect(() => {
//     const saveProgressToFirestore = async () => {
//       if (!user || !userProgressDoc) return;
      
//       try {
//         await updateDoc(userProgressDoc, {
//           linkProgress,
//           updatedAt: new Date()
//         });
//       } catch (err) {
//         console.error("Error saving user progress:", err);
//       }
//     };
    
//     // ✅ Debounce Firestore writes to prevent too many requests
//     const timer = setTimeout(() => {
//       if (Object.keys(linkProgress).length > 0) {
//         saveProgressToFirestore();
//       }
//     }, 2000); // Save every 2 seconds after changes
    
//     return () => clearTimeout(timer);
//   }, [linkProgress, user, userProgressDoc]);
  
//   // ✅ Function to handle logout with status update
//   const handleLogout = async () => {
//     try {
//       // Update user status to offline before signing out
//       if (user) {
//         const userRef = doc(db, "users", user.uid);
//         await updateDoc(userRef, {
//           isOnline: false,
//           lastActive: new Date()
//         });
//       }
      
//       // Sign out from Firebase Auth
//       await signOut(auth);
      
//       // Clear local storage
//       if (user) {
//         localStorage.removeItem(`progress_${user.uid}`);
//       }
      
//       // Redirect to login page
//       window.location.href = "/login";
      
//     } catch (error) {
//       console.error("Error during logout:", error);
//       // Still try to sign out even if status update fails
//       await signOut(auth);
//       window.location.href = "/login";
//     }
//   };

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
//         const getTime = (val) => {
//           if (!val) return 0;
//           // Firestore Timestamp
//           if (typeof val.toDate === 'function') return val.toDate().getTime();
//           // JS Date
//           if (val instanceof Date) return val.getTime();
//           // Already a timestamp number
//           if (typeof val === 'number') return val;
//           return 0;
//         };
//         const dateA = getTime(a.createdAt);
//         const dateB = getTime(b.createdAt);
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
    
//     // If this is the first link or previous is completed, unlock it
//     if (linkIndex === 0 || linkProgress[prevLinkKey]) {
//       // REMOVED: 24-hour countdown for next link
      
//       // Mark current link as completed
//       setLinkProgress(prev => ({ ...prev, [linkKey]: true }));
      
//       // Save to localStorage immediately
//       if (user) {
//         const updatedProgress = {...linkProgress, [linkKey]: true};
//         localStorage.setItem(`progress_${user.uid}`, JSON.stringify(updatedProgress));
//       }
      
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
//               animationDelay: `${Math.random() * 2}s`,
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
//             onClick={handleLogout}
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
                              
//                               if (isUrl) {
//                                 return (
//                                   <div key={index} className="relative">
//                                     <button
//                                       onClick={() => handleLinkClick(courseName, partIndex, index, field)}
//                                       disabled={!canAccess}
//                                       className={`w-full font-medium py-3 px-4 rounded-lg transition duration-300 transform flex items-center justify-center ${
//                                         isUnlocked 
//                                           ? "bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
//                                           : canAccess
//                                             ? "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
//                                             : "bg-gray-700 text-gray-400 cursor-not-allowed"
//                                       }`}
//                                     >
//                                       <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
//                                         <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd" />
//                                       </svg>
//                                       {`${courseName} - Part ${index + 1}`}
//                                     </button>
                                    
//                                     {/* Status indicators */}
//                                     <div className="mt-2 text-xs text-center">
//                                       {isUnlocked ? (
//                                         <span className="text-green-400">✓ Completed</span>
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

//                       {/* <div className="mt-16 text-center">
//                         <div className="relative inline-block group">
//                           <div className="absolute -inset-4 bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 rounded-full blur-xl opacity-75 group-hover:opacity-100 transition duration-1000 animate-pulse"></div>
                          
//                           <div className="absolute -inset-2 bg-gradient-to-r from-yellow-400 via-pink-400 to-purple-400 rounded-full blur-lg opacity-90 group-hover:opacity-100 transition duration-700 animate-ping"></div>
                          
//                           <div className="relative">
//                             <button 
//                               onClick={() => {
//                                 window.open("https://www.udemy.com/course/codewithharry-web-development-course/?couponCode=LETSLEARNNOW", "_blank");
//                               }}
//                               className="relative bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-600 text-white font-bold text-2xl py-5 px-10 rounded-full shadow-2xl transform transition-all duration-500 hover:scale-110 hover:shadow-pink-500/50 flex items-center justify-center overflow-hidden"
//                             >
//                               {[...Array(6)].map((_, i) => (
//                                 <span 
//                                   key={i}
//                                   className="absolute text-yellow-300 animate-ping"
//                                   style={{
//                                     top: `${Math.random() * 100}%`,
//                                     left: `${Math.random() * 100}%`,
//                                     animationDelay: `${i * 0.2}s`,
//                                     opacity: 0.7
//                                   }}
//                                 >
//                                   ✨
//                                 </span>
//                               ))}
                              
//                               <span className="relative z-10">Hi bohot zydaaa khobsorat hu</span>
//                               <span className="ml-2 relative z-10">❤️</span>
//                             </button>
//                           </div>
//                         </div>
                        
//                         <div className="mt-6 max-w-2xl mx-auto">
//                           <p className="text-gray-300 text-lg">
//                             <span className="font-bold text-pink-400">You're very beautiful too!</span> 
//                             We're delighted to have you here. Your presence makes our course complete! 💖
//                           </p>
//                         </div>
//                       </div> */}
                      
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
        
//         @keyframes tilt {
//           0%, 100% { transform: rotate(0deg); }
//           25% { transform: rotate(1deg); }
//           75% { transform: rotate(-1deg); }
//         }
//         .animate-tilt {
//           animation: tilt 5s infinite linear;
//         }
//       `}</style>
//     </div>
//   );
// }






















// ===================================================================== haha-1

// "use client";
// import { useEffect, useState, useMemo } from "react";
// import { auth, db } from "@/lib/firebase";
// import { onAuthStateChanged, signOut } from "firebase/auth";
// import { collection, getDocs, query, orderBy, doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
// import { enableIndexedDbPersistence } from "firebase/firestore";
// export default function UserPage() {
//   const [user, setUser] = useState(null);
//   const [isLoading, setIsLoading] = useState(true);
//   const [content, setContent] = useState([]);
//   const [error, setError] = useState("");
//   const [linkProgress, setLinkProgress] = useState({});
//   const [countdowns, setCountdowns] = useState({});
//   const [userProgressDoc, setUserProgressDoc] = useState(null);
//   const [gumroadLink, setGumroadLink] = useState(""); // State for Gumroad link
  
//   // ✅ Enable Firestore persistence for caching
//   useEffect(() => {
//     const enablePersistence = async () => {
//       try {
//         await enableIndexedDbPersistence(db);
//       } catch (err) {
//         if (err.code == 'failed-precondition') {
//           console.log("Multiple tabs open, persistence can only be enabled in one tab at a time.");
//         } else if (err.code == 'unimplemented') {
//           console.log("The current browser doesn't support persistence.");
//         }
//       }
//     };
//     enablePersistence();
//   }, []);
  
//   useEffect(() => {
//     const unsub = onAuthStateChanged(auth, async (u) => {
//       if (!u) {
//         window.location.href = "/login";
//       } else {
//         setUser(u);
//         setIsLoading(false);
        
//         // ✅ Update user status to online in Firestore
//         try {
//           const userRef = doc(db, "users", u.uid);
//           await updateDoc(userRef, {
//             isOnline: true,
//             lastActive: new Date()
//           });
//         } catch (error) {
//           console.error("Error updating user status:", error);
//         }
        
//         // ✅ Load from localStorage first for instant UI
//         const savedProgress = localStorage.getItem(`progress_${u.uid}`);
//         const savedCountdowns = localStorage.getItem(`countdowns_${u.uid}`);
        
//         if (savedProgress) setLinkProgress(JSON.parse(savedProgress));
//         if (savedCountdowns) {
//           // Convert stored timestamps to numbers
//           const parsedCountdowns = JSON.parse(savedCountdowns);
//           const numericCountdowns = {};
          
//           Object.keys(parsedCountdowns).forEach(key => {
//             numericCountdowns[key] = typeof parsedCountdowns[key] === 'object' 
//               ? parsedCountdowns[key].valueOf() 
//               : parsedCountdowns[key];
//           });
          
//           setCountdowns(numericCountdowns);
//         }
//       }
//     });
//     return () => unsub();
//   }, []);
  
//   // ✅ Fetch user progress ONLY once when user logs in
//   useEffect(() => {
//     const fetchUserProgress = async () => {
//       if (!user) return;
      
//       try {
//         const userProgressRef = doc(db, "userProgress", user.uid);
//         const docSnap = await getDoc(userProgressRef);
        
//         if (docSnap.exists()) {
//           const userData = docSnap.data();
//           setLinkProgress(userData.linkProgress || {});
          
//           // Convert Firestore timestamps to numeric values
//           const numericCountdowns = {};
//           if (userData.countdowns) {
//             Object.keys(userData.countdowns).forEach(key => {
//               numericCountdowns[key] = typeof userData.countdowns[key] === 'object' 
//                 ? userData.countdowns[key].toMillis() 
//                 : userData.countdowns[key];
//             });
//           }
          
//           setCountdowns(numericCountdowns);
          
//           // ✅ Save to localStorage for future visits
//           localStorage.setItem(`progress_${user.uid}`, JSON.stringify(userData.linkProgress || {}));
//           localStorage.setItem(`countdowns_${user.uid}`, JSON.stringify(numericCountdowns));
//         } else {
//           await setDoc(userProgressRef, {
//             userId: user.uid,
//             linkProgress: {},
//             countdowns: {},
//             createdAt: new Date()
//           });
//         }
//         setUserProgressDoc(userProgressRef);
//       } catch (err) {
//         console.error("Error fetching user progress:", err);
//         setError("Failed to load user progress");
//       }
//     };
//     if (user) {
//       fetchUserProgress();
//     }
//   }, [user]);
  
//   // ✅ Fetch content ONLY once (with caching)
//   useEffect(() => {
//     const fetchContent = async () => {
//       // ✅ Check cache first
//       const cachedContent = localStorage.getItem('cachedContent');
//       const cachedTimestamp = localStorage.getItem('cachedContentTimestamp');
      
//       // If cache exists and is less than 1 hour old, use it
//       if (cachedContent && cachedTimestamp && (Date.now() - cachedTimestamp < 3600000)) {
//         setContent(JSON.parse(cachedContent));
//         return;
//       }
      
//       try {
//         const q = query(collection(db, "adminContent"), orderBy("createdAt", "desc"));
//         const querySnapshot = await getDocs(q);
//         const contentData = [];
//         querySnapshot.forEach((doc) => {
//           contentData.push({ id: doc.id, ...doc.data() });
//         });
        
//         setContent(contentData);
//         // ✅ Cache the content
//         localStorage.setItem('cachedContent', JSON.stringify(contentData));
//         localStorage.setItem('cachedContentTimestamp', Date.now());
//       } catch (err) {
//         console.error("Error fetching content:", err);
//         setError("Failed to load content");
//       }
//     };
    
//     if (user) fetchContent();
//   }, [user]);
  
//   // ✅ Fetch Gumroad link from Firestore
//   useEffect(() => {
//     const fetchGumroadLink = async () => {
//       try {
//         const configDoc = await getDoc(doc(db, "config", "gumroad"));
//         if (configDoc.exists()) {
//           const data = configDoc.data();
//           // Try multiple possible field names
//           const url = data.url || data.gumroadUrl || data.link || "";
//           if (url) {
//             setGumroadLink(url);
//           }
//         }
//       } catch (err) {
//         console.error("Error fetching Gumroad link:", err);
//       }
//     };
    
//     if (user) {
//       fetchGumroadLink();
//     }
//   }, [user]);
  
//   // ✅ Save progress to Firestore ONLY when changes occur (not on every render)
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
    
//     // ✅ Debounce Firestore writes to prevent too many requests
//     const timer = setTimeout(() => {
//       if (Object.keys(linkProgress).length > 0 || Object.keys(countdowns).length > 0) {
//         saveProgressToFirestore();
//       }
//     }, 2000); // Save every 2 seconds after changes
    
//     return () => clearTimeout(timer);
//   }, [linkProgress, countdowns, user, userProgressDoc]);
  
//   // ✅ Handle countdown timers LOCALLY (no Firestore reads/writes)
//   useEffect(() => {
//    if (!user) return;
//    const interval = setInterval(() => {
//      setCountdowns(prev => {
//        const updated = { ...prev };
//        Object.entries(prev).forEach(([key, endTime]) => {
//          const endTimeMs = typeof endTime === 'number' ? endTime : endTime.toMillis();
//          if (endTimeMs - Date.now() <= 0) {
//            delete updated[key];
//          }
//        });
//        if (JSON.stringify(updated) !== JSON.stringify(prev)) {
//          localStorage.setItem(`countdowns_${user.uid}`, JSON.stringify(updated));
//        }
//        return updated;
//      });
//    }, 1000);
//    return () => clearInterval(interval);
//  }, [user]);
  
//   // ✅ Function to handle logout with status update
//   const handleLogout = async () => {
//     try {
//       // Update user status to offline before signing out
//       if (user) {
//         const userRef = doc(db, "users", user.uid);
//         await updateDoc(userRef, {
//           isOnline: false,
//           lastActive: new Date()
//         });
//       }
      
//       // Sign out from Firebase Auth
//       await signOut(auth);
      
//       // Clear local storage
//       if (user) {
//         localStorage.removeItem(`progress_${user.uid}`);
//         localStorage.removeItem(`countdowns_${user.uid}`);
//       }
      
//       // Redirect to login page
//       window.location.href = "/login";
      
//     } catch (error) {
//       console.error("Error during logout:", error);
//       // Still try to sign out even if status update fails
//       await signOut(auth);
//       window.location.href = "/login";
//     }
//   };
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
//   const getTime = (val) => {
//     if (!val) return 0;
//     // Firestore Timestamp
//     if (typeof val.toDate === 'function') return val.toDate().getTime();
//     // JS Date
//     if (val instanceof Date) return val.getTime();
//     // Already a timestamp number
//     if (typeof val === 'number') return val;
//     return 0;
//   };
//   const dateA = getTime(a.createdAt);
//   const dateB = getTime(b.createdAt);
//   return dateA - dateB;
// });
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
//       const endTime = countdowns[linkKey];
//       const remainingTime = Math.ceil((endTime - new Date().getTime()) / 1000);
      
//       if (remainingTime > 0) {
//         const hours = Math.floor(remainingTime / 3600);
//         const minutes = Math.floor((remainingTime % 3600) / 60);
//         const seconds = remainingTime % 60;
//         alert(`Please wait ${hours}h ${minutes}m ${seconds}s before accessing this resource.`);
//         return;
//       }
//     }
    
//     // If this is the first link or previous is completed, unlock it
//     if (linkIndex === 0 || linkProgress[prevLinkKey]) {
//       // Start 24 hour countdown for next link
//       if (linkIndex < 49) { // Assuming max 50 links
//         const nextLinkKey = `${courseName}_part${partIndex}_link${linkIndex + 1}`;
//         const endTime = new Date().getTime() + 24 * 60 * 60 * 1000; // 24 hours from now
        
//         setCountdowns(prev => ({ 
//           ...prev, 
//           [nextLinkKey]: endTime 
//         }));
        
//         // Save to localStorage immediately
//         if (user) {
//           const updatedCountdowns = {...countdowns, [nextLinkKey]: endTime};
//           localStorage.setItem(`countdowns_${user.uid}`, JSON.stringify(updatedCountdowns));
//         }
//       }
      
//       // Mark current link as completed
//       setLinkProgress(prev => ({ ...prev, [linkKey]: true }));
      
//       // Save to localStorage immediately
//       if (user) {
//         const updatedProgress = {...linkProgress, [linkKey]: true};
//         localStorage.setItem(`progress_${user.uid}`, JSON.stringify(updatedProgress));
//       }
      
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
  
//   // ✅ Modified formatCountdown function to show hours, minutes, and seconds
//   const formatCountdown = (milliseconds) => {
//     const totalSeconds = Math.ceil(milliseconds / 1000);
//     const hours = Math.floor(totalSeconds / 3600);
//     const minutes = Math.floor((totalSeconds % 3600) / 60);
//     const seconds = totalSeconds % 60;
    
//     // Always show hours, minutes, and seconds
//     return `${hours}h ${minutes}m ${seconds}s`;
//   };
//   const getCountdownTime = (key) => {
//     if (!countdowns[key]) return null;
    
//     // Ensure it's a number
//     const endTime = typeof countdowns[key] === 'number' 
//       ? countdowns[key] 
//       : countdowns[key].toMillis();
      
//     const distance = endTime - new Date().getTime();
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
//               animationDelay: `${Math.random() * 2}s`,
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
//             onClick={handleLogout} // ✅ Use the new logout handler
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
//                                       disabled={!canAccess || (countdownTime !== null && countdownTime > 0)}
//                                       className={`w-full font-medium py-3 px-4 rounded-lg transition duration-300 transform flex items-center justify-center ${
//                                         isUnlocked 
//                                           ? "bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
//                                           : canAccess && (countdownTime === null || countdownTime === 0)
//                                             ? "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
//                                             : "bg-gray-700 text-gray-400 cursor-not-allowed"
//                                       }`}
//                                     >
//                                       <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
//                                         <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd" />
//                                       </svg>
//                                       {`${courseName} - Part ${index + 1}`}
//                                     </button>
                                    
//                                     {/* Status indicators */}
//                                     <div className="mt-2 text-xs text-center">
//                                       {isUnlocked ? (
//                                         <span className="text-green-400">✓ Completed</span>
//                                       ) : countdownTime !== null && countdownTime > 0 ? (
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

//                       {/* =========================================================== */}
//                       {/* <h1>hahaahh</h1> */}
//                       {/* Beautiful animated button at the end of each course section */}
//                 <div className="mt-16 text-center">
//   <div className="relative inline-block group">
//     {/* Outer glow effect */}
//     <div className="absolute -inset-4 bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 rounded-full blur-xl opacity-75 group-hover:opacity-100 transition duration-1000 animate-pulse"></div>
    
//     {/* Middle glow effect */}
//     <div className="absolute -inset-2 bg-gradient-to-r from-yellow-400 via-pink-400 to-purple-400 rounded-full blur-lg opacity-90 group-hover:opacity-100 transition duration-700 animate-ping"></div>
    
//     {/* Button container */}
//     <div className="relative">
//       <button 
//         onClick={() => {
//           // YouTube redirect
//           // window.open("https://www.youtube.com", "_blank");
//           window.open("https://www.udemy.com/course/codewithharry-web-development-course/?couponCode=LETSLEARNNOW", "_blank");

//           // agar same tab mein chahiye to:
//           // window.location.href = "https://www.youtube.com";
//         }}
//         className="relative bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-600 text-white font-bold text-2xl py-5 px-10 rounded-full shadow-2xl transform transition-all duration-500 hover:scale-110 hover:shadow-pink-500/50 flex items-center justify-center overflow-hidden"
//       >
//         {/* Animated sparkles */}
//         {[...Array(6)].map((_, i) => (
//           <span 
//             key={i}
//             className="absolute text-yellow-300 animate-ping"
//             style={{
//               top: `${Math.random() * 100}%`,
//               left: `${Math.random() * 100}%`,
//               animationDelay: `${i * 0.2}s`,
//               opacity: 0.7
//             }}
//           >
//             ✨
//           </span>
//         ))}
        
//         <span className="relative z-10">Hi bohot zydaaa khobsorat hu</span>
//         <span className="ml-2 relative z-10">❤️</span>
//       </button>
//     </div>
//   </div>
  
//   <div className="mt-6 max-w-2xl mx-auto">
//     <p className="text-gray-300 text-lg">
//       <span className="font-bold text-pink-400">You're very beautiful too!</span> 
//       We're delighted to have you here. Your presence makes our course complete! 💖
//     </p>
//   </div>
// </div>



//                 {/* ====================================================================================================== */}
























                      
//                       <div className="mt-4 text-sm text-gray-500">
//                         {part.nonEmptyCount || part.fields.filter(f => f.trim()).length} resources
//                       </div>
//                     </div>
//                   ))}
//                 </div>
                



//                   {/* ====================================================================================== */}
                
//                       {/* Beautiful animated button at the end of each course section */}
//                       {/* <div className="mt-16 text-center"> */}
//                         <div className="relative inline-block group">
//                           {/* Outer glow effect */}
//                           {/* <div className="absolute -inset-4 bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 rounded-full blur-xl opacity-75 group-hover:opacity-100 transition duration-1000 animate-pulse"></div> */}
                          
//                           {/* Middle glow effect */}
//                           {/* <div className="absolute -inset-2 bg-gradient-to-r from-yellow-400 via-pink-400 to-purple-400 rounded-full blur-lg opacity-90 group-hover:opacity-100 transition duration-700 animate-ping"></div> */}
                          
//                           {/* Button container */}
//                           {/* <div className="relative"> */}
//                             {/* <button 
//                               onClick={() => {
//                                 // Create a beautiful notification
//                                 const notification = document.createElement('div');
//                                 notification.className = 'fixed top-4 right-4 bg-gradient-to-r from-pink-500 to-purple-600 text-white p-6 rounded-2xl shadow-2xl z-50 transform transition-all duration-500 scale-0';
//                                 notification.innerHTML = `
//                                   <div class="flex items-center">
//                                     <div class="mr-4 text-3xl">😍</div>
//                                     <div>
//                                       <h3 class="text-xl font-bold">Thank you!</h3>
//                                       <p>You're amazing! We're glad you love our course!</p>
//                                     </div>
//                                   </div>
//                                 `;
//                                 document.body.appendChild(notification);
                                
//                                 // Animate in
//                                 setTimeout(() => {
//                                   notification.classList.remove('scale-0');
//                                   notification.classList.add('scale-100');
//                                 }, 10);
                                
//                                 // Animate out and remove
//                                 setTimeout(() => {
//                                   notification.classList.remove('scale-100');
//                                   notification.classList.add('scale-0');
//                                   setTimeout(() => {
//                                     document.body.removeChild(notification);
//                                   }, 500);
//                                 }, 3000);
//                               }}
//                               className="relative bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-600 text-white font-bold text-2xl py-5 px-10 rounded-full shadow-2xl transform transition-all duration-500 hover:scale-110 hover:shadow-pink-500/50 flex items-center justify-center overflow-hidden"
//                             > */}
//                               {/* Animated sparkles
//                               {[...Array(6)].map((_, i) => (
//                                 <span 
//                                   key={i}
//                                   className="absolute text-yellow-300 animate-ping"
//                                   style={{
//                                     top: `${Math.random() * 100}%`,
//                                     left: `${Math.random() * 100}%`,
//                                     animationDelay: `${i * 0.2}s`,
//                                     opacity: 0.7
//                                   }}
//                                 >
//                                   ✨
//                                 </span>
//                               ))} */}
                              
//                               {/* <span className="relative z-10">Hi bohot zydaaa khobsorat hu</span>
//                               <span className="ml-2 relative z-10">❤️</span> */}
//                             {/* </button> */}
//                           {/* </div> */}
//                         </div>
                        
//                         {/* <div className="mt-6 max-w-2xl mx-auto">
//                           <p className="text-gray-300 text-lg">
//                             <span className="font-bold text-pink-400">You're very beautiful too!</span> 
//                             We're delighted to have you here. Your presence makes our course complete! 💖
//                           </p>
//                         </div> */}
//                       {/* </div> */}

//                 {/* ====================================================================================================== */}





                
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
        
//         @keyframes tilt {
//           0%, 100% { transform: rotate(0deg); }
//           25% { transform: rotate(1deg); }
//           75% { transform: rotate(-1deg); }
//         }
//         .animate-tilt {
//           animation: tilt 5s infinite linear;
//         }
//       `}</style>
//     </div>
//   );
// }

// ========================================================================





















// "use client";
// import { useEffect, useState, useMemo } from "react";
// import { auth, db } from "@/lib/firebase";
// import { onAuthStateChanged, signOut } from "firebase/auth";
// import { collection, getDocs, query, orderBy, doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
// import { enableIndexedDbPersistence } from "firebase/firestore";
// export default function UserPage() {
//   const [user, setUser] = useState(null);
//   const [isLoading, setIsLoading] = useState(true);
//   const [content, setContent] = useState([]);
//   const [error, setError] = useState("");
//   const [linkProgress, setLinkProgress] = useState({});
//   const [countdowns, setCountdowns] = useState({});
//   const [userProgressDoc, setUserProgressDoc] = useState(null);
//   const [gumroadLink, setGumroadLink] = useState(""); // State for Gumroad link
  
//   // ✅ Enable Firestore persistence for caching
//   useEffect(() => {
//     const enablePersistence = async () => {
//       try {
//         await enableIndexedDbPersistence(db);
//       } catch (err) {
//         if (err.code == 'failed-precondition') {
//           console.log("Multiple tabs open, persistence can only be enabled in one tab at a time.");
//         } else if (err.code == 'unimplemented') {
//           console.log("The current browser doesn't support persistence.");
//         }
//       }
//     };
//     enablePersistence();
//   }, []);
  
//   useEffect(() => {
//     const unsub = onAuthStateChanged(auth, async (u) => {
//       if (!u) {
//         window.location.href = "/login";
//       } else {
//         setUser(u);
//         setIsLoading(false);
        
//         // ✅ Update user status to online in Firestore
//         try {
//           const userRef = doc(db, "users", u.uid);
//           await updateDoc(userRef, {
//             isOnline: true,
//             lastActive: new Date()
//           });
//         } catch (error) {
//           console.error("Error updating user status:", error);
//         }
        
//         // ✅ Load from localStorage first for instant UI
//         const savedProgress = localStorage.getItem(`progress_${u.uid}`);
//         const savedCountdowns = localStorage.getItem(`countdowns_${u.uid}`);
        
//         if (savedProgress) setLinkProgress(JSON.parse(savedProgress));
//         if (savedCountdowns) {
//           // Convert stored timestamps to numbers
//           const parsedCountdowns = JSON.parse(savedCountdowns);
//           const numericCountdowns = {};
          
//           Object.keys(parsedCountdowns).forEach(key => {
//             numericCountdowns[key] = typeof parsedCountdowns[key] === 'object' 
//               ? parsedCountdowns[key].valueOf() 
//               : parsedCountdowns[key];
//           });
          
//           setCountdowns(numericCountdowns);
//         }
//       }
//     });
//     return () => unsub();
//   }, []);
  
//   // ✅ Fetch user progress ONLY once when user logs in
//   useEffect(() => {
//     const fetchUserProgress = async () => {
//       if (!user) return;
      
//       try {
//         const userProgressRef = doc(db, "userProgress", user.uid);
//         const docSnap = await getDoc(userProgressRef);
        
//         if (docSnap.exists()) {
//           const userData = docSnap.data();
//           setLinkProgress(userData.linkProgress || {});
          
//           // Convert Firestore timestamps to numeric values
//           const numericCountdowns = {};
//           if (userData.countdowns) {
//             Object.keys(userData.countdowns).forEach(key => {
//               numericCountdowns[key] = typeof userData.countdowns[key] === 'object' 
//                 ? userData.countdowns[key].toMillis() 
//                 : userData.countdowns[key];
//             });
//           }
          
//           setCountdowns(numericCountdowns);
          
//           // ✅ Save to localStorage for future visits
//           localStorage.setItem(`progress_${user.uid}`, JSON.stringify(userData.linkProgress || {}));
//           localStorage.setItem(`countdowns_${user.uid}`, JSON.stringify(numericCountdowns));
//         } else {
//           await setDoc(userProgressRef, {
//             userId: user.uid,
//             linkProgress: {},
//             countdowns: {},
//             createdAt: new Date()
//           });
//         }
//         setUserProgressDoc(userProgressRef);
//       } catch (err) {
//         console.error("Error fetching user progress:", err);
//         setError("Failed to load user progress");
//       }
//     };
//     if (user) {
//       fetchUserProgress();
//     }
//   }, [user]);
  
//   // ✅ Fetch content ONLY once (with caching)
//   useEffect(() => {
//     const fetchContent = async () => {
//       // ✅ Check cache first
//       const cachedContent = localStorage.getItem('cachedContent');
//       const cachedTimestamp = localStorage.getItem('cachedContentTimestamp');
      
//       // If cache exists and is less than 1 hour old, use it
//       if (cachedContent && cachedTimestamp && (Date.now() - cachedTimestamp < 3600000)) {
//         setContent(JSON.parse(cachedContent));
//         return;
//       }
      
//       try {
//         const q = query(collection(db, "adminContent"), orderBy("createdAt", "desc"));
//         const querySnapshot = await getDocs(q);
//         const contentData = [];
//         querySnapshot.forEach((doc) => {
//           contentData.push({ id: doc.id, ...doc.data() });
//         });
        
//         setContent(contentData);
//         // ✅ Cache the content
//         localStorage.setItem('cachedContent', JSON.stringify(contentData));
//         localStorage.setItem('cachedContentTimestamp', Date.now());
//       } catch (err) {
//         console.error("Error fetching content:", err);
//         setError("Failed to load content");
//       }
//     };
    
//     if (user) fetchContent();
//   }, [user]);
  
//   // ✅ Fetch Gumroad link from Firestore
//   useEffect(() => {
//     const fetchGumroadLink = async () => {
//       try {
//         const configDoc = await getDoc(doc(db, "config", "gumroad"));
//         if (configDoc.exists()) {
//           const data = configDoc.data();
//           // Try multiple possible field names
//           const url = data.url || data.gumroadUrl || data.link || "";
//           if (url) {
//             setGumroadLink(url);
//           }
//         }
//       } catch (err) {
//         console.error("Error fetching Gumroad link:", err);
//       }
//     };
    
//     if (user) {
//       fetchGumroadLink();
//     }
//   }, [user]);
  
//   // ✅ Save progress to Firestore ONLY when changes occur (not on every render)
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
    
//     // ✅ Debounce Firestore writes to prevent too many requests
//     const timer = setTimeout(() => {
//       if (Object.keys(linkProgress).length > 0 || Object.keys(countdowns).length > 0) {
//         saveProgressToFirestore();
//       }
//     }, 2000); // Save every 2 seconds after changes
    
//     return () => clearTimeout(timer);
//   }, [linkProgress, countdowns, user, userProgressDoc]);
  
//   // ✅ Handle countdown timers LOCALLY (no Firestore reads/writes)
//   useEffect(() => {
//    if (!user) return;
//    const interval = setInterval(() => {
//      setCountdowns(prev => {
//        const updated = { ...prev };
//        Object.entries(prev).forEach(([key, endTime]) => {
//          const endTimeMs = typeof endTime === 'number' ? endTime : endTime.toMillis();
//          if (endTimeMs - Date.now() <= 0) {
//            delete updated[key];
//          }
//        });
//        if (JSON.stringify(updated) !== JSON.stringify(prev)) {
//          localStorage.setItem(`countdowns_${user.uid}`, JSON.stringify(updated));
//        }
//        return updated;
//      });
//    }, 1000);
//    return () => clearInterval(interval);
//  }, [user]);
  
//   // ✅ Function to handle logout with status update
//   const handleLogout = async () => {
//     try {
//       // Update user status to offline before signing out
//       if (user) {
//         const userRef = doc(db, "users", user.uid);
//         await updateDoc(userRef, {
//           isOnline: false,
//           lastActive: new Date()
//         });
//       }
      
//       // Sign out from Firebase Auth
//       await signOut(auth);
      
//       // Clear local storage
//       if (user) {
//         localStorage.removeItem(`progress_${user.uid}`);
//         localStorage.removeItem(`countdowns_${user.uid}`);
//       }
      
//       // Redirect to login page
//       window.location.href = "/login";
      
//     } catch (error) {
//       console.error("Error during logout:", error);
//       // Still try to sign out even if status update fails
//       await signOut(auth);
//       window.location.href = "/login";
//     }
//   };
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
//   const getTime = (val) => {
//     if (!val) return 0;
//     // Firestore Timestamp
//     if (typeof val.toDate === 'function') return val.toDate().getTime();
//     // JS Date
//     if (val instanceof Date) return val.getTime();
//     // Already a timestamp number
//     if (typeof val === 'number') return val;
//     return 0;
//   };
//   const dateA = getTime(a.createdAt);
//   const dateB = getTime(b.createdAt);
//   return dateA - dateB;
// });
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
//       const endTime = countdowns[linkKey];
//       const remainingTime = Math.ceil((endTime - new Date().getTime()) / 1000);
      
//       if (remainingTime > 0) {
//         const hours = Math.floor(remainingTime / 3600);
//         const minutes = Math.floor((remainingTime % 3600) / 60);
//         const seconds = remainingTime % 60;
//         alert(`Please wait ${hours}h ${minutes}m ${seconds}s before accessing this resource.`);
//         return;
//       }
//     }
    
//     // If this is the first link or previous is completed, unlock it
//     if (linkIndex === 0 || linkProgress[prevLinkKey]) {
//       // Start 24 hour countdown for next link
//       if (linkIndex < 49) { // Assuming max 50 links
//         const nextLinkKey = `${courseName}_part${partIndex}_link${linkIndex + 1}`;
//         const endTime = new Date().getTime() + 24 * 60 * 60 * 1000; // 24 hours from now
        
//         setCountdowns(prev => ({ 
//           ...prev, 
//           [nextLinkKey]: endTime 
//         }));
        
//         // Save to localStorage immediately
//         if (user) {
//           const updatedCountdowns = {...countdowns, [nextLinkKey]: endTime};
//           localStorage.setItem(`countdowns_${user.uid}`, JSON.stringify(updatedCountdowns));
//         }
//       }
      
//       // Mark current link as completed
//       setLinkProgress(prev => ({ ...prev, [linkKey]: true }));
      
//       // Save to localStorage immediately
//       if (user) {
//         const updatedProgress = {...linkProgress, [linkKey]: true};
//         localStorage.setItem(`progress_${user.uid}`, JSON.stringify(updatedProgress));
//       }
      
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
  
//   // ✅ Modified formatCountdown function to show hours, minutes, and seconds
//   const formatCountdown = (milliseconds) => {
//     const totalSeconds = Math.ceil(milliseconds / 1000);
//     const hours = Math.floor(totalSeconds / 3600);
//     const minutes = Math.floor((totalSeconds % 3600) / 60);
//     const seconds = totalSeconds % 60;
    
//     // Always show hours, minutes, and seconds
//     return `${hours}h ${minutes}m ${seconds}s`;
//   };
//   const getCountdownTime = (key) => {
//     if (!countdowns[key]) return null;
    
//     // Ensure it's a number
//     const endTime = typeof countdowns[key] === 'number' 
//       ? countdowns[key] 
//       : countdowns[key].toMillis();
      
//     const distance = endTime - new Date().getTime();
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
//               animationDelay: `${Math.random() * 2}s`,
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
//             onClick={handleLogout} // ✅ Use the new logout handler
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
//                                       disabled={!canAccess || (countdownTime !== null && countdownTime > 0)}
//                                       className={`w-full font-medium py-3 px-4 rounded-lg transition duration-300 transform flex items-center justify-center ${
//                                         isUnlocked 
//                                           ? "bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
//                                           : canAccess && (countdownTime === null || countdownTime === 0)
//                                             ? "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
//                                             : "bg-gray-700 text-gray-400 cursor-not-allowed"
//                                       }`}
//                                     >
//                                       <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
//                                         <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd" />
//                                       </svg>
//                                       {`${courseName} - Part ${index + 1}`}
//                                     </button>
                                    
//                                     {/* Status indicators */}
//                                     <div className="mt-2 text-xs text-center">
//                                       {isUnlocked ? (
//                                         <span className="text-green-400">✓ Completed</span>
//                                       ) : countdownTime !== null && countdownTime > 0 ? (
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
                
//                 {/* Gumroad button at the bottom of each course section */}
//                 {gumroadLink && (
//                   <div className="mt-12 text-center">
//                     <div className="inline-block relative group">
//                       {/* Glowing effect */}
//                       <div className="absolute -inset-1 bg-gradient-to-r from-yellow-400 via-orange-500 to-pink-500 rounded-2xl blur opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-tilt"></div>
                      
//                       {/* Button container */}
//                       <div className="relative bg-black rounded-2xl p-0.5">
//                         <button 
//                           onClick={() => window.open(gumroadLink, "_blank", "noopener,noreferrer")}
//                           className="relative block w-full py-6 px-12 bg-gradient-to-r from-yellow-400 via-orange-400 to-pink-500 text-black font-extrabold text-2xl rounded-xl shadow-2xl transform transition-all duration-500 hover:scale-105 hover:shadow-pink-500/50"
//                         >
//                           <div className="flex flex-col items-center">
//                             <span className="mb-2">Full Course in 1 Click</span>
//                             <span className="text-sm font-normal">Get full course in just one click</span>
//                           </div>
//                         </button>
//                       </div>
//                     </div>
                    
//                     <div className="mt-6 max-w-2xl mx-auto">
//                       <p className="text-gray-300">
//                         <span className="font-bold text-yellow-300">⚡ INSTANT ACCESS:</span> Get all resources for <span className="font-bold text-purple-400">{courseName}</span> without waiting for countdowns. 
//                         Click the button above to unlock everything immediately!
//                       </p>
//                     </div>
//                   </div>
//                 )}
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
        
//         @keyframes tilt {
//           0%, 100% { transform: rotate(0deg); }
//           25% { transform: rotate(1deg); }
//           75% { transform: rotate(-1deg); }
//         }
//         .animate-tilt {
//           animation: tilt 5s infinite linear;
//         }
//       `}</style>
//     </div>
//   );
// }






















// "use client";
// import { useEffect, useState, useMemo } from "react";
// import { auth, db } from "@/lib/firebase";
// import { onAuthStateChanged, signOut } from "firebase/auth";
// import { collection, getDocs, query, orderBy, doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
// import { enableIndexedDbPersistence } from "firebase/firestore";
// export default function UserPage() {
//   const [user, setUser] = useState(null);
//   const [isLoading, setIsLoading] = useState(true);
//   const [content, setContent] = useState([]);
//   const [error, setError] = useState("");
//   const [linkProgress, setLinkProgress] = useState({});
//   const [countdowns, setCountdowns] = useState({});
//   const [userProgressDoc, setUserProgressDoc] = useState(null);
//   const [gumroadLink, setGumroadLink] = useState(""); // State for Gumroad link
  
//   // ✅ Enable Firestore persistence for caching
//   useEffect(() => {
//     const enablePersistence = async () => {
//       try {
//         await enableIndexedDbPersistence(db);
//       } catch (err) {
//         if (err.code == 'failed-precondition') {
//           console.log("Multiple tabs open, persistence can only be enabled in one tab at a time.");
//         } else if (err.code == 'unimplemented') {
//           console.log("The current browser doesn't support persistence.");
//         }
//       }
//     };
//     enablePersistence();
//   }, []);
  
//   useEffect(() => {
//     const unsub = onAuthStateChanged(auth, async (u) => {
//       if (!u) {
//         window.location.href = "/login";
//       } else {
//         setUser(u);
//         setIsLoading(false);
        
//         // ✅ Update user status to online in Firestore
//         try {
//           const userRef = doc(db, "users", u.uid);
//           await updateDoc(userRef, {
//             isOnline: true,
//             lastActive: new Date()
//           });
//         } catch (error) {
//           console.error("Error updating user status:", error);
//         }
        
//         // ✅ Load from localStorage first for instant UI
//         const savedProgress = localStorage.getItem(`progress_${u.uid}`);
//         const savedCountdowns = localStorage.getItem(`countdowns_${u.uid}`);
        
//         if (savedProgress) setLinkProgress(JSON.parse(savedProgress));
//         if (savedCountdowns) {
//           // Convert stored timestamps to numbers
//           const parsedCountdowns = JSON.parse(savedCountdowns);
//           const numericCountdowns = {};
          
//           Object.keys(parsedCountdowns).forEach(key => {
//             numericCountdowns[key] = typeof parsedCountdowns[key] === 'object' 
//               ? parsedCountdowns[key].valueOf() 
//               : parsedCountdowns[key];
//           });
          
//           setCountdowns(numericCountdowns);
//         }
//       }
//     });
//     return () => unsub();
//   }, []);
  
//   // ✅ Fetch user progress ONLY once when user logs in
//   useEffect(() => {
//     const fetchUserProgress = async () => {
//       if (!user) return;
      
//       try {
//         const userProgressRef = doc(db, "userProgress", user.uid);
//         const docSnap = await getDoc(userProgressRef);
        
//         if (docSnap.exists()) {
//           const userData = docSnap.data();
//           setLinkProgress(userData.linkProgress || {});
          
//           // Convert Firestore timestamps to numeric values
//           const numericCountdowns = {};
//           if (userData.countdowns) {
//             Object.keys(userData.countdowns).forEach(key => {
//               numericCountdowns[key] = typeof userData.countdowns[key] === 'object' 
//                 ? userData.countdowns[key].toMillis() 
//                 : userData.countdowns[key];
//             });
//           }
          
//           setCountdowns(numericCountdowns);
          
//           // ✅ Save to localStorage for future visits
//           localStorage.setItem(`progress_${user.uid}`, JSON.stringify(userData.linkProgress || {}));
//           localStorage.setItem(`countdowns_${user.uid}`, JSON.stringify(numericCountdowns));
//         } else {
//           await setDoc(userProgressRef, {
//             userId: user.uid,
//             linkProgress: {},
//             countdowns: {},
//             createdAt: new Date()
//           });
//         }
//         setUserProgressDoc(userProgressRef);
//       } catch (err) {
//         console.error("Error fetching user progress:", err);
//         setError("Failed to load user progress");
//       }
//     };
//     if (user) {
//       fetchUserProgress();
//     }
//   }, [user]);
  
//   // ✅ Fetch content ONLY once (with caching)
//   useEffect(() => {
//     const fetchContent = async () => {
//       // ✅ Check cache first
//       const cachedContent = localStorage.getItem('cachedContent');
//       const cachedTimestamp = localStorage.getItem('cachedContentTimestamp');
      
//       // If cache exists and is less than 1 hour old, use it
//       if (cachedContent && cachedTimestamp && (Date.now() - cachedTimestamp < 3600000)) {
//         setContent(JSON.parse(cachedContent));
//         return;
//       }
      
//       try {
//         const q = query(collection(db, "adminContent"), orderBy("createdAt", "desc"));
//         const querySnapshot = await getDocs(q);
//         const contentData = [];
//         querySnapshot.forEach((doc) => {
//           contentData.push({ id: doc.id, ...doc.data() });
//         });
        
//         setContent(contentData);
//         // ✅ Cache the content
//         localStorage.setItem('cachedContent', JSON.stringify(contentData));
//         localStorage.setItem('cachedContentTimestamp', Date.now());
//       } catch (err) {
//         console.error("Error fetching content:", err);
//         setError("Failed to load content");
//       }
//     };
    
//     if (user) fetchContent();
//   }, [user]);
  
//   // ✅ Fetch Gumroad link from Firestore - FIXED VERSION
//   useEffect(() => {
//     const fetchGumroadLink = async () => {
//       try {
//         console.log("Fetching Gumroad link...");
//         const configDoc = await getDoc(doc(db, "config", "gumroad"));
//         console.log("Config doc exists:", configDoc.exists());
        
//         if (configDoc.exists()) {
//           const data = configDoc.data();
//           console.log("Config data:", data);
          
//           // Try multiple possible field names
//           const url = data.url || data.gumroadUrl || data.link || "";
//           console.log("Found URL:", url);
          
//           if (url) {
//             setGumroadLink(url);
//           } else {
//             console.log("No URL found in config document");
//           }
//         } else {
//           console.log("Gumroad config document does not exist");
//         }
//       } catch (err) {
//         console.error("Error fetching Gumroad link:", err);
//       }
//     };
    
//     if (user) {
//       fetchGumroadLink();
//     }
//   }, [user]);
  
//   // ✅ Save progress to Firestore ONLY when changes occur (not on every render)
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
    
//     // ✅ Debounce Firestore writes to prevent too many requests
//     const timer = setTimeout(() => {
//       if (Object.keys(linkProgress).length > 0 || Object.keys(countdowns).length > 0) {
//         saveProgressToFirestore();
//       }
//     }, 2000); // Save every 2 seconds after changes
    
//     return () => clearTimeout(timer);
//   }, [linkProgress, countdowns, user, userProgressDoc]);
  
//   // ✅ Handle countdown timers LOCALLY (no Firestore reads/writes)
//   useEffect(() => {
//    if (!user) return;
//    const interval = setInterval(() => {
//      setCountdowns(prev => {
//        const updated = { ...prev };
//        Object.entries(prev).forEach(([key, endTime]) => {
//          const endTimeMs = typeof endTime === 'number' ? endTime : endTime.toMillis();
//          if (endTimeMs - Date.now() <= 0) {
//            delete updated[key];
//          }
//        });
//        if (JSON.stringify(updated) !== JSON.stringify(prev)) {
//          localStorage.setItem(`countdowns_${user.uid}`, JSON.stringify(updated));
//        }
//        return updated;
//      });
//    }, 1000);
//    return () => clearInterval(interval);
//  }, [user]);
  
//   // ✅ Function to handle logout with status update
//   const handleLogout = async () => {
//     try {
//       // Update user status to offline before signing out
//       if (user) {
//         const userRef = doc(db, "users", user.uid);
//         await updateDoc(userRef, {
//           isOnline: false,
//           lastActive: new Date()
//         });
//       }
      
//       // Sign out from Firebase Auth
//       await signOut(auth);
      
//       // Clear local storage
//       if (user) {
//         localStorage.removeItem(`progress_${user.uid}`);
//         localStorage.removeItem(`countdowns_${user.uid}`);
//       }
      
//       // Redirect to login page
//       window.location.href = "/login";
      
//     } catch (error) {
//       console.error("Error during logout:", error);
//       // Still try to sign out even if status update fails
//       await signOut(auth);
//       window.location.href = "/login";
//     }
//   };
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
//   const getTime = (val) => {
//     if (!val) return 0;
//     // Firestore Timestamp
//     if (typeof val.toDate === 'function') return val.toDate().getTime();
//     // JS Date
//     if (val instanceof Date) return val.getTime();
//     // Already a timestamp number
//     if (typeof val === 'number') return val;
//     return 0;
//   };
//   const dateA = getTime(a.createdAt);
//   const dateB = getTime(b.createdAt);
//   return dateA - dateB;
// });
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
//       const endTime = countdowns[linkKey];
//       const remainingTime = Math.ceil((endTime - new Date().getTime()) / 1000);
      
//       if (remainingTime > 0) {
//         const hours = Math.floor(remainingTime / 3600);
//         const minutes = Math.floor((remainingTime % 3600) / 60);
//         const seconds = remainingTime % 60;
//         alert(`Please wait ${hours}h ${minutes}m ${seconds}s before accessing this resource.`);
//         return;
//       }
//     }
    
//     // If this is the first link or previous is completed, unlock it
//     if (linkIndex === 0 || linkProgress[prevLinkKey]) {
//       // Start 24 hour countdown for next link
//       if (linkIndex < 49) { // Assuming max 50 links
//         const nextLinkKey = `${courseName}_part${partIndex}_link${linkIndex + 1}`;
//         const endTime = new Date().getTime() + 24 * 60 * 60 * 1000; // 24 hours from now
        
//         setCountdowns(prev => ({ 
//           ...prev, 
//           [nextLinkKey]: endTime 
//         }));
        
//         // Save to localStorage immediately
//         if (user) {
//           const updatedCountdowns = {...countdowns, [nextLinkKey]: endTime};
//           localStorage.setItem(`countdowns_${user.uid}`, JSON.stringify(updatedCountdowns));
//         }
//       }
      
//       // Mark current link as completed
//       setLinkProgress(prev => ({ ...prev, [linkKey]: true }));
      
//       // Save to localStorage immediately
//       if (user) {
//         const updatedProgress = {...linkProgress, [linkKey]: true};
//         localStorage.setItem(`progress_${user.uid}`, JSON.stringify(updatedProgress));
//       }
      
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
  
//   // ✅ Modified formatCountdown function to show hours, minutes, and seconds
//   const formatCountdown = (milliseconds) => {
//     const totalSeconds = Math.ceil(milliseconds / 1000);
//     const hours = Math.floor(totalSeconds / 3600);
//     const minutes = Math.floor((totalSeconds % 3600) / 60);
//     const seconds = totalSeconds % 60;
    
//     // Always show hours, minutes, and seconds
//     return `${hours}h ${minutes}m ${seconds}s`;
//   };
//   const getCountdownTime = (key) => {
//     if (!countdowns[key]) return null;
    
//     // Ensure it's a number
//     const endTime = typeof countdowns[key] === 'number' 
//       ? countdowns[key] 
//       : countdowns[key].toMillis();
      
//     const distance = endTime - new Date().getTime();
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
//               animationDelay: `${Math.random() * 2}s`,
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
//             onClick={handleLogout} // ✅ Use the new logout handler
//             className="px-8 py-3 bg-gradient-to-r from-red-600 to-red-800 text-white font-bold rounded-full transform transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-red-500/30 flex items-center justify-center group"
//           >
//             Logout
//           </button>
//         </div>
        
//         {/* Add the attention-grabbing Gumroad button */}
//         {gumroadLink ? (
//           <div className="mb-10 text-center animate-pulse">
//             <div className="bg-gradient-to-r from-purple-900 via-purple-700 to-pink-700 p-1 rounded-2xl shadow-2xl transform hover:scale-105 transition-transform duration-500 inline-block">
//               <button 
//                 onClick={() => window.open(gumroadLink, "_blank", "noopener,noreferrer")}
//                 className="px-12 py-5 bg-gradient-to-r from-yellow-400 via-orange-400 to-pink-500 text-black font-extrabold text-2xl rounded-xl shadow-lg hover:shadow-2xl transform hover:scale-105 transition-all duration-300 flex items-center justify-center mx-auto"
//               >
//                 <span className="mr-3">🚀</span>
//                 GET FULL COURSE IN 1 CLICK
//                 <span className="ml-3">🔥</span>
//               </button>
//             </div>
//             <p className="mt-4 text-gray-300 text-lg max-w-2xl mx-auto">
//               If you want to get <span className="font-bold text-yellow-300">ALL COURSES</span> without waiting for countdowns, 
//               click the button above to unlock everything instantly!
//             </p>
//           </div>
//         ) : (
//           <div className="mb-10 text-center">
//             <div className="bg-yellow-900 bg-opacity-50 p-4 rounded-lg inline-block">
//               <p className="text-yellow-300">Premium offer not available at this time. Check back later!</p>
//             </div>
//           </div>
//         )}
        
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
//                                       disabled={!canAccess || (countdownTime !== null && countdownTime > 0)}
//                                       className={`w-full font-medium py-3 px-4 rounded-lg transition duration-300 transform flex items-center justify-center ${
//                                         isUnlocked 
//                                           ? "bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
//                                           : canAccess && (countdownTime === null || countdownTime === 0)
//                                             ? "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
//                                             : "bg-gray-700 text-gray-400 cursor-not-allowed"
//                                       }`}
//                                     >
//                                       <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
//                                         <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd" />
//                                       </svg>
//                                       {`${courseName} - Part ${index + 1}`}
//                                     </button>
                                    
//                                     {/* Status indicators */}
//                                     <div className="mt-2 text-xs text-center">
//                                       {isUnlocked ? (
//                                         <span className="text-green-400">✓ Completed</span>
//                                       ) : countdownTime !== null && countdownTime > 0 ? (
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



















// "use client";
// import { useEffect, useState, useMemo } from "react";
// import { auth, db } from "@/lib/firebase";
// import { onAuthStateChanged, signOut } from "firebase/auth";
// import { collection, getDocs, query, orderBy, doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
// import { enableIndexedDbPersistence } from "firebase/firestore";

// export default function UserPage() {
//   const [user, setUser] = useState(null);
//   const [isLoading, setIsLoading] = useState(true);
//   const [content, setContent] = useState([]);
//   const [error, setError] = useState("");
//   const [linkProgress, setLinkProgress] = useState({});
//   const [countdowns, setCountdowns] = useState({});
//   const [userProgressDoc, setUserProgressDoc] = useState(null);
//   const [gumroadLink, setGumroadLink] = useState(""); // State for Gumroad link
  
//   // ✅ Enable Firestore persistence for caching
//   useEffect(() => {
//     const enablePersistence = async () => {
//       try {
//         await enableIndexedDbPersistence(db);
//       } catch (err) {
//         if (err.code == 'failed-precondition') {
//           console.log("Multiple tabs open, persistence can only be enabled in one tab at a time.");
//         } else if (err.code == 'unimplemented') {
//           console.log("The current browser doesn't support persistence.");
//         }
//       }
//     };
//     enablePersistence();
//   }, []);
  
//   useEffect(() => {
//     const unsub = onAuthStateChanged(auth, async (u) => {
//       if (!u) {
//         window.location.href = "/login";
//       } else {
//         setUser(u);
//         setIsLoading(false);
        
//         // ✅ Update user status to online in Firestore
//         try {
//           const userRef = doc(db, "users", u.uid);
//           await updateDoc(userRef, {
//             isOnline: true,
//             lastActive: new Date()
//           });
//         } catch (error) {
//           console.error("Error updating user status:", error);
//         }
        
//         // ✅ Load from localStorage first for instant UI
//         const savedProgress = localStorage.getItem(`progress_${u.uid}`);
//         const savedCountdowns = localStorage.getItem(`countdowns_${u.uid}`);
        
//         if (savedProgress) setLinkProgress(JSON.parse(savedProgress));
//         if (savedCountdowns) {
//           // Convert stored timestamps to numbers
//           const parsedCountdowns = JSON.parse(savedCountdowns);
//           const numericCountdowns = {};
          
//           Object.keys(parsedCountdowns).forEach(key => {
//             numericCountdowns[key] = typeof parsedCountdowns[key] === 'object' 
//               ? parsedCountdowns[key].valueOf() 
//               : parsedCountdowns[key];
//           });
          
//           setCountdowns(numericCountdowns);
//         }
//       }
//     });
//     return () => unsub();
//   }, []);
  
//   // ✅ Fetch user progress ONLY once when user logs in
//   useEffect(() => {
//     const fetchUserProgress = async () => {
//       if (!user) return;
      
//       try {
//         const userProgressRef = doc(db, "userProgress", user.uid);
//         const docSnap = await getDoc(userProgressRef);
        
//         if (docSnap.exists()) {
//           const userData = docSnap.data();
//           setLinkProgress(userData.linkProgress || {});
          
//           // Convert Firestore timestamps to numeric values
//           const numericCountdowns = {};
//           if (userData.countdowns) {
//             Object.keys(userData.countdowns).forEach(key => {
//               numericCountdowns[key] = typeof userData.countdowns[key] === 'object' 
//                 ? userData.countdowns[key].toMillis() 
//                 : userData.countdowns[key];
//             });
//           }
          
//           setCountdowns(numericCountdowns);
          
//           // ✅ Save to localStorage for future visits
//           localStorage.setItem(`progress_${user.uid}`, JSON.stringify(userData.linkProgress || {}));
//           localStorage.setItem(`countdowns_${user.uid}`, JSON.stringify(numericCountdowns));
//         } else {
//           await setDoc(userProgressRef, {
//             userId: user.uid,
//             linkProgress: {},
//             countdowns: {},
//             createdAt: new Date()
//           });
//         }
//         setUserProgressDoc(userProgressRef);
//       } catch (err) {
//         console.error("Error fetching user progress:", err);
//         setError("Failed to load user progress");
//       }
//     };
//     if (user) {
//       fetchUserProgress();
//     }
//   }, [user]);
  
//   // ✅ Fetch content ONLY once (with caching)
//   useEffect(() => {
//     const fetchContent = async () => {
//       // ✅ Check cache first
//       const cachedContent = localStorage.getItem('cachedContent');
//       const cachedTimestamp = localStorage.getItem('cachedContentTimestamp');
      
//       // If cache exists and is less than 1 hour old, use it
//       if (cachedContent && cachedTimestamp && (Date.now() - cachedTimestamp < 3600000)) {
//         setContent(JSON.parse(cachedContent));
//         return;
//       }
      
//       try {
//         const q = query(collection(db, "adminContent"), orderBy("createdAt", "desc"));
//         const querySnapshot = await getDocs(q);
//         const contentData = [];
//         querySnapshot.forEach((doc) => {
//           contentData.push({ id: doc.id, ...doc.data() });
//         });
        
//         setContent(contentData);
//         // ✅ Cache the content
//         localStorage.setItem('cachedContent', JSON.stringify(contentData));
//         localStorage.setItem('cachedContentTimestamp', Date.now());
//       } catch (err) {
//         console.error("Error fetching content:", err);
//         setError("Failed to load content");
//       }
//     };
    
//     if (user) fetchContent();
//   }, [user]);
  
//   // ✅ Fetch Gumroad link from Firestore
//   useEffect(() => {
//     const fetchGumroadLink = async () => {
//       try {
//         const configDoc = await getDoc(doc(db, "config", "gumroad"));
//         if (configDoc.exists()) {
//           setGumroadLink(configDoc.data().url || "");
//         }
//       } catch (err) {
//         console.error("Error fetching Gumroad link:", err);
//       }
//     };
    
//     if (user) fetchGumroadLink();
//   }, [user]);
  
//   // ✅ Save progress to Firestore ONLY when changes occur (not on every render)
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
    
//     // ✅ Debounce Firestore writes to prevent too many requests
//     const timer = setTimeout(() => {
//       if (Object.keys(linkProgress).length > 0 || Object.keys(countdowns).length > 0) {
//         saveProgressToFirestore();
//       }
//     }, 2000); // Save every 2 seconds after changes
    
//     return () => clearTimeout(timer);
//   }, [linkProgress, countdowns, user, userProgressDoc]);
  
//   // ✅ Handle countdown timers LOCALLY (no Firestore reads/writes)
//   useEffect(() => {
//    if (!user) return;
//    const interval = setInterval(() => {
//      setCountdowns(prev => {
//        const updated = { ...prev };
//        Object.entries(prev).forEach(([key, endTime]) => {
//          const endTimeMs = typeof endTime === 'number' ? endTime : endTime.toMillis();
//          if (endTimeMs - Date.now() <= 0) {
//            delete updated[key];
//          }
//        });
//        if (JSON.stringify(updated) !== JSON.stringify(prev)) {
//          localStorage.setItem(`countdowns_${user.uid}`, JSON.stringify(updated));
//        }
//        return updated;
//      });
//    }, 1000);
//    return () => clearInterval(interval);
//  }, [user]);
  
//   // ✅ Function to handle logout with status update
//   const handleLogout = async () => {
//     try {
//       // Update user status to offline before signing out
//       if (user) {
//         const userRef = doc(db, "users", user.uid);
//         await updateDoc(userRef, {
//           isOnline: false,
//           lastActive: new Date()
//         });
//       }
      
//       // Sign out from Firebase Auth
//       await signOut(auth);
      
//       // Clear local storage
//       if (user) {
//         localStorage.removeItem(`progress_${user.uid}`);
//         localStorage.removeItem(`countdowns_${user.uid}`);
//       }
      
//       // Redirect to login page
//       window.location.href = "/login";
      
//     } catch (error) {
//       console.error("Error during logout:", error);
//       // Still try to sign out even if status update fails
//       await signOut(auth);
//       window.location.href = "/login";
//     }
//   };

//   const groupedContent = useMemo(() => {
//     const visibleContent = content.filter(item => item.visibility !== "hide");
//     const groups = {};
//     visibleContent.forEach(item => {
//       const courseName = item.courseName || "Untitled Course";
//       if (!groups[courseName]) groups[courseName] = [];
//       groups[courseName].push(item);
//     });
//     Object.keys(groups).forEach(courseName => {
//       // groups[courseName].sort((a, b) => {
//       //   const dateA = a.createdAt?.toDate() || new Date(0);
//       //   const dateB = b.createdAt?.toDate() || new Date(0);
//       //   return dateA - dateB;
//       // });
//       groups[courseName].sort((a, b) => {
//   const getTime = (val) => {
//     if (!val) return 0;
//     // Firestore Timestamp
//     if (typeof val.toDate === 'function') return val.toDate().getTime();
//     // JS Date
//     if (val instanceof Date) return val.getTime();
//     // Already a timestamp number
//     if (typeof val === 'number') return val;
//     return 0;
//   };

//   const dateA = getTime(a.createdAt);
//   const dateB = getTime(b.createdAt);
//   return dateA - dateB;
// });
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
//       const endTime = countdowns[linkKey];
//       const remainingTime = Math.ceil((endTime - new Date().getTime()) / 1000);
      
//       if (remainingTime > 0) {
//         const hours = Math.floor(remainingTime / 3600);
//         const minutes = Math.floor((remainingTime % 3600) / 60);
//         const seconds = remainingTime % 60;
//         alert(`Please wait ${hours}h ${minutes}m ${seconds}s before accessing this resource.`);
//         return;
//       }
//     }
    
//     // If this is the first link or previous is completed, unlock it
//     if (linkIndex === 0 || linkProgress[prevLinkKey]) {
//       // Start 24 hour countdown for next link
//       if (linkIndex < 49) { // Assuming max 50 links
//         const nextLinkKey = `${courseName}_part${partIndex}_link${linkIndex + 1}`;
//         const endTime = new Date().getTime() + 24 * 60 * 60 * 1000; // 24 hours from now
        
//         setCountdowns(prev => ({ 
//           ...prev, 
//           [nextLinkKey]: endTime 
//         }));
        
//         // Save to localStorage immediately
//         if (user) {
//           const updatedCountdowns = {...countdowns, [nextLinkKey]: endTime};
//           localStorage.setItem(`countdowns_${user.uid}`, JSON.stringify(updatedCountdowns));
//         }
//       }
      
//       // Mark current link as completed
//       setLinkProgress(prev => ({ ...prev, [linkKey]: true }));
      
//       // Save to localStorage immediately
//       if (user) {
//         const updatedProgress = {...linkProgress, [linkKey]: true};
//         localStorage.setItem(`progress_${user.uid}`, JSON.stringify(updatedProgress));
//       }
      
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
  
//   // ✅ Modified formatCountdown function to show hours, minutes, and seconds
//   const formatCountdown = (milliseconds) => {
//     const totalSeconds = Math.ceil(milliseconds / 1000);
//     const hours = Math.floor(totalSeconds / 3600);
//     const minutes = Math.floor((totalSeconds % 3600) / 60);
//     const seconds = totalSeconds % 60;
    
//     // Always show hours, minutes, and seconds
//     return `${hours}h ${minutes}m ${seconds}s`;
//   };

//   const getCountdownTime = (key) => {
//     if (!countdowns[key]) return null;
    
//     // Ensure it's a number
//     const endTime = typeof countdowns[key] === 'number' 
//       ? countdowns[key] 
//       : countdowns[key].toMillis();
      
//     const distance = endTime - new Date().getTime();
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
//               animationDelay: `${Math.random() * 2}s`,
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
//             onClick={handleLogout} // ✅ Use the new logout handler
//             className="px-8 py-3 bg-gradient-to-r from-red-600 to-red-800 text-white font-bold rounded-full transform transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-red-500/30 flex items-center justify-center group"
//           >
//             Logout
//           </button>
//         </div>
        
//         {/* Add the attention-grabbing Gumroad button */}
//         {gumroadLink && (
//           <div className="mb-10 text-center animate-pulse">
//             <div className="bg-gradient-to-r from-purple-900 via-purple-700 to-pink-700 p-1 rounded-2xl shadow-2xl transform hover:scale-105 transition-transform duration-500 inline-block">
//               <button 
//                 onClick={() => window.open(gumroadLink, "_blank", "noopener,noreferrer")}
//                 className="px-12 py-5 bg-gradient-to-r from-yellow-400 via-orange-400 to-pink-500 text-black font-extrabold text-2xl rounded-xl shadow-lg hover:shadow-2xl transform hover:scale-105 transition-all duration-300 flex items-center justify-center mx-auto"
//               >
//                 <span className="mr-3">🚀</span>
//                 GET FULL COURSE IN 1 CLICK
//                 <span className="ml-3">🔥</span>
//               </button>
//             </div>
//             <p className="mt-4 text-gray-300 text-lg max-w-2xl mx-auto">
//               If you want to get <span className="font-bold text-yellow-300">ALL COURSES</span> without waiting for countdowns, 
//               click the button above to unlock everything instantly!
//             </p>
//           </div>
//         )}
        
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
//                                       disabled={!canAccess || (countdownTime !== null && countdownTime > 0)}
//                                       className={`w-full font-medium py-3 px-4 rounded-lg transition duration-300 transform flex items-center justify-center ${
//                                         isUnlocked 
//                                           ? "bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
//                                           : canAccess && (countdownTime === null || countdownTime === 0)
//                                             ? "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
//                                             : "bg-gray-700 text-gray-400 cursor-not-allowed"
//                                       }`}
//                                     >
//                                       <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
//                                         <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd" />
//                                       </svg>
//                                       {`${courseName} - Part ${index + 1}`}
//                                     </button>
                                    
//                                     {/* Status indicators */}
//                                     <div className="mt-2 text-xs text-center">
//                                       {isUnlocked ? (
//                                         <span className="text-green-400">✓ Completed</span>
//                                       ) : countdownTime !== null && countdownTime > 0 ? (
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













// "use client";
// import { useEffect, useState, useMemo } from "react";
// import { auth, db } from "@/lib/firebase";
// import { onAuthStateChanged, signOut } from "firebase/auth";
// import { collection, getDocs, query, orderBy, doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
// import { enableIndexedDbPersistence } from "firebase/firestore";

// export default function UserPage() {
//   const [user, setUser] = useState(null);
//   const [isLoading, setIsLoading] = useState(true);
//   const [content, setContent] = useState([]);
//   const [error, setError] = useState("");
//   const [linkProgress, setLinkProgress] = useState({});
//   const [countdowns, setCountdowns] = useState({});
//   const [userProgressDoc, setUserProgressDoc] = useState(null);
  
//   // ✅ Enable Firestore persistence for caching
//   useEffect(() => {
//     const enablePersistence = async () => {
//       try {
//         await enableIndexedDbPersistence(db);
//       } catch (err) {
//         if (err.code == 'failed-precondition') {
//           console.log("Multiple tabs open, persistence can only be enabled in one tab at a time.");
//         } else if (err.code == 'unimplemented') {
//           console.log("The current browser doesn't support persistence.");
//         }
//       }
//     };
//     enablePersistence();
//   }, []);
  
//   useEffect(() => {
//     const unsub = onAuthStateChanged(auth, async (u) => {
//       if (!u) {
//         window.location.href = "/login";
//       } else {
//         setUser(u);
//         setIsLoading(false);
        
//         // ✅ Update user status to online in Firestore
//         try {
//           const userRef = doc(db, "users", u.uid);
//           await updateDoc(userRef, {
//             isOnline: true,
//             lastActive: new Date()
//           });
//         } catch (error) {
//           console.error("Error updating user status:", error);
//         }
        
//         // ✅ Load from localStorage first for instant UI
//         const savedProgress = localStorage.getItem(`progress_${u.uid}`);
//         const savedCountdowns = localStorage.getItem(`countdowns_${u.uid}`);
        
//         if (savedProgress) setLinkProgress(JSON.parse(savedProgress));
//         if (savedCountdowns) {
//           // Convert stored timestamps to numbers
//           const parsedCountdowns = JSON.parse(savedCountdowns);
//           const numericCountdowns = {};
          
//           Object.keys(parsedCountdowns).forEach(key => {
//             numericCountdowns[key] = typeof parsedCountdowns[key] === 'object' 
//               ? parsedCountdowns[key].valueOf() 
//               : parsedCountdowns[key];
//           });
          
//           setCountdowns(numericCountdowns);
//         }
//       }
//     });
//     return () => unsub();
//   }, []);
  
//   // ✅ Fetch user progress ONLY once when user logs in
//   useEffect(() => {
//     const fetchUserProgress = async () => {
//       if (!user) return;
      
//       try {
//         const userProgressRef = doc(db, "userProgress", user.uid);
//         const docSnap = await getDoc(userProgressRef);
        
//         if (docSnap.exists()) {
//           const userData = docSnap.data();
//           setLinkProgress(userData.linkProgress || {});
          
//           // Convert Firestore timestamps to numeric values
//           const numericCountdowns = {};
//           if (userData.countdowns) {
//             Object.keys(userData.countdowns).forEach(key => {
//               numericCountdowns[key] = typeof userData.countdowns[key] === 'object' 
//                 ? userData.countdowns[key].toMillis() 
//                 : userData.countdowns[key];
//             });
//           }
          
//           setCountdowns(numericCountdowns);
          
//           // ✅ Save to localStorage for future visits
//           localStorage.setItem(`progress_${user.uid}`, JSON.stringify(userData.linkProgress || {}));
//           localStorage.setItem(`countdowns_${user.uid}`, JSON.stringify(numericCountdowns));
//         } else {
//           await setDoc(userProgressRef, {
//             userId: user.uid,
//             linkProgress: {},
//             countdowns: {},
//             createdAt: new Date()
//           });
//         }
//         setUserProgressDoc(userProgressRef);
//       } catch (err) {
//         console.error("Error fetching user progress:", err);
//         setError("Failed to load user progress");
//       }
//     };
//     if (user) {
//       fetchUserProgress();
//     }
//   }, [user]);
  
//   // ✅ Fetch content ONLY once (with caching)
//   useEffect(() => {
//     const fetchContent = async () => {
//       // ✅ Check cache first
//       const cachedContent = localStorage.getItem('cachedContent');
//       const cachedTimestamp = localStorage.getItem('cachedContentTimestamp');
      
//       // If cache exists and is less than 1 hour old, use it
//       if (cachedContent && cachedTimestamp && (Date.now() - cachedTimestamp < 3600000)) {
//         setContent(JSON.parse(cachedContent));
//         return;
//       }
      
//       try {
//         const q = query(collection(db, "adminContent"), orderBy("createdAt", "desc"));
//         const querySnapshot = await getDocs(q);
//         const contentData = [];
//         querySnapshot.forEach((doc) => {
//           contentData.push({ id: doc.id, ...doc.data() });
//         });
        
//         setContent(contentData);
//         // ✅ Cache the content
//         localStorage.setItem('cachedContent', JSON.stringify(contentData));
//         localStorage.setItem('cachedContentTimestamp', Date.now());
//       } catch (err) {
//         console.error("Error fetching content:", err);
//         setError("Failed to load content");
//       }
//     };
    
//     if (user) fetchContent();
//   }, [user]);
  
//   // ✅ Save progress to Firestore ONLY when changes occur (not on every render)
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
    
//     // ✅ Debounce Firestore writes to prevent too many requests
//     const timer = setTimeout(() => {
//       if (Object.keys(linkProgress).length > 0 || Object.keys(countdowns).length > 0) {
//         saveProgressToFirestore();
//       }
//     }, 2000); // Save every 2 seconds after changes
    
//     return () => clearTimeout(timer);
//   }, [linkProgress, countdowns, user, userProgressDoc]);
  
//   // ✅ Handle countdown timers LOCALLY (no Firestore reads/writes)
//   useEffect(() => {
//    if (!user) return;
//    const interval = setInterval(() => {
//      setCountdowns(prev => {
//        const updated = { ...prev };
//        Object.entries(prev).forEach(([key, endTime]) => {
//          const endTimeMs = typeof endTime === 'number' ? endTime : endTime.toMillis();
//          if (endTimeMs - Date.now() <= 0) {
//            delete updated[key];
//          }
//        });
//        if (JSON.stringify(updated) !== JSON.stringify(prev)) {
//          localStorage.setItem(`countdowns_${user.uid}`, JSON.stringify(updated));
//        }
//        return updated;
//      });
//    }, 1000);
//    return () => clearInterval(interval);
//  }, [user]);
  
//   // ✅ Function to handle logout with status update
//   const handleLogout = async () => {
//     try {
//       // Update user status to offline before signing out
//       if (user) {
//         const userRef = doc(db, "users", user.uid);
//         await updateDoc(userRef, {
//           isOnline: false,
//           lastActive: new Date()
//         });
//       }
      
//       // Sign out from Firebase Auth
//       await signOut(auth);
      
//       // Clear local storage
//       if (user) {
//         localStorage.removeItem(`progress_${user.uid}`);
//         localStorage.removeItem(`countdowns_${user.uid}`);
//       }
      
//       // Redirect to login page
//       window.location.href = "/login";
      
//     } catch (error) {
//       console.error("Error during logout:", error);
//       // Still try to sign out even if status update fails
//       await signOut(auth);
//       window.location.href = "/login";
//     }
//   };

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
//       const endTime = countdowns[linkKey];
//       const remainingTime = Math.ceil((endTime - new Date().getTime()) / 1000);
      
//       if (remainingTime > 0) {
//         const hours = Math.floor(remainingTime / 3600);
//         const minutes = Math.floor((remainingTime % 3600) / 60);
//         const seconds = remainingTime % 60;
//         alert(`Please wait ${hours}h ${minutes}m ${seconds}s before accessing this resource.`);
//         return;
//       }
//     }
    
//     // If this is the first link or previous is completed, unlock it
//     if (linkIndex === 0 || linkProgress[prevLinkKey]) {
//       // Start 24 hour countdown for next link
//       if (linkIndex < 49) { // Assuming max 50 links
//         const nextLinkKey = `${courseName}_part${partIndex}_link${linkIndex + 1}`;
//         const endTime = new Date().getTime() + 24 * 60 * 60 * 1000; // 24 hours from now
        
//         setCountdowns(prev => ({ 
//           ...prev, 
//           [nextLinkKey]: endTime 
//         }));
        
//         // Save to localStorage immediately
//         if (user) {
//           const updatedCountdowns = {...countdowns, [nextLinkKey]: endTime};
//           localStorage.setItem(`countdowns_${user.uid}`, JSON.stringify(updatedCountdowns));
//         }
//       }
      
//       // Mark current link as completed
//       setLinkProgress(prev => ({ ...prev, [linkKey]: true }));
      
//       // Save to localStorage immediately
//       if (user) {
//         const updatedProgress = {...linkProgress, [linkKey]: true};
//         localStorage.setItem(`progress_${user.uid}`, JSON.stringify(updatedProgress));
//       }
      
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
  
//   // ✅ Modified formatCountdown function to show hours, minutes, and seconds
//   const formatCountdown = (milliseconds) => {
//     const totalSeconds = Math.ceil(milliseconds / 1000);
//     const hours = Math.floor(totalSeconds / 3600);
//     const minutes = Math.floor((totalSeconds % 3600) / 60);
//     const seconds = totalSeconds % 60;
    
//     // Always show hours, minutes, and seconds
//     return `${hours}h ${minutes}m ${seconds}s`;
//   };

//   const getCountdownTime = (key) => {
//     if (!countdowns[key]) return null;
    
//     // Ensure it's a number
//     const endTime = typeof countdowns[key] === 'number' 
//       ? countdowns[key] 
//       : countdowns[key].toMillis();
      
//     const distance = endTime - new Date().getTime();
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
//               animationDelay: `${Math.random() * 2}s`,
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
//             onClick={handleLogout} // ✅ Use the new logout handler
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
//                                       disabled={!canAccess || (countdownTime !== null && countdownTime > 0)}
//                                       className={`w-full font-medium py-3 px-4 rounded-lg transition duration-300 transform flex items-center justify-center ${
//                                         isUnlocked 
//                                           ? "bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
//                                           : canAccess && (countdownTime === null || countdownTime === 0)
//                                             ? "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
//                                             : "bg-gray-700 text-gray-400 cursor-not-allowed"
//                                       }`}
//                                     >
//                                       <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
//                                         <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd" />
//                                       </svg>
//                                       {`${courseName} - Part ${index + 1}`}
//                                     </button>
                                    
//                                     {/* Status indicators */}
//                                     <div className="mt-2 text-xs text-center">
//                                       {isUnlocked ? (
//                                         <span className="text-green-400">✓ Completed</span>
//                                       ) : countdownTime !== null && countdownTime > 0 ? (
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




















// "use client";
// import { useEffect, useState, useMemo } from "react";
// import { auth, db } from "@/lib/firebase";
// import { onAuthStateChanged, signOut } from "firebase/auth";
// import { collection, getDocs, query, orderBy, doc, getDoc, setDoc, updateDoc, addDoc } from "firebase/firestore";
// import { enableIndexedDbPersistence } from "firebase/firestore";

// export default function UserPage() {
//   const [user, setUser] = useState(null);
//   const [isLoading, setIsLoading] = useState(true);
//   const [content, setContent] = useState([]);
//   const [error, setError] = useState("");
//   const [linkProgress, setLinkProgress] = useState({});
//   const [countdowns, setCountdowns] = useState({});
//   const [userProgressDoc, setUserProgressDoc] = useState(null);
  
//   // ✅ Enable Firestore persistence for caching
//   useEffect(() => {
//     const enablePersistence = async () => {
//       try {
//         await enableIndexedDbPersistence(db);
//       } catch (err) {
//         if (err.code == 'failed-precondition') {
//           console.log("Multiple tabs open, persistence can only be enabled in one tab at a time.");
//         } else if (err.code == 'unimplemented') {
//           console.log("The current browser doesn't support persistence.");
//         }
//       }
//     };
//     enablePersistence();
//   }, []);
  
//   useEffect(() => {
//     const unsub = onAuthStateChanged(auth, async (u) => {
//       if (!u) {
//         window.location.href = "/login";
//       } else {
//         setUser(u);
//         setIsLoading(false);
        
//         // ✅ Update user status to online in Firestore
//         try {
//           const userRef = doc(db, "users", u.uid);
//           await updateDoc(userRef, {
//             isOnline: true,
//             lastActive: new Date()
//           });
//         } catch (error) {
//           console.error("Error updating user status:", error);
//         }
        
//         // ✅ Load from localStorage first for instant UI
//         const savedProgress = localStorage.getItem(`progress_${u.uid}`);
//         const savedCountdowns = localStorage.getItem(`countdowns_${u.uid}`);
        
//         if (savedProgress) setLinkProgress(JSON.parse(savedProgress));
//         if (savedCountdowns) {
//           // Convert stored timestamps to numbers
//           const parsedCountdowns = JSON.parse(savedCountdowns);
//           const numericCountdowns = {};
          
//           Object.keys(parsedCountdowns).forEach(key => {
//             numericCountdowns[key] = typeof parsedCountdowns[key] === 'object' 
//               ? parsedCountdowns[key].valueOf() 
//               : parsedCountdowns[key];
//           });
          
//           setCountdowns(numericCountdowns);
//         }
//       }
//     });
//     return () => unsub();
//   }, []);
  
//   // ✅ Fetch user progress ONLY once when user logs in
//   useEffect(() => {
//     const fetchUserProgress = async () => {
//       if (!user) return;
      
//       try {
//         const userProgressRef = doc(db, "userProgress", user.uid);
//         const docSnap = await getDoc(userProgressRef);
        
//         if (docSnap.exists()) {
//           const userData = docSnap.data();
//           setLinkProgress(userData.linkProgress || {});
          
//           // Convert Firestore timestamps to numeric values
//           const numericCountdowns = {};
//           if (userData.countdowns) {
//             Object.keys(userData.countdowns).forEach(key => {
//               numericCountdowns[key] = typeof userData.countdowns[key] === 'object' 
//                 ? userData.countdowns[key].toMillis() 
//                 : userData.countdowns[key];
//             });
//           }
          
//           setCountdowns(numericCountdowns);
          
//           // ✅ Save to localStorage for future visits
//           localStorage.setItem(`progress_${user.uid}`, JSON.stringify(userData.linkProgress || {}));
//           localStorage.setItem(`countdowns_${user.uid}`, JSON.stringify(numericCountdowns));
//         } else {
//           await setDoc(userProgressRef, {
//             userId: user.uid,
//             linkProgress: {},
//             countdowns: {},
//             createdAt: new Date()
//           });
//         }
//         setUserProgressDoc(userProgressRef);
//       } catch (err) {
//         console.error("Error fetching user progress:", err);
//         setError("Failed to load user progress");
//       }
//     };
//     if (user) {
//       fetchUserProgress();
//     }
//   }, [user]);
  
//   // ✅ Fetch content ONLY once (with caching)
//   useEffect(() => {
//     const fetchContent = async () => {
//       // ✅ Check cache first
//       const cachedContent = localStorage.getItem('cachedContent');
//       const cachedTimestamp = localStorage.getItem('cachedContentTimestamp');
      
//       // If cache exists and is less than 1 hour old, use it
//       if (cachedContent && cachedTimestamp && (Date.now() - cachedTimestamp < 3600000)) {
//         setContent(JSON.parse(cachedContent));
//         return;
//       }
      
//       try {
//         const q = query(collection(db, "adminContent"), orderBy("createdAt", "desc"));
//         const querySnapshot = await getDocs(q);
//         const contentData = [];
//         querySnapshot.forEach((doc) => {
//           contentData.push({ id: doc.id, ...doc.data() });
//         });
        
//         setContent(contentData);
//         // ✅ Cache the content
//         localStorage.setItem('cachedContent', JSON.stringify(contentData));
//         localStorage.setItem('cachedContentTimestamp', Date.now());
//       } catch (err) {
//         console.error("Error fetching content:", err);
//         setError("Failed to load content");
//       }
//     };
    
//     if (user) fetchContent();
//   }, [user]);
  
//   // ✅ Save progress to Firestore ONLY when changes occur (not on every render)
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
    
//     // ✅ Debounce Firestore writes to prevent too many requests
//     const timer = setTimeout(() => {
//       if (Object.keys(linkProgress).length > 0 || Object.keys(countdowns).length > 0) {
//         saveProgressToFirestore();
//       }
//     }, 2000); // Save every 2 seconds after changes
    
//     return () => clearTimeout(timer);
//   }, [linkProgress, countdowns, user, userProgressDoc]);
  
//   // ✅ Handle countdown timers LOCALLY (no Firestore reads/writes)
//   useEffect(() => {
//    if (!user) return;
//    const interval = setInterval(() => {
//      setCountdowns(prev => {
//        const updated = { ...prev };
//        Object.entries(prev).forEach(([key, endTime]) => {
//          const endTimeMs = typeof endTime === 'number' ? endTime : endTime.toMillis();
//          if (endTimeMs - Date.now() <= 0) {
//            delete updated[key];
//          }
//        });
//        if (JSON.stringify(updated) !== JSON.stringify(prev)) {
//          localStorage.setItem(`countdowns_${user.uid}`, JSON.stringify(updated));
//        }
//        return updated;
//      });
//    }, 1000);
//    return () => clearInterval(interval);
//  }, [user]);
  
//   // ✅ Function to handle logout with status update
//   const handleLogout = async () => {
//     try {
//       // Update user status to offline before signing out
//       if (user) {
//         const userRef = doc(db, "users", user.uid);
//         await updateDoc(userRef, {
//           isOnline: false,
//           lastActive: new Date()
//         });
//       }
      
//       // Sign out from Firebase Auth
//       await signOut(auth);
      
//       // Clear local storage
//       if (user) {
//         localStorage.removeItem(`progress_${user.uid}`);
//         localStorage.removeItem(`countdowns_${user.uid}`);
//       }
      
//       // Redirect to login page
//       window.location.href = "/login";
      
//     } catch (error) {
//       console.error("Error during logout:", error);
//       // Still try to sign out even if status update fails
//       await signOut(auth);
//       window.location.href="/login";
//     }
//   };

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
  
//   // ✅ Function to track when user clicks on Gumroad link
//   const trackGumroadClick = async (courseName, gumroadUrl) => {
//     try {
//       // Track in user's progress
//       const gumroadKey = `${courseName}_gumroad`;
//       setLinkProgress(prev => ({ ...prev, [gumroadKey]: true }));
      
//       // Save to localStorage immediately
//       if (user) {
//         const updatedProgress = {...linkProgress, [gumroadKey]: true};
//         localStorage.setItem(`progress_${user.uid}`, JSON.stringify(updatedProgress));
//       }
      
//       // Record this action in a separate collection for admin tracking
//       const trackingRef = collection(db, "gumroadClicks");
//       await addDoc(trackingRef, {
//         userId: user.uid,
//         userEmail: user.email,
//         courseName,
//         gumroadUrl,
//         clickedAt: new Date(),
//         userName: user.displayName || user.email.split('@')[0]
//       });
      
//       // Open the Gumroad link
//       window.open(gumroadUrl, "_blank", "noopener,noreferrer");
      
//     } catch (error) {
//       console.error("Error tracking Gumroad click:", error);
//       // Still open the link even if tracking fails
//       window.open(gumroadUrl, "_blank", "noopener,noreferrer");
//     }
//   };
  
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
//       const endTime = countdowns[linkKey];
//       const remainingTime = Math.ceil((endTime - new Date().getTime()) / 1000);
      
//       if (remainingTime > 0) {
//         const hours = Math.floor(remainingTime / 3600);
//         const minutes = Math.floor((remainingTime % 3600) / 60);
//         const seconds = remainingTime % 60;
//         alert(`Please wait ${hours}h ${minutes}m ${seconds}s before accessing this resource.`);
//         return;
//       }
//     }
    
//     // If this is the first link or previous is completed, unlock it
//     if (linkIndex === 0 || linkProgress[prevLinkKey]) {
//       // Start 24 hour countdown for next link
//       if (linkIndex < 149) { // Changed from 49 to 149 for 150 fields
//         const nextLinkKey = `${courseName}_part${partIndex}_link${linkIndex + 1}`;
//         const endTime = new Date().getTime() + 24 * 60 * 60 * 1000; // 24 hours from now
        
//         setCountdowns(prev => ({ 
//   ...prev, 
//   [nextLinkKey]: endTime 
// }));
        
//         // Save to localStorage immediately
//         if (user) {
//           const updatedCountdowns = {...countdowns, [nextLinkKey]: endTime};
//           localStorage.setItem(`countdowns_${user.uid}`, JSON.stringify(updatedCountdowns));
//         }
//       }
      
//       // Mark current link as completed
//       setLinkProgress(prev => ({ ...prev, [linkKey]: true }));
      
//       // Save to localStorage immediately
//       if (user) {
//         const updatedProgress = {...linkProgress, [linkKey]: true};
//         localStorage.setItem(`progress_${user.uid}`, JSON.stringify(updatedProgress));
//       }
      
//       // Track this completion in user activity
//       trackResourceCompletion(courseName, partIndex, linkIndex, url);
      
//       // Open the link
//       openLink(url);
//     }
//   };
  
//   // ✅ Function to track resource completion
//   const trackResourceCompletion = async (courseName, partIndex, linkIndex, url) => {
//     try {
//       const activityRef = collection(db, "userActivities");
//       await addDoc(activityRef, {
//         userId: user.uid,
//         userEmail: user.email,
//         courseName,
//         partIndex,
//         linkIndex,
//         resourceUrl: url,
//         completedAt: new Date(),
//         userName: user.displayName || user.email.split('@')[0]
//       });
//     } catch (error) {
//       console.error("Error tracking resource completion:", error);
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
  
//   // ✅ Modified formatCountdown function to show hours, minutes, and seconds
//   const formatCountdown = (milliseconds) => {
//     const totalSeconds = Math.ceil(milliseconds / 1000);
//     const hours = Math.floor(totalSeconds / 3600);
//     const minutes=Math.floor((totalSeconds % 3600) / 60);
//     const seconds = totalSeconds % 60;
    
//     // Always show hours, minutes, and seconds
//     return `${hours}h ${minutes}m ${seconds}s`;
//   };

//   const getCountdownTime = (key) => {
//     if (!countdowns[key]) return null;
    
//     // Ensure it's a number
//     const endTime = typeof countdowns[key] === 'number' 
//       ? countdowns[key] 
//       : countdowns[key].toMillis();
      
//     const distance = endTime - new Date().getTime();
//     return Math.max(0, distance);
//   };
  
//   if (isLoading) {
//     return (
//       <div className="flex min-h-screen items-center justify-center bg-black">
//         <div className="relative">
//           <div className="w-16 h-16 border-4 border-blue-500 rounded-full animate-spin"></div>
//           {/* <div className="absolute top-0 left-0 w-16极16 border-4 border-transparent border-t-blue-300 rounded-full animate-ping"></div> */}
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
//               animationDelay: `${Math.random() * 2}s`,
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
//             onClick={handleLogout}
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
//             {Object.entries(groupedContent).map(([courseName, parts]) => {
//               // Check if this course has a Gumroad link - FIXED to handle invalid URLs
//               const gumroadLink = parts[0]?.gumroadLink;
//               const isValidGumroadLink = gumroadLink && 
//                 (gumroadLink.startsWith('http://') || gumroadLink.startsWith('https://')) &&
//                 gumroadLink.includes('gumroad');
              
//               return (
//                 <div key={courseName} className="course-section">
//                   <div className="text-center mb-8">
//                     <h2 className="text-3xl md:text-4xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
//                       {courseName}
//                     </h2>
//                     <div className="w-24 h-1 bg-gradient-to-r from-blue-500 to-purple-500 mx-auto rounded-full"></div>
//                   </div>
                  
//                   <div className="space-y-8">
//                     {parts.map((part, partIndex) => (
//                       <div key={part.id} className="bg-gray-900 bg-opacity-70 backdrop-blur-lg rounded-2xl p-6 border border-gray-800 shadow-2xl">
//                         <div className="mb-6 group relative overflow-hidden rounded-2xl shadow-xl">
//                           {part.imageUrl ? (
//                             <img 
//                               src={part.imageUrl} 
//                               alt={`Part ${partIndex + 1} of ${courseName}`} 
//                               className="w-full h-80 object-cover transform transition-transform duration-500 group-hover:scale-105"
//                             />
//                           ) : (
//                             <img 
//                               // src="https://images.unsplash.com/photo-1611162617213-7极7a39e9b1d7?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80" 
//                               src="https://images.unsplash.com/photo-1611162617213-77a39e9b1d7?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80"

//                               alt={`Part ${partIndex + 1} of ${courseName}`} 
//                               className="w-full h-80 object-cover transform transition-transform duration-500 group-hover:scale-105"
//                             />
//                           )}
//                         </div>
                        
//                         <div className="mb-4">
//                           <h4 className="text-lg font-semibold mb-3 text-purple-400">Resources for Part {partIndex + 1}:</h4>
//                           {/* <div className="grid grid-cols-1 md:极rid-cols-2 lg:grid-cols-3 gap-4"> */}
//                           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

//                             {part.fields
//                               .filter(field => field.trim() !== '') 
//                               .map((field, index) => {
//                                 const isUrl = field.startsWith('http://') || field.startsWith('https://');
//                                 const linkKey = `${courseName}_part${partIndex}_link${index}`;
//                                 const isUnlocked = linkProgress[linkKey];
//                                 const prevLinkKey = index > 0 ? `${courseName}_part${partIndex}_link${index - 1}` : null;
//                                 const canAccess = index === 0 || linkProgress[prevLinkKey];
//                                 const countdownTime = getCountdownTime(linkKey);
                                
//                                 if (isUrl) {
//                                   return (
//                                     <div key={index} className="relative">
//                                       <button
//                                         onClick={() => handleLinkClick(courseName, partIndex, index, field)}
//                                         disabled={!canAccess || (countdownTime !== null && countdownTime > 0)}
//                                         className={`w-full font-medium py-3 px-4 rounded-lg transition duration-300 transform flex items-center justify-center ${
//                                           isUnlocked 
//                                             ? "bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
//                                             : canAccess && (countdownTime === null || countdownTime === 0)
//                                               ? "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"

//                                               : "bg-gray-700 text-gray-400 cursor-not-allowed"
//                                         }`}
//                                       >
//                                         {/* <svg xmlns="http://www.w3.org/2000/s极" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
//                                           <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l极.5-1.5zm-5 5a2 2 0 012.828 0 1 1 极 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd" />
//                                         </svg> */}
//                                         <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
//   <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l-.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd" />
// </svg>

//                                         {`${courseName} - Part ${index + 1}`}
//                                       </button>
                                      
//                                       {/* Status indicators */}
//                                       <div className="mt-2 text-xs text-center">
//                                         {isUnlocked ? (
//                                           <span className="text-green-400">✓ Completed</span>
//                                         ) : countdownTime !== null && countdownTime > 0 ? (
//                                           <span className="text-yellow-400">Available in {formatCountdown(countdownTime)}</span>
//                                         ) : canAccess ? (
//                                           <span className="text-blue-400">Ready to access</span>
//                                         ) : (
//                                           <span className="text-gray-400">Complete previous resource first</span>
//                                         )}
//                                       </div>
//                                     </div>
//                                   );
//                                 } else {
//                                   return (
//                                     <div key={index} className="bg-gray-800 p-4 rounded-lg">
//                                       <p className="text-gray-300">{field}</p>
//                                     </div>
//                                   );
//                                 }
//                               })}
//                           </div>
//                         </div>
                        
//                         <div className="mt-4 text-sm text-gray-500">
//                           {part.fields.filter(f => f.trim()).length} resources
//                         </div>
//                       </div>
//                     ))}
//                   </div>
                  
//                   {/* Gumroad Button at the bottom of each course section - FIXED condition */}
//                   {isValidGumroadLink && (
//                     <div className="mt-12 text-center p-8 bg-gradient-to-r from-gray-900 to-gray-800 rounded-2xl border border-gray-700">
//                       <h3 className="text-2xl font-bold mb-4 text-yellow-300">Want instant access to the entire course?</h3>
//                       <p className="text-gray-300 mb-6 max-w-2xl mx-auto">
//                         Skip the wait and get all content immediately with our one-click Gumroad package!
//                         Includes all resources, videos, and materials for the complete {courseName} course.
//                       </p>
//                       <div className="animate-pulse">
//                         <div className="bg-gradient-to-r from-yellow-500 to-orange-500 p-1 rounded-2xl shadow-2xl transform hover:scale-105 transition-transform duration-300 inline-block">
//                           <button
//                             onClick={() => trackGumroadClick(courseName, gumroadLink)}
//                             className="bg-black py-4 px-8 rounded-xl text-xl font-bold text-white flex items-center justify-center space-x-3"
//                           >
//                             <span className="text-yellow-300">🚀</span>
//                             <span>Get Full Course in 1 Click</span>
//                             <span className="text-yellow-300">⭐</span>
//                           </button>
//                         </div>
//                       </div>
//                       <p className="text-gray-400 mt-4 text-sm">
//                         If you want to get all content of this course in just 1 click then click here
//                       </p>
//                     </div>
//                   )}
//                 </div>
//               );
//             })}
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
// import { collection, getDocs, query, orderBy, doc, getDoc, setDoc, updateDoc, addDoc } from "firebase/firestore";
// import { enableIndexedDbPersistence } from "firebase/firestore";

// export default function UserPage() {
//   const [user, setUser] = useState(null);
//   const [isLoading, setIsLoading] = useState(true);
//   const [content, setContent] = useState([]);
//   const [error, setError] = useState("");
//   const [linkProgress, setLinkProgress] = useState({});
//   const [countdowns, setCountdowns] = useState({});
//   const [userProgressDoc, setUserProgressDoc] = useState(null);
  
//   // ✅ Enable Firestore persistence for caching
//   useEffect(() => {
//     const enablePersistence = async () => {
//       try {
//         await enableIndexedDbPersistence(db);
//       } catch (err) {
//         if (err.code == 'failed-precondition') {
//           console.log("Multiple tabs open, persistence can only be enabled in one tab at a time.");
//         } else if (err.code == 'unimplemented') {
//           console.log("The current browser doesn't support persistence.");
//         }
//       }
//     };
//     enablePersistence();
//   }, []);
  
//   useEffect(() => {
//     const unsub = onAuthStateChanged(auth, async (u) => {
//       if (!u) {
//         window.location.href = "/login";
//       } else {
//         setUser(u);
//         setIsLoading(false);
        
//         // ✅ Update user status to online in Firestore
//         try {
//           const userRef = doc(db, "users", u.uid);
//           await updateDoc(userRef, {
//             isOnline: true,
//             lastActive: new Date()
//           });
//         } catch (error) {
//           console.error("Error updating user status:", error);
//         }
        
//         // ✅ Load from localStorage first for instant UI
//         const savedProgress = localStorage.getItem(`progress_${u.uid}`);
//         const savedCountdowns = localStorage.getItem(`countdowns_${u.uid}`);
        
//         if (savedProgress) setLinkProgress(JSON.parse(savedProgress));
//         if (savedCountdowns) {
//           // Convert stored timestamps to numbers
//           const parsedCountdowns = JSON.parse(savedCountdowns);
//           const numericCountdowns = {};
          
//           Object.keys(parsedCountdowns).forEach(key => {
//             numericCountdowns[key] = typeof parsedCountdowns[key] === 'object' 
//               ? parsedCountdowns[key].valueOf() 
//               : parsedCountdowns[key];
//           });
          
//           setCountdowns(numericCountdowns);
//         }
//       }
//     });
//     return () => unsub();
//   }, []);
  
//   // ✅ Fetch user progress ONLY once when user logs in
//   useEffect(() => {
//     const fetchUserProgress = async () => {
//       if (!user) return;
      
//       try {
//         const userProgressRef = doc(db, "userProgress", user.uid);
//         const docSnap = await getDoc(userProgressRef);
        
//         if (docSnap.exists()) {
//           const userData = docSnap.data();
//           setLinkProgress(userData.linkProgress || {});
          
//           // Convert Firestore timestamps to numeric values
//           const numericCountdowns = {};
//           if (userData.countdowns) {
//             Object.keys(userData.countdowns).forEach(key => {
//               numericCountdowns[key] = typeof userData.countdowns[key] === 'object' 
//                 ? userData.countdowns[key].toMillis() 
//                 : userData.countdowns[key];
//             });
//           }
          
//           setCountdowns(numericCountdowns);
          
//           // ✅ Save to localStorage for future visits
//           localStorage.setItem(`progress_${user.uid}`, JSON.stringify(userData.linkProgress || {}));
//           localStorage.setItem(`countdowns_${user.uid}`, JSON.stringify(numericCountdowns));
//         } else {
//           await setDoc(userProgressRef, {
//             userId: user.uid,
//             linkProgress: {},
//             countdowns: {},
//             createdAt: new Date()
//           });
//         }
//         setUserProgressDoc(userProgressRef);
//       } catch (err) {
//         console.error("Error fetching user progress:", err);
//         setError("Failed to load user progress");
//       }
//     };
//     if (user) {
//       fetchUserProgress();
//     }
//   }, [user]);
  
//   // ✅ Fetch content ONLY once (with caching)
//   useEffect(() => {
//     const fetchContent = async () => {
//       // ✅ Check cache first
//       const cachedContent = localStorage.getItem('cachedContent');
//       const cachedTimestamp = localStorage.getItem('cachedContentTimestamp');
      
//       // If cache exists and is less than 1 hour old, use it
//       if (cachedContent && cachedTimestamp && (Date.now() - cachedTimestamp < 3600000)) {
//         setContent(JSON.parse(cachedContent));
//         return;
//       }
      
//       try {
//         const q = query(collection(db, "adminContent"), orderBy("createdAt", "desc"));
//         const querySnapshot = await getDocs(q);
//         const contentData = [];
//         querySnapshot.forEach((doc) => {
//           contentData.push({ id: doc.id, ...doc.data() });
//         });
        
//         setContent(contentData);
//         // ✅ Cache the content
//         localStorage.setItem('cachedContent', JSON.stringify(contentData));
//         localStorage.setItem('cachedContentTimestamp', Date.now());
//       } catch (err) {
//         console.error("Error fetching content:", err);
//         setError("Failed to load content");
//       }
//     };
    
//     if (user) fetchContent();
//   }, [user]);
  
//   // ✅ Save progress to Firestore ONLY when changes occur (not on every render)
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
    
//     // ✅ Debounce Firestore writes to prevent too many requests
//     const timer = setTimeout(() => {
//       if (Object.keys(linkProgress).length > 0 || Object.keys(countdowns).length > 0) {
//         saveProgressToFirestore();
//       }
//     }, 2000); // Save every 2 seconds after changes
    
//     return () => clearTimeout(timer);
//   }, [linkProgress, countdowns, user, userProgressDoc]);
  
//   // ✅ Handle countdown timers LOCALLY (no Firestore reads/writes)
//   useEffect(() => {
//    if (!user) return;
//    const interval = setInterval(() => {
//      setCountdowns(prev => {
//        const updated = { ...prev };
//        Object.entries(prev).forEach(([key, endTime]) => {
//          const endTimeMs = typeof endTime === 'number' ? endTime : endTime.toMillis();
//          if (endTimeMs - Date.now() <= 0) {
//            delete updated[key];
//          }
//        });
//        if (JSON.stringify(updated) !== JSON.stringify(prev)) {
//          localStorage.setItem(`countdowns_${user.uid}`, JSON.stringify(updated));
//        }
//        return updated;
//      });
//    }, 1000);
//    return () => clearInterval(interval);
//  }, [user]);
  
//   // ✅ Function to handle logout with status update
//   const handleLogout = async () => {
//     try {
//       // Update user status to offline before signing out
//       if (user) {
//         const userRef = doc(db, "users", user.uid);
//         await updateDoc(userRef, {
//           isOnline: false,
//           lastActive: new Date()
//         });
//       }
      
//       // Sign out from Firebase Auth
//       await signOut(auth);
      
//       // Clear local storage
//       if (user) {
//         localStorage.removeItem(`progress_${user.uid}`);
//         localStorage.removeItem(`countdowns_${user.uid}`);
//       }
      
//       // Redirect to login page
//       window.location.href = "/login";
      
//     } catch (error) {
//       console.error("Error during logout:", error);
//       // Still try to sign out even if status update fails
//       await signOut(auth);
//       window.location.href = "/login";
//     }
//   };

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
  
//   // ✅ Function to track when user clicks on Gumroad link
//   const trackGumroadClick = async (courseName, gumroadUrl) => {
//     try {
//       // Track in user's progress
//       const gumroadKey = `${courseName}_gumroad`;
//       setLinkProgress(prev => ({ ...prev, [gumroadKey]: true }));
      
//       // Save to localStorage immediately
//       if (user) {
//         const updatedProgress = {...linkProgress, [gumroadKey]: true};
//         localStorage.setItem(`progress_${user.uid}`, JSON.stringify(updatedProgress));
//       }
      
//       // Record this action in a separate collection for admin tracking
//       const trackingRef = collection(db, "gumroadClicks");
//       await addDoc(trackingRef, {
//         userId: user.uid,
//         userEmail: user.email,
//         courseName,
//         gumroadUrl,
//         clickedAt: new Date(),
//         userName: user.displayName || user.email.split('@')[0]
//       });
      
//       // Open the Gumroad link
//       window.open(gumroadUrl, "_blank", "noopener,noreferrer");
      
//     } catch (error) {
//       console.error("Error tracking Gumroad click:", error);
//       // Still open the link even if tracking fails
//       window.open(gumroadUrl, "_blank", "noopener,noreferrer");
//     }
//   };
  
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
//       const endTime = countdowns[linkKey];
//       const remainingTime = Math.ceil((endTime - new Date().getTime()) / 1000);
      
//       if (remainingTime > 0) {
//         const hours = Math.floor(remainingTime / 3600);
//         const minutes = Math.floor((remainingTime % 3600) / 60);
//         const seconds = remainingTime % 60;
//         alert(`Please wait ${hours}h ${minutes}m ${seconds}s before accessing this resource.`);
//         return;
//       }
//     }
    
//     // If this is the first link or previous is completed, unlock it
//     if (linkIndex === 0 || linkProgress[prevLinkKey]) {
//       // Start 24 hour countdown for next link
//       if (linkIndex < 149) { // Changed from 49 to 149 for 150 fields
//         const nextLinkKey = `${courseName}_part${partIndex}_link${linkIndex + 1}`;
//         const endTime = new Date().getTime() + 24 * 60 * 60 * 1000; // 24 hours from now
        
//         setCountdowns(prev => ({ 
//           ...prev, 
//           [nextLinkKey]: endTime 
//         }));
        
//         // Save to localStorage immediately
//         if (user) {
//           const updatedCountdowns = {...countdowns, [nextLinkKey]: endTime};
//           localStorage.setItem(`countdowns_${user.uid}`, JSON.stringify(updatedCountdowns));
//         }
//       }
      
//       // Mark current link as completed
//       setLinkProgress(prev => ({ ...prev, [linkKey]: true }));
      
//       // Save to localStorage immediately
//       if (user) {
//         const updatedProgress = {...linkProgress, [linkKey]: true};
//         localStorage.setItem(`progress_${user.uid}`, JSON.stringify(updatedProgress));
//       }
      
//       // Track this completion in user activity
//       trackResourceCompletion(courseName, partIndex, linkIndex, url);
      
//       // Open the link
//       openLink(url);
//     }
//   };
  
//   // ✅ Function to track resource completion
//   const trackResourceCompletion = async (courseName, partIndex, linkIndex, url) => {
//     try {
//       const activityRef = collection(db, "userActivities");
//       await addDoc(activityRef, {
//         userId: user.uid,
//         userEmail: user.email,
//         courseName,
//         partIndex,
//         linkIndex,
//         resourceUrl: url,
//         completedAt: new Date(),
//         userName: user.displayName || user.email.split('@')[0]
//       });
//     } catch (error) {
//       console.error("Error tracking resource completion:", error);
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
  
//   // ✅ Modified formatCountdown function to show hours, minutes, and seconds
//   const formatCountdown = (milliseconds) => {
//     const totalSeconds = Math.ceil(milliseconds / 1000);
//     const hours = Math.floor(totalSeconds / 3600);
//     const minutes = Math.floor((totalSeconds % 3600) / 60);
//     const seconds = totalSeconds % 60;
    
//     // Always show hours, minutes, and seconds
//     return `${hours}h ${minutes}m ${seconds}s`;
//   };

//   const getCountdownTime = (key) => {
//     if (!countdowns[key]) return null;
    
//     // Ensure it's a number
//     const endTime = typeof countdowns[key] === 'number' 
//       ? countdowns[key] 
//       : countdowns[key].toMillis();
      
//     const distance = endTime - new Date().getTime();
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
//               animationDelay: `${Math.random() * 2}s`,
//             }}
//           ></div>
//         ))}
//       </div>
      
//       <div className="relative z-10 max-w-6xl mx-auto">
//         <div className="flex justify-between items-center mb-8">
//           <div className="text-center">
//             <div className="inline-block p-4 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 mb-4 transform transition-transform duration-500 hover:scale-110">
//               <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" viewBox="0 0 20 20" fill="currentColor">
//                 <path fillRule="evenodd" d="M10 9a3 3 极 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
//               </svg>
//             </div>
//             <h1 className="text-4xl md:text-5xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
//               Welcome, {user?.email?.split('@')[0]}!
//             </h1>
//           </div>
//           <button
//             onClick={handleLogout}
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
//             <h2 className="text-2xl font-semibold mb极 4">No content available</h2>
//             <p className="text-gray-400">Check back later for new content.</p>
//           </div>
//         ) : (
//           <div className="space-y-12">
//             {Object.entries(groupedContent).map(([courseName, parts]) => {
//               // Check if this course has a Gumroad link
//               const gumroadLink = parts[0]?.gumroadLink;
              
//               return (
//                 <div key={courseName} className="course-section">
//                   <div className="text-center mb-8">
//                     <h2 className="text-3xl md:text-4xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
//                       {courseName}
//                     </h2>
//                     <div className="w-24 h-1 bg-gradient-to-r from-blue-500 to-purple-500 mx-auto rounded-full"></div>
//                   </div>
                  
//                   <div className="space-y-8">
//                     {parts.map((part, partIndex) => (
//                       <div key={part.id} className="bg-gray-900 bg-opacity-70 backdrop-blur-lg rounded-2xl p-6 border border-gray-800 shadow-2xl">
//                         <div className="mb-6 group relative overflow-hidden rounded-2xl shadow-xl">
//                           {part.imageUrl ? (
//                             <img 
//                               src={part.imageUrl} 
//                               alt={`Part ${partIndex + 1} of ${courseName}`} 
//                               className="w-full h-80 object-cover transform transition-transform duration-500 group-hover:scale-105"
//                             />
//                           ) : (
//                             <img 
//                               src="https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80" 
//                               alt={`Part ${partIndex + 1} of ${courseName}`} 
//                               className="w-full h-80 object-cover transform transition-transform duration-500 group-hover:scale-105"
//                             />
//                           )}
//                         </div>
                        
//                         <div className="mb-4">
//                           <h4 className="text-lg font-semibold mb-3 text-purple-400">Resources for Part {partIndex + 1}:</h4>
//                           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
//                             {part.fields
//                               .filter(field => field.trim() !== '') 
//                               .map((field, index) => {
//                                 const isUrl = field.startsWith('http://') || field.startsWith('https://');
//                                 const linkKey = `${courseName}_part${partIndex}_link${index}`;
//                                 const isUnlocked = linkProgress[linkKey];
//                                 const prevLinkKey = index > 0 ? `${courseName}_part${partIndex}_link${index - 1}` : null;
//                                 const canAccess = index === 0 || linkProgress[prevLinkKey];
//                                 const countdownTime = getCountdownTime(linkKey);
                                
//                                 if (isUrl) {
//                                   return (
//                                     <div key={index} className="relative">
//                                       <button
//                                         onClick={() => handleLinkClick(courseName, partIndex, index, field)}
//                                         disabled={!canAccess || (countdownTime !== null && countdownTime > 0)}
//                                         className={`w-full font-medium py-3 px-4 rounded-lg transition duration-300 transform flex items-center justify-center ${
//                                           isUnlocked 
//                                             ? "bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
//                                             : canAccess && (countdownTime === null || countdownTime === 0)
//                                               ? "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
//                                               : "bg-gray-700 text-gray-400 cursor-not-allowed"
//                                         }`}
//                                       >
//                                         <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
//                                           <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd" />
//                                         </svg>
//                                         {`${courseName} - Part ${index + 1}`}
//                                       </button>
                                      
//                                       {/* Status indicators */}
//                                       <div className="mt-2 text-xs text-center">
//                                         {isUnlocked ? (
//                                           <span className="text-green-400">✓ Completed</span>
//                                         ) : countdownTime !== null && countdownTime > 0 ? (
//                                           <span className="text-yellow-400">Available in {formatCountdown(countdownTime)}</span>
//                                         ) : canAccess ? (
//                                           <span className极="text-blue-400">Ready to access</span>
//                                         ) : (
//                                           <span className="text-gray-400">Complete previous resource first</span>
//                                         )}
//                                       </div>
//                                     </div>
//                                   );
//                                 } else {
//                                   return (
//                                     <div key={index} className="bg-gray-800 p-4 rounded-lg">
//                                       <p className="text-gray-300">{field}</p>
//                                     </div>
//                                   );
//                                 }
//                               })}
//                           </div>
//                         </div>
                        
//                         <div className="mt-4 text-sm text-gray-500">
//                           {part.fields.filter(f => f.trim()).length} resources
//                         </div>
//                       </div>
//                     ))}
//                   </div>
                  
//                   {/* Gumroad Button at the bottom of each course section */}
//                   {gumroadLink && (
//                     <div className="mt-12 text-center p-8 bg-gradient-to-r from-gray-900 to-gray-800 rounded-2xl border border-gray-700">
//                       <h3 className="text-2xl font-bold mb-4 text-yellow-300">Want instant access to the entire course?</h3>
//                       <p className="text-gray-300 mb-6 max-w-2xl mx-auto">
//                         Skip the wait and get all content immediately with our one-click Gumroad package!
//                         Includes all resources, videos, and materials for the complete {courseName} course.
//                       </p>
//                       <div className="animate-pulse">
//                         <div className="bg-gradient-to-r from-yellow-500 to-orange-500 p-1 rounded-2xl shadow-2xl transform hover:scale-105 transition-transform duration-300 inline-block">
//                           <button
//                             onClick={() => trackGumroadClick(courseName, gumroadLink)}
//                             className="bg-black py-4 px-8 rounded-xl text-xl font-bold text-white flex items-center justify-center space-x-3"
//                           >
//                             <span className="text-yellow-300">🚀</span>
//                             <span>Get Full Course in 1 Click</span>
//                             <span className="text-yellow-300">⭐</span>
//                           </button>
//                         </div>
//                       </div>
//                       <p className="text-gray-400 mt-4 text-sm">
//                         If you want to get all content of this course in just 1 click then click here
//                       </p>
//                     </div>
//                   )}
//                 </div>
//               );
//             })}
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
// import { collection, getDocs, query, orderBy, doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
// import { enableIndexedDbPersistence } from "firebase/firestore";

// export default function UserPage() {
//   const [user, setUser] = useState(null);
//   const [isLoading, setIsLoading] = useState(true);
//   const [content, setContent] = useState([]);
//   const [error, setError] = useState("");
//   const [linkProgress, setLinkProgress] = useState({});
//   const [countdowns, setCountdowns] = useState({});
//   const [userProgressDoc, setUserProgressDoc] = useState(null);
  
//   // ✅ Enable Firestore persistence for caching
//   useEffect(() => {
//     const enablePersistence = async () => {
//       try {
//         await enableIndexedDbPersistence(db);
//       } catch (err) {
//         if (err.code == 'failed-precondition') {
//           console.log("Multiple tabs open, persistence can only be enabled in one tab at a time.");
//         } else if (err.code == 'unimplemented') {
//           console.log("The current browser doesn't support persistence.");
//         }
//       }
//     };
//     enablePersistence();
//   }, []);
  
//   useEffect(() => {
//     const unsub = onAuthStateChanged(auth, async (u) => {
//       if (!u) {
//         window.location.href = "/login";
//       } else {
//         setUser(u);
//         setIsLoading(false);
        
//         // ✅ Update user status to online in Firestore
//         try {
//           const userRef = doc(db, "users", u.uid);
//           await updateDoc(userRef, {
//             isOnline: true,
//             lastActive: new Date()
//           });
//         } catch (error) {
//           console.error("Error updating user status:", error);
//         }
        
//         // ✅ Load from localStorage first for instant UI
//         const savedProgress = localStorage.getItem(`progress_${u.uid}`);
//         const savedCountdowns = localStorage.getItem(`countdowns_${u.uid}`);
        
//         if (savedProgress) setLinkProgress(JSON.parse(savedProgress));
//         if (savedCountdowns) {
//           // Convert stored timestamps to numbers
//           const parsedCountdowns = JSON.parse(savedCountdowns);
//           const numericCountdowns = {};
          
//           Object.keys(parsedCountdowns).forEach(key => {
//             numericCountdowns[key] = typeof parsedCountdowns[key] === 'object' 
//               ? parsedCountdowns[key].valueOf() 
//               : parsedCountdowns[key];
//           });
          
//           setCountdowns(numericCountdowns);
//         }
//       }
//     });
//     return () => unsub();
//   }, []);
  
//   // ✅ Fetch user progress ONLY once when user logs in
//   useEffect(() => {
//     const fetchUserProgress = async () => {
//       if (!user) return;
      
//       try {
//         const userProgressRef = doc(db, "userProgress", user.uid);
//         const docSnap = await getDoc(userProgressRef);
        
//         if (docSnap.exists()) {
//           const userData = docSnap.data();
//           setLinkProgress(userData.linkProgress || {});
          
//           // Convert Firestore timestamps to numeric values
//           const numericCountdowns = {};
//           if (userData.countdowns) {
//             Object.keys(userData.countdowns).forEach(key => {
//               numericCountdowns[key] = typeof userData.countdowns[key] === 'object' 
//                 ? userData.countdowns[key].toMillis() 
//                 : userData.countdowns[key];
//             });
//           }
          
//           setCountdowns(numericCountdowns);
          
//           // ✅ Save to localStorage for future visits
//           localStorage.setItem(`progress_${user.uid}`, JSON.stringify(userData.linkProgress || {}));
//           localStorage.setItem(`countdowns_${user.uid}`, JSON.stringify(numericCountdowns));
//         } else {
//           await setDoc(userProgressRef, {
//             userId: user.uid,
//             linkProgress: {},
//             countdowns: {},
//             createdAt: new Date()
//           });
//         }
//         setUserProgressDoc(userProgressRef);
//       } catch (err) {
//         console.error("Error fetching user progress:", err);
//         setError("Failed to load user progress");
//       }
//     };
//     if (user) {
//       fetchUserProgress();
//     }
//   }, [user]);
  
//   // ✅ Fetch content ONLY once (with caching)
//   useEffect(() => {
//     const fetchContent = async () => {
//       // ✅ Check cache first
//       const cachedContent = localStorage.getItem('cachedContent');
//       const cachedTimestamp = localStorage.getItem('cachedContentTimestamp');
      
//       // If cache exists and is less than 1 hour old, use it
//       if (cachedContent && cachedTimestamp && (Date.now() - cachedTimestamp < 3600000)) {
//         setContent(JSON.parse(cachedContent));
//         return;
//       }
      
//       try {
//         const q = query(collection(db, "adminContent"), orderBy("createdAt", "desc"));
//         const querySnapshot = await getDocs(q);
//         const contentData = [];
//         querySnapshot.forEach((doc) => {
//           contentData.push({ id: doc.id, ...doc.data() });
//         });
        
//         setContent(contentData);
//         // ✅ Cache the content
//         localStorage.setItem('cachedContent', JSON.stringify(contentData));
//         localStorage.setItem('cachedContentTimestamp', Date.now());
//       } catch (err) {
//         console.error("Error fetching content:", err);
//         setError("Failed to load content");
//       }
//     };
    
//     if (user) fetchContent();
//   }, [user]);
  
//   // ✅ Save progress to Firestore ONLY when changes occur (not on every render)
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
    
//     // ✅ Debounce Firestore writes to prevent too many requests
//     const timer = setTimeout(() => {
//       if (Object.keys(linkProgress).length > 0 || Object.keys(countdowns).length > 0) {
//         saveProgressToFirestore();
//       }
//     }, 2000); // Save every 2 seconds after changes
    
//     return () => clearTimeout(timer);
//   }, [linkProgress, countdowns, user, userProgressDoc]);
  
//   // ✅ Handle countdown timers LOCALLY (no Firestore reads/writes)
//   useEffect(() => {
//    if (!user) return;
//    const interval = setInterval(() => {
//      setCountdowns(prev => {
//        const updated = { ...prev };
//        Object.entries(prev).forEach(([key, endTime]) => {
//          const endTimeMs = typeof endTime === 'number' ? endTime : endTime.toMillis();
//          if (endTimeMs - Date.now() <= 0) {
//            delete updated[key];
//          }
//        });
//        if (JSON.stringify(updated) !== JSON.stringify(prev)) {
//          localStorage.setItem(`countdowns_${user.uid}`, JSON.stringify(updated));
//        }
//        return updated;
//      });
//    }, 1000);
//    return () => clearInterval(interval);
//  }, [user]);
  
//   // ✅ Function to handle logout with status update
//   const handleLogout = async () => {
//     try {
//       // Update user status to offline before signing out
//       if (user) {
//         const userRef = doc(db, "users", user.uid);
//         await updateDoc(userRef, {
//           isOnline: false,
//           lastActive: new Date()
//         });
//       }
      
//       // Sign out from Firebase Auth
//       await signOut(auth);
      
//       // Clear local storage
//       if (user) {
//         localStorage.removeItem(`progress_${user.uid}`);
//         localStorage.removeItem(`countdowns_${user.uid}`);
//       }
      
//       // Redirect to login page
//       window.location.href = "/login";
      
//     } catch (error) {
//       console.error("Error during logout:", error);
//       // Still try to sign out even if status update fails
//       await signOut(auth);
//       window.location.href = "/login";
//     }
//   };

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
  
//   // ✅ Function to track when user clicks on Gumroad link
//   const trackGumroadClick = async (courseName, gumroadUrl) => {
//     try {
//       // Track in user's progress
//       const gumroadKey = `${courseName}_gumroad`;
//       setLinkProgress(prev => ({ ...prev, [gumroadKey]: true }));
      
//       // Save to localStorage immediately
//       if (user) {
//         const updatedProgress = {...linkProgress, [gumroadKey]: true};
//         localStorage.setItem(`progress_${user.uid}`, JSON.stringify(updatedProgress));
//       }
      
//       // Record this action in a separate collection for admin tracking
//       const trackingRef = collection(db, "gumroadClicks");
//       await addDoc(trackingRef, {
//         userId: user.uid,
//         userEmail: user.email,
//         courseName,
//         gumroadUrl,
//         clickedAt: new Date(),
//         userName: user.displayName || user.email.split('@')[0]
//       });
      
//       // Open the Gumroad link
//       window.open(gumroadUrl, "_blank", "noopener,noreferrer");
      
//     } catch (error) {
//       console.error("Error tracking Gumroad click:", error);
//       // Still open the link even if tracking fails
//       window.open(gumroadUrl, "_blank", "noopener,noreferrer");
//     }
//   };
  
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
//       const endTime = countdowns[linkKey];
//       const remainingTime = Math.ceil((endTime - new Date().getTime()) / 1000);
      
//       if (remainingTime > 0) {
//         const hours = Math.floor(remainingTime / 3600);
//         const minutes = Math.floor((remainingTime % 3600) / 60);
//         const seconds = remainingTime % 60;
//         alert(`Please wait ${hours}h ${minutes}m ${seconds}s before accessing this resource.`);
//         return;
//       }
//     }
    
//     // If this is the first link or previous is completed, unlock it
//     if (linkIndex === 0 || linkProgress[prevLinkKey]) {
//       // Start 24 hour countdown for next link
//       if (linkIndex < 149) { // Changed from 49 to 149 for 150 fields
//         const nextLinkKey = `${courseName}_part${partIndex}_link${linkIndex + 1}`;
//         const endTime = new Date().getTime() + 24 * 60 * 60 * 1000; // 24 hours from now
        
//         setCountdowns(prev => ({ 
//           ...prev, 
//           [nextLinkKey]: endTime 
//         }));
        
//         // Save to localStorage immediately
//         if (user) {
//           const updatedCountdowns = {...countdowns, [nextLinkKey]: endTime};
//           localStorage.setItem(`countdowns_${user.uid}`, JSON.stringify(updatedCountdowns));
//         }
//       }
      
//       // Mark current link as completed
//       setLinkProgress(prev => ({ ...prev, [linkKey]: true }));
      
//       // Save to localStorage immediately
//       if (user) {
//         const updatedProgress = {...linkProgress, [linkKey]: true};
//         localStorage.setItem(`progress_${user.uid}`, JSON.stringify(updatedProgress));
//       }
      
//       // Track this completion in user activity
//       trackResourceCompletion(courseName, partIndex, linkIndex, url);
      
//       // Open the link
//       openLink(url);
//     }
//   };
  
//   // ✅ Function to track resource completion
//   const trackResourceCompletion = async (courseName, partIndex, linkIndex, url) => {
//     try {
//       const activityRef = collection(db, "userActivities");
//       await addDoc(activityRef, {
//         userId: user.uid,
//         userEmail: user.email,
//         courseName,
//         partIndex,
//         linkIndex,
//         resourceUrl: url,
//         completedAt: new Date(),
//         userName: user.displayName || user.email.split('@')[0]
//       });
//     } catch (error) {
//       console.error("Error tracking resource completion:", error);
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
  
//   // ✅ Modified formatCountdown function to show hours, minutes, and seconds
//   const formatCountdown = (milliseconds) => {
//     const totalSeconds = Math.ceil(milliseconds / 1000);
//     const hours = Math.floor(totalSeconds / 3600);
//     const minutes = Math.floor((totalSeconds % 3600) / 60);
//     const seconds = totalSeconds % 60;
    
//     // Always show hours, minutes, and seconds
//     return `${hours}h ${minutes}m ${seconds}s`;
//   };

//   const getCountdownTime = (key) => {
//     if (!countdowns[key]) return null;
    
//     // Ensure it's a number
//     const endTime = typeof countdowns[key] === 'number' 
//       ? countdowns[key] 
//       : countdowns[key].toMillis();
      
//     const distance = endTime - new Date().getTime();
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
//               animationDelay: `${Math.random() * 2}s`,
//             }}
//           ></div>
//         ))}
//       </div>
      
//       <div className="relative z-10 max-w-6xl mx-auto">
//         <div className="flex justify-between items-center mb-8">
//           <div className="text-center">
//             <div className="inline-block p-4 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 mb-4 transform transition-transform duration-500 hover:scale-110">
//               <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" viewBox="0 0 20 20" fill="currentColor">
//                 <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 极 9a7 7 0 1114 0H3z" clipRule="evenodd" />
//               </svg>
//             </div>
//             <h1 className="text-4xl md:text-5xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
//               Welcome, {user?.email?.split('@')[0]}!
//             </h1>
//           </div>
//           <button
//             onClick={handleLogout}
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
//             {Object.entries(groupedContent).map(([courseName, parts]) => {
//               // Check if this course has a Gumroad link
//               const gumroadLink = parts[0]?.gumroadLink;
              
//               return (
//                 <div key={courseName} className="course-section">
//                   <div className="text-center mb-8">
//                     <h2 className="text-3xl md:text-4xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
//                       {courseName}
//                     </h2>
                    
//                     {/* Special Gumroad Button - Very Prominent */}
//                     {gumroadLink && (
//                       <div className="mt-6 mb-8 animate-pulse">
//                         <div className="bg-gradient-to-r from-yellow-500 to-orange-500 p-1 rounded-2xl shadow-2xl transform hover:scale-105 transition-transform duration-300 inline-block">
//                           <button
//                             onClick={() => trackGumroadClick(courseName, gumroadLink)}
//                             className="bg-black py-4 px-8 rounded-xl text-xl font-bold text-white flex items-center justify-center space-x-3"
//                           >
//                             <span className="text-yellow-300">🚀</span>
//                             <span>Get Full Course Instantly on Gumroad</span>
//                             <span className="text-yellow-300">⭐</span>
//                           </button>
//                         </div>
//                         <p className="text-gray-300 mt-3 text-lg">
//                           One-click access to the complete {courseName} course
//                         </p>
//                       </div>
//                     )}
                    
//                     <div className="w-24 h-1 bg-gradient-to-r from-blue-500 to-purple-500 mx-auto rounded-full"></div>
//                   </div>
                  
//                   <div className="space-y-8">
//                     {parts.map((part, partIndex) => (
//                       <div key={part.id} className="bg-gray-900 bg-opacity-70 backdrop-blur-lg rounded-2xl p-6 border border-gray-800 shadow-2xl">
//                         <div className="mb-6 group relative overflow-hidden rounded-2xl shadow-xl">
//                           {part.imageUrl ? (
//                             <img 
//                               src={part.imageUrl} 
//                               alt={`Part ${partIndex + 1} of ${courseName}`} 
//                               className="w-full h-80 object-cover transform transition-transform duration-500 group-hover:scale-105"
//                             />
//                           ) : (
//                             <img 
//                               src="https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80" 
//                               alt={`Part ${partIndex + 1} of ${courseName}`} 
//                               className="w-full h-80 object-cover transform transition-transform duration-500 group-hover:scale-105"
//                             />
//                           )}
//                         </div>
                        
//                         <div className="mb-4">
//                           <h4 className="text-lg font-semib极 old mb-3 text-purple-400">Resources for Part {partIndex + 1}:</h4>
//                           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
//                             {part.fields
//                               .filter(field => field.trim() !== '') 
//                               .map((field, index) => {
//                                 const isUrl = field.startsWith('http://') || field.startsWith('https://');
//                                 const linkKey = `${courseName}_part${partIndex}_link${index}`;
//                                 const isUnlocked = linkProgress[linkKey];
//                                 const prevLinkKey = index > 0 ? `${courseName}_part${partIndex}_link${index - 1}` : null;
//                                 const canAccess = index === 0 || linkProgress[prevLinkKey];
//                                 const countdownTime = getCountdownTime(linkKey);
                                
//                                 if (isUrl) {
//                                   return (
//                                     <div key={index} className="relative">
//                                       <button
//                                         onClick={() => handleLinkClick(courseName, partIndex, index, field)}
//                                         disabled={!canAccess || (countdownTime !== null && countdownTime > 0)}
//                                         className={`w-full font-medium py-3 px-4 rounded-lg transition duration-300 transform flex items-center justify-center ${
//                                           isUnlocked 
//                                             ? "bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
//                                             : canAccess && (countdownTime === null || countdownTime === 0)
//                                               ? "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
//                                               : "bg-gray-700 text-gray-400 cursor-not-allowed"
//                                         }`}
//                                       >
//                                         <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
//                                           <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 极 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 极 11-2.828-2.828l3-3z" clipRule="evenodd" />
//                                         </svg>
//                                         {`${courseName} - Part ${index + 1}`}
//                                       </button>
                                      
//                                       {/* Status indicators */}
//                                       <div className="mt-2 text-xs text-center">
//                                         {isUnlocked ? (
//                                           <span className="text-green-400">✓ Completed</span>
//                                         ) : countdownTime !== null && countdownTime > 0 ? (
//                                           <span className="text-yellow-400">Available in {formatCountdown(countdownTime)}</span>
//                                         ) : canAccess ? (
//                                           <span className="text-blue-400">Ready to access</span>
//                                         ) : (
//                                           <span className="text-gray-400">Complete previous resource first</span>
//                                         )}
//                                       </div>
//                                     </div>
//                                   );
//                                 } else {
//                                   return (
//                                     <div key={index} className="bg-gray-800 p-4 rounded-lg">
//                                       <p className="text-gray-300">{field}</p>
//                                     </div>
//                                   );
//                                 }
//                               })}
//                           </div>
//                         </div>
                        
//                         <div className="mt-4 text-sm text-gray-500">
//                           {part.fields.filter(f => f.trim()).length} resources
//                         </div>
//                       </div>
//                     ))}
//                   </div>
//                 </div>
//               );
//             })}
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
// import { collection, getDocs, query, orderBy, doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
// import { enableIndexedDbPersistence } from "firebase/firestore";

// export default function UserPage() {
//   const [user, setUser] = useState(null);
//   const [isLoading, setIsLoading] = useState(true);
//   const [content, setContent] = useState([]);
//   const [error, setError] = useState("");
//   const [linkProgress, setLinkProgress] = useState({});
//   const [countdowns, setCountdowns] = useState({});
//   const [userProgressDoc, setUserProgressDoc] = useState(null);
  
//   // ✅ Enable Firestore persistence for caching
//   useEffect(() => {
//     const enablePersistence = async () => {
//       try {
//         await enableIndexedDbPersistence(db);
//       } catch (err) {
//         if (err.code == 'failed-precondition') {
//           console.log("Multiple tabs open, persistence can only be enabled in one tab at a time.");
//         } else if (err.code == 'unimplemented') {
//           console.log("The current browser doesn't support persistence.");
//         }
//       }
//     };
//     enablePersistence();
//   }, []);
  
//   useEffect(() => {
//     const unsub = onAuthStateChanged(auth, async (u) => {
//       if (!u) {
//         window.location.href = "/login";
//       } else {
//         setUser(u);
//         setIsLoading(false);
        
//         // ✅ Update user status to online in Firestore
//         try {
//           const userRef = doc(db, "users", u.uid);
//           await updateDoc(userRef, {
//             isOnline: true,
//             lastActive: new Date()
//           });
//         } catch (error) {
//           console.error("Error updating user status:", error);
//         }
        
//         // ✅ Load from localStorage first for instant UI
//         const savedProgress = localStorage.getItem(`progress_${u.uid}`);
//         const savedCountdowns = localStorage.getItem(`countdowns_${u.uid}`);
        
//         if (savedProgress) setLinkProgress(JSON.parse(savedProgress));
//         if (savedCountdowns) {
//           // Convert stored timestamps to numbers
//           const parsedCountdowns = JSON.parse(savedCountdowns);
//           const numericCountdowns = {};
          
//           Object.keys(parsedCountdowns).forEach(key => {
//             numericCountdowns[key] = typeof parsedCountdowns[key] === 'object' 
//               ? parsedCountdowns[key].valueOf() 
//               : parsedCountdowns[key];
//           });
          
//           setCountdowns(numericCountdowns);
//         }
//       }
//     });
//     return () => unsub();
//   }, []);
  
//   // ✅ Fetch user progress ONLY once when user logs in
//   useEffect(() => {
//     const fetchUserProgress = async () => {
//       if (!user) return;
      
//       try {
//         const userProgressRef = doc(db, "userProgress", user.uid);
//         const docSnap = await getDoc(userProgressRef);
        
//         if (docSnap.exists()) {
//           const userData = docSnap.data();
//           setLinkProgress(userData.linkProgress || {});
          
//           // Convert Firestore timestamps to numeric values
//           const numericCountdowns = {};
//           if (userData.countdowns) {
//             Object.keys(userData.countdowns).forEach(key => {
//               numericCountdowns[key] = typeof userData.countdowns[key] === 'object' 
//                 ? userData.countdowns[key].toMillis() 
//                 : userData.countdowns[key];
//             });
//           }
          
//           setCountdowns(numericCountdowns);
          
//           // ✅ Save to localStorage for future visits
//           localStorage.setItem(`progress_${user.uid}`, JSON.stringify(userData.linkProgress || {}));
//           localStorage.setItem(`countdowns_${user.uid}`, JSON.stringify(numericCountdowns));
//         } else {
//           await setDoc(userProgressRef, {
//             userId: user.uid,
//             linkProgress: {},
//             countdowns: {},
//             createdAt: new Date()
//           });
//         }
//         setUserProgressDoc(userProgressRef);
//       } catch (err) {
//         console.error("Error fetching user progress:", err);
//         setError("Failed to load user progress");
//       }
//     };
//     if (user) {
//       fetchUserProgress();
//     }
//   }, [user]);
  
//   // ✅ Fetch content ONLY once (with caching)
//   useEffect(() => {
//     const fetchContent = async () => {
//       // ✅ Check cache first
//       const cachedContent = localStorage.getItem('cachedContent');
//       const cachedTimestamp = localStorage.getItem('cachedContentTimestamp');
      
//       // If cache exists and is less than 1 hour old, use it
//       if (cachedContent && cachedTimestamp && (Date.now() - cachedTimestamp < 3600000)) {
//         setContent(JSON.parse(cachedContent));
//         return;
//       }
      
//       try {
//         const q = query(collection(db, "adminContent"), orderBy("createdAt", "desc"));
//         const querySnapshot = await getDocs(q);
//         const contentData = [];
//         querySnapshot.forEach((doc) => {
//           contentData.push({ id: doc.id, ...doc.data() });
//         });
        
//         setContent(contentData);
//         // ✅ Cache the content
//         localStorage.setItem('cachedContent', JSON.stringify(contentData));
//         localStorage.setItem('cachedContentTimestamp', Date.now());
//       } catch (err) {
//         console.error("Error fetching content:", err);
//         setError("Failed to load content");
//       }
//     };
    
//     if (user) fetchContent();
//   }, [user]);
  
//   // ✅ Save progress to Firestore ONLY when changes occur (not on every render)
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
    
//     // ✅ Debounce Firestore writes to prevent too many requests
//     const timer = setTimeout(() => {
//       if (Object.keys(linkProgress).length > 0 || Object.keys(countdowns).length > 0) {
//         saveProgressToFirestore();
//       }
//     }, 2000); // Save every 2 seconds after changes
    
//     return () => clearTimeout(timer);
//   }, [linkProgress, countdowns, user, userProgressDoc]);
  
//   // ✅ Handle countdown timers LOCALLY (no Firestore reads/writes)
//   useEffect(() => {
//    if (!user) return;
//    const interval = setInterval(() => {
//      setCountdowns(prev => {
//        const updated = { ...prev };
//        Object.entries(prev).forEach(([key, endTime]) => {
//          const endTimeMs = typeof endTime === 'number' ? endTime : endTime.toMillis();
//          if (endTimeMs - Date.now() <= 0) {
//            delete updated[key];
//          }
//        });
//        if (JSON.stringify(updated) !== JSON.stringify(prev)) {
//          localStorage.setItem(`countdowns_${user.uid}`, JSON.stringify(updated));
//        }
//        return updated;
//      });
//    }, 1000);
//    return () => clearInterval(interval);
//  }, [user]);
  
//   // ✅ Function to handle logout with status update
//   const handleLogout = async () => {
//     try {
//       // Update user status to offline before signing out
//       if (user) {
//         const userRef = doc(db, "users", user.uid);
//         await updateDoc(userRef, {
//           isOnline: false,
//           lastActive: new Date()
//         });
//       }
      
//       // Sign out from Firebase Auth
//       await signOut(auth);
      
//       // Clear local storage
//       if (user) {
//         localStorage.removeItem(`progress_${user.uid}`);
//         localStorage.removeItem(`countdowns_${user.uid}`);
//       }
      
//       // Redirect to login page
//       window.location.href = "/login";
      
//     } catch (error) {
//       console.error("Error during logout:", error);
//       // Still try to sign out even if status update fails
//       await signOut(auth);
//       window.location.href = "/login";
//     }
//   };

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
//       const endTime = countdowns[linkKey];
//       const remainingTime = Math.ceil((endTime - new Date().getTime()) / 1000);
      
//       if (remainingTime > 0) {
//         const hours = Math.floor(remainingTime / 3600);
//         const minutes = Math.floor((remainingTime % 3600) / 60);
//         const seconds = remainingTime % 60;
//         alert(`Please wait ${hours}h ${minutes}m ${seconds}s before accessing this resource.`);
//         return;
//       }
//     }
    
//     // If this is the first link or previous is completed, unlock it
//     if (linkIndex === 0 || linkProgress[prevLinkKey]) {
//       // Start 24 hour countdown for next link
//       if (linkIndex < 49) { // Assuming max 50 links
//         const nextLinkKey = `${courseName}_part${partIndex}_link${linkIndex + 1}`;
//         const endTime = new Date().getTime() + 24 * 60 * 60 * 1000; // 24 hours from now
        
//         setCountdowns(prev => ({ 
//           ...prev, 
//           [nextLinkKey]: endTime 
//         }));
        
//         // Save to localStorage immediately
//         if (user) {
//           const updatedCountdowns = {...countdowns, [nextLinkKey]: endTime};
//           localStorage.setItem(`countdowns_${user.uid}`, JSON.stringify(updatedCountdowns));
//         }
//       }
      
//       // Mark current link as completed
//       setLinkProgress(prev => ({ ...prev, [linkKey]: true }));
      
//       // Save to localStorage immediately
//       if (user) {
//         const updatedProgress = {...linkProgress, [linkKey]: true};
//         localStorage.setItem(`progress_${user.uid}`, JSON.stringify(updatedProgress));
//       }
      
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
  
//   // ✅ Modified formatCountdown function to show hours, minutes, and seconds
//   const formatCountdown = (milliseconds) => {
//     const totalSeconds = Math.ceil(milliseconds / 1000);
//     const hours = Math.floor(totalSeconds / 3600);
//     const minutes = Math.floor((totalSeconds % 3600) / 60);
//     const seconds = totalSeconds % 60;
    
//     // Always show hours, minutes, and seconds
//     return `${hours}h ${minutes}m ${seconds}s`;
//   };

//   const getCountdownTime = (key) => {
//     if (!countdowns[key]) return null;
    
//     // Ensure it's a number
//     const endTime = typeof countdowns[key] === 'number' 
//       ? countdowns[key] 
//       : countdowns[key].toMillis();
      
//     const distance = endTime - new Date().getTime();
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
//               animationDelay: `${Math.random() * 2}s`,
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
//             onClick={handleLogout} // ✅ Use the new logout handler
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
//                                       disabled={!canAccess || (countdownTime !== null && countdownTime > 0)}
//                                       className={`w-full font-medium py-3 px-4 rounded-lg transition duration-300 transform flex items-center justify-center ${
//                                         isUnlocked 
//                                           ? "bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
//                                           : canAccess && (countdownTime === null || countdownTime === 0)
//                                             ? "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
//                                             : "bg-gray-700 text-gray-400 cursor-not-allowed"
//                                       }`}
//                                     >
//                                       <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
//                                         <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd" />
//                                       </svg>
//                                       {`${courseName} - Part ${index + 1}`}
//                                     </button>
                                    
//                                     {/* Status indicators */}
//                                     <div className="mt-2 text-xs text-center">
//                                       {isUnlocked ? (
//                                         <span className="text-green-400">✓ Completed</span>
//                                       ) : countdownTime !== null && countdownTime > 0 ? (
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



// =======================================================================


























// "use client";
// import { useEffect, useState, useMemo } from "react";
// import { auth, db } from "@/lib/firebase";
// import { onAuthStateChanged, signOut } from "firebase/auth";
// import { collection, getDocs, query, orderBy, doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
// import { enableIndexedDbPersistence } from "firebase/firestore";

// export default function UserPage() {
//   const [user, setUser] = useState(null);
//   const [isLoading, setIsLoading] = useState(true);
//   const [content, setContent] = useState([]);
//   const [error, setError] = useState("");
//   const [linkProgress, setLinkProgress] = useState({});
//   const [countdowns, setCountdowns] = useState({});
//   const [userProgressDoc, setUserProgressDoc] = useState(null);
  
//   // ✅ Enable Firestore persistence for caching
//   useEffect(() => {
//     const enablePersistence = async () => {
//       try {
//         await enableIndexedDbPersistence(db);
//       } catch (err) {
//         if (err.code == 'failed-precondition') {
//           console.log("Multiple tabs open, persistence can only be enabled in one tab at a time.");
//         } else if (err.code == 'unimplemented') {
//           console.log("The current browser doesn't support persistence.");
//         }
//       }
//     };
//     enablePersistence();
//   }, []);
  
//   useEffect(() => {
//     const unsub = onAuthStateChanged(auth, (u) => {
//       if (!u) {
//         window.location.href = "/login";
//       } else {
//         setUser(u);
//         setIsLoading(false);
        
//         // ✅ Load from localStorage first for instant UI
//         const savedProgress = localStorage.getItem(`progress_${u.uid}`);
//         const savedCountdowns = localStorage.getItem(`countdowns_${u.uid}`);
        
//         if (savedProgress) setLinkProgress(JSON.parse(savedProgress));
//         if (savedCountdowns) {
//           // Convert stored timestamps to numbers
//           const parsedCountdowns = JSON.parse(savedCountdowns);
//           const numericCountdowns = {};
          
//           Object.keys(parsedCountdowns).forEach(key => {
//             numericCountdowns[key] = typeof parsedCountdowns[key] === 'object' 
//               ? parsedCountdowns[key].valueOf() 
//               : parsedCountdowns[key];
//           });
          
//           setCountdowns(numericCountdowns);
//         }
//       }
//     });
//     return () => unsub();
//   }, []);
  
//   // ✅ Fetch user progress ONLY once when user logs in
//   useEffect(() => {
//     const fetchUserProgress = async () => {
//       if (!user) return;
      
//       try {
//         const userProgressRef = doc(db, "userProgress", user.uid);
//         const docSnap = await getDoc(userProgressRef);
        
//         if (docSnap.exists()) {
//           const userData = docSnap.data();
//           setLinkProgress(userData.linkProgress || {});
          
//           // Convert Firestore timestamps to numeric values
//           const numericCountdowns = {};
//           if (userData.countdowns) {
//             Object.keys(userData.countdowns).forEach(key => {
//               numericCountdowns[key] = typeof userData.countdowns[key] === 'object' 
//                 ? userData.countdowns[key].toMillis() 
//                 : userData.countdowns[key];
//             });
//           }
          
//           setCountdowns(numericCountdowns);
          
//           // ✅ Save to localStorage for future visits
//           localStorage.setItem(`progress_${user.uid}`, JSON.stringify(userData.linkProgress || {}));
//           localStorage.setItem(`countdowns_${user.uid}`, JSON.stringify(numericCountdowns));
//         } else {
//           await setDoc(userProgressRef, {
//             userId: user.uid,
//             linkProgress: {},
//             countdowns: {},
//             createdAt: new Date()
//           });
//         }
//         setUserProgressDoc(userProgressRef);
//       } catch (err) {
//         console.error("Error fetching user progress:", err);
//         setError("Failed to load user progress");
//       }
//     };
//     if (user) {
//       fetchUserProgress();
//     }
//   }, [user]);
  
//   // ✅ Fetch content ONLY once (with caching)
//   useEffect(() => {
//     const fetchContent = async () => {
//       // ✅ Check cache first
//       const cachedContent = localStorage.getItem('cachedContent');
//       const cachedTimestamp = localStorage.getItem('cachedContentTimestamp');
      
//       // If cache exists and is less than 1 hour old, use it
//       if (cachedContent && cachedTimestamp && (Date.now() - cachedTimestamp < 3600000)) {
//         setContent(JSON.parse(cachedContent));
//         return;
//       }
      
//       try {
//         const q = query(collection(db, "adminContent"), orderBy("createdAt", "desc"));
//         const querySnapshot = await getDocs(q);
//         const contentData = [];
//         querySnapshot.forEach((doc) => {
//           contentData.push({ id: doc.id, ...doc.data() });
//         });
        
//         setContent(contentData);
//         // ✅ Cache the content
//         localStorage.setItem('cachedContent', JSON.stringify(contentData));
//         localStorage.setItem('cachedContentTimestamp', Date.now());
//       } catch (err) {
//         console.error("Error fetching content:", err);
//         setError("Failed to load content");
//       }
//     };
    
//     if (user) fetchContent();
//   }, [user]);
  
//   // ✅ Save progress to Firestore ONLY when changes occur (not on every render)
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
    
//     // ✅ Debounce Firestore writes to prevent too many requests
//     const timer = setTimeout(() => {
//       if (Object.keys(linkProgress).length > 0 || Object.keys(countdowns).length > 0) {
//         saveProgressToFirestore();
//       }
//     }, 2000); // Save every 2 seconds after changes
    
//     return () => clearTimeout(timer);
//   }, [linkProgress, countdowns, user, userProgressDoc]);
  
//   // ======================================================================================

//   // ✅ Handle countdown timers LOCALLY (no Firestore reads/writes)
//   // useEffect(() => {
//   //   const timers = {};
    
//   //   Object.entries(countdowns).forEach(([key, endTime]) => {
//   //     // Ensure endTime is a number
//   //     const endTimeMs = typeof endTime === 'number' ? endTime : endTime.toMillis();
      
//   //     const updateCountdown = () => {
//   //       const now = new Date().getTime();
//   //       const distance = endTimeMs - now;
        
//   //       if (distance <= 0) {
//   //         // Timer finished - update locally only
//   //         setCountdowns(prev => {
//   //           const newCountdowns = { ...prev };
//   //           delete newCountdowns[key];
            
//   //           // ✅ Update localStorage
//   //           if (user) {
//   //             localStorage.setItem(`countdowns_${user.uid}`, JSON.stringify(newCountdowns));
//   //           }
//   //           return newCountdowns;
//   //         });
//   //       } else {
//   //         // Just update the local state
//   //         timers[key] = setTimeout(updateCountdown, 1000);
//   //       }
//   //     };
      
//   //     timers[key] = setTimeout(updateCountdown, 1000);
//   //   });
    
//   //   return () => {
//   //     Object.values(timers).forEach(timer => clearTimeout(timer));
//   //   };
//   // }, [countdowns, user]);

//   useEffect(() => {
//    if (!user) return;
//    const interval = setInterval(() => {
//      setCountdowns(prev => {
//        const updated = { ...prev };
//        Object.entries(prev).forEach(([key, endTime]) => {
//          const endTimeMs = typeof endTime === 'number' ? endTime : endTime.toMillis();
//          if (endTimeMs - Date.now() <= 0) {
//            delete updated[key];
//          }
//        });
//        if (JSON.stringify(updated) !== JSON.stringify(prev)) {
//          localStorage.setItem(`countdowns_${user.uid}`, JSON.stringify(updated));
//        }
//        return updated;
//      });
//    }, 1000);
//    return () => clearInterval(interval);
//  }, [user]);
  

// //  ===========================================================================

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
//       const endTime = countdowns[linkKey];
//       const remainingTime = Math.ceil((endTime - new Date().getTime()) / 1000);
      
//       if (remainingTime > 0) {
//         const hours = Math.floor(remainingTime / 3600);
//         const minutes = Math.floor((remainingTime % 3600) / 60);
//         const seconds = remainingTime % 60;
//         alert(`Please wait ${hours}h ${minutes}m ${seconds}s before accessing this resource.`);
//         return;
//       }
//     }
    
//     // If this is the first link or previous is completed, unlock it
//     if (linkIndex === 0 || linkProgress[prevLinkKey]) {
//       // Start 24 hour countdown for next link
//       if (linkIndex < 49) { // Assuming max 50 links
//         const nextLinkKey = `${courseName}_part${partIndex}_link${linkIndex + 1}`;
//         const endTime = new Date().getTime() + 24 * 60 * 60 * 1000; // 24 hours from now
        
//         setCountdowns(prev => ({ 
//           ...prev, 
//           [nextLinkKey]: endTime 
//         }));
        
//         // Save to localStorage immediately
//         if (user) {
//           const updatedCountdowns = {...countdowns, [nextLinkKey]: endTime};
//           localStorage.setItem(`countdowns_${user.uid}`, JSON.stringify(updatedCountdowns));
//         }
//       }
      
//       // Mark current link as completed
//       setLinkProgress(prev => ({ ...prev, [linkKey]: true }));
      
//       // Save to localStorage immediately
//       if (user) {
//         const updatedProgress = {...linkProgress, [linkKey]: true};
//         localStorage.setItem(`progress_${user.uid}`, JSON.stringify(updatedProgress));
//       }
      
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
  
//   // ✅ Modified formatCountdown function to show hours, minutes, and seconds
//   const formatCountdown = (milliseconds) => {
//     const totalSeconds = Math.ceil(milliseconds / 1000);
//     const hours = Math.floor(totalSeconds / 3600);
//     const minutes = Math.floor((totalSeconds % 3600) / 60);
//     const seconds = totalSeconds % 60;
    
//     // Always show hours, minutes, and seconds
//     return `${hours}h ${minutes}m ${seconds}s`;
//   };

//   const getCountdownTime = (key) => {
//     if (!countdowns[key]) return null;
    
//     // Ensure it's a number
//     const endTime = typeof countdowns[key] === 'number' 
//       ? countdowns[key] 
//       : countdowns[key].toMillis();
      
//     const distance = endTime - new Date().getTime();
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
//               animationDelay: `${Math.random() * 2}s`,
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
//                                       disabled={!canAccess || (countdownTime !== null && countdownTime > 0)}
//                                       className={`w-full font-medium py-3 px-4 rounded-lg transition duration-300 transform flex items-center justify-center ${
//                                         isUnlocked 
//                                           ? "bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
//                                           : canAccess && (countdownTime === null || countdownTime === 0)
//                                             ? "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
//                                             : "bg-gray-700 text-gray-400 cursor-not-allowed"
//                                       }`}
//                                     >
//                                       <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
//                                         <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd" />
//                                       </svg>
//                                       {/* {getLinkName(field)} */}
//                                       {/* {`${courseName} - Part ${partIndex + 1}`} */}

//                                         {/* ✅ New (fix here) */}
//   {/* {`${courseName} - Part ${partIndex + 1} - Resource ${index + 1}`} */}
//   {`${courseName} - Part ${index + 1}`}

//                                     </button>
                                    
//                                     {/* Status indicators */}
//                                     <div className="mt-2 text-xs text-center">
//                                       {isUnlocked ? (
//                                         <span className="text-green-400">✓ Completed</span>
//                                       ) : countdownTime !== null && countdownTime > 0 ? (
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




























// "use client";
// import { useEffect, useState, useMemo } from "react";
// import { auth, db } from "@/lib/firebase";
// import { onAuthStateChanged, signOut } from "firebase/auth";
// import { collection, getDocs, query, orderBy, doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
// import { enableIndexedDbPersistence } from "firebase/firestore";

// export default function UserPage() {
//   const [user, setUser] = useState(null);
//   const [isLoading, setIsLoading] = useState(true);
//   const [content, setContent] = useState([]);
//   const [error, setError] = useState("");
//   const [linkProgress, setLinkProgress] = useState({});
//   const [countdowns, setCountdowns] = useState({});
//   const [userProgressDoc, setUserProgressDoc] = useState(null);
  
//   // ✅ Enable Firestore persistence for caching
//   useEffect(() => {
//     const enablePersistence = async () => {
//       try {
//         await enableIndexedDbPersistence(db);
//       } catch (err) {
//         if (err.code == 'failed-precondition') {
//           console.log("Multiple tabs open, persistence can only be enabled in one tab at a time.");
//         } else if (err.code == 'unimplemented') {
//           console.log("The current browser doesn't support persistence.");
//         }
//       }
//     };
//     enablePersistence();
//   }, []);
  
//   useEffect(() => {
//     const unsub = onAuthStateChanged(auth, (u) => {
//       if (!u) {
//         window.location.href = "/login";
//       } else {
//         setUser(u);
//         setIsLoading(false);
        
//         // ✅ Load from localStorage first for instant UI
//         const savedProgress = localStorage.getItem(`progress_${u.uid}`);
//         const savedCountdowns = localStorage.getItem(`countdowns_${u.uid}`);
        
//         if (savedProgress) setLinkProgress(JSON.parse(savedProgress));
//         if (savedCountdowns) {
//           // Convert stored timestamps to numbers
//           const parsedCountdowns = JSON.parse(savedCountdowns);
//           const numericCountdowns = {};
          
//           Object.keys(parsedCountdowns).forEach(key => {
//             numericCountdowns[key] = typeof parsedCountdowns[key] === 'object' 
//               ? parsedCountdowns[key].valueOf() 
//               : parsedCountdowns[key];
//           });
          
//           setCountdowns(numericCountdowns);
//         }
//       }
//     });
//     return () => unsub();
//   }, []);
  
//   // ✅ Fetch user progress ONLY once when user logs in
//   useEffect(() => {
//     const fetchUserProgress = async () => {
//       if (!user) return;
      
//       try {
//         const userProgressRef = doc(db, "userProgress", user.uid);
//         const docSnap = await getDoc(userProgressRef);
        
//         if (docSnap.exists()) {
//           const userData = docSnap.data();
//           setLinkProgress(userData.linkProgress || {});
          
//           // Convert Firestore timestamps to numeric values
//           const numericCountdowns = {};
//           if (userData.countdowns) {
//             Object.keys(userData.countdowns).forEach(key => {
//               numericCountdowns[key] = typeof userData.countdowns[key] === 'object' 
//                 ? userData.countdowns[key].toMillis() 
//                 : userData.countdowns[key];
//             });
//           }
          
//           setCountdowns(numericCountdowns);
          
//           // ✅ Save to localStorage for future visits
//           localStorage.setItem(`progress_${user.uid}`, JSON.stringify(userData.linkProgress || {}));
//           localStorage.setItem(`countdowns_${user.uid}`, JSON.stringify(numericCountdowns));
//         } else {
//           await setDoc(userProgressRef, {
//             userId: user.uid,
//             linkProgress: {},
//             countdowns: {},
//             createdAt: new Date()
//           });
//         }
//         setUserProgressDoc(userProgressRef);
//       } catch (err) {
//         console.error("Error fetching user progress:", err);
//         setError("Failed to load user progress");
//       }
//     };
//     if (user) {
//       fetchUserProgress();
//     }
//   }, [user]);
  
//   // ✅ Fetch content ONLY once (with caching)
//   useEffect(() => {
//     const fetchContent = async () => {
//       // ✅ Check cache first
//       const cachedContent = localStorage.getItem('cachedContent');
//       const cachedTimestamp = localStorage.getItem('cachedContentTimestamp');
      
//       // If cache exists and is less than 1 hour old, use it
//       if (cachedContent && cachedTimestamp && (Date.now() - cachedTimestamp < 3600000)) {
//         setContent(JSON.parse(cachedContent));
//         return;
//       }
      
//       try {
//         const q = query(collection(db, "adminContent"), orderBy("createdAt", "desc"));
//         const querySnapshot = await getDocs(q);
//         const contentData = [];
//         querySnapshot.forEach((doc) => {
//           contentData.push({ id: doc.id, ...doc.data() });
//         });
        
//         setContent(contentData);
//         // ✅ Cache the content
//         localStorage.setItem('cachedContent', JSON.stringify(contentData));
//         localStorage.setItem('cachedContentTimestamp', Date.now());
//       } catch (err) {
//         console.error("Error fetching content:", err);
//         setError("Failed to load content");
//       }
//     };
    
//     if (user) fetchContent();
//   }, [user]);
  
//   // ✅ Save progress to Firestore ONLY when changes occur (not on every render)
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
    
//     // ✅ Debounce Firestore writes to prevent too many requests
//     const timer = setTimeout(() => {
//       if (Object.keys(linkProgress).length > 0 || Object.keys(countdowns).length > 0) {
//         saveProgressToFirestore();
//       }
//     }, 2000); // Save every 2 seconds after changes
    
//     return () => clearTimeout(timer);
//   }, [linkProgress, countdowns, user, userProgressDoc]);
  
//   // ✅ Handle countdown timers LOCALLY (no Firestore reads/writes)
//   useEffect(() => {
//     const timers = {};
    
//     Object.entries(countdowns).forEach(([key, endTime]) => {
//       // Ensure endTime is a number
//       const endTimeMs = typeof endTime === 'number' ? endTime : endTime.toMillis();
      
//       const updateCountdown = () => {
//         const now = new Date().getTime();
//         const distance = endTimeMs - now;
        
//         if (distance <= 0) {
//           // Timer finished - update locally only
//           setCountdowns(prev => {
//             const newCountdowns = { ...prev };
//             delete newCountdowns[key];
            
//             // ✅ Update localStorage
//             if (user) {
//               localStorage.setItem(`countdowns_${user.uid}`, JSON.stringify(newCountdowns));
//             }
//             return newCountdowns;
//           });
//         } else {
//           // Just update the local state
//           timers[key] = setTimeout(updateCountdown, 1000);
//         }
//       };
      
//       timers[key] = setTimeout(updateCountdown, 1000);
//     });
    
//     return () => {
//       Object.values(timers).forEach(timer => clearTimeout(timer));
//     };
//   }, [countdowns, user]);
  
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
//       const endTime = countdowns[linkKey];
//       const remainingTime = Math.ceil((endTime - new Date().getTime()) / 1000);
      
//       if (remainingTime > 0) {
//         const hours = Math.floor(remainingTime / 3600);
//         const minutes = Math.floor((remainingTime % 3600) / 60);
//         const seconds = remainingTime % 60;
//         alert(`Please wait ${hours}h ${minutes}m ${seconds}s before accessing this resource.`);
//         return;
//       }
//     }
    
//     // If this is the first link or previous is completed, unlock it
//     if (linkIndex === 0 || linkProgress[prevLinkKey]) {
//       // Start 24 hour countdown for next link
//       if (linkIndex < 49) { // Assuming max 50 links
//         const nextLinkKey = `${courseName}_part${partIndex}_link${linkIndex + 1}`;
//         const endTime = new Date().getTime() + 24 * 60 * 60 * 1000; // 24 hours from now
        
//         setCountdowns(prev => ({ 
//           ...prev, 
//           [nextLinkKey]: endTime 
//         }));
        
//         // Save to localStorage immediately
//         if (user) {
//           const updatedCountdowns = {...countdowns, [nextLinkKey]: endTime};
//           localStorage.setItem(`countdowns_${user.uid}`, JSON.stringify(updatedCountdowns));
//         }
//       }
      
//       // Mark current link as completed
//       setLinkProgress(prev => ({ ...prev, [linkKey]: true }));
      
//       // Save to localStorage immediately
//       if (user) {
//         const updatedProgress = {...linkProgress, [linkKey]: true};
//         localStorage.setItem(`progress_${user.uid}`, JSON.stringify(updatedProgress));
//       }
      
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
  
//   // ✅ Modified formatCountdown function to show hours, minutes, and seconds
//   const formatCountdown = (milliseconds) => {
//     const totalSeconds = Math.ceil(milliseconds / 1000);
//     const hours = Math.floor(totalSeconds / 3600);
//     const minutes = Math.floor((totalSeconds % 3600) / 60);
//     const seconds = totalSeconds % 60;
    
//     // Always show hours, minutes, and seconds
//     return `${hours}h ${minutes}m ${seconds}s`;
//   };

//   const getCountdownTime = (key) => {
//     if (!countdowns[key]) return null;
    
//     // Ensure it's a number
//     const endTime = typeof countdowns[key] === 'number' 
//       ? countdowns[key] 
//       : countdowns[key].toMillis();
      
//     const distance = endTime - new Date().getTime();
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
//               animationDelay: `${Math.random() * 2}s`,
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
//                                       disabled={!canAccess || (countdownTime !== null && countdownTime > 0)}
//                                       className={`w-full font-medium py-3 px-4 rounded-lg transition duration-300 transform flex items-center justify-center ${
//                                         isUnlocked 
//                                           ? "bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
//                                           : canAccess && (countdownTime === null || countdownTime === 0)
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
//                                       ) : countdownTime !== null && countdownTime > 0 ? (
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






















// "use client";
// import { useEffect, useState, useMemo } from "react";
// import { auth, db } from "@/lib/firebase";
// import { onAuthStateChanged, signOut } from "firebase/auth";
// import { collection, getDocs, query, orderBy, doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
// import { enableIndexedDbPersistence } from "firebase/firestore";

// export default function UserPage() {
//   const [user, setUser] = useState(null);
//   const [isLoading, setIsLoading] = useState(true);
//   const [content, setContent] = useState([]);
//   const [error, setError] = useState("");
//   const [linkProgress, setLinkProgress] = useState({});
//   const [countdowns, setCountdowns] = useState({});
//   const [userProgressDoc, setUserProgressDoc] = useState(null);
  
//   // ✅ Enable Firestore persistence for caching
//   useEffect(() => {
//     const enablePersistence = async () => {
//       try {
//         await enableIndexedDbPersistence(db);
//       } catch (err) {
//         if (err.code == 'failed-precondition') {
//           console.log("Multiple tabs open, persistence can only be enabled in one tab at a time.");
//         } else if (err.code == 'unimplemented') {
//           console.log("The current browser doesn't support persistence.");
//         }
//       }
//     };
//     enablePersistence();
//   }, []);
  
//   useEffect(() => {
//     const unsub = onAuthStateChanged(auth, (u) => {
//       if (!u) {
//         window.location.href = "/login";
//       } else {
//         setUser(u);
//         setIsLoading(false);
        
//         // ✅ Load from localStorage first for instant UI
//         const savedProgress = localStorage.getItem(`progress_${u.uid}`);
//         const savedCountdowns = localStorage.getItem(`countdowns_${u.uid}`);
        
//         if (savedProgress) setLinkProgress(JSON.parse(savedProgress));
//         if (savedCountdowns) setCountdowns(JSON.parse(savedCountdowns));
//       }
//     });
//     return () => unsub();
//   }, []);
  
//   // ✅ Fetch user progress ONLY once when user logs in
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
          
//           // ✅ Save to localStorage for future visits
//           localStorage.setItem(`progress_${user.uid}`, JSON.stringify(userData.linkProgress || {}));
//           localStorage.setItem(`countdowns_${user.uid}`, JSON.stringify(userData.countdowns || {}));
//         } else {
//           await setDoc(userProgressRef, {
//             userId: user.uid,
//             linkProgress: {},
//             countdowns: {},
//             createdAt: new Date()
//           });
//         }
//         setUserProgressDoc(userProgressRef);
//       } catch (err) {
//         console.error("Error fetching user progress:", err);
//         setError("Failed to load user progress");
//       }
//     };
//     if (user) {
//       fetchUserProgress();
//     }
//   }, [user]);
  
//   // ✅ Fetch content ONLY once (with caching)
//   useEffect(() => {
//     const fetchContent = async () => {
//       // ✅ Check cache first
//       const cachedContent = localStorage.getItem('cachedContent');
//       const cachedTimestamp = localStorage.getItem('cachedContentTimestamp');
      
//       // If cache exists and is less than 1 hour old, use it
//       if (cachedContent && cachedTimestamp && (Date.now() - cachedTimestamp < 3600000)) {
//         setContent(JSON.parse(cachedContent));
//         return;
//       }
      
//       try {
//         const q = query(collection(db, "adminContent"), orderBy("createdAt", "desc"));
//         const querySnapshot = await getDocs(q);
//         const contentData = [];
//         querySnapshot.forEach((doc) => {
//           contentData.push({ id: doc.id, ...doc.data() });
//         });
        
//         setContent(contentData);
//         // ✅ Cache the content
//         localStorage.setItem('cachedContent', JSON.stringify(contentData));
//         localStorage.setItem('cachedContentTimestamp', Date.now());
//       } catch (err) {
//         console.error("Error fetching content:", err);
//         setError("Failed to load content");
//       }
//     };
    
//     if (user) fetchContent();
//   }, [user]);
  
//   // ✅ Save progress to Firestore ONLY when changes occur (not on every render)
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
    
//     // ✅ Debounce Firestore writes to prevent too many requests
//     const timer = setTimeout(() => {
//       if (Object.keys(linkProgress).length > 0 || Object.keys(countdowns).length > 0) {
//         saveProgressToFirestore();
//       }
//     }, 2000); // Save every 2 seconds after changes
    
//     return () => clearTimeout(timer);
//   }, [linkProgress, countdowns, user, userProgressDoc]);
  
//   // ✅ Handle countdown timers LOCALLY (no Firestore reads/writes)
//   useEffect(() => {
//     const timers = {};
    
//     Object.entries(countdowns).forEach(([key, endTime]) => {
//       // Convert Firestore timestamp to milliseconds if needed
//       const endTimeMs = typeof endTime === 'number' ? endTime : endTime.toMillis();
      
//       const updateCountdown = () => {
//         const now = new Date().getTime();
//         const distance = endTimeMs - now;
        
//         if (distance <= 0) {
//           // Timer finished - update locally only
//           setCountdowns(prev => {
//             const newCountdowns = { ...prev };
//             delete newCountdowns[key];
            
//             // ✅ Update localStorage
//             if (user) {
//               localStorage.setItem(`countdowns_${user.uid}`, JSON.stringify(newCountdowns));
//             }
//             return newCountdowns;
//           });
//         } else {
//           // Just update the local state
//           timers[key] = setTimeout(updateCountdown, 1000);
//         }
//       };
      
//       timers[key] = setTimeout(updateCountdown, 1000);
//     });
    
//     return () => {
//       Object.values(timers).forEach(timer => clearTimeout(timer));
//     };
//   }, [countdowns, user]);
  
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
//       const endTime = typeof countdowns[linkKey] === 'number' 
//         ? countdowns[linkKey] 
//         : countdowns[linkKey].toMillis();
//       const remainingTime = Math.ceil((endTime - new Date().getTime()) / 1000);
      
//       if (remainingTime > 0) {
//         const minutes = Math.floor(remainingTime / 60);
//         const seconds = remainingTime % 60;
//         alert(`Please wait ${minutes}m ${seconds}s before accessing this resource.`);
//         return;
//       }
//     }
    
//     // If this is the first link or previous is completed, unlock it
//     if (linkIndex === 0 || linkProgress[prevLinkKey]) {
//       // Start 20 minute countdown for next link
//       if (linkIndex < 49) { // Assuming max 50 links
//         const nextLinkKey = `${courseName}_part${partIndex}_link${linkIndex + 1}`;
//         const endTime = new Date().getTime() + 20 * 60 * 1000; // 20 minutes from now
        
//         setCountdowns(prev => ({ 
//           ...prev, 
//           [nextLinkKey]: endTime 
//         }));
        
//         // Save to localStorage immediately
//         if (user) {
//           const updatedCountdowns = {...countdowns, [nextLinkKey]: endTime};
//           localStorage.setItem(`countdowns_${user.uid}`, JSON.stringify(updatedCountdowns));
//         }
//       }
      
//       // Mark current link as completed
//       setLinkProgress(prev => ({ ...prev, [linkKey]: true }));
      
//       // Save to localStorage immediately
//       if (user) {
//         const updatedProgress = {...linkProgress, [linkKey]: true};
//         localStorage.setItem(`progress_${user.uid}`, JSON.stringify(updatedProgress));
//       }
      
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
  
//   // ✅ Modified formatCountdown function
//   const formatCountdown = (milliseconds) => {
//     const totalSeconds = Math.ceil(milliseconds / 1000);
//     const hours = Math.floor(totalSeconds / 3600);
//     const minutes = Math.floor((totalSeconds % 3600) / 60);
//     const seconds = totalSeconds % 60;
    
//     // Agar 1 hour se kam time bacha hai toh minutes aur seconds mein dikhao
//     if (hours < 1) {
//       // Agar 1 minute se kam time bacha hai toh seconds mein dikhao
//       if (minutes < 1) {
//         return `${seconds}s`;
//       }
//       // Warna minutes aur seconds dono dikhao
//       return `${minutes}m ${seconds}s`;
//     }
//     // 1 hour ya zyada time bacha hai toh sirf hours dikhao
//     return `${hours}h`;
//   };

//   const getCountdownTime = (key) => {
//     if (!countdowns[key]) return null;
    
//     // Handle both number timestamps and Firestore timestamps
//     const endTime = typeof countdowns[key] === 'number' 
//       ? countdowns[key] 
//       : countdowns[key].toMillis();
      
//     const distance = endTime - new Date().getTime();
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
//               // animationDuration: `${Math.random() * 5 + 3)s`
//               // animationDelay: `${Math.random() * 2}s`
//               animationDuration: `${Math.random() * 5 + 3}s`,
//               animationDelay: `${Math.random() * 2}s`,

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
//                                       disabled={!canAccess || (countdownTime !== null && countdownTime > 0)}
//                                       className={`w-full font-medium py-3 px-4 rounded-lg transition duration-300 transform flex items-center justify-center ${
//                                         isUnlocked 
//                                           ? "bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
//                                           : canAccess && (countdownTime === null || countdownTime === 0)
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
//                                       ) : countdownTime !== null && countdownTime > 0 ? (
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























// "use client";
// import { useEffect, useState, useMemo } from "react";
// import { auth, db } from "@/lib/firebase";
// import { onAuthStateChanged, signOut } from "firebase/auth";
// import { collection, getDocs, query, orderBy, doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
// import { enableIndexedDbPersistence } from "firebase/firestore"; // Added missing import

// export default function UserPage() {
//   const [user, setUser] = useState(null);
//   const [isLoading, setIsLoading] = useState(true);
//   const [content, setContent] = useState([]);
//   const [error, setError] = useState("");
//   const [linkProgress, setLinkProgress] = useState({});
//   const [countdowns, setCountdowns] = useState({});
//   const [userProgressDoc, setUserProgressDoc] = useState(null);
  
//   // ✅ Enable Firestore persistence for caching
//   useEffect(() => {
//     const enablePersistence = async () => {
//       try {
//         await enableIndexedDbPersistence(db);
//       } catch (err) {
//         if (err.code == 'failed-precondition') {
//           console.log("Multiple tabs open, persistence can only be enabled in one tab at a time.");
//         } else if (err.code == 'unimplemented') {
//           console.log("The current browser doesn't support persistence.");
//         }
//       }
//     };
//     enablePersistence();
//   }, []);
  
//   useEffect(() => {
//     const unsub = onAuthStateChanged(auth, (u) => {
//       if (!u) {
//         window.location.href = "/login";
//       } else {
//         setUser(u);
//         setIsLoading(false);
        
//         // ✅ Load from localStorage first for instant UI
//         const savedProgress = localStorage.getItem(`progress_${u.uid}`);
//         const savedCountdowns = localStorage.getItem(`countdowns_${u.uid}`);
        
//         if (savedProgress) setLinkProgress(JSON.parse(savedProgress));
//         if (savedCountdowns) setCountdowns(JSON.parse(savedCountdowns));
//       }
//     });
//     return () => unsub();
//   }, []);
  
//   // ✅ Fetch user progress ONLY once when user logs in
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
          
//           // ✅ Save to localStorage for future visits
//           localStorage.setItem(`progress_${user.uid}`, JSON.stringify(userData.linkProgress || {}));
//           localStorage.setItem(`countdowns_${user.uid}`, JSON.stringify(userData.countdowns || {}));
//         } else {
//           await setDoc(userProgressRef, {
//             userId: user.uid,
//             linkProgress: {},
//             countdowns: {},
//             createdAt: new Date()
//           });
//         }
//         setUserProgressDoc(userProgressRef);
//       } catch (err) {
//         console.error("Error fetching user progress:", err);
//         setError("Failed to load user progress");
//       }
//     };
//     if (user) {
//       fetchUserProgress();
//     }
//   }, [user]);
  
//   // ✅ Fetch content ONLY once (with caching)
//   useEffect(() => {
//     const fetchContent = async () => {
//       // ✅ Check cache first
//       const cachedContent = localStorage.getItem('cachedContent');
//       const cachedTimestamp = localStorage.getItem('cachedContentTimestamp');
      
//       // If cache exists and is less than 1 hour old, use it
//       if (cachedContent && cachedTimestamp && (Date.now() - cachedTimestamp < 3600000)) {
//         setContent(JSON.parse(cachedContent));
//         return;
//       }
      
//       try {
//         const q = query(collection(db, "adminContent"), orderBy("createdAt", "desc"));
//         const querySnapshot = await getDocs(q);
//         const contentData = [];
//         querySnapshot.forEach((doc) => {
//           contentData.push({ id: doc.id, ...doc.data() });
//         });
        
//         setContent(contentData);
//         // ✅ Cache the content
//         localStorage.setItem('cachedContent', JSON.stringify(contentData));
//         localStorage.setItem('cachedContentTimestamp', Date.now());
//       } catch (err) {
//         console.error("Error fetching content:", err);
//         setError("Failed to load content");
//       }
//     };
    
//     if (user) fetchContent();
//   }, [user]);
  
//   // ✅ Save progress to Firestore ONLY when changes occur (not on every render)
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
    
//     // ✅ Debounce Firestore writes to prevent too many requests
//     const timer = setTimeout(() => {
//       if (Object.keys(linkProgress).length > 0 || Object.keys(countdowns).length > 0) {
//         saveProgressToFirestore();
//       }
//     }, 2000); // Save every 2 seconds after changes
    
//     return () => clearTimeout(timer);
//   }, [linkProgress, countdowns, user, userProgressDoc]);
  
//   // ✅ Handle countdown timers LOCALLY (no Firestore reads/writes)
//   useEffect(() => {
//     const timers = {};
    
//     Object.entries(countdowns).forEach(([key, endTime]) => {
//       // Convert Firestore timestamp to milliseconds if needed
//       const endTimeMs = typeof endTime === 'number' ? endTime : endTime.toMillis();
      
//       const updateCountdown = () => {
//         const now = new Date().getTime();
//         const distance = endTimeMs - now;
        
//         if (distance <= 0) {
//           // Timer finished - update locally only
//           setCountdowns(prev => {
//             const newCountdowns = { ...prev };
//             delete newCountdowns[key];
            
//             // ✅ Update localStorage
//             if (user) {
//               localStorage.setItem(`countdowns_${user.uid}`, JSON.stringify(newCountdowns));
//             }
//             return newCountdowns;
//           });
//         } else {
//           // Just update the local state
//           timers[key] = setTimeout(updateCountdown, 1000);
//         }
//       };
      
//       timers[key] = setTimeout(updateCountdown, 1000);
//     });
    
//     return () => {
//       Object.values(timers).forEach(timer => clearTimeout(timer));
//     };
//   }, [countdowns, user]);
  
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
//       const endTime = typeof countdowns[linkKey] === 'number' 
//         ? countdowns[linkKey] 
//         : countdowns[linkKey].toMillis();
//       const remainingTime = Math.ceil((endTime - new Date().getTime()) / 1000);
      
//       if (remainingTime > 0) {
//         const minutes = Math.floor(remainingTime / 60);
//         const seconds = remainingTime % 60;
//         alert(`Please wait ${minutes}m ${seconds}s before accessing this resource.`);
//         return;
//       }
//     }
    
//     // If this is the first link or previous is completed, unlock it
//     if (linkIndex === 0 || linkProgress[prevLinkKey]) {
//       // Start 20 minute countdown for next link
//       if (linkIndex < 49) { // Assuming max 50 links
//         const nextLinkKey = `${courseName}_part${partIndex}_link${linkIndex + 1}`;
//         const endTime = new Date().getTime() + 20 * 60 * 1000; // 20 minutes from now
        
//         setCountdowns(prev => ({ 
//           ...prev, 
//           [nextLinkKey]: endTime 
//         }));
        
//         // Save to localStorage immediately
//         if (user) {
//           const updatedCountdowns = {...countdowns, [nextLinkKey]: endTime};
//           localStorage.setItem(`countdowns_${user.uid}`, JSON.stringify(updatedCountdowns));
//         }
//       }
      
//       // Mark current link as completed
//       setLinkProgress(prev => ({ ...prev, [linkKey]: true }));
      
//       // Save to localStorage immediately
//       if (user) {
//         const updatedProgress = {...linkProgress, [linkKey]: true};
//         localStorage.setItem(`progress_${user.uid}`, JSON.stringify(updatedProgress));
//       }
      
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
//     const hours = Math.floor(totalSeconds / 3600);
//     return `${hours}h`;
//   };

//   const getCountdownTime = (key) => {
//     if (!countdowns[key]) return null;
    
//     // Handle both number timestamps and Firestore timestamps
//     const endTime = typeof countdowns[key] === 'number' 
//       ? countdowns[key] 
//       : countdowns[key].toMillis();
      
//     const distance = endTime - new Date().getTime();
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
//                                       disabled={!canAccess || (countdownTime !== null && countdownTime > 0)}
//                                       className={`w-full font-medium py-3 px-4 rounded-lg transition duration-300 transform flex items-center justify-center ${
//                                         isUnlocked 
//                                           ? "bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
//                                           : canAccess && (countdownTime === null || countdownTime === 0)
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
//                                       ) : countdownTime !== null && countdownTime > 0 ? (
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

























// "use client";
// import { useEffect, useState, useMemo } from "react";
// import { auth, db } from "@/lib/firebase";
// import { onAuthStateChanged, signOut } from "firebase/auth";
// import { collection, getDocs, query, orderBy, doc, getDoc, setDoc, updateDoc } from "firebase/firestore";

// export default function UserPage() {
//   const [user, setUser] = useState(null);
//   const [isLoading, setIsLoading] = useState(true);
//   const [content, setContent] = useState([]);
//   const [error, setError] = useState("");
//   const [linkProgress, setLinkProgress] = useState({});
//   const [countdowns, setCountdowns] = useState({});
//   const [userProgressDoc, setUserProgressDoc] = useState(null);

//   // ✅ Enable Firestore persistence for caching
//   useEffect(() => {
//     const enablePersistence = async () => {
//       try {
//         await enableIndexedDbPersistence(db);
//       } catch (err) {
//         if (err.code == 'failed-precondition') {
//           console.log("Multiple tabs open, persistence can only be enabled in one tab at a time.");
//         } else if (err.code == 'unimplemented') {
//           console.log("The current browser doesn't support persistence.");
//         }
//       }
//     };
//     enablePersistence();
//   }, []);

//   useEffect(() => {
//     const unsub = onAuthStateChanged(auth, (u) => {
//       if (!u) {
//         window.location.href = "/login";
//       } else {
//         setUser(u);
//         setIsLoading(false);
        
//         // ✅ Load from localStorage first for instant UI
//         const savedProgress = localStorage.getItem(`progress_${u.uid}`);
//         const savedCountdowns = localStorage.getItem(`countdowns_${u.uid}`);
        
//         if (savedProgress) setLinkProgress(JSON.parse(savedProgress));
//         if (savedCountdowns) setCountdowns(JSON.parse(savedCountdowns));
//       }
//     });
//     return () => unsub();
//   }, []);

//   // ✅ Fetch user progress ONLY once when user logs in
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
          
//           // ✅ Save to localStorage for future visits
//           localStorage.setItem(`progress_${user.uid}`, JSON.stringify(userData.linkProgress || {}));
//           localStorage.setItem(`countdowns_${user.uid}`, JSON.stringify(userData.countdowns || {}));
//         } else {
//           await setDoc(userProgressRef, {
//             userId: user.uid,
//             linkProgress: {},
//             countdowns: {},
//             createdAt: new Date()
//           });
//         }
//         setUserProgressDoc(userProgressRef);
//       } catch (err) {
//         console.error("Error fetching user progress:", err);
//         setError("Failed to load user progress");
//       }
//     };

//     if (user) {
//       fetchUserProgress();
//     }
//   }, [user]);

//   // ✅ Fetch content ONLY once (with caching)
//   useEffect(() => {
//     const fetchContent = async () => {
//       // ✅ Check cache first
//       const cachedContent = localStorage.getItem('cachedContent');
//       const cachedTimestamp = localStorage.getItem('cachedContentTimestamp');
      
//       // If cache exists and is less than 1 hour old, use it
//       if (cachedContent && cachedTimestamp && (Date.now() - cachedTimestamp < 3600000)) {
//         setContent(JSON.parse(cachedContent));
//         return;
//       }
      
//       try {
//         const q = query(collection(db, "adminContent"), orderBy("createdAt", "desc"));
//         const querySnapshot = await getDocs(q);
//         const contentData = [];
//         querySnapshot.forEach((doc) => {
//           contentData.push({ id: doc.id, ...doc.data() });
//         });
        
//         setContent(contentData);
//         // ✅ Cache the content
//         localStorage.setItem('cachedContent', JSON.stringify(contentData));
//         localStorage.setItem('cachedContentTimestamp', Date.now());
//       } catch (err) {
//         console.error("Error fetching content:", err);
//         setError("Failed to load content");
//       }
//     };
    
//     if (user) fetchContent();
//   }, [user]);

//   // ✅ Save progress to Firestore ONLY when changes occur (not on every render)
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

//     // ✅ Debounce Firestore writes to prevent too many requests
//     const timer = setTimeout(() => {
//       if (Object.keys(linkProgress).length > 0 || Object.keys(countdowns).length > 0) {
//         saveProgressToFirestore();
//       }
//     }, 2000); // Save every 2 seconds after changes

//     return () => clearTimeout(timer);
//   }, [linkProgress, countdowns, user, userProgressDoc]);

//   // ✅ Handle countdown timers LOCALLY (no Firestore reads/writes)
//   useEffect(() => {
//     const timers = {};
    
//     Object.entries(countdowns).forEach(([key, endTime]) => {
//       const updateCountdown = () => {
//         const now = new Date().getTime();
//         const distance = endTime - now;
        
//         if (distance <= 0) {
//           // Timer finished - update locally only
//           setCountdowns(prev => {
//             const newCountdowns = { ...prev };
//             delete newCountdowns[key];
            
//             // ✅ Update localStorage
//             if (user) {
//               localStorage.setItem(`countdowns_${user.uid}`, JSON.stringify(newCountdowns));
//             }
//             return newCountdowns;
//           });
//         } else {
//           // Just update the local state
//           timers[key] = setTimeout(updateCountdown, 1000);
//         }
//       };
      
//       timers[key] = setTimeout(updateCountdown, 1000);
//     });
    
//     return () => {
//       Object.values(timers).forEach(timer => clearTimeout(timer));
//     };
//   }, [countdowns, user]);

//   // ✅ Rest of your code remains exactly the same...
//   // [Keep all your existing functions like handleLinkClick, openLink, etc.]
//   // Only the optimization parts above have changed

//   // ... (Your existing JSX rendering code)

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

//   // const formatCountdown = (milliseconds) => {
//   //   const totalSeconds = Math.ceil(milliseconds / 1000);
//   //   const minutes = Math.floor(totalSeconds / 60);
//   //   const seconds = totalSeconds % 60;
    
//   //   if (minutes > 0) {
//   //     return `${minutes}m ${seconds}s`;
//   //   } else {
//   //     return `${seconds}s`;
//   //   }
//   // };

// // const formatCountdown = (milliseconds) => {
// //   const totalSeconds = Math.ceil(milliseconds / 1000);

// //   const hours = Math.floor(totalSeconds / 3600); // 1 hour = 3600 seconds
// //   const minutes = Math.floor((totalSeconds % 3600) / 60);
// //   const seconds = totalSeconds % 60;

// //   if (hours > 0) {
// //     return `${hours}h ${minutes}m ${seconds}s`;
// //   } else if (minutes > 0) {
// //     return `${minutes}m ${seconds}s`;
// //   } else {
// //     return `${seconds}s`;
// //   }
// // };

// const formatCountdown = (milliseconds) => {
//   const totalSeconds = Math.ceil(milliseconds / 1000);
//   const hours = Math.floor(totalSeconds / 3600); // 1 hour = 3600 seconds

//   return `${hours}h`;
// };



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