"use client";
import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { collection, addDoc, query, orderBy, onSnapshot, doc, updateDoc, serverTimestamp, deleteDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { ADMIN_EMAILS } from "@/lib/config";

export default function AdminPage() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fields, setFields] = useState(Array(2000).fill(""));

  const [gumroadLink, setGumroadLink] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [courseName, setCourseName] = useState("");
  const [visibility, setVisibility] = useState("show");
  const [uploading, setUploading] = useState(false);
  const [users, setUsers] = useState([]);
  const [showUsers, setShowUsers] = useState(false);
  // Courses (adminContent) management state
  const [courses, setCourses] = useState([]);
  const [showCourses, setShowCourses] = useState(false);
  const [coursesUnsub, setCoursesUnsub] = useState(null);
  // Removed modal edit state – using dedicated edit page now
  const [deletingId, setDeletingId] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [sectionControl, setSectionControl] = useState([10]);
  const [mounted, setMounted] = useState(false); // Add mounted state
  const router = useRouter();

  // Editing now handled in /admin/edit/[id]

  // ---------------- Effect: Auth & Initial Mount ----------------
  useEffect(() => {
    setMounted(true); // for animated background
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u || !ADMIN_EMAILS.includes(u.email)) {
        router.replace("/login");
        return;
      }
      setUser(u);
      setIsLoading(false);
    });
    return () => unsub();
  }, [router]);

  // ---------------- Fetch Users (real-time) ----------------
  const fetchUsers = () => {
    if (showUsers) { // toggle off
      setShowUsers(false);
      return;
    }
    try {
      const qUsers = query(collection(db, "users"), orderBy("createdAt", "desc"));
      const unsubUsers = onSnapshot(qUsers, (snap) => {
        const arr = [];
        snap.forEach((d) => arr.push({ id: d.id, ...d.data() }));
        setUsers(arr);
      });
      setShowUsers(true);
      // Track online users collection separately
      const onlineQ = collection(db, "onlineUsers");
      const unsubOnline = onSnapshot(onlineQ, (snap) => {
        const setO = new Set();
        snap.forEach((d) => setO.add(d.id));
        setOnlineUsers(setO);
      });
      // store in ref if needed; for now rely on component unmount cleanup
      return () => { unsubUsers(); unsubOnline(); };
    } catch (e) {
      console.error("Error fetching users", e);
      alert("Failed to fetch users");
    }
  };

  // ---------------- Field Handlers ----------------
  const handleFieldChange = (index, value) => {
    setFields((prev) => {
      const copy = [...prev];
      copy[index] = value;
      return copy;
    });
  };

  // ---------------- Section Control Handlers ----------------
  const addSection = () => {
    setSectionControl((prev) => [...prev, 1]);
  };
  const removeSection = (idx) => {
    setSectionControl((prev) => prev.filter((_, i) => i !== idx));
  };
  const handleSectionControlChange = (idx, val) => {
    const num = parseInt(val, 10) || 1;
    setSectionControl((prev) => prev.map((c, i) => (i === idx ? num : c)));
  };

  // ---------------- Delete Course ----------------
  const deleteCourse = async (id) => {
    if (!confirm("Are you sure you want to delete this course?")) return;
    try {
      setDeletingId(id);
      await deleteDoc(doc(db, "adminContent", id));
    } catch (e) {
      console.error("Delete failed", e);
      alert("Failed to delete course");
    } finally {
      setDeletingId(null);
    }
  };

  // ---------------- Submit New Course ----------------
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!courseName.trim()) {
      alert("Please provide a course name");
      return;
    }
    try {
      setUploading(true);
      // Trim trailing empty fields to reduce doc size
      let trimmedFields = [...fields];
      while (trimmedFields.length && !trimmedFields[trimmedFields.length - 1]) {
        trimmedFields.pop();
      }
      const payload = {
        courseName: courseName.trim(),
        gumroadLink: gumroadLink.trim() || "",
        imageUrl: imageUrl.trim() || "",
        visibility,
        fields: trimmedFields,
        sectionControl,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: user?.email || null,
      };
      await addDoc(collection(db, "adminContent"), payload);
      // Reset form
      setCourseName("");
      setGumroadLink("");
      setImageUrl("");
      setFields(Array(2000).fill(""));
      setSectionControl([10]);
      setVisibility("show");
      alert("Course created successfully");
    } catch (e) {
      console.error("Upload failed", e);
      alert("Failed to upload content");
    } finally {
      setUploading(false);
    }
  };

  // Fetch courses (adminContent) with real-time updates
  const fetchCourses = async () => {
    try {
      if (coursesUnsub) {
        coursesUnsub();
      }
      const coursesQuery = query(
        collection(db, "adminContent"),
        orderBy("createdAt", "desc")
      );
      const unsubscribe = onSnapshot(coursesQuery, (querySnapshot) => {
        const list = [];
        querySnapshot.forEach((d) => {
          list.push({ id: d.id, ...d.data() });
        });
        setCourses(list);
      });
      setCoursesUnsub(() => unsubscribe);
      setShowCourses(true);
    } catch (e) {
      console.error("Error fetching courses:", e);
      alert("Error fetching courses. Please try again.");
    }
  };

  const hideCourses = () => {
    if (coursesUnsub) coursesUnsub();
    setShowCourses(false);
  };

  // (Old inline edit modal code removed; editing handled on dedicated page)

  const redirectToUserPage = () => {
    router.push("/user?adminPreview=1");
  };

  // Function to calculate time spent
  const calculateTimeSpent = (userData) => {
    if (!userData.lastActive || !userData.createdAt) return "N/A";
    
    const lastActive = userData.lastActive.seconds 
      ? new Date(userData.lastActive.seconds * 1000)
      : new Date(userData.lastActive);
    
    const createdAt = userData.createdAt.seconds 
      ? new Date(userData.createdAt.seconds * 1000)
      : new Date(userData.createdAt);
    
    const totalTime = Math.floor((lastActive - createdAt) / 1000);
    
    if (totalTime < 60) return `${totalTime} seconds`;
    if (totalTime < 3600) return `${Math.floor(totalTime / 60)} minutes`;
    if (totalTime < 86400) return `${Math.floor(totalTime / 3600)} hours`;
    return `${Math.floor(totalTime / 86400)} days`;
  };

  // Function to get current page/link (simplified)
  const getCurrentPage = (userData) => {
    return userData.lastPageVisited || "Home";
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
      {/* Animated background elements - Only render on client side */}
      {mounted && (
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
      )}
      
      {/* Content with animation */}
      <div className="relative z-10 w-full max-w-7xl px-4 py-8 transform transition-all duration-700 animate-fadeIn">
        <div className="mb-8 text-center">
          <div className="inline-block p-4 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 mb-6 transform transition-transform duration-500 hover:scale-110">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 0 1114 0H3z" clipRule="evenodd" />
            </svg>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-500">
            Admin Dashboard, {user?.email?.split('@')[0]}!
          </h1>
          <p className="text-xl text-gray-300">Enter up to 2000 optional text fields or links below</p>
        </div>
        
        {/* Navigation Buttons */}
        <div className="flex justify-center gap-4 mb-8 flex-wrap">
          <button
            onClick={redirectToUserPage}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-800 text-white font-bold rounded-full transform transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-blue-500/30 flex items-center justify-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
            </svg>
            View User Page
          </button>
          
          <button
            onClick={fetchUsers}
            className="px-6 py-3 bg-gradient-to-r from-green-600 to-green-800 text-white font-bold rounded-full transform transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-green-500/30 flex items-center justify-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8  0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
            </svg>
            View Users ({users.length})
          </button>

          <button
            onClick={fetchCourses}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-fuchsia-700 text-white font-bold rounded-full transform transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-fuchsia-500/30 flex items-center justify-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path d="M4 3a2 2 0 00-2 2v9.5A2.5 2.5 0 004.5 17H15a3 3 0 003-3V5a2 2 0 00-2-2H4zm2 3h8a1 1 0 010 2H6a1 1 0 010-2zm0 4h5a1 1 0 010 2H6a1 1 0 010-2z" />
            </svg>
            Manage Courses ({courses.length})
          </button>
          {showCourses && (
            <button
              onClick={hideCourses}
              className="px-6 py-3 bg-gray-700 text-white font-bold rounded-full transform transition-all duration-300 hover:scale-105 hover:shadow-lg flex items-center justify-center"
            >
              Hide Courses
            </button>
          )}
        </div>
        
        {/* Users Table */}
        {showUsers && (
          <div className="bg-gray-900 bg-opacity-70 backdrop-blur-lg rounded-2xl p-8 border border-gray-800 shadow-2xl mb-10">
            <h2 className="text-2xl font-bold mb-6 text-green-400 text-center">Registered Users</h2>
            <p className="text-gray-400 text-center mb-6">Total Users: {users.length} | Online: {Array.from(onlineUsers).length}</p>
            
            <div className="overflow-x-auto">
              <table className="min-w-full bg-gray-800 rounded-lg">
                <thead>
                  <tr className="bg-gray-700">
                    <th className="py-3 px-4 text-left">#</th>
                    <th className="py-3 px-4 text-left">Email</th>
                    <th className="py-3 px-4 text-left">Name</th>
                    <th className="py-3 px-4 text-left">Joined Date</th>
                    <th className="py-3 px-4 text-left">Status</th>
                    <th className="py-3 px-4 text-left">Current Page</th>
                    <th className="py-3 px-4 text-left">Time Spent</th>
                    <th className="py-3 px-4 text-left">Location</th>
                    <th className="py-3 px-4 text-left">Provider</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((userData, index) => (
                    <tr key={userData.id} className="border-b border-gray-700 hover:bg-gray-750">
                      <td className="py-3 px-4">{index + 1}</td>
                      <td className="py-3 px-4">{userData.email}</td>
                      <td className="py-3 px-4">{userData.name || 'N/A'}</td>
                      <td className="py-3 px-4">
                        {userData.createdAt ? new Date(userData.createdAt.seconds * 1000).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          onlineUsers.has(userData.id) 
                            ? "bg-green-100 text-green-800" 
                            : "bg-red-100 text-red-800"
                        }`}>
                          {onlineUsers.has(userData.id) ? "Online" : "Offline"}
                        </span>
                      </td>
                      <td className="py-3 px-4">{getCurrentPage(userData)}</td>
                      <td className="py-3 px-4">{calculateTimeSpent(userData)}</td>
                      <td className="py-3 px-4">
                        {userData.location || userData.country || 
                         (userData.ipLocation ? JSON.stringify(userData.ipLocation) : 'N/A')}
                      </td>
                      <td className="py-3 px-4">{userData.provider || 'Google'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="mt-6 text-center">
              <button
                onClick={() => setShowUsers(false)}
                className="px-6 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Hide Users
              </button>
            </div>
          </div>
        )}

        {/* Courses Table */}
        {showCourses && (
          <div className="bg-gray-900 bg-opacity-70 backdrop-blur-lg rounded-2xl p-8 border border-gray-800 shadow-2xl mb-10">
            <h2 className="text-2xl font-bold mb-6 text-fuchsia-400 text-center">Courses</h2>
            <p className="text-gray-400 text-center mb-6">Total Courses: {courses.length}</p>
            <div className="overflow-x-auto">
              <table className="min-w-full bg-gray-800 rounded-lg">
                <thead>
                  <tr className="bg-gray-700">
                    <th className="py-3 px-4 text-left">#</th>
                    <th className="py-3 px-4 text-left">Course Name</th>
                    <th className="py-3 px-4 text-left">Visibility</th>
                    <th className="py-3 px-4 text-left">Created</th>
                    <th className="py-3 px-4 text-left">Updated</th>
                    <th className="py-3 px-4 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {courses.map((c, idx) => {
                    const created = c.createdAt?.seconds ? new Date(c.createdAt.seconds * 1000) : (c.createdAt instanceof Date ? c.createdAt : null);
                    const updated = c.updatedAt?.seconds ? new Date(c.updatedAt.seconds * 1000) : (c.updatedAt instanceof Date ? c.updatedAt : null);
                    return (
                      <tr key={c.id} className="border-b border-gray-700 hover:bg-gray-750">
                        <td className="py-3 px-4">{idx + 1}</td>
                        <td className="py-3 px-4 max-w-xs truncate" title={c.courseName}>{c.courseName || '—'}</td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${c.visibility === 'show' ? 'bg-green-100 text-green-800' : 'bg-gray-300 text-gray-800'}`}>{c.visibility || 'show'}</span>
                        </td>
                        <td className="py-3 px-4">{created ? created.toLocaleDateString() : '—'}</td>
                        <td className="py-3 px-4">{updated ? updated.toLocaleDateString() : '—'}</td>
                        <td className="py-3 px-4 flex items-center gap-2">
                          <button
                            onClick={() => router.push(`/admin/edit/${c.id}`)}
                            className="px-3 py-1 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded"
                          >Edit</button>
                          <button
                            disabled={deletingId === c.id}
                            onClick={() => deleteCourse(c.id)}
                            className={`px-3 py-1 text-xs rounded text-white ${deletingId === c.id ? 'bg-red-800 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'}`}
                          >{deletingId === c.id ? 'Deleting...' : 'Delete'}</button>
                        </td>
                      </tr>
                    );
                  })}
                  {courses.length === 0 && (
                    <tr>
                      <td colSpan="6" className="py-6 text-center text-gray-400">No courses found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
        
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
            
            {/* Gumroad Link Field */}
            <div className="space-y-2">
              <label className="block text-lg font-medium text-gray-300">
                Gumroad Link
              </label>
              <input
                type="text"
                value={gumroadLink}
                onChange={(e) => setGumroadLink(e.target.value)}
                placeholder="Enter your Gumroad link"
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
            
            {/* Section Control Field */}
            <div className="space-y-4 p-4 bg-gray-800 rounded-lg">
              <div className="flex justify-between items-center">
                <label className="block text-lg font-medium text-gray-300">
                  Section Control
                </label>
                <button
                  type="button"
                  onClick={addSection}
                  className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Add Section
                </button>
              </div>
              <p className="text-gray-400 text-sm">
                Define how many items should be in each section. For example: [2,5,10] means Section 1 has 2 items, Section 2 has 5 items, and Section 3 has 10 items.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                {sectionControl.map((count, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <label className="block text-sm font-medium text-gray-300 whitespace-nowrap">
                      Section {index + 1}:
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={count}
                      onChange={(e) => handleSectionControlChange(index, e.target.value)}
                      className="w-full bg-gray-700 text-white rounded-lg p-2 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    {sectionControl.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeSection(index)}
                        className="px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>
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
            
            {/* 2000 Input Fields */}
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
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c 0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Uploading...
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1  01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
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
      {/* Edit Course Modal */}
      {/* Edit modal removed; editing handled on dedicated page */}
      
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