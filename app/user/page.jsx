"use client";
import { useEffect, useState, useMemo, useCallback } from "react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { collection, getDocs, query, orderBy, doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { enableIndexedDbPersistence } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { ADMIN_EMAILS } from "@/lib/config";

// Custom hooks for better organization
const useAuth = () => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

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
          await updateDoc(userRef, { 
            isOnline: true, 
            lastActive: new Date(), 
            lastPageVisited: isAdmin && allowPreview ? 'user-preview' : 'user' 
          });
        } catch (error) {
          console.error("Error updating user status:", error);
        }
      }
    });
    return () => unsub();
  }, []);

  return { user, isLoading };
};

const useFirestorePersistence = () => {
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
};

const useSearchState = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  
  const SEARCH_QUERY_KEY = 'bf_user_search_q';
  const SEARCH_PAGE_KEY = 'bf_user_search_p';

  useEffect(() => {
    try {
      const savedQ = localStorage.getItem(SEARCH_QUERY_KEY);
      const savedP = localStorage.getItem(SEARCH_PAGE_KEY);
      if (typeof savedQ === 'string') setSearchQuery(savedQ);
      const p = savedP != null ? parseInt(savedP, 10) : NaN;
      if (!isNaN(p) && p >= 0) setCurrentPage(p);
    } catch {}
  }, []);

  useEffect(() => { 
    try { localStorage.setItem(SEARCH_QUERY_KEY, searchQuery); } catch {} 
  }, [searchQuery]);
  
  useEffect(() => { 
    try { localStorage.setItem(SEARCH_PAGE_KEY, String(currentPage)); } catch {} 
  }, [currentPage]);

  const goHome = () => {
    try {
      localStorage.removeItem(SEARCH_QUERY_KEY);
      localStorage.removeItem(SEARCH_PAGE_KEY);
    } catch {}
    setSearchQuery("");
    setCurrentPage(0);
    if (typeof window !== 'undefined') {
      window.location.href = '/user';
    }
  };

  return {
    searchQuery,
    setSearchQuery,
    searchFocused,
    setSearchFocused,
    currentPage,
    setCurrentPage,
    goHome
  };
};

// UI Components for better modularity
const LoadingSpinner = () => (
  <div className="flex min-h-screen items-center justify-center bg-black">
    <div className="relative">
      <div className="w-16 h-16 border-4 border-blue-500 rounded-full animate-spin border-t-transparent"></div>
      <div className="absolute top-0 left-0 w-16 h-16 border-4 border-transparent border-t-blue-300 rounded-full animate-ping"></div>
    </div>
  </div>
);

const BackgroundAnimation = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    {[...Array(15)].map((_, i) => (
      <div 
        key={i}
        className="absolute rounded-full bg-gradient-to-r from-blue-500/10 to-purple-500/10 animate-float"
        style={{
          width: `${Math.random() * 80 + 20}px`,
          height: `${Math.random() * 80 + 20}px`,
          top: `${Math.random() * 100}%`,
          left: `${Math.random() * 100}%`,
          animationDuration: `${Math.random() * 10 + 10}s`,
          animationDelay: `${Math.random() * 5}s`,
        }}
      />
    ))}
  </div>
);

const SearchBar = ({ searchQuery, setSearchQuery, searchFocused, setSearchFocused }) => (
  <div className="relative w-full sm:w-72">
    <div className="relative">
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        onFocus={() => setSearchFocused(true)}
        onBlur={() => setSearchFocused(false)}
        placeholder="Search courses or videos..."
        className={`w-full px-3 py-2.5 pr-9 rounded-xl bg-gray-900/80 backdrop-blur-sm border transition-all duration-300 ${
          searchFocused 
            ? 'border-indigo-500 shadow-lg shadow-indigo-500/20' 
            : 'border-gray-700 hover:border-gray-600'
  } text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-600`}
      />
      <div className="absolute right-3 top-1/2 -translate-y-1/2">
        {searchQuery ? (
          <button
            onClick={() => setSearchQuery("")}
            className="text-gray-400 hover:text-white transition-colors duration-200 p-1 rounded-full hover:bg-gray-700/50"
            aria-label="Clear search"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        ) : (
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        )}
      </div>
    </div>
  </div>
);

