import cron from "node-cron";
import admin from "./firebaseAdmin.js";
import { Medicine } from "../model/medicine.model.js";
import { Reminder } from "../model/reminderstatus.js";
import { addMedicineToGoogleCalendar } from "../utils/googleCalendar.js";
import { User } from "../model/user.model.js";

/** 🔔 Send FCM data-only notification */
async function sendNotification(token, medicine) {
  const message = {
    data: {
      title: `💊 Medicine Reminder`,
      body: `Time to take your medicine: ${medicine.medicineName} (${medicine.dosage})`,
      medicineId: medicine._id.toString(),
    },
    token,
  };

  try {
    await admin.messaging().send(message);
    console.log(`✅ Notification sent to token: ${token}`);
  } catch (err) {
    console.error("❌ Error sending notification:", err);
  }
}

/** 🕒 Cron Job: checks every minute for reminders */
const sendnoti = () => {
  cron.schedule("* * * * *", async () => {
    console.log("⏰ Cron triggered:", new Date().toLocaleString());

    try {
      const now = new Date();
      const medicines = await Medicine.find().populate("userId");

      for (const med of medicines) {
        const user = med.userId;
        if (!user || !user.fcmToken) continue;

        for (const t of med.time) {
          const [hours, minutes] = t.split(":").map(Number);
          const medTime = new Date(now);
          medTime.setHours(hours, minutes, 0, 0);

          const diff = medTime.getTime() - now.getTime();

          // ⏭️ Skip if snoozed
          if (med.snoozedUntil && med.snoozedUntil > now) continue;

          // 🔔 Send reminder within 2 minutes window
          if (Math.abs(diff) < 120000) {
            const alreadySentToday =
              med.lastNotified &&
              med.lastNotified.toDateString() === now.toDateString() &&
              Math.abs(med.lastNotified.getTime() - medTime.getTime()) < 60000;

            if (alreadySentToday) continue;

            console.log(`💊 Sending notification for ${med.medicineName}`);

            // Send FCM
            await sendNotification(user.fcmToken, med);

            // 🔹 Create a Reminder entry
            const reminder = await Reminder.create({
              medicineId: med._id,
              userId: user._id,
              time: medTime,
              status: "pending",
            });

            // 🔹 Add to medicine history
            med.statusHistory.push(reminder._id);
            med.lastNotified = now;

            // 🔹 Optional: Sync to Google Calendar
            if (user.googleAuth) {
              try {
                const eventId = await addMedicineToGoogleCalendar(
                  user.googleAuth,
                  med,
                  medTime
                );
                reminder.eventId = eventId;
                await reminder.save();
              } catch (err) {
                console.error("⚠️ Google Calendar sync failed:", err.message);
              }
            }

            await med.save();
          }

          // ⚠️ Mark as missed if > 30 min late and still pending
          const missedTime = new Date(medTime.getTime() + 30 * 60 * 1000);
          if (now > missedTime) {
            const pendingReminder = await Reminder.findOne({
              medicineId: med._id,
              userId: user._id,
              time: medTime,
              status: "pending",
            });

            if (pendingReminder) {
              pendingReminder.status = "missed";
              pendingReminder.userResponseTime = now;
              await pendingReminder.save();

              med.missedCount += 1;
              await med.save();

              console.log(
                `⚠️ Marked as missed: ${med.medicineName} (${t}) for user ${user._id}`
              );
            }
          }
        }
      }
    } catch (err) {
      console.error("❌ Error in cron job:", err);
    }
  });

  console.log("🕐 Reminder cron scheduled (every minute).");
};

export { sendnoti };
