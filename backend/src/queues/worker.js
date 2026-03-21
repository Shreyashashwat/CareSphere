// import { Worker } from "bullmq";
// // import User from "../models/User.js";
// import { sendNotification, sendEmail } from "../firebase/SendNotification.js";
// // import "./src/queues/worker.js";

// const buildEmailHTML = ({ title, username, description, status, deadline, extraMessage }) => {
//   return `
//     <div style="font-family: Arial, sans-serif; padding: 15px;">
//       <h2>${title}</h2>
//       ${username ? `<p>Hi ${username},</p>` : ""}
//       ${extraMessage ? `<p>${extraMessage}</p>` : ""}
//       ${description ? `<p><strong>Description:</strong> ${description}</p>` : ""}
//       ${status ? `<p><strong>Status:</strong> ${status}</p>` : ""}
//       ${deadline ? `<p><strong>Deadline:</strong> ${new Date(deadline).toLocaleString()}</p>` : ""}
      
//       <br/>
//       <p>— DevSync Team</p>
//     </div>
//   `;
// };

// export const worker = new Worker(
//   "task-queue",
//   async (job) => {
//     console.log("Worker job:", job.name);
//     console.log("Job data:", job.data);

//     const { userId } = job.data;
//     // const user = await User.findById(userId);

//     if (!user) {
//       console.error("User not found:", job.name);
//       return;
//     }

//     console.log("User", user.username);
//     console.log("email", user.email);
//     console.log("FCM Token", user.fcmToken);


//     //****************normal notification******************** */
//     if (job.name === "sendNotification") {
//       const { title, body } = job.data;
//       console.log("Sending notification");
//       if (user.fcmToken) {
//         try {
//           await sendNotification(user.fcmToken, title, body);
//           console.log("FCM push sent successfully!");
//         } catch (err) {
//           console.error("FCM Push Failed:", err);
//         }
//       } else {
//         console.warn("No FCM token found for user! Skipping push notification.");
//       }
//       if (user.email) {
//         try {
//           const html =
            
//             buildEmailHTML({
//               title,
//               username: user.username,
//               extraMessage: body,
//             });

//           await sendEmail(user.email, title, body, html);
//           console.log("Email sent successfully!");
//         } catch (err) {
//           console.error("Email send failed:", err);
//         }
//       } else {
//         console.warn("⚠ No email found for user! Skipping email.");
//       }

//       return;
//     }

//     // ****************complaint assign************
//     if (job.name === "complaintAssigned") {
//       const {complaintTitle} = job.data;
//       const title = "New Complaint Assigned";
//       const body = `Complaint "${complaintTitle}"`;
//       console.log("Sending complaintAssigned message...");
//       if (user.fcmToken) {
//         try {
//           await sendNotification(user.fcmToken, title, body);
//           console.log("Assigned: FCM sent.");
//         } catch (err) {
//           console.error("Assigned: fcm failed:", err);
//         }
//       }
//       if (user.email) {
//         try {
//           const html = buildEmailHTML({
//             title,
//             username: user.username,
//             extraMessage: body,
//           });

//           await sendEmail(user.email, title, body, html);
//           console.log("Email sent.");
//         } catch (err) {
//           console.error("Email FAILED:", err);
//         }
//       }
//       return;
//     }

//     // *************deadline aleart****************
//     if (job.name === "deadlineAlert") {
//       const { complaint, minutesRemaining } = job.data;

//       const title = `IMPENDING DEADLINE: Complaint #${complaint._id}`;
//       const body = `Deadline approaching in ${minutesRemaining} minutes.`;
//       console.log("Sending deadline alert...");
//       if (user.fcmToken) {
//         try {
//           await sendNotification(user.fcmToken, title, body);
//           console.log("Deadline: FCM sent.");
//         } catch (err) {
//           console.error("Deadline: FCM FAILED:", err);
//         }
//       }
//       if (user.email) {
//         try {
//           const html = buildEmailHTML({
//             title,
//             username: user.username,
//             description: complaint.description,
//             status: complaint.status,
//             deadline: complaint.deadline,
//             extraMessage: body,
//           });

//           await sendEmail(user.email, title, body, html);
//           console.log("Deadline: Email sent.");
//         } catch (err) {
//           console.error("Deadline: EMAIL FAILED:", err);
//         }
//       }

//       return;
//     }

