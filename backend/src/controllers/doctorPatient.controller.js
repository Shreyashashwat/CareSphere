import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { DoctorPatientRequest } from "../model/doctorPatientRequest.model.js";
import { User } from "../model/user.model.js";
import Doctor from "../model/doctor.js";
import { Reminder } from "../model/reminderstatus.js";
import { Medicine } from "../model/medicine.model.js";
import { Appointment } from "../model/appointment.model.js";
import mongoose from "mongoose";


// ─── Send Doctor Request (Patient → Doctor) ───────────────────────────────────
const sendDoctorRequest = asyncHandler(async (req, res) => {
  const patientId = req.user._id;
  const { doctorId } = req.body;

  if (!doctorId) {
    throw new ApiError(400, "Doctor ID is required");
  }

  console.log("sending request");

  const patient = await User.findById(patientId);
  if (!patient) {
    throw new ApiError(404, "Patient not found");
  }

  const doctor = await Doctor.findById(doctorId);
  if (!doctor) {
    throw new ApiError(404, "Doctor not found");
  }

  console.log("request sent");

  const existingRequest = await DoctorPatientRequest.findOne({
    patientId,
    doctorId,
  });

  if (existingRequest) {
    throw new ApiError(400, "Request already sent to this doctor");
  }

  const request = await DoctorPatientRequest.create({
    patientId,
    doctorId,
    status: "PENDING",
  });

  const populatedRequest = await DoctorPatientRequest.findById(request._id)
    .populate("patientId", "username email")
    .populate("doctorId", "username email code");

  return res
    .status(201)
    .json(new ApiResponse(201, populatedRequest, "Request sent to doctor successfully"));
});


// ─── Get Pending Requests (Doctor) ────────────────────────────────────────────
const getPendingRequests = asyncHandler(async (req, res) => {
  const doctorId = req.user._id;

  console.log("getting request");

  const doctor = await Doctor.findById(doctorId);
  if (!doctor) {
    throw new ApiError(404, "Doctor not found");
  }

  const pendingRequests = await DoctorPatientRequest.find({
    doctorId,
    status: "PENDING",
  })
    .populate("patientId", "username email age gender")
    .sort({ createdAt: -1 });

  console.log("got request");

  return res
    .status(200)
    .json(new ApiResponse(200, pendingRequests, "Pending requests fetched successfully"));
});


// ─── Accept Request (Doctor) ──────────────────────────────────────────────────
const acceptRequest = asyncHandler(async (req, res) => {
  const loggedInDoctorId = req.user._id;
  const { id } = req.params;

  console.log("Accepting request ID:", id);

  const request = await DoctorPatientRequest.findById(id);
  if (!request) {
    throw new ApiError(404, "Request not found");
  }

  console.log("Request Doctor ID:", request.doctorId.toString());
  console.log("Logged-in Doctor ID:", loggedInDoctorId.toString());

  if (request.doctorId.toString() !== loggedInDoctorId.toString()) {
    throw new ApiError(403, "Unauthorized: This request does not belong to you");
  }

  request.status = "ACCEPTED";
  await request.save();

  console.log("Request accepted");

  const populatedRequest = await DoctorPatientRequest.findById(request._id)
    .populate("patientId", "username email age gender")
    .populate("doctorId", "username email code");

  return res
    .status(200)
    .json(new ApiResponse(200, populatedRequest, "Request accepted successfully"));
});


// ─── Reject Request (Doctor) ──────────────────────────────────────────────────
const rejectRequest = asyncHandler(async (req, res) => {
  const loggedInDoctorId = req.user._id;
  const { id } = req.params;

  const request = await DoctorPatientRequest.findById(id);
  if (!request) {
    throw new ApiError(404, "Request not found");
  }

  if (!request.doctorId.equals(loggedInDoctorId)) {
    throw new ApiError(403, "Unauthorized: This request does not belong to you");
  }

  request.status = "REJECTED";
  await request.save();

  const populatedRequest = await DoctorPatientRequest.findById(request._id)
    .populate("patientId", "username email age gender")
    .populate("doctorId", "username email code");

  return res
    .status(200)
    .json(new ApiResponse(200, populatedRequest, "Request rejected successfully"));
});


// ─── Doctor Dashboard ─────────────────────────────────────────────────────────
const getDoctorDashboard = asyncHandler(async (req, res) => {
  const doctorId = req.user._id;

  const doctor = await Doctor.findById(doctorId);
  if (!doctor) {
    throw new ApiError(404, "Doctor not found");
  }

  console.log("got doctor dashboard");

  const acceptedRequests = await DoctorPatientRequest.find({
    doctorId,
    status: "ACCEPTED",
  }).populate("patientId", "username email age gender");

  const patientIds = acceptedRequests
    .map((req) => {
      const patient = req.patientId;
      return patient && patient._id ? patient._id : patient;
    })
    .filter(Boolean);

  if (patientIds.length === 0) {
    return res.status(200).json(
      new ApiResponse(
        200,
        {
          stats: { totalPatients: 0, missedToday: 0, takenToday: 0, pendingToday: 0 },
          todaySchedule: [],
          patientList: [],
        },
        "Doctor dashboard data fetched successfully (no patients)"
      )
    );
  }

  const patients = await User.find({ _id: { $in: patientIds } }).select("-password");

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const [todayReminders, allRecentReminders] = await Promise.all([
    Reminder.find({
      userId: { $in: patientIds },
      time: { $gte: todayStart, $lte: todayEnd },
    })
      .populate("userId", "username")
      .populate("medicineId", "medicineName"),

    Reminder.find({
      userId: { $in: patientIds },
      time: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
    }),
  ]);

  const stats = {
    totalPatients: patients.length,
    missedToday: todayReminders.filter((r) => r.status === "missed").length,
    takenToday: todayReminders.filter((r) => r.status === "taken").length,
    pendingToday: todayReminders.filter((r) => r.status === "pending").length,
  };

  const patientAdherence = patients.map((patient) => {
    const pReminders = allRecentReminders.filter(
      (r) => r.userId.toString() === patient._id.toString()
    );
    const missedCount = pReminders.filter((r) => r.status === "missed").length;

    return {
      patientName: patient.username,
      patientId: patient._id,
      email: patient.email,
      age: patient.age,
      gender: patient.gender,
      missedCount,
      status: missedCount > 3 ? "Critical" : "Stable",
      todayMedicines: todayReminders.filter(
        (r) => r.userId._id.toString() === patient._id.toString()
      ),
    };
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      { stats, todaySchedule: todayReminders, patientList: patientAdherence },
      "Doctor dashboard data fetched successfully"
    )
  );
});


