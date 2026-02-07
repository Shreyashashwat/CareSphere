import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../model/user.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import { Medicine } from "../model/medicine.model.js";
import { Reminder } from "../model/reminderstatus.js";
import { callLLM } from "./llm.controller.js";
import WeeklyInsight from "../model/insights.model.js";
import { getWeekRange } from "../utils/getWeeklyRange.js";
const registerUser = asyncHandler(async (req, res) => {
  console.log("yes noo")
  const { username, email, password, age, gender } = req.body;

  if ([username, email, password, gender].some((field) => field?.trim() === "") || !age) {
    throw new ApiError(400, "All fields are required");
  }

  if (!email.includes("@")) {
    throw new ApiError(400, "Invalid email format");
  }

  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (existedUser) {
    throw new ApiError(400, "User already registered");
  }

  const user = new User({ username, email, password, age, gender });
  await user.save();

  const createdUser = await User.findById(user._id).select("-password");

  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while creating user");
  }

  return res
    .status(201)
    .json(new ApiResponse(201, createdUser, "User registered successfully"));
});


const loginUser = asyncHandler(async (req, res) => {
  console.log(" yes");
  const { email, password } = req.body;

  if (!email || !password) throw new ApiError(400, "Email and password are required");

  const user = await User.findOne({ email });
  if (!user) throw new ApiError(404, "User not found");

  const isPasswordValid = await user.isPasswordCorrect(password);
  if (!isPasswordValid) throw new ApiError(401, "Incorrect password");

 
  const token = jwt.sign(
    { _id: user._id, username: user.username, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: "7d" } 
  );
  console.log("hgffd");
  console.log("Generated Token:", token);

  const loggedInUser = await User.findById(user._id).select("-password");

  return res
    .status(200)
    .json(
      new ApiResponse(200, { user: loggedInUser, token }, "Logged in successfully")
    );
});


const logOut = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, {}, "User logged out successfully"));
});

export const generateWeeklyInsightsForAllUsers = async () => {
  console.log("🚀 Starting weekly insights generation for all users");

  let users;
  try {
    users = await User.find({}, { _id: 1 });
    console.log(`👥 Found ${users.length} users`);
  } catch (err) {
    console.error("❌ Failed to fetch users:", err);
    return;
  }

  for (const user of users) {
    console.log(`\n➡️ Processing user: ${user._id}`);
    try {
      await processUserWeeklyInsights(user._id);
      console.log(`✅ Done for user: ${user._id}`);
    } catch (err) {
      console.error(
        `❌ Error processing user ${user._id}:`,
        err.message,
        err.stack
      );
    }
  }

  console.log("🏁 Weekly insights job finished");
};
export const processUserWeeklyInsights = async (userId) => {
  console.log("🧠 processUserWeeklyInsights START", userId);

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  console.log("📅 Fetching data since:", sevenDaysAgo.toISOString());

  // ---------------- MEDICINE LOGS ----------------
  let medLogs;
  try {
    medLogs = await Medicine.find({
      user_id: userId,
      date: { $gte: sevenDaysAgo }
    });

    console.log(`💊 Medicine logs found: ${medLogs.length}`);
  } catch (err) {
    console.error("❌ Error fetching medicine logs:", err);
    throw err;
  }

  // ---------------- REMINDER LOGS ----------------
  let reminderLogs;
  try {
    reminderLogs = await Reminder.find({
      user_id: userId,
      date: { $gte: sevenDaysAgo }
    });

    console.log(`⏰ Reminder logs found: ${reminderLogs.length}`);
  } catch (err) {
    console.error("❌ Error fetching reminder logs:", err);
    throw err;
  }

  // ---------------- SKIP IF NO DATA ----------------
  if (medLogs.length === 0) {
    console.log("⚠️ No medicine logs → skipping user");
    return;
  }

  // ---------------- AGGREGATION ----------------
  console.log("📊 Aggregating weekly data");

  const total = medLogs.length;
  const taken = medLogs.filter(m => m.taken === true).length;
  const missed = total - taken;

  const adherence = total > 0
    ? Math.round((taken / total) * 100)
    : 0;

  const missedTimes = medLogs
    .filter(m => !m.taken && m.time_bucket)
    .map(m => m.time_bucket);

  const mostMissed =
    missedTimes.length > 0 ? missedTimes[0] : "none";

  console.log("📈 Aggregated values:", {
    total,
    taken,
    missed,
    adherence,
    mostMissed
  });

  // ---------------- WEEKLY SUMMARY ----------------
  const weeklySummary = {
    adherence_percentage: adherence,
    missed_doses: missed,
    most_missed_time: mostMissed
  };

  console.log("🧾 Weekly summary to send to LLM:", weeklySummary);

  // ---------------- LLM CALL ----------------
  let llmResponse;
  try {
    llmResponse = await callLLM(weeklySummary);
    console.log("🤖 LLM raw response:", llmResponse);
  } catch (err) {
    console.error("❌ LLM call failed:", err.message);
    throw err;
  }

  if (!llmResponse || !Array.isArray(llmResponse.insights)) {
    console.error("❌ Invalid LLM response format:", llmResponse);
    throw new Error("Invalid LLM response");
  }

  // ---------------- SAVE TO DB ----------------
  try {
    const doc = await WeeklyInsight.create({
      user_id: userId,
      week: getWeekRange(),
      insights: llmResponse.insights
    });

    console.log("💾 WeeklyInsight saved:", doc._id);
  } catch (err) {
    console.error("❌ Failed to save WeeklyInsight:", err);
    throw err;
  }

  console.log("🎉 processUserWeeklyInsights COMPLETE", userId);
};


export { registerUser, loginUser, logOut };
