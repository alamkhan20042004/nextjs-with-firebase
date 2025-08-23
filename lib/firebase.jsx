// lib/firebase.jsx
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// Firebase config environment variables se le rahe hain
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Firebase initialize karo (agar pehle se app hai to usko use karo)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Export Auth (login, signup, logout ke liye use hoga)
export const auth = getAuth(app);

















// // Import the functions you need from the SDKs you need
// import { initializeApp,getApps, getApp} from "firebase/app";
// import { getAuth } from "firebase/auth";
// // TODO: Add SDKs for Firebase products that you want to use
// // https://firebase.google.com/docs/web/setup#available-libraries

// // Your web app's Firebase configuration
// const firebaseConfig = {
//   apiKey: "AIzaSyAw26qRUDkU__aGD_n-Gk-_gebuUdDf5zo",
//   authDomain: "test-3270e.firebaseapp.com",
//   projectId: "test-3270e",
//   storageBucket: "test-3270e.firebasestorage.app",
//   messagingSenderId: "43935916292",
//   appId: "1:43935916292:web:e2fcbd27f53eb2f68cb051"
// };

// // Initialize Firebase
// // const app = initializeApp(firebaseConfig);
// // export const auth = getAuth(app);
// const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
// export const auth = getAuth(app);