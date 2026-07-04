// import cron from "node-cron";
// import admin from "./firebaseAdmin.js";
// import { Reminder } from "../model/reminderstatus.js";
// import { Medicine } from "../model/medicine.model.js";
// import { User } from "../model/user.model.js";


// export const sendEmail = async (email, subject, body) => {
// };

// const handleMissedReminder = async (reminderId) => {
//   const reminder = await Reminder.findById(reminderId);
//   if (!reminder) return;

//   if (reminder.autoAdjusted) {
//     reminder.status = "missed";
//     await reminder.save();
//     return;
//   }

//   const newTime = new Date(reminder.time.getTime() + 5 * 60000);
//   reminder.time = newTime;
//   reminder.status = "pending";
//   reminder.autoAdjusted = true;
//   reminder.userResponseTime = null;
//   await reminder.save();
// };

// export async function sendNotification(token, medicine, userId) {
//   const message = {
//     token,
//     data: {
//       title: "Medicine Reminder",
//       body: `Time to take your medicine: ${medicine.medicineName} (${medicine.dosage})`,
//       medicineId: medicine._id.toString(),
//     },
//   };

//   try {
//     await admin.messaging().send(message);
//     console.log("FCM sent successfully");
//     return true;
//   } catch (error) {
//     console.error("FCM Error:", error.code);

//     if (error.code === "messaging/registration-token-not-registered") {
//       console.log("Removing invalid FCM token for user:", userId);
//       await User.findByIdAndUpdate(userId, {
//         $unset: { fcmToken: 1 },
//       });
//     }

//     return false;
//   }
// }


// let cronJobStarted = false;

// const sendnoti = () => {
//   if (cronJobStarted) {
//     console.log("Notification cron already running, skipping duplicate");
//     return;
//   }

//   cron.schedule("* * * * *", async () => {
//     const now = new Date();

//     try {
//       const dueReminders = await Reminder.find({
//         status: "pending",
//         notified: false,
//         time: { $lte: now },
//       }).select("_id medicineId userId").lean();

//       if (dueReminders.length === 0) {
//       } else {
//         const seen = new Set();
//         const uniqueIds = [];
//         for (const r of dueReminders) {
//           const key = `${r.medicineId}_${r.userId}`;
//           if (!seen.has(key)) {
//             seen.add(key);
//             uniqueIds.push(r._id);
//           }
//         }

//         await Reminder.updateMany(
//           { _id: { $in: uniqueIds } },
//           { $set: { notified: true } }
//         );

//         const allIds = dueReminders.map(r => r._id);
//         const skippedIds = allIds.filter(
//           id => !uniqueIds.some(uid => uid.equals(id))
//         );
//         if (skippedIds.length > 0) {
//           await Reminder.updateMany(
//             { _id: { $in: skippedIds } },
//             { $set: { status: "missed", processedMissed: true, notified: true } }
//           );
//           console.log(`Cleaned ${skippedIds.length} duplicate reminder(s)`);
//         }

//         const reminders = await Reminder.find({ _id: { $in: uniqueIds } })
//           .populate("medicineId userId");

//         for (const reminder of reminders) {
//           const user = reminder.userId;
//           const medicine = reminder.medicineId;

//           if (!user?.fcmToken || !medicine) continue;

//           const sent = await sendNotification(
//             user.fcmToken,
//             medicine,
//             user._id
//           );

//           if (!sent) {
//             await Reminder.findByIdAndUpdate(reminder._id, { $set: { notified: false } });
//             continue;
//           }

//           console.log(`Notified reminder ${reminder._id} (${medicine.medicineName})`);
//         }
//       }

//       const lateReminders = await Reminder.find({
//         status: "pending",
//         processedMissed: { $ne: true },
//         time: { $lt: new Date(now.getTime() - 30 * 60 * 1000) },
//       });

//       for (const reminder of lateReminders) {
//         reminder.processedMissed = true;
//         reminder.status = "missed";

//         const medicine = await Medicine.findById(reminder.medicineId);
//         if (medicine) {
//           medicine.missedCount += 1;
//           await medicine.save();
//         }

//         await reminder.save();
//         console.log(`Marked missed: ${reminder._id}`);
//       }
//     } catch (err) {
//       console.error("Notification cron error:", err);
//     }
//   });

//   cronJobStarted = true;
//   console.log("Minute notification cron scheduled (runs every minute)");
// };

// export { sendnoti };


