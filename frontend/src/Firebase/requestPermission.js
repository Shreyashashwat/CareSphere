import { getToken } from "firebase/messaging";
import { messaging } from "./firebase";
import axios from "axios";

export const requestPermission = async (userId) => {
  console.log("🔔 Requesting notification permission...");

  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.warn("❌ Notification permission denied");
      return;
    }
    console.log("✅ Notification permission granted");

    // Explicitly register Firebase SW (always use our own, not vite's)
    let swRegistration;
    const existingRegs = await navigator.serviceWorker.getRegistrations();
    swRegistration = existingRegs.find(r =>
      r.active?.scriptURL?.includes("firebase-messaging-sw.js") ||
      r.installing?.scriptURL?.includes("firebase-messaging-sw.js") ||
      r.waiting?.scriptURL?.includes("firebase-messaging-sw.js")
    );

    if (!swRegistration) {
      console.log("🔄 Registering firebase-messaging-sw.js...");
      swRegistration = await navigator.serviceWorker.register(
        "/firebase-messaging-sw.js",
        { scope: "/" }
      );
    }

    // Wait for it to become active
    if (swRegistration.installing || swRegistration.waiting) {
      await new Promise((resolve) => {
        const sw = swRegistration.installing || swRegistration.waiting;
        sw.addEventListener("statechange", function handler(e) {
          if (e.target.state === "activated") {
            sw.removeEventListener("statechange", handler);
            resolve();
          }
        });
      });
    }

    console.log("✅ Firebase SW active:", swRegistration.active?.scriptURL);

    const token = await getToken(messaging, {
      vapidKey: "BG8L7pkVGe7RpMdpDSuJd4IR-_QDh0D6Xllb9UIRgcpoeUBXhqhyRL-V2mkWLzDKMcUT24eha-BujuJm7IA4Ia0",
      serviceWorkerRegistration: swRegistration,
    });

    if (!token) {
      console.error("❌ Failed to get FCM token");
      return;
    }

    console.log("✅ FCM Token obtained:", token.substring(0, 20) + "...");

    if (!userId) {
      console.warn("⚠️ No userId — token not saved to backend");
      return;
    }

    const response = await axios.post(
      "http://localhost:8000/api/v1/save-token",
      { userId, token }
    );

    if (response.data.success) {
      console.log("✅ FCM token saved to backend for user:", userId);
    } else {
      console.warn("❌ Failed to save token:", response.data.message);
    }
  } catch (err) {
    console.error("❌ Error in requestPermission:", err);
  }
};
