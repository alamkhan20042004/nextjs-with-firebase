"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

function ProgressStep2Content() {
  const searchParams = useSearchParams();
  const data = searchParams.get("data");

  return (
    <div className="text-white p-4">
      <h1>Progress Step 2</h1>
      <p>Data: {data}</p>
    </div>
  );
}

export default function ProgressStep2Page() {
  return (
    <Suspense fallback={<div className="text-white">Loading step 2...</div>}>
      <ProgressStep2Content />
    </Suspense>
  );
}










// // app/page.js
// export default function Home() {
//   return (
//     <div className="flex h-screen items-center justify-center">
//       <h1 className="text-4xl font-bold text-blue-600">Hello World</h1>
//     </div>
//   );
// }
