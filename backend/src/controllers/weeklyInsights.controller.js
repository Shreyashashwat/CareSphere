import { Reminder } from "../model/reminderstatus.js";
import WeeklyInsight from "../model/insights.model.js";
import { callLLM } from "./llm.controller.js";
import { getWeekRange } from "../utils/getWeeklyRange.js";

const getTimeOfDay = (hour) => {
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 21) return "evening";
  return "night";
};

const DAY_NAMES = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

const buildRichStats = async (userId) => {
  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(now.getDate() - 7);
  const fourteenDaysAgo = new Date(now);
  fourteenDaysAgo.setDate(now.getDate() - 14);

  const thisWeekReminders = await Reminder.find({
    userId,
    time: { $gte: sevenDaysAgo },
    status: { $in: ["taken", "missed"] },
  }).populate("medicineId", "medicineName");

  const prevWeekReminders = await Reminder.find({
    userId,
    time: { $gte: fourteenDaysAgo, $lt: sevenDaysAgo },
    status: { $in: ["taken", "missed"] },
  });

  if (thisWeekReminders.length === 0) return null;

  const total = thisWeekReminders.length;
  const taken = thisWeekReminders.filter((r) => r.status === "taken").length;
  const missed = thisWeekReminders.filter((r) => r.status === "missed").length;
  const adherencePercent = Math.round((taken / total) * 100);

  // Trend vs last week
  let trend = "stable";
  if (prevWeekReminders.length > 0) {
    const prevTaken = prevWeekReminders.filter((r) => r.status === "taken").length;
    const prevAdherence = Math.round((prevTaken / prevWeekReminders.length) * 100);
    const diff = adherencePercent - prevAdherence;
    if (diff >= 10) trend = "improving";
    else if (diff <= -10) trend = "worsening";
  }

  // Per-medicine breakdown
  const medicineMap = {};
  thisWeekReminders.forEach((r) => {
    const name = r.medicineId?.medicineName || "Unknown";
    if (!medicineMap[name]) medicineMap[name] = { taken: 0, missed: 0 };
    if (r.status === "taken") medicineMap[name].taken++;
    else medicineMap[name].missed++;
  });
  const byMedicine = Object.entries(medicineMap).map(([name, s]) => ({
    name,
    taken: s.taken,
    missed: s.missed,
    adherence: Math.round((s.taken / (s.taken + s.missed)) * 100),
  }));
  const worstMedicine = byMedicine
    .filter((m) => m.missed > 0)
    .sort((a, b) => a.adherence - b.adherence)[0] || null;

  // Day-of-week breakdown
  const byDayOfWeek = {};
  DAY_NAMES.forEach((d) => (byDayOfWeek[d] = { taken: 0, missed: 0 }));
  thisWeekReminders.forEach((r) => {
    const day = DAY_NAMES[new Date(r.time).getDay()];
    if (r.status === "taken") byDayOfWeek[day].taken++;
    else byDayOfWeek[day].missed++;
  });
  const worstDay = Object.entries(byDayOfWeek)
    .filter(([, v]) => v.missed > 0)
    .sort((a, b) => b[1].missed - a[1].missed)[0]?.[0] || null;

  // Time-of-day breakdown
  const byTimeOfDay = {
    morning: { taken: 0, missed: 0 },
    afternoon: { taken: 0, missed: 0 },
    evening: { taken: 0, missed: 0 },
    night: { taken: 0, missed: 0 },
  };
  thisWeekReminders.forEach((r) => {
    const slot = getTimeOfDay(new Date(r.time).getHours());
    if (r.status === "taken") byTimeOfDay[slot].taken++;
    else byTimeOfDay[slot].missed++;
  });
  const mostMissedTimeSlot = Object.entries(byTimeOfDay)
    .filter(([, v]) => v.missed > 0)
    .sort((a, b) => b[1].missed - a[1].missed)[0]?.[0] || "none";

  // Current streak (consecutive taken going backwards)
  const allSorted = [...thisWeekReminders].sort(
    (a, b) => new Date(b.time) - new Date(a.time)
  );
  let currentStreak = 0;
  for (const r of allSorted) {
    if (r.status === "taken") currentStreak++;
    else break;
  }

  return {
    adherencePercent, total, taken, missed,
    trend, worstMedicine, byMedicine,
    worstDay, mostMissedTimeSlot, byTimeOfDay, currentStreak,
  };
};

// POST /api/weekly-insights/generate
export const generateInsightsForUser = async (req, res) => {
    try {
      const userId = req.user._id || req.user.id;
  
      // Staleness check — serve cache if < 6 hours old
    //   const existing = await WeeklyInsight.findOne({ user_id: userId }).sort({ created_at: -1 });
    //   const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
    //   if (existing && existing.created_at > sixHoursAgo) {
    //     return res.json({
    //       success: true,
    //       insights: existing.insights,
    //       week: existing.week,
    //       created_at: existing.created_at,
    //       weeklyTrend: existing.weeklyTrend || [],
    //       fromCache: true,
    //     });
    //   }
  
      const stats = await buildRichStats(userId);
      if (!stats) {
        return res.json({ success: true, insights: [], message: "Not enough data yet" });
      }
  
      // Build 4-week trend
      const now = new Date();
      const weeklyTrend = await Promise.all(
        Array.from({ length: 4 }, async (_, i) => {
          const end = new Date(now);
          end.setDate(now.getDate() - i * 7);
          const start = new Date(end);
          start.setDate(end.getDate() - 6);
          const label = i === 0 ? "This week"
            : i === 1 ? "Last week"
            : `${i + 1} wks ago`;
          const reminders = await Reminder.find({
            userId,
            time: { $gte: start, $lte: end },
            status: { $in: ["taken", "missed"] },
          });
          const taken = reminders.filter(r => r.status === "taken").length;
          const total = reminders.length;
          return { label, taken, total, pct: total > 0 ? Math.round((taken / total) * 100) : 0 };
        })
      );
      weeklyTrend.reverse(); // oldest first
  
      const llmResponse = await callLLM(stats);
      if (!llmResponse || !Array.isArray(llmResponse.insights)) {
        throw new Error("Invalid LLM response");
      }
  
      const week = getWeekRange();
      const doc = await WeeklyInsight.findOneAndUpdate(
        { user_id: userId, week },
        { insights: llmResponse.insights, weeklyTrend, created_at: new Date() },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
  
      return res.json({
        success: true,
        insights: doc.insights,
        week: doc.week,
        created_at: doc.created_at,
        weeklyTrend: doc.weeklyTrend || [],
        fromCache: false,
      });
    } catch (err) {
      console.error("❌ generateInsightsForUser error:", err);
      return res.status(500).json({ success: false, message: "Failed to generate insights" });
    }
  };

// GET /api/weekly-insights/me
export const getUserWeeklyInsights = async (req, res) => {
    try {
      const userId = req.user._id || req.user.id;
      const doc = await WeeklyInsight.findOne({ user_id: userId }).sort({ created_at: -1 });
      if (doc) {
        return res.json({
          success: true,
          insights: doc.insights,
          week: doc.week,
          created_at: doc.created_at,
          weeklyTrend: doc.weeklyTrend || [],
        });
      }
      return res.json({ success: true, insights: [], weeklyTrend: [] });
    } catch (err) {
      console.error("❌ getUserWeeklyInsights error:", err);
      return res.status(500).json({ success: false, message: "Failed to fetch insights" });
    }
};