const PaginationControls = ({ currentPage, totalPages, onPrev, onNext }) => (
  <div className="flex flex-col sm:flex-row justify-between items-center gap-3 mb-5">
    <button
      onClick={onPrev}
      disabled={currentPage === 0}
      className={`px-4 py-2.5 rounded-lg font-semibold transition-all duration-300 flex items-center justify-center w-full sm:w-auto min-w-[120px] shadow-md backdrop-blur-sm ${
        currentPage === 0 
          ? 'bg-gradient-to-r from-gray-700 to-gray-800 text-gray-400 cursor-not-allowed border border-gray-600' 
          : 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white hover:from-indigo-500 hover:to-indigo-400 hover:shadow-xl hover:shadow-indigo-500/40 transform hover:-translate-y-1 border border-indigo-400/50 hover:border-indigo-300/70'
      }`}
    >
      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
      </svg>
      Previous
    </button>
    
    <div className="text-center">
      <span className="text-base font-bold bg-gradient-to-r from-red-300 to-red-200 bg-clip-text text-transparent drop-shadow-sm">
        {currentPage + 1} of {totalPages}
      </span>
      <div className="text-xs text-gray-200 mt-1 drop-shadow-sm">Courses</div>
    </div>
    
    <button
      onClick={onNext}
      disabled={currentPage === totalPages - 1}
      className={`px-4 py-2.5 rounded-lg font-semibold transition-all duration-300 flex items-center justify-center w-full sm:w-auto min-w-[120px] shadow-md backdrop-blur-sm ${
        currentPage === totalPages - 1 
          ? 'bg-gradient-to-r from-gray-700 to-gray-800 text-gray-400 cursor-not-allowed border border-gray-600' 
          : 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white hover:from-indigo-500 hover:to-indigo-400 hover:shadow-xl hover:shadow-indigo-500/40 transform hover:-translate-y-1 border border-indigo-400/50 hover:border-indigo-300/70'
      }`}
    >
      Next
      <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </button>
  </div>
);

const ProgressIndicator = ({ isUnlocked, canAccess }) => {
  if (isUnlocked) {
    return (
      <span className="text-green-300 flex items-center justify-center font-semibold text-xs drop-shadow-sm">
        <svg className="w-4 h-4 mr-1 drop-shadow-sm" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
        Completed
      </span>
    );
  } else if (canAccess) {
    return (
      <span className="text-blue-200 flex items-center justify-center font-semibold text-xs drop-shadow-sm">
        <svg className="w-4 h-4 mr-1 drop-shadow-sm" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
        </svg>
        Ready to access
      </span>
    );
  } else {
    return (
      <span className="text-gray-300 flex items-center justify-center font-semibold text-xs drop-shadow-sm">
        <svg className="w-4 h-4 mr-1 drop-shadow-sm" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
        </svg>
        Complete previous first
      </span>
    );
  }
};

