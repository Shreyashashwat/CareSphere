import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../model/user.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import Doctor from "../model/doctor.js";
import { Medicine } from "../model/medicine.model.js";
import { Reminder } from "../model/reminderstatus.js";
import { callLLM } from "./llm.controller.js";
import WeeklyInsight from "../model/insights.model.js";
import { getWeekRange } from "../utils/getWeeklyRange.js";

const registerUser = asyncHandler(async (req, res) => {
  const { username, email, password, age, gender, doctorCode, role } = req.body;

  // DOCTOR REGISTRATION
  if (role === "doctor") {
    if ([username, email, password, doctorCode].some((field) => field?.trim() === "")) {
      throw new ApiError(400, "All fields (Username, Email, Password, Code) are required for Doctors");
    }

    const existedDoctor = await Doctor.findOne({
      $or: [{ username }, { email }, { code: doctorCode }],
    });

    if (existedDoctor) {
      throw new ApiError(409, "Doctor with these credentials already exists");
    }

    const doctor = new Doctor({ username, email, password, code: doctorCode, role: "doctor" });
    await doctor.save();
    const createdDoctor = await Doctor.findById(doctor._id).select("-password");

    return res.status(201).json(new ApiResponse(201, createdDoctor, "Doctor registered successfully"));
  }

  // USER REGISTRATION
  if ([username, email, password, gender].some((field) => field?.trim() === "") || !age) {
    throw new ApiError(400, "All fields are required");
  }

  if (!email.includes("@")) throw new ApiError(400, "Invalid email format");

  const existedUser = await User.findOne({ $or: [{ username }, { email }] });
  if (existedUser) throw new ApiError(409, "User already registered");

  const user = new User({ username, email, password, age, gender, doctorCode, role: "user" });
  await user.save();

  const createdUser = await User.findById(user._id).select("-password");
  if (!createdUser) throw new ApiError(500, "Something went wrong while creating user");

  return res.status(201).json(new ApiResponse(201, createdUser, "User registered successfully"));
});


const loginUser = asyncHandler(async (req, res) => {
  const { email, password, role } = req.body;

  if (!email || !password) throw new ApiError(400, "Email and password are required");

  let user;
  let modelType;

  if (role === "doctor") {
    user = await Doctor.findOne({ email });
    modelType = "doctor";
  } else {
    user = await User.findOne({ email });
    modelType = "user";
  }

  if (!user) throw new ApiError(404, `${role === "doctor" ? "Doctor" : "User"} not found`);

  const isPasswordValid = await user.isPasswordCorrect(password);
  if (!isPasswordValid) throw new ApiError(401, "Incorrect password");

  const token = jwt.sign(
    { _id: user._id, email: user.email, username: user.username, role: modelType },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  const loggedInUser =
    role === "doctor"
      ? await Doctor.findById(user._id).select("-password")
      : await User.findById(user._id).select("-password");

  return res.status(200).json(
    new ApiResponse(200, { user: loggedInUser, token }, `${role === "doctor" ? "Doctor" : "User"} logged in successfully`)
  );
});


const logOut = asyncHandler(async (req, res) => {
  return res.status(200).json(new ApiResponse(200, {}, "User logged out successfully"));
});


const connectToDoctor = asyncHandler(async (req, res) => {
  const { doctorCode } = req.body;
  const userId = req.user._id;

  if (!doctorCode) throw new ApiError(400, "Doctor code is required");

  const user = await User.findByIdAndUpdate(
    userId,
    { $set: { doctorCode } },
    { new: true }
  ).select("-password");

  if (!user) throw new ApiError(404, "User not found");

  return res.status(200).json(new ApiResponse(200, user, "Successfully connected to doctor"));
});


export { registerUser, loginUser, logOut, connectToDoctor };


export const generateWeeklyInsightsForAllUsers = async () => {
  let users;
  try {
    users = await User.find({}, { _id: 1 });
  } catch (err) {
    console.error("❌ Failed to fetch users:", err);
    return;
  }

  for (const user of users) {
    try {
      await processUserWeeklyInsights(user._id);
    } catch (err) {
      console.error(`❌ Error processing user ${user._id}:`, err.message);
    }
  }
};


export const processUserWeeklyInsights = async (userId) => {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const reminderLogs = await Reminder.find({
    userId,
    time: { $gte: sevenDaysAgo },
  }).populate("medicineId");

  if (reminderLogs.length === 0) return;

  const resolvedReminders = reminderLogs.filter(
    (r) => r.status === "taken" || r.status === "missed"
  );

  if (resolvedReminders.length === 0) return;

  const total = resolvedReminders.length;
  const taken = resolvedReminders.filter((r) => r.status === "taken").length;
  const missed = resolvedReminders.filter((r) => r.status === "missed").length;
  const adherence = Math.round((taken / total) * 100);

  let mostMissedTime = "none";
  const missedReminders = resolvedReminders.filter((r) => r.status === "missed");

  if (missedReminders.length > 0) {
    const hourCounts = {};
    missedReminders.forEach((r) => {
      const hour = new Date(r.time).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });

    const mostMissedHour = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
    if (mostMissedHour !== undefined) {
      const hour = parseInt(mostMissedHour);
      const period = hour >= 12 ? "PM" : "AM";
      const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
      mostMissedTime = `${displayHour}:00 ${period}`;
    }
  }

  const weeklySummary = {
    adherence_percentage: adherence,
    total_doses: total,
    taken_doses: taken,
    missed_doses: missed,
    most_missed_time: mostMissedTime,
  };

  const llmResponse = await callLLM(weeklySummary);

  if (!llmResponse || !Array.isArray(llmResponse.insights)) {
    throw new Error("Invalid LLM response");
  }

  await WeeklyInsight.findOneAndUpdate(
    { user_id: userId, week: getWeekRange() },
    { insights: llmResponse.insights, created_at: new Date() },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
};


export const getUserWeeklyInsights = async (req, res) => {
  try {
    const { userId } = req.params;

    const insights = await WeeklyInsight.find({ user_id: userId })
      .sort({ created_at: -1 })
      .limit(10);

    if (insights.length > 0) {
      return res.json({
        success: true,
        insights: insights[0].insights,
        week: insights[0].week,
        created_at: insights[0].created_at,
      });
    }

    return res.json({ success: true, insights: [] });
  } catch (error) {
    console.error("Error fetching weekly insights:", error);
    res.status(500).json({ success: false, message: "Failed to fetch insights" });
  }
};


export const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id || req.user.id).select("-password");
  if (!user) throw new ApiError(404, "User not found");
  return res.status(200).json(new ApiResponse(200, user, "User fetched"));
});