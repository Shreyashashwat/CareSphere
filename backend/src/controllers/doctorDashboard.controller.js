import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../model/user.model.js";

const getDoctorDashboard = asyncHandler(async (req, res) => {
    // Basic implementation to prevent crash and verify route works
    // Logic should be expanded to fetch actual doctor-related data

    // For now, return a placeholder response
    const stats = {
        message: "Doctor dashboard operational",
        patientsCount: 0,
        pendingConsultations: 0
    };

    return res
        .status(200)
        .json(new ApiResponse(200, stats, "Doctor dashboard data fetched successfully"));
});

export { getDoctorDashboard };