export default function UserPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  useFirestorePersistence();
  const {
    searchQuery,
    setSearchQuery,
    searchFocused,
    setSearchFocused,
    currentPage,
    setCurrentPage,
    goHome
  } = useSearchState();

  const [content, setContent] = useState([]);
  const [error, setError] = useState("");
  const [linkProgress, setLinkProgress] = useState({});
  const [userProgressDoc, setUserProgressDoc] = useState(null);
  const [gumroadLink, setGumroadLink] = useState("");
  const [userLocation, setUserLocation] = useState(null);
  const [expandedSections, setExpandedSections] = useState({});
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [clickedKey, setClickedKey] = useState(null);
  const [appliedReturnFocus, setAppliedReturnFocus] = useState(false);

  // Location tracking
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
            const locationData = {
              ...location,
              userId: user?.uid || 'unknown',
              userEmail: user?.email || 'unknown'
            };
            localStorage.setItem("user_location", JSON.stringify(locationData));
          },
          (error) => console.error("Error getting location:", error),
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
        );
      }
    };
    
    if (user) {
      trackUserLocation();
      const locationInterval = setInterval(trackUserLocation, 300000);
      return () => clearInterval(locationInterval);
    }
  }, [user]);

  // User progress management
  useEffect(() => {
    const fetchUserProgress = async () => {
      if (!user) return;
      
      try {
        const userProgressRef = doc(db, "userProgress", user.uid);
        const docSnap = await getDoc(userProgressRef);
        
        if (docSnap.exists()) {
          const userData = docSnap.data();
          setLinkProgress(userData.linkProgress || {});
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
    
    if (user) fetchUserProgress();
  }, [user]);

  // Content fetching with caching
  const fetchContent = useCallback(async (force = false) => {
    if (!user) return;
    
    try {
      const cachedContent = localStorage.getItem('cachedContent');
      const cachedTimestamp = localStorage.getItem('cachedContentTimestamp');
      const cacheValid = cachedContent && cachedTimestamp && (Date.now() - cachedTimestamp < 3600000);

      if (cacheValid && !force && content.length === 0) {
        setContent(JSON.parse(cachedContent));
      }

      setIsRefreshing(true);
      const q = query(collection(db, "adminContent"), orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);
      const freshContent = [];
      querySnapshot.forEach((doc) => freshContent.push({ id: doc.id, ...doc.data() }));
      
      setContent(freshContent);
      localStorage.setItem('cachedContent', JSON.stringify(freshContent));
      localStorage.setItem('cachedContentTimestamp', Date.now());
    } catch (err) {
      console.error("Error fetching content:", err);
      if (content.length === 0) setError("Failed to load content");
    } finally {
      setIsRefreshing(false);
    }
  }, [user, content.length]);

  useEffect(() => {
    if (user) fetchContent(false);
  }, [user, fetchContent]);

  // Gumroad link fetching
  useEffect(() => {
    const fetchGumroadLink = async () => {
      try {
        const configDoc = await getDoc(doc(db, "config", "gumroad"));
        if (configDoc.exists()) {
          const data = configDoc.data();
          const url = data.url || data.gumroadUrl || data.link || "";
          if (url) setGumroadLink(url);
        }
      } catch (err) {
        console.error("Error fetching Gumroad link:", err);
      }
    };
    
    if (user) fetchGumroadLink();
  }, [user]);

  // Progress saving with debouncing
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
    
    const timer = setTimeout(() => {
      if (Object.keys(linkProgress).length > 0) {
        saveProgressToFirestore();
      }
    }, 2000);
    
    return () => clearTimeout(timer);
  }, [linkProgress, user, userProgressDoc]);

  // Logout handler
  const handleLogout = async () => {
    try {
      if (user) {
        const userRef = doc(db, "users", user.uid);
        await updateDoc(userRef, {
          isOnline: false,
          lastActive: new Date()
        });
        localStorage.removeItem(`progress_${user.uid}`);
      }
      await signOut(auth);
      window.location.href = "/login";
    } catch (error) {
      console.error("Error during logout:", error);
      await signOut(auth);
      window.location.href = "/login";
    }
  };

  // Content organization and search
  const { courses, groupedContent } = useMemo(() => {
    const baseContent = content.filter(item => {
      const courseName = (item.courseName || "Untitled Course").trim();
      if (courseName.startsWith("_")) return false;
      return item.visibility !== "hide";
    });

    const visibleContent = searchQuery.trim() ? baseContent.filter(item => {
      const q = searchQuery.toLowerCase();
      const name = (item.courseName || "Untitled Course").toLowerCase();
      const fields = item.fields || [];
      
      return name.includes(q) || 
             fields.some(field => field.toLowerCase().includes(q)) ||
             (item.description && item.description.toLowerCase().includes(q));
    }) : baseContent;

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
          if (typeof val.toDate === 'function') return val.toDate().getTime();
          if (val instanceof Date) return val.getTime();
          if (typeof val === 'number') return val;
          return 0;
        };
        return getTime(a.createdAt) - getTime(b.createdAt);
      });
    });

    return { 
      courses: Object.entries(groups),
      groupedContent: groups 
    };
  }, [content, searchQuery]);

  // Pagination controls
  useEffect(() => {
    if (currentPage > courses.length - 1) {
      setCurrentPage(Math.max(0, courses.length - 1));
    }
  }, [courses.length, currentPage]);

  // Auto-focus the course the user came from (via query or watchContext)
  useEffect(() => {
    if (appliedReturnFocus) return;
    if (!courses || courses.length === 0) return;
    let targetCourse = null;
    try {
      const sp = new URLSearchParams(window.location.search);
      targetCourse = sp.get('course');
    } catch {}
    if (!targetCourse) {
      try {
        const raw = localStorage.getItem('watchContext');
        if (raw) {
          const ctx = JSON.parse(raw);
          if (ctx && ctx.course) targetCourse = String(ctx.course);
        }
      } catch {}
    }
    if (!targetCourse) return;
    const idx = courses.findIndex(([name]) => String(name).trim() === String(targetCourse).trim());
    if (idx >= 0) {
      if (idx !== currentPage) setCurrentPage(idx);
      setAppliedReturnFocus(true);
      // Optional: clean query to avoid persisting state in URL
      try {
        const sp = new URLSearchParams(window.location.search);
        if (sp.get('course')) {
          sp.delete('course');
          const newUrl = `${window.location.pathname}${sp.toString() ? '?' + sp.toString() : ''}`;
          window.history.replaceState({}, '', newUrl);
        }
      } catch {}
    }
  }, [courses, currentPage, setCurrentPage, appliedReturnFocus]);

  const goToNextPage = () => {
    setCurrentPage(prev => Math.min(prev + 1, courses.length - 1));
  };

  const goToPrevPage = () => {
    setCurrentPage(prev => Math.max(prev - 1, 0));
  };

  // Section management
  const toggleSection = (sectionKey) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionKey]: !prev[sectionKey]
    }));
  };

  const organizeFieldsIntoSections = (fields, sectionControl) => {
    if (!sectionControl || !Array.isArray(sectionControl) || sectionControl.length === 0) {
      return [fields.filter(field => field.trim() !== '')];
    }
    
    const sections = [];
    let currentIndex = 0;
    
    for (const itemCount of sectionControl) {
      if (currentIndex >= fields.length) break;
      const sectionFields = fields.slice(currentIndex, currentIndex + itemCount)
        .filter(field => field.trim() !== '');
      if (sectionFields.length > 0) sections.push(sectionFields);
      currentIndex += itemCount;
    }
    
    if (currentIndex < fields.length) {
      const remainingFields = fields.slice(currentIndex)
        .filter(field => field.trim() !== '');
      if (remainingFields.length > 0) sections.push(remainingFields);
    }
    
    return sections;
  };

  // Link handling with auto-progression and part unlocking
  const handleLinkClick = async (courseName, partIndex, linkIndex, url, allFields, posterUrl) => {
    const linkKey = `${courseName}_part${partIndex}_link${linkIndex}`;
    // Prevent multiple rapid clicks while animating
    if (clickedKey) return;
    setClickedKey(linkKey);
    
    // Auto-unlock all subsequent parts when clicking any part
    const currentCourse = groupedContent[courseName] || [];
    const updatedProgress = { ...linkProgress, [linkKey]: true };
    
    // Unlock all parts from current part onwards
    for (let i = partIndex; i < currentCourse.length; i++) {
      const part = currentCourse[i];
      if (part && part.fields) {
        // Unlock first video of each subsequent part
        const firstVideoIndex = part.fields.findIndex(f => typeof f === 'string' && f.trim().startsWith('http'));
        if (firstVideoIndex >= 0) {
          const unlockKey = `${courseName}_part${i}_link${firstVideoIndex}`;
          updatedProgress[unlockKey] = true;
        }
      }
    }
    
    setLinkProgress(updatedProgress);
    
    // Save to both localStorage and Firestore
    if (user) {
      localStorage.setItem(`progress_${user.uid}`, JSON.stringify(updatedProgress));
      
      // Save to Firestore database
      try {
        if (userProgressDoc) {
          await updateDoc(userProgressDoc, {
            linkProgress: updatedProgress,
            lastUpdated: new Date(),
            lastClickedPart: partIndex,
            lastClickedCourse: courseName
          });
        }
      } catch (error) {
        console.error('Error saving progress to Firestore:', error);
      }
    }
    const data = { url, timestamp: Date.now() };
    localStorage.setItem('tempDownloadUrl', JSON.stringify(data));
    
    try {
      // Build playlist with auto-progression: current part + next parts from same course
      const currentCourse = groupedContent[courseName] || [];
      let fullPlaylist = [];
      
      // Add all videos from the current part
      const currentPart = currentCourse[partIndex];
      if (currentPart && currentPart.fields) {
        const currentPartVideos = currentPart.fields
          .filter(f => typeof f === 'string' && f.trim().startsWith('http'))
          .map((u) => ({ 
            url: u.trim(), 
            title: `${courseName} - Part ${partIndex + 1}`,
            partIndex: partIndex 
          }));
        fullPlaylist.push(...currentPartVideos);
      }
      
      // Add videos from subsequent parts for auto-progression
      for (let i = partIndex + 1; i < currentCourse.length; i++) {
        const nextPart = currentCourse[i];
        if (nextPart && nextPart.fields) {
          const nextPartVideos = nextPart.fields
            .filter(f => typeof f === 'string' && f.trim().startsWith('http'))
            .map((u) => ({ 
              url: u.trim(), 
              title: `${courseName} - Part ${i + 1}`,
              partIndex: i 
            }));
          fullPlaylist.push(...nextPartVideos);
        }
      }
      
      const currentIndex = Math.max(0, fullPlaylist.findIndex(i => i.url === url));
      const ctx = {
        course: courseName,
        partIndex,
        currentIndex,
        list: fullPlaylist,
        poster: posterUrl || "",
        timestamp: Date.now(),
        autoProgression: true // Flag to indicate this supports auto-progression
      };
      localStorage.setItem('watchContext', JSON.stringify(ctx));
    } catch (e) {
      console.error('Error building playlist:', e);
      // Fallback to original behavior
      const list = (allFields || []).filter(f => typeof f === 'string' && f.trim().startsWith('http')).map((u) => ({ url: u.trim() }));
      const currentIndex = Math.max(0, list.findIndex(i => i.url === url));
      const ctx = {
        course: courseName,
        partIndex,
        currentIndex,
        list,
        poster: posterUrl || "",
        timestamp: Date.now()
      };
      localStorage.setItem('watchContext', JSON.stringify(ctx));
    }
    
    // Small delay to let the click animation play before navigating
    setTimeout(() => {
      router.push('/watch');
    }, 420);
  };

  // Check if a part is auto-unlocked (accessible due to previous part completion)
  const isPartAutoUnlocked = (courseName, partIndex) => {
    if (partIndex === 0) return true; // First part is always unlocked
    
    // Check if any previous part was clicked (which would unlock this part)
    for (let i = 0; i < partIndex; i++) {
      const prevPart = groupedContent[courseName]?.[i];
      if (prevPart && prevPart.fields) {
        const firstVideoInPrevPart = prevPart.fields.findIndex(f => typeof f === 'string' && f.trim().startsWith('http'));
        if (firstVideoInPrevPart >= 0) {
          const prevPartKey = `${courseName}_part${i}_link${firstVideoInPrevPart}`;
          if (linkProgress[prevPartKey]) {
            return true;
          }
        }
      }
    }
    return false;
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white relative">
      <BackgroundAnimation />
      
      <div className="relative z-10 max-w-7xl mx-auto">
        {/* Enhanced Header */}
        <header className="mb-8 sm:mb-12">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-5 mb-7">
            <div className="flex items-center gap-3.5">
              <div className="relative">
                <div className="w-12 h-12 bg-gradient-to-r from-red-600 to-red-500 rounded-2xl flex items-center justify-center shadow-lg shadow-red-500/30">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div className="absolute -inset-1.5 bg-gradient-to-r from-red-600 to-red-500 rounded-2xl opacity-20 blur-sm"></div>
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-red-400 to-red-300 bg-clip-text text-transparent">
                  Welcome back
                </h1>
                <p className="text-gray-400 text-xs">{user?.email}</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5 w-full lg:w-auto">
              <SearchBar 
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                searchFocused={searchFocused}
                setSearchFocused={setSearchFocused}
              />
              
              <div className="flex gap-2.5">
                <button
                  onClick={goHome}
                  className="px-3 py-2.5 bg-gray-900/80 border border-gray-700 hover:bg-gray-800 text-white rounded-lg flex items-center justify-center gap-2 transition-all duration-300 hover:border-gray-600"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  Home
                </button>

                <button
                  onClick={() => fetchContent(true)}
                  disabled={isRefreshing}
                  className="px-3 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg flex items-center justify-center gap-2 hover:from-blue-700 hover:to-purple-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isRefreshing ? (
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  )}
                  {isRefreshing ? 'Refreshing' : 'Refresh'}
                </button>

                <button
                  onClick={handleLogout}
                  className="px-3 py-2.5 bg-gradient-to-r from-red-600 to-red-700 text-white font-semibold rounded-lg flex items-center justify-center gap-2 hover:from-red-700 hover:to-red-800 transition-all duration-300 transform hover:scale-105"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Logout
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-indigo-900/50 border border-indigo-700 p-4 rounded-xl mb-6">
              <p className="text-indigo-300 flex items-center gap-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {error}
              </p>
            </div>
          )}
        </header>

        {/* Main Content */}
        <main>
          {courses.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-20 h-20 mx-auto mb-5 bg-gray-800 rounded-2xl flex items-center justify-center">
                <svg className="w-10 h-10 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold mb-2.5 text-gray-300">
                {searchQuery ? "No matches found" : "No content available"}
              </h2>
              <p className="text-gray-500 max-w-md mx-auto">
                {searchQuery 
                  ? "Try different keywords or clear your search to see all available content."
                  : "Check back later for new courses and learning materials."
                }
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Search Results Summary */}
              {searchQuery && (
                <div className="text-center">
                  <p className="text-gray-400">
                    Found <span className="text-blue-400 font-semibold">{courses.length}</span> course{courses.length !== 1 ? 's' : ''} matching "{searchQuery}"
                  </p>
                </div>
              )}

              <PaginationControls
                currentPage={currentPage}
                totalPages={courses.length}
                onPrev={goToPrevPage}
                onNext={goToNextPage}
              />

              {/* Current Course */}
              {courses[currentPage] && (
                <div className="course-section animate-fadeIn">
                  <div className="text-center mb-7">
                    {(() => {
                      const rawTitle = courses[currentPage][0] || "";
                      const normalized = String(rawTitle).trim();
                      // Match optional separators before the suffix and optional space before '!'
                      const match = normalized.match(/^(.*?)(?:\s*[\-–—:|•]+\s*)?(coming\s*soon)(?:\s*!+)?\s*$/i);
                      const hasComingSoon = !!match;
                      const mainTitle = hasComingSoon ? (match?.[1] || "").trim() : normalized;
                      return (
                        <h2 className="text-xl sm:text-2xl font-bold mb-3.5 flex items-center justify-center gap-3 flex-wrap">
                          <span className="bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">{mainTitle}</span>
                          {hasComingSoon && (
                            <span
                              className="relative inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-amber-400 via-rose-400 to-pink-500 text-black font-extrabold shadow-lg ring-1 ring-white/10 shimmer"
                              aria-label="Coming Soon"
                              title="Coming Soon"
                            >
                              <span className="w-2 h-2 rounded-full bg-white/90 animate-pulse shadow-sm" />
                              <span className="tracking-wide">Coming Soon!</span>
                            </span>
                          )}
                        </h2>
                      );
                    })()}
                    <div className="w-20 h-1 bg-gradient-to-r from-blue-500 to-purple-500 mx-auto rounded-full"></div>
                  </div>
                  
                  <div className="grid gap-3.5 sm:gap-4">
                    {courses[currentPage][1].map((part, partIndex) => {
                      const sections = organizeFieldsIntoSections(
                        part.fields, 
                        part.sectionControl || [10]
                      );
                      
                      return (
                        <div key={part.id} className="bg-gray-900/50 backdrop-blur-lg rounded-xl p-3 sm:p-4 border border-gray-800 shadow-xl">
                          {/* Enhanced Part Image */}
                          <div className="mb-3 sm:mb-3.5 relative group overflow-hidden rounded-xl bg-gradient-to-br from-gray-800 to-gray-900">
                            <div className="aspect-video w-full overflow-hidden">
                              <img 
                                src={part.imageUrl || "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80"} 
                                alt={`Course Part ${partIndex + 1}`} 
                                className="w-full h-full object-cover transform transition-all duration-700 group-hover:scale-110 group-hover:rotate-1"
                                loading="lazy"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                              <div className="absolute bottom-3 left-3 right-3 transform translate-y-3 group-hover:translate-y-0 transition-transform duration-300 opacity-0 group-hover:opacity-100">
                                {/* <h4 className="text-white font-semibold text-base mb-0.5">Part {partIndex + 1}</h4> */}
                                <p className="text-gray-200 text-xs">
                                  {part.fields?.filter(f => f.trim() && f.startsWith('http')).length || 0} videos • 
                                  {part.fields?.filter(f => f.trim() && !f.startsWith('http')).length || 0} resources
                                </p>
                              </div>
                            </div>
                          </div>
                          
                          <div className="mb-3 sm:mb-4">
                            <h3 className="text-base sm:text-lg font-semibold mb-3 text-indigo-400 flex items-center gap-2">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              LEARNING CONTENT
                              {isPartAutoUnlocked(courses[currentPage][0], partIndex) && partIndex > 0 && (
                                <span className="px-2 py-1 text-xs bg-green-500/90 text-white rounded-full border border-green-400 font-semibold shadow-lg animate-pulse">
                                  🔓 UNLOCKED
                                </span>
                              )}
                            </h3>
                            
                            {sections.map((sectionFields, sectionIndex) => {
                              const sectionKey = `${courses[currentPage][0]}_part${partIndex}_section${sectionIndex}`;
                              const isExpanded = sectionIndex === 0 ? true : expandedSections[sectionKey];
                              
                              return (
                                <div key={sectionIndex} className={`mb-2.5 sm:mb-3 overflow-hidden transition-all duration-300 ${
                                  sectionIndex === 0 
                                    ? 'border border-blue-400/60 rounded-xl bg-gradient-to-br from-blue-500/10 via-gray-700/60 to-purple-500/10 shadow' 
                                    : 'border border-gray-500/40 rounded-lg bg-gray-700/40 hover:bg-gray-600/50 hover:border-gray-400/60'
                                }`}>
                                  {/* Enhanced Section Header */}
                                  <div 
                                    className={`p-2 sm:p-3 flex justify-between items-center cursor-pointer transition-all duration-200 ${
                                      sectionIndex === 0
                                        ? isExpanded 
                                          ? 'bg-gradient-to-r from-blue-500/25 via-purple-500/25 to-teal-500/25' 
                                          : 'bg-gradient-to-r from-blue-600/15 via-purple-600/15 to-teal-600/15 hover:from-blue-500/20 hover:via-purple-500/20 hover:to-teal-500/20'
                                        : isExpanded 
                                          ? 'bg-gray-600/50' 
                                          : 'bg-gray-700/40 hover:bg-gray-600/45'
                                    }`}
                                    onClick={() => toggleSection(sectionKey)}
                                  >
                                    <div className="flex items-center gap-2.5 sm:gap-3">
                                      <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center relative overflow-hidden shadow ${
                                        sectionIndex === 0
                                          ? 'bg-gradient-to-br from-blue-500 via-purple-500 to-teal-500' 
                                          : isExpanded 
                                            ? 'bg-gradient-to-r from-gray-500 to-gray-600' 
                                            : 'bg-gray-600'
                                      }`}>
                                        {sectionIndex === 0 && (
                                          <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent animate-pulse"></div>
                                        )}
                                        <span className="text-base font-bold text-white relative z-10">
                                          {sectionIndex + 1}
                                        </span>
                                        {sectionIndex === 0 && (
                                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white shadow-lg animate-pulse"></div>
                                        )}
                                      </div>
                                      <div>
                                        <h4 className={`font-semibold text-sm sm:text-base ${
                                          sectionIndex === 0 ? 'text-white' : 'text-gray-100'
                                        }`}>
                                          Section {sectionIndex + 1}
                                          {sectionIndex === 0 && (
                                            <span className="ml-3 px-3 py-1 text-xs bg-yellow-500/90 text-yellow-900 rounded-full border border-yellow-400 font-semibold shadow-lg">
                                              ⭐ PRIORITY
                                            </span>
                                          )}
                                        </h4>
                                        <p className={`text-[11px] sm:text-xs font-medium ${
                                          sectionIndex === 0 ? 'text-blue-100' : 'text-gray-300'
                                        }`}>
                                          {sectionFields.length} resources available
                                        </p>
                                      </div>
                                    </div>
                                    <svg 
                                      className={`w-6 h-6 transform transition-transform duration-300 ${
                                        isExpanded 
                                          ? sectionIndex === 0 
                                            ? 'rotate-180 text-white' 
                                            : 'rotate-180 text-gray-200' 
                                          : sectionIndex === 0 
                                            ? 'text-white' 
                                            : 'text-gray-300'
                                      }`}
                                      fill="none" 
                                      stroke="currentColor" 
                                      viewBox="0 0 24 24"
                                    >
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
                                    </svg>
                                  </div>
                                  
                                  {/* Enhanced Section Content */}
                                  {isExpanded && (
                                    <div className={`p-2 sm:p-3 ${
                                      sectionIndex === 0 
                                        ? 'bg-gradient-to-b from-gray-700/60 to-gray-800/60' 
                                        : 'bg-gray-800/40'
                                    }`}>
                                      <div className="grid gap-1.5 sm:gap-2">
                                        {sectionFields.map((field, index) => {
                                          const globalIndex = part.fields.indexOf(field);
                                          const isUrl = field.startsWith('http');
                                          const linkKey = `${courses[currentPage][0]}_part${partIndex}_link${globalIndex}`;
                                          const completionKey = `${courses[currentPage][0]}_part${partIndex}_completed`;
                                          const isUnlocked = linkProgress[linkKey];
                                          
                                          // Determine access based on URL ordering within the part
                                          let canAccess = false;
                                          const firstVideoIndexInPart = part.fields.findIndex(f => typeof f === 'string' && f.trim().startsWith('http'));
                                          if (globalIndex === firstVideoIndexInPart) {
                                            // First playable item in this part
                                            canAccess = partIndex === 0 || isPartAutoUnlocked(courses[currentPage][0], partIndex);
                                          } else {
                                            // Find previous playable URL in this part and require it to be unlocked
                                            let prevUrlIndex = -1;
                                            for (let j = globalIndex - 1; j >= 0; j--) {
                                              if (typeof part.fields[j] === 'string' && part.fields[j].trim().startsWith('http')) {
                                                prevUrlIndex = j;
                                                break;
                                              }
                                            }
                                            if (prevUrlIndex >= 0) {
                                              const prevLinkKey = `${courses[currentPage][0]}_part${partIndex}_link${prevUrlIndex}`;
                                              canAccess = !!linkProgress[prevLinkKey];
                                            } else {
                                              canAccess = false;
                                            }
                                          }
                                          
                                          // Check if video was completed via auto-progression
                                          let isCompleted = false;
                                          try {
                                            const videoProgress = JSON.parse(localStorage.getItem('bf_video_progress') || '{}');
                                            const videoCompletionKey = `${courses[currentPage][0]}_part${partIndex}_completed`;
                                            isCompleted = videoProgress[videoCompletionKey]?.completed || false;
                                          } catch (e) {};
                                          
                                          if (isUrl) {
                                            return (
                                              <div key={globalIndex} className="group">
                                                <button
                                                  onClick={() => handleLinkClick(courses[currentPage][0], partIndex, globalIndex, field, part.fields, part.imageUrl)}
                                                  disabled={!canAccess}
                                                  className={`w-full text-left p-2 sm:p-2.5 rounded-md border transition-all duration-150 transform shadow-sm relative overflow-hidden ${
                                                    isCompleted
                                                      ? "border-green-400/90 bg-gradient-to-br from-green-500/25 via-green-400/20 to-green-600/25 hover:from-green-500/35 hover:to-green-600/35 hover:border-green-400/100 hover:-translate-y-0.5"
                                                      : isUnlocked 
                                                        ? "border-yellow-400/70 bg-gradient-to-br from-yellow-500/15 via-yellow-400/10 to-orange-600/15 hover:from-yellow-500/25 hover:to-orange-600/25 hover:border-yellow-400/90 hover:-translate-y-0.5"
                                                        : canAccess
                                                          ? "border-indigo-400/70 bg-gradient-to-br from-indigo-500/15 via-indigo-400/10 to-indigo-600/15 hover:from-indigo-500/25 hover:to-indigo-600/25 hover:border-indigo-400/90 hover:-translate-y-0.5"
                                                          : "border-gray-600 bg-gray-800/40 text-gray-400 cursor-not-allowed"
                                                  } ${clickedKey === linkKey ? 'ring-2 ring-indigo-400/70 animate-pulse' : ''}`}
                                                >
                                                  <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2 sm:gap-2.5">
                                                      <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-md flex items-center justify-center shadow ${
                                                        isCompleted
                                                          ? 'bg-gradient-to-br from-green-400 to-green-600 shadow-green-500/20'
                                                          : isUnlocked 
                                                            ? 'bg-gradient-to-br from-yellow-400 to-orange-600 shadow-yellow-500/20' 
                                                            : canAccess 
                                                              ? 'bg-gradient-to-br from-red-400 to-red-600 shadow-red-500/20' 
                                                              : 'bg-gradient-to-br from-gray-600 to-gray-700 shadow-gray-600/20'
                                                      }`}>
                                                        {clickedKey === linkKey ? (
                                                          <svg className="w-3.5 h-3.5 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                                                            <circle className="opacity-30" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"></circle>
                                                            <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z"></path>
                                                          </svg>
                                                        ) : isCompleted ? (
                                                          <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                          </svg>
                                                        ) : (
                                                          <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                                          </svg>
                                                        )}
                                                      </div>
                                                      <div>
                                                        <div className="font-medium text-white text-xs sm:text-sm">
                                                          Part {index + 1}
                                                        </div>
                                                        {/* Secondary line intentionally removed for compactness */}
                                                      </div>
                                                    </div>
                                                    <div className={`${clickedKey === linkKey ? 'opacity-0 scale-95' : 'opacity-100'} transition-all duration-200`}>
                                                      <ProgressIndicator isUnlocked={isUnlocked} canAccess={canAccess} />
                                                    </div>
                                                  </div>
                                                  {clickedKey === linkKey && (
                                                    <span className="pointer-events-none absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-600/10"></span>
                                                  )}
                                                </button>
                                              </div>
                                            );
                                          } else {
                                            return (
                                              <div key={globalIndex} className="p-2.5 sm:p-3 rounded-lg bg-gradient-to-br from-gray-700/40 to-gray-800/40 border border-gray-600/60 shadow">
                                                <p className="text-white font-medium text-sm sm:text-base">{field}</p>
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
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <PaginationControls
                currentPage={currentPage}
                totalPages={courses.length}
                onPrev={goToPrevPage}
                onNext={goToNextPage}
              />
            </div>
          )}
        </main>
      </div>

      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.6s ease-out forwards;
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(180deg); }
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        
        /* Smooth scrolling */
        html {
          scroll-behavior: smooth;
        }
        
        /* Custom selection colors */
        ::selection {
          background: rgba(59, 130, 246, 0.3);
          color: white;
        }
        
        @keyframes float {
          0%, 100% { 
            transform: translateY(0px) rotate(0deg) scale(1);
            opacity: 0.4;
          }
          50% { 
            transform: translateY(-30px) rotate(180deg) scale(1.05);
            opacity: 0.8;
          }
        }
        .animate-float {
          animation: float var(--duration, 20s) ease-in-out infinite;
        }
        
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .shimmer:before {
          content: "";
          position: absolute;
          top: 0;
          left: -150%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent);
          animation: shimmer 2s infinite;
          border-radius: inherit;
        }
        
        @keyframes pulse-glow {
          0%, 100% { 
            box-shadow: 0 0 20px rgba(59, 130, 246, 0.2);
          }
          50% { 
            box-shadow: 0 0 40px rgba(59, 130, 246, 0.5);
          }
        }
        
        /* Enhanced scrollbar */
        ::-webkit-scrollbar {
          width: 10px;
        }
        
        ::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.2);
          border-radius: 10px;
        }
        
        ::-webkit-scrollbar-thumb {
          background: linear-gradient(45deg, #3b82f6, #8b5cf6, #06b6d4);
          border-radius: 10px;
          border: 2px solid transparent;
          background-clip: content-box;
        }
        
        ::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(45deg, #2563eb, #7c3aed, #0891b2);
          background-clip: content-box;
        }
        
        /* Glass morphism helper */
        .glass {
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
      `}</style>
    </div>
  );
}