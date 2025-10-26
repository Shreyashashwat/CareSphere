import express from "express";
import { User } from "../model/user.model.js";
import { Medicine } from "../model/medicine.model.js";

const router = express.Router();
// Save FCM token
router.post("/", async (req, res) => {
  const { userId, token } = req.body;
  await User.findByIdAndUpdate(userId, { fcmToken: token });
  res.send("Token saved!");
});
router.post("/snooze/:medId", async (req, res) => {
  const { medId } = req.params;
  const { minutes } = req.body;

  const med = await Medicine.findById(medId);
  if (!med) return res.status(404).json({ message: "Medicine not found" });

  med.snoozedUntil = new Date(Date.now() + minutes * 60 * 1000);
  await med.save();

  res.json({
    message: `⏱️ ${med.medicineName} snoozed for ${minutes} minutes`,
    snoozedUntil: med.snoozedUntil,
  });
});

export default router;
