"use client";
import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";

export default function AdminPage() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) {
        window.location.href = "/login"; // not logged in -> login
      } else {
        setUser(u);
        setIsLoading(false);
      }
    });
    return () => unsub();
  }, []);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-purple-500 rounded-full animate-spin"></div>
          <div className="absolute top-0 left-0 w-16 h-16 border-4 border-transparent border-t-purple-300 rounded-full animate-ping"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <div 
            key={i}
            className="absolute rounded-full bg-purple-500 opacity-10 animate-pulse"
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
      
      {/* Content with animation */}
      <div className="relative z-10 text-center max-w-2xl px-4 transform transition-all duration-700 animate-fadeIn">
        <div className="mb-8">
          <div className="inline-block p-4 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 mb-6 transform transition-transform duration-500 hover:scale-110">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
            </svg>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-500">
            Admin Dashboard, {user?.email?.split('@')[0]}!
          </h1>
          {/* <p className="text-xl text-gray-300 mb-8">Welcome to your exclusive admin control center</p> */}
        </div>
        
        {/* <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {['Users', 'Analytics', 'Settings'].map((item, index) => (
            <div 
              key={index}
              className="bg-gray-900 bg-opacity-50 backdrop-blur-sm rounded-xl p-6 border border-gray-800 transform transition-all duration-300 hover:border-purple-500 hover:scale-105 hover:shadow-lg hover:shadow-purple-500/20"
            >
              <div className="text-purple-400 mb-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2">{item}</h3>
              <p className="text-gray-400 text-sm">Manage {item.toLowerCase()} and system preferences</p>
            </div>
          ))}
        </div> */}
        
        <button
          onClick={() => signOut(auth)}
          className="px-8 py-3 bg-gradient-to-r from-red-600 to-red-800 text-white font-bold rounded-full transform transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-red-500/30 flex items-center justify-center mx-auto group"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 group-hover:animate-bounce" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
          </svg>
          Logout
        </button>
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














// "use client";
// import { useEffect, useState } from "react";
// import { auth } from "@/lib/firebase";
// import { onAuthStateChanged, signOut } from "firebase/auth";



// export default function AdminPage() {
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
//       <h1 className="text-2xl font-bold">Welcome admin, {user.email} 🎉</h1>
//       <button
//         onClick={() => signOut(auth)}
//         className="mt-4 bg-red-600 text-white px-4 py-2 rounded"
//       >
//         Logout
//       </button>

//     </div>
//   );
// }