// ─── Get All Doctors ──────────────────────────────────────────────────────────
const getAllDoctors = asyncHandler(async (req, res) => {
  // File 2 version: no isActive filter (more inclusive)
  const doctors = await Doctor.find({})
    .select("-password")
    .sort({ username: 1 });

  return res
    .status(200)
    .json(new ApiResponse(200, doctors, "Doctors fetched successfully"));
});


// ─── Get Patient Request Status ───────────────────────────────────────────────
const getPatientRequestStatus = asyncHandler(async (req, res) => {
  const patientId = req.user._id;
  const { doctorId } = req.params;

  const request = await DoctorPatientRequest.findOne({ patientId, doctorId })
    .populate("patientId", "username email")
    .populate("doctorId", "username email code");

  if (!request) {
    return res
      .status(200)
      .json(new ApiResponse(200, { status: "NONE" }, "No request found"));
  }

  return res
    .status(200)
    .json(new ApiResponse(200, request, "Request status fetched successfully"));
});


// ─── Get Patient Requests ─────────────────────────────────────────────────────
const getPatientRequests = asyncHandler(async (req, res) => {
  const patientId = req.user._id;

  const requests = await DoctorPatientRequest.find({ patientId })
    .populate("doctorId", "username email code")
    .sort({ createdAt: -1 });

  return res
    .status(200)
    .json(new ApiResponse(200, requests, "Patient requests fetched successfully"));
});


// ─── Schedule Appointment ─────────────────────────────────────────────────────
const scheduleAppointment = asyncHandler(async (req, res) => {
  const patientId = req.user._id;
  const { doctorId, appointmentDate, problem } = req.body;

  if (!doctorId || !appointmentDate || !problem) {
    throw new ApiError(400, "All fields (Doctor, Date, Problem) are required");
  }

  // File 2: validate ObjectId before hitting DB
  if (!mongoose.Types.ObjectId.isValid(doctorId)) {
    throw new ApiError(
      400,
      `Invalid doctorId: '${doctorId}' is not a valid doctor ID. Use the exact ID from the available doctors list.`
    );
  }

  const doctorExists = await Doctor.findById(doctorId);
  if (!doctorExists) {
    throw new ApiError(404, "Doctor not found. Please use a valid doctor ID from the available doctors list.");
  }

  const appointment = await Appointment.create({
    patientId,
    doctorId,
    appointmentDate,
    problem,
    status: "PENDING",
  });

  return res
    .status(201)
    .json(new ApiResponse(201, appointment, "Appointment request sent to doctor"));
});


// ─── Get Doctor Appointments ──────────────────────────────────────────────────
export const getDoctorAppointments = async (req, res) => {
  try {
    // File 2: only fetch by doctorId (cleaner, no dual-role logic)
    const appointments = await Appointment.find({ doctorId: req.user._id })
      .populate("patientId", "username email")
      .sort({ appointmentDate: 1 });

    res.status(200).json({ success: true, data: appointments });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch appointments" });
  }
};


// ─── Update Appointment Status ────────────────────────────────────────────────
export const updateAppointmentStatus = async (req, res) => {
  console.log("in update appointment");
  const { appointmentId } = req.params;
  const { status } = req.body;

  try {
    const appointment = await Appointment.findByIdAndUpdate(
      appointmentId,
      { status },
      { new: true }
    );
    res.status(200).json({ success: true, data: appointment });
  } catch (err) {
    res.status(500).json({ message: "Failed to update status" });
  }
};


// ─── Get Patient Appointments ─────────────────────────────────────────────────
export const getPatientAppointments = async (req, res) => {
  try {
    const patientId = req.user._id || req.user; // handles both middleware styles
    const appointments = await Appointment.find({ patientId })
      .populate("doctorId", "username email")
      .sort({ appointmentDate: 1 });

    res.status(200).json({ success: true, data: appointments });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch patient appointments" });
  }
};


// ─── Named Exports ────────────────────────────────────────────────────────────
export {
  getPendingRequests,
  acceptRequest,
  rejectRequest,
  getDoctorDashboard,
  sendDoctorRequest,
  getAllDoctors,
  getPatientRequestStatus,
  getPatientRequests,
  scheduleAppointment,
};