import cron from "node-cron";
import admin from "./firebaseAdmin.js";
import nodemailer from "nodemailer";
import { Reminder } from "../model/reminderstatus.js";
import { Medicine } from "../model/medicine.model.js";
import { User } from "../model/user.model.js";
import { Queue } from "bullmq"; 

const taskQueue = new Queue("task-queue", {
  connection: {
    host: process.env.REDIS_HOST || "127.0.0.1",
    port: parseInt(process.env.REDIS_PORT) || 6379,
    family: 4
  }
});

export const sendEmail = async (email, subject, body) => {
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || "smtp.gmail.com",
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: process.env.EMAIL_SECURE === "true",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  await transporter.sendMail({
    from: `"CareSphere" <${process.env.EMAIL_USER}>`,
    to: email,
    subject,
    html: `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #0f172a;">${body}</div>`,
  });

  console.log(`✅ Email sent to ${email}`);
  return true;
};

const handleMissedReminder = async (reminderId) => {
  const reminder = await Reminder.findById(reminderId);
  if (!reminder) return;

  if (reminder.autoAdjusted) {
    reminder.status = "missed";
    await reminder.save();
    return;
  }

  const newTime = new Date(reminder.time.getTime() + 5 * 60000);
  reminder.time = newTime;
  reminder.status = "pending";
  reminder.autoAdjusted = true;
  reminder.userResponseTime = null;
  await reminder.save();
};

export async function sendNotification(token, medicine, userId) {
  const message = {
    token,
    data: {
      title: "Medicine Reminder",
      body: `Time to take your medicine: ${medicine.medicineName} (${medicine.dosage})`,
      medicineId: medicine._id.toString(),
    },
  };

  try {
    await admin.messaging().send(message);
    console.log("FCM sent successfully");
    return true;
  } catch (error) {
    console.error("FCM Error:", error.code);

    if (error.code === "messaging/registration-token-not-registered") {
      console.log("Removing invalid FCM token for user:", userId);
      await User.findByIdAndUpdate(userId, {
        $unset: { fcmToken: 1 },
      });
    }
    return false;
  }
}

let cronJobStarted = false;

const sendnoti = () => {
  if (cronJobStarted) {
    console.log("Notification cron already running, skipping duplicate");
    return;
  }

  cron.schedule("* * * * *", async () => {
    const now = new Date();

    try {
      const dueReminders = await Reminder.find({
        status: "pending",
        notified: false,
        time: { $lte: now },
      }).select("_id medicineId userId").lean();

      if (dueReminders.length > 0) {
        const seen = new Set();
        const uniqueIds = [];
        
        for (const r of dueReminders) {
          const key = `${r.medicineId}_${r.userId}`;
          if (!seen.has(key)) {
            seen.add(key);
            uniqueIds.push(r._id);
          }
        }

        await Reminder.updateMany(
          { _id: { $in: uniqueIds } },
          { $set: { notified: true } }
        );

        const remindersToQueue = await Reminder.find({ _id: { $in: uniqueIds } })
          .populate("medicineId userId");

        for (const reminder of remindersToQueue) {
          if (!reminder.userId || !reminder.medicineId) continue;

          await taskQueue.add("sendNotification", {
            userId: reminder.userId._id,
            medicineId: reminder.medicineId._id,
            title: reminder.medicineId.medicineName,
            body: reminder.medicineId.dosage,
            sendEmail: true 
          }, {
            attempts: 3, 
            backoff: 5000
          });

          console.log(`Queued notification job for reminder: ${reminder._id}`);
        }

        const allIds = dueReminders.map(r => r._id);
        const skippedIds = allIds.filter(id => !uniqueIds.some(uid => uid.equals(id)));
        
        if (skippedIds.length > 0) {
          await Reminder.updateMany(
            { _id: { $in: skippedIds } },
            { $set: { status: "missed", processedMissed: true, notified: true } }
          );
        }
      }

      const lateReminders = await Reminder.find({
        status: "pending",
        processedMissed: { $ne: true },
        time: { $lt: new Date(now.getTime() - 30 * 60 * 1000) },
      });

      for (const reminder of lateReminders) {
        reminder.processedMissed = true;
        reminder.status = "missed";
        const medicine = await Medicine.findById(reminder.medicineId);
        if (medicine) {
          medicine.missedCount += 1;
          await medicine.save();
        }
        await reminder.save();
      }
    } catch (err) {
      console.error("Notification cron error:", err);
    }
  });

  cronJobStarted = true;
  console.log("Minute notification cron scheduled -> Jobs will be sent to Worker");
};

export { sendnoti };