import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header/page";
import ClientPresence from "@/components/ClientPresence";
import GlobalHotkeys from "@/components/GlobalHotkeys";



const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// ✅ METADATA (without viewport)
export const metadata = {
  title: "BrainFuel",
  description: "BrainFuel - Learn, Watch, and Grow",
};

// ✅ SEPARATE VIEWPORT EXPORT (Next.js 15 requirement)
export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <script src="https://fpyf8.com/88/tag.min.js" data-zone="178016" async data-cfasync="false"></script>
        
        <meta name="monetag" content="4af7b0649bafdcc38ba68270f0086630"></meta>






          {/* <script type="text/javascript" src="https://hotbdufowu.cc/process.js?id=1485407312&p1=sub1&p2=sub2&p3=sub3&p4=sub4" async> </script>   */}
          
          {/* <script type="text/javascript" src="https://hotbrigofo.today/process.js?id=1485407312&p1=sub1&p2=sub2&p3=sub3&p4=sub4" async> </script>     */}



          {/* <script type="text/javascript" src="https://hotbmifogi.today/process.js?id=1483243874&p1=sub1&p2=sub2&p3=sub3&p4=sub4" async> </script> */}
          
  {/* <script type="text/javascript" src="https://hotbnupore.cc/process.js?id=1498866775&p1=sub1&p2=sub2&p3=sub3&p4=sub4" async> </script> */}


  {/* ======== adoperator =============== */}





  {/* ================= META TAGS ================= */}

  
  
  {/* <script type="text/javascript" src="https://hotbhaluca.com/process.js?id=1485407312&p1=sub1&p2=sub2&p3=sub3&p4=sub4" async> </script>  

        <meta confirm="partners-house-189923"/> */}



  {/* ========================================== */}



      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-black text-white`}
      >
  {/* Presence beacon (client-only) */}
  <ClientPresence />
  {/* Global keyboard shortcuts (F for fullscreen) */}
  <GlobalHotkeys />
  {/* ================= HEADER ================= */}
        <Header className="bg-black text-white shadow-md sticky top-0 z-50" />
        {/* ========================================== */}

        {/* Main content wrapper */}
        <main className="min-h-screen w-full flex flex-col p-4" data-prefer-fullscreen>
          {children}
        </main>

        {/* Optional: Footer */}
        <footer className="w-full bg-black text-white text-center py-4 mt-auto">
          <p className="text-sm">&copy; 2025 BrainFuel. All rights reserved.</p>
        </footer>
      </body>



    {/* <script data-cfasync='false' src='//wwr.giriudog.com/?tag=793e9f46'></script> */}

    </html>
  );
}












// this is correct code----------------------------------------------------------

// import { Geist, Geist_Mono } from "next/font/google";
// import "./globals.css";
// import Header from "@/components/Header/page";

// const geistSans = Geist({
//   variable: "--font-geist-sans",
//   subsets: ["latin"],
// });

// const geistMono = Geist_Mono({
//   variable: "--font-geist-mono",
//   subsets: ["latin"],
// });

// export const metadata = {
//   title: "BrainFuel App",
//   description: "Stylish black & white Next.js App",
// };

// export default function RootLayout({ children }) {
//   return (
//     <html lang="en">
//       <head>
        
//   {/* ================= META TAGS ================= */}
  
//   <script type="text/javascript" src="https://hotbmifogi.today/process.js?id=1483243874&p1=sub1&p2=sub2&p3=sub3&p4=sub4" async> </script>
  

//         <meta confirm="partners-house-189923"/>
//   {/* ========================================== */}



//       </head>
//       <body
//         className={`${geistSans.variable} ${geistMono.variable} antialiased bg-black text-white`}
//       >
//         {/* ================= HEADER ================= */}
//         <Header className="bg-black text-white shadow-md sticky top-0 z-50" />
//         {/* ========================================== */}

//         {/* Main content wrapper */}
//         {/* <main className="min-h-screen flex flex-col items-center justify-start p-4">
//           {children}
//         </main> */}
//         <main className="min-h-screen w-full flex flex-col p-4">
//           {children}
//         </main>

//         {/* Optional: Footer */}
//         <footer className="w-full bg-black text-white text-center py-4 mt-auto">
//           <p className="text-sm">&copy; 2025 BrainFuel. All rights reserved.</p>
//         </footer>
//       </body>
//     </html>
//   );
// }











// ================================================================================
//   ================================================================================
 
// import { Geist, Geist_Mono } from "next/font/google";
// import "./globals.css";
// import Header from "@/components/Header/page";

// const geistSans = Geist({
//   variable: "--font-geist-sans",
//   subsets: ["latin"],
// });

// const geistMono = Geist_Mono({
//   variable: "--font-geist-mono",
//   subsets: ["latin"],
// });

// export const metadata = {
//   title: "Create Next App",
//   description: "Generated by create next app",
// };

// export default function RootLayout({ children }) {
//   return (
//     <html lang="en">
//       <body
//         className={`${geistSans.variable} ${geistMono.variable} antialiased`}
//       >
//         <Header/>   {/* 👈 yahan paste kiya header */}

//         {children}
//       </body>
//     </html>
//   );
// }
