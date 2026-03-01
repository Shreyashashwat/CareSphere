import express from "express";
import {
  getWeekStats,
  getMedicineAdherence,
  getAppointments,
  getUpcomingAppointment,
} from "../controllers/agentData.controller.js";
import { verifyJwt } from "../middleware/auth.middleware.js";

const router = express.Router();

// Reminder stats
router.get("/reminder/stats/week", verifyJwt, getWeekStats);
router.get("/reminder/stats/medicine/:medicineId", verifyJwt, getMedicineAdherence);

// Appointments
router.get("/appointment/upcoming", verifyJwt, getUpcomingAppointment); 
router.get("/appointment", verifyJwt, getAppointments);

export default router;