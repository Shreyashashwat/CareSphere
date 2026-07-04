import { Worker } from "bullmq";
import mongoose from "mongoose";
import { User } from "../model/user.model.js";
import { Medicine } from "../model/medicine.model.js";
import { sendNotification, sendEmail } from "../firebase/SendNotification.js";

// 1️⃣ Connect MongoDB
await mongoose.connect(process.env.MONGODB_URI);
console.log("[Worker] MongoDB connected ✅");

const buildEmailHTML = ({ title, username, description, 
                          status, deadline, extraMessage }) => {
  // ... your existing function
};

// 2️⃣ Start Worker only after DB is ready
export const worker = new Worker(
  "task-queue",
  async (job) => {
    const { userId, medicineId, title, body, toEmail, extraMessage, description, inviterName } = job.data;

    if (job.name === "sendNotification") {
      const user = userId ? await User.findById(userId) : null;
      const medicine = medicineId ? await Medicine.findById(medicineId) : null;

      if (!user) {
        console.warn(`[Worker] User not found: ${userId}`);
        return;
      }

      if (!medicine) {
        console.warn(`[Worker] Medicine not found: ${medicineId}`);
        return;
      }

      if (!user.fcmToken) {
        console.warn(`[Worker] Missing FCM token for user: ${userId}`);
        return;
      }

      const sent = await sendNotification(user.fcmToken, medicine, user._id);
      if (sent) {
        console.log(`[Worker] Notification sent for medicine ${medicine._id} to user ${user._id}`);
      }
      return;
    }

    if (job.name === "sendEmail" || job.data.sendEmail) {
      const user = userId ? await User.findById(userId) : null;

      if (!toEmail) {
        console.warn(`[Worker] Missing recipient email for job ${job.id}`);
        return;
      }

      const subject = title || "CareSphere Notification";
      const emailBody = extraMessage || description || body || "You have a new CareSphere update.";

      await sendEmail(toEmail, subject, emailBody, {
        username: user?.username,
        inviterName,
      });
      console.log(`[Worker] Email job processed for ${toEmail}`);
      return;
    }

    console.warn(`[Worker] Unhandled job type: ${job.name}`);
  },
  {
    connection: {
      host: process.env.REDIS_HOST || "127.0.0.1",
      port: parseInt(process.env.REDIS_PORT) || 6379,
      family: 4,
    },
    concurrency: 5,
  }
);