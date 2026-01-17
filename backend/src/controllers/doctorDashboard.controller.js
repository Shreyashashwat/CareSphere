// import { User } from "../model/user.model.js";
// import { Medicine } from "../model/medicine.model.js";

// export const getDoctorDashboard = async (req, res) => {
//   try {
//     const doctorCode = req.user.doctorCode;

//     if (!doctorCode) {
//       return res.status(403).json({ message: "Unauthorized doctor" });
//     }

//     //  Fetch all patients under this doctor
//     const patients = await User.find({ doctorCode })
//       .select("username email age gender createdAt");

//     if (patients.length === 0) {
//       return res.status(200).json({
//         doctorCode,
//         totalPatients: 0,
//         dashboardData: [],
//       });
//     }

//     const patientIds = patients.map(p => p._id);

//     // 2Fetch all medicines for these patients
//     const medicines = await Medicine.find({
//       userId: { $in: patientIds }
//     });

//     // 3️ Group medicines by patient
//     const medicineMap = {};
//     medicines.forEach(med => {
//       const uid = med.userId.toString();
//       if (!medicineMap[uid]) medicineMap[uid] = [];
//       medicineMap[uid].push(med);
//     });

//     // 4️ Build final dashboard data
//     const dashboardData = patients.map(patient => {
//       const pid = patient._id.toString();
//       const patientMeds = medicineMap[pid] || [];

//       let totalTaken = 0;
//       let totalMissed = 0;
//       let lastActivity = null;

//       patientMeds.forEach(med => {
//         totalTaken += med.takenCount || 0;
//         totalMissed += med.missedCount || 0;

//         if (!lastActivity || med.updatedAt > lastActivity) {
//           lastActivity = med.updatedAt;
//         }
//       });

//       const totalDoses = totalTaken + totalMissed;

//       return {
//         patientInfo: patient,
//         medicines: patientMeds,
//         stats: {
//           totalDoses,
//           taken: totalTaken,
//           missed: totalMissed,
//           compliance:
//             totalDoses > 0
//               ? `${((totalTaken / totalDoses) * 100).toFixed(2)}%`
//               : "0%",
//           lastActivity,
//         },
//       };
//     });

//     res.status(200).json({
//       doctorCode,
//       totalPatients: patients.length,
//       dashboardData,
//     });

//   } catch (error) {
//     console.error("Doctor dashboard error:", error);
//     res.status(500).json({ message: "Server error" });
//   }
// };


import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../model/user.model.js";
import { Reminder } from "../model/reminderstatus.js";
import { Medicine } from "../model/medicine.model.js";

const getDoctorDashboard = asyncHandler(async (req, res) => {
    const doctor = await User.findById(req.user._id);
    // if (!doctor || !doctor.doctorCode) {
    //     throw new ApiError(403, "Access denied. Only registered doctors can view this dashboard.");
    // }

    // const doctorCode = doctor.doctorCode;
    const patients = await User.find({})
    // const patients = await User.find({ doctorCode, _id: { $ne: doctor._id } })
        .select("-password");

    const patientIds = patients.map(p => p._id);

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

    return res.status(200).json(
        new ApiResponse(200, {
            stats,
            todaySchedule: todayReminders,
            patientList: patientAdherence,
            // doctorInfo: {
            //     username: doctor.username,
            //     doctorCode: doctor.doctorCode
            // }
        }, "Doctor dashboard data fetched successfully")
    );
});

export { getDoctorDashboard };