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

import { onMessage } from "firebase/messaging";
import { messaging } from "./Firebase/firebase";

// ChatbotWrapper component handles chat widget and Firebase foreground messages
function ChatbotWrapper() {
  const location = useLocation();
  const context = useContext(UserContext);
  const user = context?.user || JSON.parse(localStorage.getItem("user"));
  const token = context?.token || localStorage.getItem("token");

  useEffect(() => {
    if (location.pathname !== "/patient") return;

    const unsubscribe = onMessage(messaging, (payload) => {
      console.log("Foreground message received:", payload);
      if (Notification.permission === "granted" && payload.notification) {
        new Notification(payload.notification.title, {
          body: payload.notification.body,
        });
      }
    });

    return () => unsubscribe();
  }, [location.pathname]);

  if (location.pathname !== "/patient") return null;

  const userId = user?._id;
  const authToken = token;

  if (!userId || !authToken) {
    return <p className="text-center text-red-500 mt-4">Please log in to use the chatbot.</p>;
  }

  return <ChatWidget userId={userId} authToken={authToken} />;
}

function App() {
  useEffect(() => {
    requestPermission();
  }, []);

  return (
    <UserProvider>
      <Router>
        <Header />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          
          <Route path="/patient" element={<Patient />} />
        </Routes>

        {/* ChatWidget only appears on /patient route  */}
        <ChatbotWrapper />
      </Router>
    </UserProvider>
  );
}

export default App;
