"use client";
import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { collection, getDocs, query, orderBy } from "firebase/firestore";

export default function UserPage() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [content, setContent] = useState([]);
  const [error, setError] = useState("");

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

  useEffect(() => {
    const fetchContent = async () => {
      try {
        const q = query(collection(db, "adminContent"), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        const contentData = [];
        querySnapshot.forEach((doc) => {
          contentData.push({ id: doc.id, ...doc.data() });
        });
        setContent(contentData);
      } catch (err) {
        console.error("Error fetching content:", err);
        setError("Failed to load content");
      }
    };

    if (user) {
      fetchContent();
    }
  }, [user]);

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
      {/* Animated background elements */}
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
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 group-hover:animate-bounce" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
            </svg>
            Logout
          </button>
        </div>
        
        {error && (
          <div className="bg-red-900 bg-opacity-50 p-4 rounded-lg mb-6">
            <p className="text-red-300">{error}</p>
          </div>
        )}
        
        {content.length === 0 ? (
          <div className="text-center py-12">
            <h2 className="text-2xl font-semibold mb-4">No content available</h2>
            <p className="text-gray-400">Check back later for new content.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {content.map((item) => (
              <div key={item.id} className="bg-gray-900 bg-opacity-70 backdrop-blur-lg rounded-2xl p-6 border border-gray-800 shadow-2xl">
                <div className="flex justify-between items-start mb-4">
                  <h2 className="text-xl font-bold text-blue-400">
                    Content by BrainFuel
                  </h2>
                  <span className="text-sm text-gray-400">
                    {new Date(item.createdAt?.toDate()).toLocaleString()}
                  </span>
                </div>
                
                {/* Image from internet */}
                <div className="mb-6">
                  {/* <img 
                    src="https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80" 
                    alt="Content" 
                    className="w-full h-64 object-cover rounded-xl"
                  /> */}
                  <img 
                        src="https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80" 
                        alt="Content" 
                        className="w-full h-80 object-cover transform transition-transform duration-500 group-hover:scale-105"
                      />
                  <h3 className="text-lg font-semibold mb-3 text-purple-400">Course Name:</h3>
                </div>
                
                {/* Dynamic links section */}
                <div className="mb-4">
                  <h3 className="text-lg font-semibold mb-3 text-purple-400">Links:</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {item.fields
                      .filter(field => field.trim() !== '') // Remove empty fields
                      .map((field, index) => {
                        // Check if it's a URL
                        const isUrl = field.startsWith('http://') || field.startsWith('https://');
                        
                        if (isUrl) {
                          return (
                            <a
                              key={index}
                              href={field}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block bg-gray-800 hover:bg-gray-700 p-3 rounded-lg transition duration-300 transform hover:scale-105"
                            >
                              <div className="flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-400 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd" />
                                </svg>
                                <span className="text-blue-300 truncate">
                                  {field.includes('youtube.com') ? 'YouTube Video' : field}
                                </span>
                              </div>
                            </a>
                          );
                        } else {
                          // For non-URL text, display as text
                          return (
                            <div key={index} className="bg-gray-800 p-3 rounded-lg">
                              <p className="text-gray-300">{field}</p>
                            </div>
                          );
                        }
                      })}
                  </div>
                </div>
                
                <div className="mt-4 text-sm text-gray-500">
                  {item.nonEmptyCount || item.fields.filter(f => f.trim()).length} items
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