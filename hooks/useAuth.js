// hooks/useAuth.js
"use client";
import { useState, useCallback } from 'react';
import { 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithRedirect,
  browserPopupRedirectResolver
} from 'firebase/auth';
import { auth } from '@/lib/firebase';

export const useAuth = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState(null);

  // Smart device detection
  const getAuthMethod = useCallback(() => {
    if (typeof window === 'undefined') return 'popup';
    
    const userAgent = navigator.userAgent.toLowerCase();
    const isMobile = /mobi|android|iphone|ipad|ipod/i.test(navigator.userAgent);
    
    // For mobile devices, ALWAYS use redirect for best compatibility
    if (isMobile) {
      return 'redirect';
    }
    
    // For desktop, use popup
    return 'popup';
  }, []);

  const signInWithGoogle = useCallback(async () => {
    setIsLoading(true);
    setAuthError(null);
    
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('profile');
      provider.addScope('email');
      provider.setCustomParameters({
        prompt: 'select_account'
      });
      
      const authMethod = getAuthMethod();
      
      console.log('Auth method selected:', authMethod);
      console.log('User agent:', navigator.userAgent);
      
      if (authMethod === 'popup') {
        // Use popup for desktop
        const result = await signInWithPopup(auth, provider, browserPopupRedirectResolver);
        return result;
      } else {
        // Use redirect for mobile (most reliable)
        await signInWithRedirect(auth, provider);
        // Don't reset loading state here - it will be handled by the redirect result
      }
    } catch (error) {
      console.error('Auth error:', error);
      
      let errorMessage = 'An error occurred during sign-in.';
      
      if (error.code === 'auth/popup-blocked') {
        errorMessage = 'Popup was blocked. Please allow popups for this site.';
      } else if (error.code === 'auth/popup-closed-by-user') {
        errorMessage = 'Sign-in was cancelled.';
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage = 'Network error. Please check your internet connection.';
      } else if (error.code === 'auth/unauthorized-domain') {
        errorMessage = 'Domain authorization error. Please contact support.';
      } else {
        errorMessage = error.message || errorMessage;
      }
      
      setAuthError(errorMessage);
      setIsLoading(false);
      throw error;
    }
  }, [getAuthMethod]);

  return {
    signInWithGoogle,
    isLoading,
    authError,
    clearError: () => setAuthError(null),
    authMethod: getAuthMethod()
  };
};






// "use client";
// import { useState, useCallback } from 'react';
// import { 
//   GoogleAuthProvider, 
//   signInWithPopup, 
//   signInWithRedirect,
//   browserPopupRedirectResolver
// } from 'firebase/auth';
// import { auth } from '@/lib/firebase';

// export const useAuth = () => {
//   const [isLoading, setIsLoading] = useState(false);
//   const [authError, setAuthError] = useState(null);
//   const [forcePopup, setForcePopup] = useState(false);

//   // Smart detection that gives priority to user preference
//   const getAuthMethod = useCallback(() => {
//     if (typeof window === 'undefined') return 'popup';
    
//     // Check if user previously forced popup
//     const savedPreference = localStorage.getItem('prefer-popup-auth');
//     if (savedPreference === 'true' || forcePopup) {
//       return 'popup';
//     }
    
//     const userAgent = navigator.userAgent.toLowerCase();
//     const isIOS = /iphone|ipad|ipod/.test(userAgent);
//     const isAndroid = /android/.test(userAgent);
//     const isMobile = isIOS || isAndroid;
    
//     // Modern mobile browsers that generally support popups well
//     const isChromeMobile = /chrome|chromium|crios/.test(userAgent);
//     const isFirefoxMobile = /firefox|fxios/.test(userAgent);
//     const isSamsungBrowser = /samsungbrowser/.test(userAgent);
    
//     // Safari on iOS has the most popup issues
//     const isSafari = /safari/.test(userAgent) && !/chrome/.test(userAgent);
    
//     // Use popup for:
//     // - Desktop browsers
//     // - Chrome Mobile
//     // - Firefox Mobile  
//     // - Samsung Browser
//     // Use redirect for:
//     // - iOS Safari (most problematic)
//     // - Older mobile browsers
    
//     if (isMobile) {
//       if (isIOS && isSafari) {
//         return 'redirect';
//       }
//       // For other mobile browsers, try popup first
//       return 'popup';
//     }
    
//     // Default to popup for desktop
//     return 'popup';
//   }, [forcePopup]);

//   const signInWithGoogle = useCallback(async (preferPopup = false) => {
//     setIsLoading(true);
//     setAuthError(null);
    
//     // If user explicitly wants popup, set the preference
//     if (preferPopup) {
//       setForcePopup(true);
//       localStorage.setItem('prefer-popup-auth', 'true');
//     }
    
//     try {
//       const provider = new GoogleAuthProvider();
//       provider.addScope('profile');
//       provider.addScope('email');
      
//       const authMethod = preferPopup ? 'popup' : getAuthMethod();
      
//       console.log('Using auth method:', authMethod, 'on device:', navigator.userAgent);
      
