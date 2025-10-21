import cron from "node-cron";
import admin from "./firebaseAdmin.js";
import { Medicine } from "../model/medicine.model.js";

/**
 * Send FCM notification
 */
async function sendNotification(token, title, body) {
  const message = { notification: { title, body }, token };
  try {
    await admin.messaging().send(message);
    console.log(`✅ Notification sent to token: ${token}`);
  } catch (err) {
    console.error("❌ Error sending notification:", err);
  }
}

/**
 * Cron job for medicine reminders
 */
const sendnoti = () => {
  // Run every minute
  cron.schedule("* * * * *", async () => {
    console.log("🕒 Cron triggered:", new Date().toLocaleString());

    try {
      const now = new Date();
      const medicines = await Medicine.find().populate("userId");

      for (const med of medicines) {
        const user = med.userId;
         console.log(`Medicine: ${med.medicineName}, Times:`, med.time);
        if (!user || !user.fcmToken) {
    console.log("Skipping, user missing or no fcmToken", user);
    continue;
}
        console.log("yes")
 
        for (const t of med.time) {
           console.log(`Raw time string: "${t}"`);
          const [hours, minutes] = t.split(":").map(Number);
          const medTime = new Date(now);
          medTime.setHours(hours, minutes, 0, 0);
        
          const diff = Math.abs(medTime.getTime() - now.getTime());
            console.log(
  `Now: ${now.toTimeString()}, MedTime: ${medTime.toTimeString()}, Diff(ms): ${diff}`
);

          // Only send if within 2 minutes window
          if (diff < 120000) {
            // Check if already notified in last 24 hours
            if (med.lastNotified) {
              const last = new Date(med.lastNotified);
              if (
                last.toDateString() === now.toDateString() &&
                Math.abs(last.getTime() - medTime.getTime()) < 60000
              ) {
                console.log(
                  `⚠️ Already notified for ${med.medicineName} at ${t}`
                );
                continue;
              }
            }

            console.log(
              `💊 Sending notification for ${med.medicineName} to user ${user._id}`
            );

            await sendNotification(
              user.fcmToken,
              "💊 Medicine Reminder",
              `Time to take your medicine: ${med.medicineName} (${med.dosage})`
            );

            // Save lastNotified time
            med.lastNotified = now;
            await med.save();
          }
        }
      }
    } catch (err) {
      console.error("❌ Error in cron job:", err);
    }
  });

  console.log("⏰ Cron job scheduled: checking medicine reminders every minute.");
};

export { sendnoti };
