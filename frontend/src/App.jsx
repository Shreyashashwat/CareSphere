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


// import { useEffect } from "react";
// import { requestPermission } from "../requestPermission";

// function Messaging() {
//   useEffect(() => {
//     const storedUser = JSON.parse(localStorage.getItem("user"));
//     const userId = storedUser?._id;
//     requestPermission(userId);
//   }, []);

//   return (
//     <div>
//       <h1>CareSphere Notifications 🔔</h1>
//       <p>You'll receive reminders when they are scheduled.</p>
//     </div>
//   );
// }

// export default Messaging;  
// for this tell me hoe to place it in app.jsx  my app .jsx code is   
import React, { useContext, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";

import Home from "./pages/HomePage";
import Patient from "./pages/patient";
import Header from "./components/Header";
import ChatWidget from "./pages/ChatBot";
import About from "./pages/About";
import Contact from "./pages/Contact";

import { UserProvider, UserContext } from "./context/UserContext";
import { requestPermission } from "./Firebase/requestPermission";
import {Messaging} from "./Firebase/Messaging";

import { onMessage } from "firebase/messaging";
import { messaging } from "./Firebase/firebase";

import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import MedicineReminderToast from "./components/MedicineReminderToast";

function ChatbotWrapper() {
  const location = useLocation();
  const { user, token } = useContext(UserContext);

  useEffect(() => {
    if (location.pathname !== "/patient") return;

    const unsubscribe = onMessage(messaging, (payload) => {
      console.log("Foreground FCM message received:", payload);

      // Use data payload from backend (data-only message)
      const { title, body, medicineId } = payload.data || {};

      if (!medicineId) return; // skip invalid messages

      toast.info(
        <MedicineReminderToast title={title || "💊 Medicine Reminder"} body={body || ""} medicineId={medicineId} />,
        { autoClose: false, closeOnClick: false }
      );
    });

    return () => unsubscribe();
  }, [location.pathname]);

  if (location.pathname !== "/patient") return null;

  if (!user || !token) {
    return (
      <p className="text-center text-red-500 mt-4">
        Please log in to use the chatbot.
      </p>
    );
  }

  return <ChatWidget userId={user._id} authToken={token} />;
}

function App() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/firebase-messaging-sw.js")
        .then((reg) => console.log("Service Worker registered:", reg))
        .catch((err) => console.error("SW registration failed:", err));
    }
  }, []);

  return (
    <UserProvider>
      <Router>
        <Header />
        <Messaging />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/patient" element={<Patient />} />
        </Routes>
        <ChatbotWrapper /> {/* Foreground notifications with Snooze */}
        <ToastContainer position="top-right" />
      </Router>
    </UserProvider>
  );
}

export default App;