//     // **************notification request permission******
//     if (job.name === "saveTokenConfirmation") {
//       const title = "Notifications Activated";
//       const body = "You accepted notification permission. You will get all updates via notification";
//       console.log("Sending token confirmation");
//       if (user.fcmToken) {
//         try {
//           await sendNotification(user.fcmToken, title, body);
//           console.log("Token Confirmation: FCM sent.");
//         } catch (err) {
//           console.error("Token Confirmation: FCM FAILED:", err);
//         }
//       }

//       if (user.email) {
//         try {
//           const html = buildEmailHTML({
//             title,
//             username: user.username,
//             extraMessage: body,
//           });
//           await sendEmail(user.email, title, body, html);
//           console.log("Token Confirmation: Email sent.");
//         } catch (err) {
//           console.error("Token Confirmation: EMAIL FAILED:", err);
//         }
//       }
//       return;
//     }
//   },
//   {connection: {
//     url: process.env.REDIS_URL,
//   }, }
// );

// console.log("Worker Started...");
// // (ID: ${complaintId}) has been assigned to you.`;
// //, complaintId 


import { Worker } from "bullmq";
import { User } from "../model/user.model.js";
import { sendNotification, sendEmail } from "../firebase/SendNotification.js";
const buildEmailHTML = ({ title, username, description, status, deadline, extraMessage }) => {
  return `
    <div style="font-family: Arial, sans-serif; padding: 15px; border: 1px solid #eee; border-radius: 8px;">
      <h2 style="color: #2c3e50;">${title}</h2>
      ${username ? `<p>Hi <strong>${username}</strong>,</p>` : "<p>Hello,</p>"}
      ${extraMessage ? `<p>${extraMessage}</p>` : ""}
      <hr />
      ${description ? `<p><strong>Details:</strong> ${description}</p>` : ""}
      ${status ? `<p><strong>Status:</strong> ${status}</p>` : ""}
      ${deadline ? `<p><strong>Deadline:</strong> ${new Date(deadline).toLocaleString()}</p>` : ""}
      <br/>
      <p style="font-size: 0.9em; color: #7f8c8d;">— CareSphere Team</p>
    </div>
  `;
};

export const worker = new Worker(
  "task-queue",
  async (job) => {
    console.log(`[Worker] Processing job: ${job.name} (${job.id})`);

    const { 
      userId, 
      medicineId, 
      title, 
      body, 
      description, 
      status, 
      deadline, 
      extraMessage, 
      toEmail, 
      inviterName 
    } = job.data;

    let user = null;
    if (userId) {
      user = await User.findById(userId);
    }

    if (job.name === "sendNotification" && user) {
      if (user.fcmToken) {
        try {
          const medicinePayload = {
            _id: medicineId || "N/A",
            medicineName: title || "Medicine Reminder",
            dosage: body || "Please take your scheduled dose",
          };
          await sendNotification(user.fcmToken, medicinePayload, user._id);
          console.log(`[Worker] FCM sent to user: ${user.username}`);
        } catch (err) {
          console.error("[Worker] FCM Push Failed:", err);
        }
      }
    }

    if (job.name === "sendEmail" || job.data.sendEmail) {
      try {
        const recipientEmail = user ? user.email : toEmail;
        
        if (!recipientEmail) {
          console.error("[Worker] No recipient email found. Skipping email job.");
          return;
        }

        const htmlContent = buildEmailHTML({
          title: title || "CareSphere Update",
          username: user ? user.username : null, 
          description: description || body,
          status,
          deadline,
          extraMessage: extraMessage || (inviterName ? `${inviterName} invited you to CareSphere.` : null)
        });

        await sendEmail(recipientEmail, title || "CareSphere Reminder", htmlContent);
        console.log(`[Worker] Email sent successfully to: ${recipientEmail}`);
      } catch (err) {
        console.error("[Worker] Email sending failed:", err);
      }
    }
  },
  {
    connection: {
      host: process.env.REDIS_HOST || "127.0.0.1",
      port: parseInt(process.env.REDIS_PORT) || 6379,
      family: 4
    },
    concurrency: 5
  }
);

worker.on("completed", (job) => {
  console.log(`[Worker] Job ${job.id} completed.`);
});

worker.on("failed", (job, err) => {
  console.error(`[Worker] Job ${job.id} failed: ${err.message}`);
});