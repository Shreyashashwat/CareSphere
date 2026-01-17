// import React, { useContext, useEffect } from "react";
// import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";

// import Home from "./pages/HomePage";
// import Patient from "./pages/patient";
// import Header from "./components/Header";
// import ChatWidget from "./pages/ChatBot";
// import About from "./pages/About";
// import Contact from "./pages/Contact";

// import { UserProvider, UserContext } from "./context/UserContext";
// import { requestPermission } from "./Firebase/requestPermission";

// import { onMessage } from "firebase/messaging";
// import { messaging } from "./Firebase/firebase";

// function ChatbotWrapper() {
//   const location = useLocation();
//   const { user, token } = useContext(UserContext);

//   useEffect(() => {
//     if (location.pathname !== "/patient") return;

//     const unsubscribe = onMessage(messaging, (payload) => {
//       console.log("Foreground message received:", payload);
//       if (Notification.permission === "granted" && payload.notification) {
//         new Notification(payload.notification.title, {
//           body: payload.notification.body,
//         });
//       }
//     });

//     return () => unsubscribe();
//   }, [location.pathname]);

//   if (location.pathname !== "/patient") return null;

//   if (!user || !token) {
//     return (
//       <p className="text-center text-red-500 mt-4">
//         Please log in to use the chatbot.
//       </p>
//     );
//   }

//   return <ChatWidget userId={user._id} authToken={token} />;
// }

// function App() {
//   useEffect(() => {
//     requestPermission();
//   }, []);

//   return (
//     <UserProvider>
//       <Router>
//         <Header />
//         <Routes>
//           <Route path="/" element={<Home />} />
//           <Route path="/about" element={<About />} />
//           <Route path="/contact" element={<Contact />} />
//           <Route path="/patient" element={<Patient />} />
//         </Routes>

//         {/* ChatWidget only appears on /patient route */}
//         <ChatbotWrapper />
//       </Router>
//     </UserProvider>
//   );
// }

// export default App;



import React, { useContext, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from "react-router-dom";

// Page Imports
import Home from "./pages/HomePage";
import Patient from "./pages/patient";
import Doctor from "./pages/doctor"; // File: C:\Users\HP\Desktop\HTML Ishita\CareSphere\frontend\src\pages\doctor.jsx
import About from "./pages/About";
import Contact from "./pages/Contact";

// Component Imports
import Header from "./components/Header";
import ChatWidget from "./pages/ChatBot";

// Context & Firebase
import { UserProvider, UserContext } from "./context/UserContext";
import { requestPermission } from "./Firebase/requestPermission";
import { onMessage } from "firebase/messaging";
import { messaging } from "./Firebase/firebase";

/**
 * ChatbotWrapper handles logic for displaying the AI Assistant.
 * It strictly ensures the widget only appears on the /patient route.
 */
function ChatbotWrapper() {
  const location = useLocation();
  const { user, token } = useContext(UserContext);

  useEffect(() => {
    // Only set up foreground notification listeners if the user is on the patient dashboard
    if (location.pathname !== "/patient") return;

    const unsubscribe = onMessage(messaging, (payload) => {
      console.log("Foreground message received:", payload);
      if (Notification.permission === "granted" && payload.notification) {
        new Notification(payload.notification.title, {
          body: payload.notification.body,
          icon: "/logo192.png", // Optional: path to your app icon
        });
      }
    });

    return () => unsubscribe();
  }, [location.pathname]);

  // Logic: Only show ChatWidget on the /patient route
  if (location.pathname !== "/patient") return null;

  // If user is on /patient but not logged in, show a friendly prompt
  if (!user || !token) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <p className="text-xs text-red-500 bg-white border border-red-200 px-3 py-2 rounded-lg shadow-lg">
          Log in to chat with AI Assistant 🤖
        </p>
      </div>
    );
  }

  return <ChatWidget userId={user._id} authToken={token} />;
}

function App() {
  // Request Firebase Cloud Messaging permission on app mount
  useEffect(() => {
    requestPermission();
  }, []);

  return (
    <UserProvider>
      <Router>
        {/* Navigation Header appears on all pages */}
        <Header />

        <div className="app-content">
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />

            {/* Patient Dashboard */}
            <Route path="/patient" element={<Patient />} />

            {/* Doctor Dashboard */}
            <Route path="/doctor" element={<Doctor />} />

            {/* Catch-all route: Redirect unknown paths to Home */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>

        {/* ChatbotWrapper is placed outside Routes so it can persist 
            across navigation but uses internal logic to only render 
            when the URL is /patient.
        */}
        <ChatbotWrapper />
      </Router>
    </UserProvider>
  );
}

export default App;