//       if (authMethod === 'popup') {
//         try {
//           const result = await signInWithPopup(auth, provider, browserPopupRedirectResolver);
//           setIsLoading(false);
//           return result;
//         } catch (popupError) {
//           // If popup fails on mobile, fall back to redirect
//           if (popupError.code === 'auth/popup-blocked' || popupError.code === 'auth/popup-closed-by-user') {
//             console.log('Popup failed, falling back to redirect');
//             await signInWithRedirect(auth, provider);
//           } else {
//             throw popupError;
//           }
//         }
//       } else {
//         await signInWithRedirect(auth, provider);
//       }
//     } catch (error) {
//       console.error('Auth error:', error);
      
//       // Handle specific error cases
//       if (error.code === 'auth/popup-blocked') {
//         setAuthError('Popup was blocked. Please allow popups or use the redirect method below.');
//       } else if (error.code === 'auth/popup-closed-by-user') {
//         setAuthError('Sign-in was cancelled. Please try again.');
//       } else if (error.code === 'auth/unauthorized-domain') {
//         setAuthError('This domain is not authorized. Please contact support.');
//       } else {
//         setAuthError(error.message || 'An error occurred during sign-in.');
//       }
      
//       setIsLoading(false);
//       throw error;
//     }
//   }, [getAuthMethod]);

//   const clearError = () => setAuthError(null);

//   return {
//     signInWithGoogle,
//     isLoading,
//     authError,
//     clearError,
//     authMethod: getAuthMethod(),
//     forcePopup: () => {
//       setForcePopup(true);
//       localStorage.setItem('prefer-popup-auth', 'true');
//     }
//   };
// };







// // hooks/useAuth.js
// "use client";
// import { useState, useEffect, useCallback } from 'react';
// import { 
//   GoogleAuthProvider, 
//   signInWithPopup, 
//   signInWithRedirect, 
//   getRedirectResult,
//   onAuthStateChanged,
//   browserPopupRedirectResolver
// } from 'firebase/auth';
// import { auth } from '@/lib/firebase';

// export const useAuth = () => {
//   const [isLoading, setIsLoading] = useState(false);
//   const [authError, setAuthError] = useState(null);
//   const [authMethod, setAuthMethod] = useState('popup'); // Default to popup

//   // Detect if popup is likely to work - runs only on client
//   const canUsePopup = useCallback(() => {
//     // Check if window is available (client-side)
//     if (typeof window === 'undefined') {
//       return true; // Default during SSR
//     }

//     const userAgent = navigator.userAgent.toLowerCase();
    
//     // Modern mobile browsers that support popups
//     const supportsPopup = 
//       /chrome|chromium|crios/i.test(userAgent) ||
//       /firefox|fxios/i.test(userAgent) ||
//       /samsungbrowser/i.test(userAgent) ||
//       /edg/i.test(userAgent);
    
//     // Safari has popup blocking issues, use redirect as fallback
//     const isSafari = /safari/i.test(userAgent) && !/chrome/i.test(userAgent);
    
//     // Check screen size as additional factor
//     const isMobileScreen = window.innerWidth <= 768;
    
//     return supportsPopup && !isSafari && !isMobileScreen;
//   }, []);

//   // Set auth method on client side only
//   useEffect(() => {
//     const method = canUsePopup() ? 'popup' : 'redirect';
//     setAuthMethod(method);
//   }, [canUsePopup]);

//   const signInWithGoogle = useCallback(async () => {
//     setIsLoading(true);
//     setAuthError(null);
    
//     try {
//       const provider = new GoogleAuthProvider();
//       provider.addScope('profile');
//       provider.addScope('email');
      
//       if (authMethod === 'popup') {
//         // Set a longer timeout for mobile popups
//         const timeoutPromise = new Promise((_, reject) => 
//           setTimeout(() => reject(new Error('Popup timed out. Please try again.')), 45000)
//         );
        
//         const signInPromise = signInWithPopup(auth, provider, browserPopupRedirectResolver);
        
//         const result = await Promise.race([signInPromise, timeoutPromise]);
//         return result;
//       } else {
//         // Use redirect for browsers that don't support popups well
//         await signInWithRedirect(auth, provider);
//         // Loading state will persist until redirect result is handled
//       }
//     } catch (error) {
//       console.error('Auth error:', error);
      
//       // Handle specific error cases
//       if (error.code === 'auth/popup-blocked') {
//         setAuthError('Popup blocked. Please allow popups for this site or try the redirect method.');
//       } else if (error.code === 'auth/popup-closed-by-user') {
//         setAuthError('Sign-in was cancelled. Please try again.');
//       } else if (error.message?.includes('timed out')) {
//         setAuthError('Sign-in took too long. Please try again.');
//       } else {
//         setAuthError(error.message || 'An error occurred during sign-in.');
//       }
      
//       setIsLoading(false);
//       throw error;
//     }
//   }, [authMethod]);

//   return {
//     signInWithGoogle,
//     isLoading,
//     authError,
//     clearError: () => setAuthError(null),
//     authMethod
//   };
// };