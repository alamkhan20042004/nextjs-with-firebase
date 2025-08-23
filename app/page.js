"use client";
import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";



export default function HomePage() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) {
        window.location.href = "/login"; // not logged in -> login
      } else {
        setUser(u);
      }
    });
    return () => unsub();
  }, []);

  if (!user) return <p className="text-center mt-20">Loading...</p>;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-green-100">
      <h1 className="text-2xl font-bold">Welcome, {user.email} 🎉</h1>
      <button
        onClick={() => signOut(auth)}
        className="mt-4 bg-red-600 text-white px-4 py-2 rounded"
      >
        Logout
      </button>

    </div>
  );
}
















// useEffect(() => {
//   const unsub = onAuthStateChanged(auth, (u) => {
//     if (!u) {
//       window.location.href = "/login";
//     } else {
//       setUser(u);
//     }
//   });
//   return () => unsub();
// }, []);


























// "use client";
// import { useEffect, useState } from "react";
// import { auth } from "@/lib/firebase";
// import { onAuthStateChanged, signOut } from "firebase/auth";

// export default function HomePage() {
//   const [user, setUser] = useState(null);

//   useEffect(() => {
//     const unsub = onAuthStateChanged(auth, (currentUser) => {
//       if (!currentUser) {
//         window.location.href = "/login";
//       } else {
//         setUser(currentUser);
//       }
//     });
//     return () => unsub();
//   }, []);

//   if (!user) return <p className="text-center mt-20">Loading...</p>;

//   return (
//     <div className="flex flex-col items-center justify-center min-h-screen bg-green-100">
//       <h1 className="text-2xl font-bold">Welcome, {user.email} 🎉</h1>
//       <button
//         onClick={() => signOut(auth)}
//         className="mt-4 bg-red-500 text-white px-4 py-2 rounded"
//       >
//         Logout
//       </button>
//     </div>
//   );
// }























// import Image from "next/image";

// export default function Home() {
//   return (
//    <h1>Hello</h1>
//   );
// }
