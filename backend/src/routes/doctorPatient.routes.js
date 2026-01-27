import { Router } from "express";
import { verifyJwt } from "../middleware/auth.middleware.js";
import {
  sendDoctorRequest,
  getPendingRequests,
  acceptRequest,
  rejectRequest,
  getDoctorDashboard,
  getAllDoctors,
  getPatientRequestStatus,
  getPatientRequests,
} from "../controllers/doctorPatient.controller.js";

const router = Router();

// Public route - Get all doctors (for patients to see)
router.get("/doctors", getAllDoctors);

// Patient routes - require authentication
router.post("/doctor-request/send", verifyJwt, sendDoctorRequest);
router.get("/doctor-request/patient-requests", verifyJwt, getPatientRequests);
router.get("/doctor-request/status/:doctorId", verifyJwt, getPatientRequestStatus);

// Doctor routes - require authentication
router.get("/doctor-request/pending", verifyJwt, getPendingRequests);
router.post("/doctor-request/:id/accept", verifyJwt, acceptRequest);
router.post("/doctor-request/:id/reject", verifyJwt, rejectRequest);
router.get("/doctor/dashboard", verifyJwt, getDoctorDashboard);

export default router;

