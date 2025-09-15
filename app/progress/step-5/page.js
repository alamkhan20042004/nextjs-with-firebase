// ProgressPage5.js (Step 5)
"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState, Suspense } from "react";

function ProgressPage5Content() {
  const router = useRouter();
  const [url, setUrl] = useState("");

  useEffect(() => {
    const tempData = localStorage.getItem('tempDownloadUrl');
    if (tempData) {
      try {
        const data = JSON.parse(tempData);
        // Check if expired (30 minutes)
        const now = Date.now();
        if (now - data.timestamp > 30 * 60 * 1000) {
          localStorage.removeItem('tempDownloadUrl');
          router.push('/user');
          return;
        }
        setUrl(data.url);
      } catch (error) {
        console.error("Error parsing URL data:", error);
        router.push('/user');
      }
    } else {
      router.push('/user');
    }
  }, [router]);

  const handleDownload = () => {
    if (url) {
      // Remove the temp data
      localStorage.removeItem('tempDownloadUrl');
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-gray-800/30 backdrop-blur-lg rounded-2xl border border-gray-700 p-8 shadow-2xl">
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-emerald-500">
            Content Ready!
          </h1>
          <p className="text-gray-400">Your content is ready for download (Step 5 of 5)</p>
        </div>

        <div className="mb-12">
          <div className="flex items-center justify-between mb-8">
            {[1, 2, 3, 4, 5].map((step, index) => (
              <div key={index} className="flex flex-col items-center relative">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center z-10 transition-all duration-500 ${
                    step <= 5
                      ? "bg-gradient-to-r from-green-500 to-emerald-500 shadow-lg shadow-green-500/30"
                      : "bg-gray-700"
                  }`}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6 text-white"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="mt-3 text-center">
                  <div
                    className={`font-medium ${
                      step <= 5 ? "text-white" : "text-gray-400"
                    }`}
                  >
                    Step {step}
                  </div>
                </div>
                {index < 4 && (
                  <div className="absolute top-6 left-12 w-[calc(100%+24px)] h-1 bg-gray-700 -z-10">
                    <div
                      className={`h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-700 ${
                        step < 5 ? "w-full" : "w-0"
                      }`}
                    ></div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="text-center mb-10">
          <h3 className="text-xl font-semibold mb-2">Access Granted!</h3>
          <p className="text-gray-400 mb-6">
            Click the button below to download your content
          </p>
        </div>

        <div className="flex justify-center">
          <button
            onClick={handleDownload}
            className="px-8 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold rounded-full transform transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-green-500/30 flex items-center"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 mr-2"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
            Download Now
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ProgressPage5() {
  return (
    <Suspense fallback={<div className="text-white p-10">Loading...</div>}>
      <ProgressPage5Content />
    </Suspense>
  );
}