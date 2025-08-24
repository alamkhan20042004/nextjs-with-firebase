"use client";
import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { collection, addDoc } from "firebase/firestore";

export default function AdminPage() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fields, setFields] = useState(Array(50).fill(""));
  const [imageUrl, setImageUrl] = useState("");
  const [courseName, setCourseName] = useState("");
  const [visibility, setVisibility] = useState("show"); // Default to "show"
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) {
        window.location.href = "/login";
      } else {
        setUser(u);
        setIsLoading(false);
      }
    });
    return () => unsub();
  }, []);

  const handleFieldChange = (index, value) => {
    const newFields = [...fields];
    newFields[index] = value;
    setFields(newFields);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUploading(true);
    try {
      // Save data to Firestore
      await addDoc(collection(db, "adminContent"), {
        fields,
        imageUrl,
        courseName,
        visibility,
        createdAt: new Date(),
        createdBy: user.email
      });
      
      alert("Content uploaded successfully!");
      // Reset form
      setFields(Array(50).fill(""));
      setImageUrl("");
      setCourseName("");
      setVisibility("show");
    } catch (error) {
      console.error("Error uploading content:", error);
      alert("Error uploading content. Please try again.");
    } finally {
      setUploading(false);
    }
  };

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
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-start p-4 relative overflow-hidden">
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
      <div className="relative z-10 w-full max-w-4xl px-4 py-8 transform transition-all duration-700 animate-fadeIn">
        <div className="mb-8 text-center">
          <div className="inline-block p-4 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 mb-6 transform transition-transform duration-500 hover:scale-110">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
            </svg>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-500">
            Admin Dashboard, {user?.email?.split('@')[0]}!
          </h1>
          <p className="text-xl text-gray-300">Enter up to 50 optional text fields or links below</p>
        </div>
        
        {/* Content Upload Form */}
        <div className="bg-gray-900 bg-opacity-70 backdrop-blur-lg rounded-2xl p-8 border border-gray-800 shadow-2xl mb-10">
          <h2 className="text-2xl font-bold mb-6 text-purple-400 text-center">Upload Content</h2>
          <p className="text-gray-400 text-center mb-6">All fields are optional. Fill as many as you need.</p>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Course Name Field */}
            <div className="space-y-2">
              <label className="block text-lg font-medium text-gray-300">
                Course Name
              </label>
              <input
                type="text"
                value={courseName}
                onChange={(e) => setCourseName(e.target.value)}
                placeholder="Enter the name of the course"
                className="w-full bg-gray-800 text-white rounded-lg p-3 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            
            {/* Image URL Field */}
            <div className="space-y-2">
              <label className="block text-lg font-medium text-gray-300">
                Image URL
              </label>
              <input
                type="text"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="Enter image URL for the course"
                className="w-full bg-gray-800 text-white rounded-lg p-3 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            
            {/* Visibility Control Field */}
            <div className="space-y-2">
              <label className="block text-lg font-medium text-gray-300">
                Content Visibility
              </label>
              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="visibility"
                    value="show"
                    checked={visibility === "show"}
                    onChange={() => setVisibility("show")}
                    className="h-4 w-4 text-purple-500 focus:ring-purple-500"
                  />
                  <span className="ml-2 text-gray-300">Show</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="visibility"
                    value="hide"
                    checked={visibility === "hide"}
                    onChange={() => setVisibility("hide")}
                    className="h-4 w-4 text-purple-500 focus:ring-purple-500"
                  />
                  <span className="ml-2 text-gray-300">Hide</span>
                </label>
              </div>
            </div>
            
            {/* 50 Input Fields */}
            <div className="pt-4">
              <h3 className="text-lg font-medium mb-4 text-gray-300">Content Fields (Optional)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {fields.map((field, index) => (
                  <div key={index} className="space-y-2">
                    <label className="block text-sm font-medium text-gray-300">
                      Field {index + 1} <span className="text-gray-500">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      value={field}
                      onChange={(e) => handleFieldChange(index, e.target.value)}
                      placeholder={`Optional: Enter text or link ${index + 1}`}
                      className="w-full bg-gray-800 text-white rounded-lg p-3 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                ))}
              </div>
            </div>
            
            {/* Submit Button */}
            <div className="pt-6">
              <button
                type="submit"
                disabled={uploading}
                className={`w-full py-3 px-6 rounded-lg font-bold transition duration-300 flex items-center justify-center gap-2 ${
                  uploading 
                    ? "bg-purple-800 cursor-not-allowed" 
                    : "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                }`}
              >
                {uploading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Uploading...
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Submit Content
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
        
        <div className="text-center">
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

















// ===============================================================

// "use client";

// import { useEffect, useState } from "react";
// import { auth, db } from "@/lib/firebase";
// import { onAuthStateChanged, signOut } from "firebase/auth";
// import { collection, addDoc } from "firebase/firestore";

// export default function AdminPage() {
//   const [user, setUser] = useState(null);
//   const [isLoading, setIsLoading] = useState(true);
//   const [fields, setFields] = useState(Array(50).fill(""));
//   const [uploading, setUploading] = useState(false);

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

//   const handleFieldChange = (index, value) => {
//     const newFields = [...fields];
//     newFields[index] = value;
//     setFields(newFields);
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     setUploading(true);
//     try {
//       // Save data to Firestore
//       await addDoc(collection(db, "adminContent"), {
//         fields,
//         createdAt: new Date(),
//         createdBy: user.email
//       });
      
//       alert("Content uploaded successfully!");
//       // Reset form
//       setFields(Array(50).fill(""));
//     } catch (error) {
//       console.error("Error uploading content:", error);
//       alert("Error uploading content. Please try again.");
//     } finally {
//       setUploading(false);
//     }
//   };

//   if (isLoading) {
//     return (
//       <div className="flex min-h-screen items-center justify-center bg-black">
//         <div className="relative">
//           <div className="w-16 h-16 border-4 border-purple-500 rounded-full animate-spin"></div>
//           <div className="absolute top-0 left-0 w-16 h-16 border-4 border-transparent border-t-purple-300 rounded-full animate-ping"></div>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="min-h-screen bg-black text-white flex flex-col items-center justify-start p-4 relative overflow-hidden">
//       {/* Animated background elements */}
//       <div className="absolute inset-0 overflow-hidden">
//         {[...Array(20)].map((_, i) => (
//           <div 
//             key={i}
//             className="absolute rounded-full bg-purple-500 opacity-10 animate-pulse"
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
//       <div className="relative z-10 w-full max-w-4xl px-4 py-8 transform transition-all duration-700 animate-fadeIn">
//         <div className="mb-8 text-center">
//           <div className="inline-block p-4 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 mb-6 transform transition-transform duration-500 hover:scale-110">
//             <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" viewBox="0 0 20 20" fill="currentColor">
//               <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
//             </svg>
//           </div>
//           <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-500">
//             Admin Dashboard, {user?.email?.split('@')[0]}!
//           </h1>
//           <p className="text-xl text-gray-300">Enter up to 50 optional text fields or links below</p>
//         </div>
        
//         {/* Content Upload Form */}
//         <div className="bg-gray-900 bg-opacity-70 backdrop-blur-lg rounded-2xl p-8 border border-gray-800 shadow-2xl mb-10">
//           <h2 className="text-2xl font-bold mb-6 text-purple-400 text-center">Upload Content</h2>
//           <p className="text-gray-400 text-center mb-6">All fields are optional. Fill as many as you need.</p>
          
//           <form onSubmit={handleSubmit} className="space-y-4">
//             {/* 50 Input Fields */}
//             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//               {fields.map((field, index) => (
//                 <div key={index} className="space-y-2">
//                   <label className="block text-sm font-medium text-gray-300">
//                     Field {index + 1} <span className="text-gray-500">(Optional)</span>
//                   </label>
//                   <input
//                     type="text"
//                     value={field}
//                     onChange={(e) => handleFieldChange(index, e.target.value)}
//                     placeholder={`Optional: Enter text or link ${index + 1}`}
//                     className="w-full bg-gray-800 text-white rounded-lg p-3 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
//                   />
//                 </div>
//               ))}
//             </div>
            
//             {/* Submit Button */}
//             <div className="pt-6">
//               <button
//                 type="submit"
//                 disabled={uploading}
//                 className={`w-full py-3 px-6 rounded-lg font-bold transition duration-300 flex items-center justify-center gap-2 ${
//                   uploading 
//                     ? "bg-purple-800 cursor-not-allowed" 
//                     : "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
//                 }`}
//               >
//                 {uploading ? (
//                   <>
//                     <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
//                       <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
//                       <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
//                     </svg>
//                     Uploading...
//                   </>
//                 ) : (
//                   <>
//                     <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
//                       <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
//                     </svg>
//                     Submit Content
//                   </>
//                 )}
//               </button>
//             </div>
//           </form>
//         </div>
        
//         <div className="text-center">
//           <button
//             onClick={() => signOut(auth)}
//             className="px-8 py-3 bg-gradient-to-r from-red-600 to-red-800 text-white font-bold rounded-full transform transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-red-500/30 flex items-center justify-center mx-auto group"
//           >
//             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 group-hover:animate-bounce" viewBox="0 0 20 20" fill="currentColor">
//               <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
//             </svg>
//             Logout
//           </button>
//         </div>
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



















// ==============================================

// "use client";
// import { useEffect, useState } from "react";
// import { auth, db } from "@/lib/firebase";
// import { onAuthStateChanged, signOut } from "firebase/auth";
// import { collection, addDoc } from "firebase/firestore";

// export default function AdminPage() {
//   const [user, setUser] = useState(null);
//   const [isLoading, setIsLoading] = useState(true);
//   const [fields, setFields] = useState(Array(50).fill(""));
//   const [uploading, setUploading] = useState(false);

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

//   const handleFieldChange = (index, value) => {
//     const newFields = [...fields];
//     newFields[index] = value;
//     setFields(newFields);
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     setUploading(true);
//     try {
//       // Save data to Firestore
//       await addDoc(collection(db, "adminContent"), {
//         fields,
//         createdAt: new Date(),
//         createdBy: user.email
//       });
      
//       alert("Content uploaded successfully!");
//       // Reset form
//       setFields(Array(50).fill(""));
//     } catch (error) {
//       console.error("Error uploading content:", error);
//       alert("Error uploading content. Please try again.");
//     } finally {
//       setUploading(false);
//     }
//   };

//   if (isLoading) {
//     return (
//       <div className="flex min-h-screen items-center justify-center bg-black">
//         <div className="relative">
//           <div className="w-16 h-16 border-4 border-purple-500 rounded-full animate-spin"></div>
//           <div className="absolute top-0 left-0 w-16 h-16 border-4 border-transparent border-t-purple-300 rounded-full animate-ping"></div>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="min-h-screen bg-black text-white flex flex-col items-center justify-start p-4 relative overflow-hidden">
//       {/* Animated background elements */}
//       <div className="absolute inset-0 overflow-hidden">
//         {[...Array(20)].map((_, i) => (
//           <div 
//             key={i}
//             className="absolute rounded-full bg-purple-500 opacity-10 animate-pulse"
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
//       <div className="relative z-10 w-full max-w-4xl px-4 py-8 transform transition-all duration-700 animate-fadeIn">
//         <div className="mb-8 text-center">
//           <div className="inline-block p-4 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 mb-6 transform transition-transform duration-500 hover:scale-110">
//             <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" viewBox="0 0 20 20" fill="currentColor">
//               <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
//             </svg>
//           </div>
//           <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-500">
//             Admin Dashboard, {user?.email?.split('@')[0]}!
//           </h1>
//           <p className="text-xl text-gray-300">Enter up to 50 text fields or links below</p>
//         </div>
        
//         {/* Content Upload Form */}
//         <div className="bg-gray-900 bg-opacity-70 backdrop-blur-lg rounded-2xl p-8 border border-gray-800 shadow-2xl mb-10">
//           <h2 className="text-2xl font-bold mb-6 text-purple-400 text-center">Upload Content</h2>
          
//           <form onSubmit={handleSubmit} className="space-y-4">
//             {/* 50 Input Fields */}
//             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//               {fields.map((field, index) => (
//                 <div key={index} className="space-y-2">
//                   <label className="block text-sm font-medium text-gray-300">
//                     Field {index + 1}
//                   </label>
//                   <input
//                     type="text"
//                     value={field}
//                     onChange={(e) => handleFieldChange(index, e.target.value)}
//                     placeholder={`Enter text or link ${index + 1}`}
//                     className="w-full bg-gray-800 text-white rounded-lg p-3 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
//                   />
//                 </div>
//               ))}
//             </div>
            
//             {/* Submit Button */}
//             <div className="pt-6">
//               <button
//                 type="submit"
//                 disabled={uploading}
//                 className={`w-full py-3 px-6 rounded-lg font-bold transition duration-300 flex items-center justify-center gap-2 ${
//                   uploading 
//                     ? "bg-purple-800 cursor-not-allowed" 
//                     : "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
//                 }`}
//               >
//                 {uploading ? (
//                   <>
//                     <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
//                       <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
//                       <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
//                     </svg>
//                     Uploading...
//                   </>
//                 ) : (
//                   <>
//                     <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
//                       <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
//                     </svg>
//                     Submit Content
//                   </>
//                 )}
//               </button>
//             </div>
//           </form>
//         </div>
        
//         <div className="text-center">
//           <button
//             onClick={() => signOut(auth)}
//             className="px-8 py-3 bg-gradient-to-r from-red-600 to-red-800 text-white font-bold rounded-full transform transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-red-500/30 flex items-center justify-center mx-auto group"
//           >
//             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 group-hover:animate-bounce" viewBox="0 0 20 20" fill="currentColor">
//               <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
//             </svg>
//             Logout
//           </button>
//         </div>
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


























// =============================================

// "use client";
// import { useEffect, useState } from "react";
// import { auth, db } from "@/lib/firebase";
// import { onAuthStateChanged, signOut } from "firebase/auth";
// import { collection, addDoc } from "firebase/firestore";

// export default function AdminPage() {
//   const [user, setUser] = useState(null);
//   const [isLoading, setIsLoading] = useState(true);
//   const [imageUrl, setImageUrl] = useState("");
//   const [content, setContent] = useState("");
//   const [uploading, setUploading] = useState(false);
//   const [previewUrl, setPreviewUrl] = useState("");

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

//   const handleImageUrlChange = (e) => {
//     const url = e.target.value;
//     setImageUrl(url);
//     setPreviewUrl(url);
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     if (!imageUrl.trim() || !content.trim()) {
//       alert("Please enter an image URL and content");
//       return;
//     }

//     setUploading(true);
//     try {
//       // Save data to Firestore
//       await addDoc(collection(db, "adminContent"), {
//         imageUrl,
//         content,
//         createdAt: new Date(),
//         createdBy: user.email
//       });
      
//       alert("Content uploaded successfully!");
//       // Reset form
//       setImageUrl("");
//       setContent("");
//       setPreviewUrl("");
//     } catch (error) {
//       console.error("Error uploading content:", error);
//       alert("Error uploading content. Please try again.");
//     } finally {
//       setUploading(false);
//     }
//   };

//   if (isLoading) {
//     return (
//       <div className="flex min-h-screen items-center justify-center bg-black">
//         <div className="relative">
//           <div className="w-16 h-16 border-4 border-purple-500 rounded-full animate-spin"></div>
//           <div className="absolute top-0 left-0 w-16 h-16 border-4 border-transparent border-t-purple-300 rounded-full animate-ping"></div>
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
//             className="absolute rounded-full bg-purple-500 opacity-10 animate-pulse"
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
//       <div className="relative z-10 text-center max-w-4xl w-full px-4 transform transition-all duration-700 animate-fadeIn">
//         <div className="mb-8">
//           <div className="inline-block p-4 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 mb-6 transform transition-transform duration-500 hover:scale-110">
//             <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" viewBox="0 0 20 20" fill="currentColor">
//               <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
//             </svg>
//           </div>
//           <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-500">
//             Admin Dashboard, {user?.email?.split('@')[0]}!
//           </h1>
//         </div>
        
//         {/* Content Upload Form */}
//         <div className="bg-gray-900 bg-opacity-70 backdrop-blur-lg rounded-2xl p-8 border border-gray-800 shadow-2xl mb-10">
//           <h2 className="text-2xl font-bold mb-6 text-purple-400">Upload Content</h2>
          
//           <form onSubmit={handleSubmit} className="space-y-6">
//             {/* Image URL Input Section */}
//             <div className="space-y-4">
//               <label className="block text-lg font-medium">Image URL</label>
//               <div className="flex flex-col items-center">
//                 <input
//                   type="text"
//                   value={imageUrl}
//                   onChange={handleImageUrlChange}
//                   placeholder="Enter image URL from the internet"
//                   className="w-full bg-gray-800 text-white rounded-lg p-4 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
//                 />
                
//                 {previewUrl && (
//                   <div className="mt-4">
//                     <img 
//                       src={previewUrl} 
//                       alt="Preview" 
//                       className="max-w-xs max-h-48 rounded-lg border-2 border-purple-500"
//                       onError={(e) => {
//                         e.target.onerror = null;
//                         e.target.src = "https://via.placeholder.com/300x200?text=Image+Not+Available";
//                       }}
//                     />
//                   </div>
//                 )}
//               </div>
//             </div>
            
//             {/* Content Textarea */}
//             <div className="space-y-4">
//               <label className="block text-lg font-medium">Content (50 lines of text or links)</label>
//               <textarea
//                 value={content}
//                 onChange={(e) => setContent(e.target.value)}
//                 rows={10}
//                 className="w-full bg-gray-800 text-white rounded-lg p-4 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
//                 placeholder="Enter your content here (up to 50 lines)..."
//               />
//             </div>
            
//             {/* Submit Button */}
//             <button
//               type="submit"
//               disabled={uploading}
//               className={`w-full py-3 px-6 rounded-lg font-bold transition duration-300 flex items-center justify-center gap-2 ${
//                 uploading 
//                   ? "bg-purple-800 cursor-not-allowed" 
//                   : "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
//               }`}
//             >
//               {uploading ? (
//                 <>
//                   <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
//                     <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
//                     <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
//                   </svg>
//                   Uploading...
//                 </>
//               ) : (
//                 <>
//                   <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
//                     <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
//                   </svg>
//                   Submit Content
//                 </>
//               )}
//             </button>
//           </form>
//         </div>
        
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






















// ===========================================================================

// "use client";
// import { useEffect, useState } from "react";
// import { auth } from "@/lib/firebase";
// import { onAuthStateChanged, signOut } from "firebase/auth";

// export default function AdminPage() {
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
//           <div className="w-16 h-16 border-4 border-purple-500 rounded-full animate-spin"></div>
//           <div className="absolute top-0 left-0 w-16 h-16 border-4 border-transparent border-t-purple-300 rounded-full animate-ping"></div>
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
//             className="absolute rounded-full bg-purple-500 opacity-10 animate-pulse"
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
//           <div className="inline-block p-4 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 mb-6 transform transition-transform duration-500 hover:scale-110">
//             <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" viewBox="0 0 20 20" fill="currentColor">
//               <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
//             </svg>
//           </div>
//           <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-500">
//             Admin Dashboard, {user?.email?.split('@')[0]}!
//           </h1>
//           {/* <p className="text-xl text-gray-300 mb-8">Welcome to your exclusive admin control center</p> */}
//         </div>
        
//         {/* <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
//           {['Users', 'Analytics', 'Settings'].map((item, index) => (
//             <div 
//               key={index}
//               className="bg-gray-900 bg-opacity-50 backdrop-blur-sm rounded-xl p-6 border border-gray-800 transform transition-all duration-300 hover:border-purple-500 hover:scale-105 hover:shadow-lg hover:shadow-purple-500/20"
//             >
//               <div className="text-purple-400 mb-3">
//                 <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
//                 </svg>
//               </div>
//               <h3 className="text-lg font-semibold mb-2">{item}</h3>
//               <p className="text-gray-400 text-sm">Manage {item.toLowerCase()} and system preferences</p>
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