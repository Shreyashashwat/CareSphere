import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../model/user.model.js";
import { Reminder } from "../model/reminderstatus.js";
import { Medicine } from "../model/medicine.model.js";
import { DoctorPatientRequest } from "../model/doctorPatientRequest.model.js";
import Doctor from "../model/doctor.js";
import redisClient from "../configs/redisClient.js";

const getDoctorDashboard = asyncHandler(async (req, res) => {
    const doctorId = req.user?._id || req.user; 
    
    if (!doctorId) throw new ApiError(401, "Unauthorized access");

    const cacheKey = `doctor_dashboard:${doctorId}`;

    const cachedData = await redisClient.get(cacheKey);
    if (cachedData) {
        return res.status(200).json(
            new ApiResponse(200, JSON.parse(cachedData), "Doctor dashboard data fetched from cache")
        );
    }

    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
        throw new ApiError(404, "Doctor not found");
    }

    const acceptedRequests = await DoctorPatientRequest.find({
        doctorId,
        status: "ACCEPTED",
    }).populate("patientId", "username email age gender");

    const patientIds = acceptedRequests
        .map((req) => {
            const patient = req.patientId;
            return patient?._id ? patient._id : patient;
        })
        .filter(Boolean);

    if (patientIds.length === 0) {
        const emptyState = {
            stats: { totalPatients: 0, missedToday: 0, takenToday: 0, pendingToday: 0 },
            todaySchedule: [],
            patientList: [],
        };
        await redisClient.setEx(cacheKey, 300, JSON.stringify(emptyState)); // Cache for 5 mins
        return res.status(200).json(
            new ApiResponse(200, emptyState, "Doctor dashboard data fetched (no patients)")
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
            time: { $gte: todayStart, $lte: todayEnd }
        }).populate("userId", "username").populate("medicineId", "medicineName"),

        Reminder.find({
            userId: { $in: patientIds },
            time: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
        })
    ]);

    const stats = {
        totalPatients: patients.length,
        missedToday: todayReminders.filter(r => r.status === "missed").length,
        takenToday: todayReminders.filter(r => r.status === "taken").length,
        pendingToday: todayReminders.filter(r => r.status === "pending").length,
    };

    const patientAdherence = patients.map(patient => {
        const pReminders = allRecentReminders.filter(r => r.userId.toString() === patient._id.toString());
        const missedCount = pReminders.filter(r => r.status === "missed").length;
        
        return {
            patientName: patient.username,
            patientId: patient._id,
            missedCount,
            status: missedCount > 3 ? "Critical" : "Stable"
        };
    });

    const finalResponse = {
        stats,
        todaySchedule: todayReminders,
        patientList: patientAdherence,
    };
    await redisClient.setEx(cacheKey, 600, JSON.stringify(finalResponse));

    return res.status(200).json(
        new ApiResponse(200, finalResponse, "Doctor dashboard data fetched successfully")
    );
});

export { getDoctorDashboard };