import { Reminder } from "../model/reminderstatus.js";
import WeeklyInsight from "../model/insights.model.js";
import { callLLM } from "./llm.controller.js";
import { getWeekRange, getCurrentWeekBounds } from "../utils/getWeeklyRange.js";

const DAY_NAMES = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

const getTimeSlot = (hour) => {
  if (hour >= 5  && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 21) return "evening";
  return "night";
};

const COOLDOWN_MS = 60 * 60 * 1000; // 1 hour (production)
// const COOLDOWN_MS = 0; // disabled for testing

const buildRichStats = async (userId) => {
  const now          = new Date();
  const sevenDaysAgo = new Date(now); sevenDaysAgo.setDate(now.getDate() - 7);
  const fourteenAgo  = new Date(now); fourteenAgo.setDate(now.getDate() - 14);

  const [thisWeek, prevWeek] = await Promise.all([
    Reminder.find({
      userId,
      time:   { $gte: sevenDaysAgo },
      status: { $in: ["taken", "missed"] },
    }).populate("medicineId", "medicineName"),
    Reminder.find({
      userId,
      time:   { $gte: fourteenAgo, $lt: sevenDaysAgo },
      status: { $in: ["taken", "missed"] },
    }).populate("medicineId", "medicineName"),
  ]);

  if (thisWeek.length === 0) return null;

  const total  = thisWeek.length;
  const taken  = thisWeek.filter(r => r.status === "taken").length;
  const missed = thisWeek.filter(r => r.status === "missed").length;
  const adherencePercent = Math.round((taken / total) * 100);

  let trend = "stable";
  if (prevWeek.length > 0) {
    const prevTaken = prevWeek.filter(r => r.status === "taken").length;
    const prevAdh   = Math.round((prevTaken / prevWeek.length) * 100);
    const diff      = adherencePercent - prevAdh;
    if (diff >= 10)       trend = "improving";
    else if (diff <= -10) trend = "worsening";
  }

  // Per-medicine this week
  const medMap = {};
  thisWeek.forEach(r => {
    const name = r.medicineId?.medicineName || "Unknown";
    if (!medMap[name]) medMap[name] = { taken: 0, missed: 0 };
    if (r.status === "taken") medMap[name].taken++;
    else medMap[name].missed++;
  });

  // Per-medicine last week (for delta)
  const prevMedMap = {};
  prevWeek.forEach(r => {
    const name = r.medicineId?.medicineName || "Unknown";
    if (!prevMedMap[name]) prevMedMap[name] = { taken: 0, missed: 0 };
    if (r.status === "taken") prevMedMap[name].taken++;
    else prevMedMap[name].missed++;
  });

  const byMedicine = Object.entries(medMap).map(([name, s]) => {
    const thisAdh = Math.round((s.taken / (s.taken + s.missed)) * 100);
    const prev    = prevMedMap[name];
    const prevAdh = prev ? Math.round((prev.taken / (prev.taken + prev.missed)) * 100) : null;
    const delta   = prevAdh !== null ? thisAdh - prevAdh : null;
    return { name, taken: s.taken, missed: s.missed, adherence: thisAdh, delta };
  });

  const worstMedicine = byMedicine
    .filter(m => m.missed > 0)
    .sort((a, b) => a.adherence - b.adherence)[0] || null;

  const byDay = {};
  DAY_NAMES.forEach(d => (byDay[d] = { taken: 0, missed: 0 }));
  thisWeek.forEach(r => {
    const day = DAY_NAMES[new Date(r.time).getDay()];
    if (r.status === "taken") byDay[day].taken++;
    else byDay[day].missed++;
  });
  const worstDay = Object.entries(byDay)
    .filter(([, v]) => v.missed > 0)
    .sort((a, b) => b[1].missed - a[1].missed)[0]?.[0] || null;

  const byTime = {
    morning:   { taken: 0, missed: 0 },
    afternoon: { taken: 0, missed: 0 },
    evening:   { taken: 0, missed: 0 },
    night:     { taken: 0, missed: 0 },
  };
  thisWeek.forEach(r => {
    const slot = getTimeSlot(new Date(r.time).getHours());
    if (r.status === "taken") byTime[slot].taken++;
    else byTime[slot].missed++;
  });
  const mostMissedTimeSlot = Object.entries(byTime)
    .filter(([, v]) => v.missed > 0)
    .sort((a, b) => b[1].missed - a[1].missed)[0]?.[0] || "none";

  // --- FIXED STREAK: count consecutive days where ALL medicines were taken ---
  const dayMap = {};
  thisWeek.forEach(r => {
    const dateKey = new Date(r.time).toISOString().split("T")[0];
    if (!dayMap[dateKey]) dayMap[dateKey] = { taken: 0, missed: 0 };
    if (r.status === "taken") dayMap[dateKey].taken++;
    else dayMap[dateKey].missed++;
  });
  const sortedDays = Object.keys(dayMap).sort((a, b) => b.localeCompare(a));
  let streak = 0;
  for (const day of sortedDays) {
    if (dayMap[day].missed === 0 && dayMap[day].taken > 0) streak++;
    else break;
  }

  return {
    adherencePercent, total, taken, missed,
    trend, worstMedicine, byMedicine,
    worstDay, mostMissedTimeSlot, byTime,
    currentStreak: streak,
  };
};

const buildWeeklyTrend = async (userId) => {
  const now = new Date();
  const weeks = await Promise.all(
    Array.from({ length: 4 }, async (_, i) => {
      const end   = new Date(now); end.setDate(now.getDate() - i * 7);
      const start = new Date(end); start.setDate(end.getDate() - 6);
      const label = i === 0 ? "This week" : i === 1 ? "Last week" : `${i + 1} wks ago`;
      const rows  = await Reminder.find({
        userId,
        time:   { $gte: start, $lte: end },
        status: { $in: ["taken", "missed"] },
      });
      const t   = rows.filter(r => r.status === "taken").length;
      const tot = rows.length;
      return { label, taken: t, total: tot, pct: tot > 0 ? Math.round((t / tot) * 100) : 0 };
    })
  );
  weeks.reverse();
  return weeks;
};

export const generateInsightsForUser = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const week   = getWeekRange();

    // --- COOLDOWN CHECK ---
    const existing = await WeeklyInsight.findOne({ user_id: userId, week });
    if (existing?.last_generated_at) {
      const elapsed = Date.now() - new Date(existing.last_generated_at).getTime();
      if (elapsed < COOLDOWN_MS) {
        const remainingMins = Math.ceil((COOLDOWN_MS - elapsed) / 60000);
        return res.json({
          success:          true,
          insights:         existing.insights,
          week:             existing.week,
          created_at:       existing.created_at,
          weeklyTrend:      existing.weeklyTrend || [],
          adherenceRate:    existing.meta?.adherenceRate,
          weeklyTrendLabel: existing.meta?.weeklyTrendLabel,
          streak:           existing.meta?.streak,
          mostMissedTime:   existing.meta?.mostMissedTime,
          worstMedicine:    existing.meta?.worstMedicine,
          fromCache:        true,
          cooldownRemaining: remainingMins,
        });
      }
    }

    const stats = await buildRichStats(userId);
    if (!stats) {
      return res.json({ success: true, insights: [], weeklyTrend: [], message: "Not enough data yet" });
    }

    const weeklyTrend = await buildWeeklyTrend(userId);

    // --- LLM CALL WITH FALLBACK ---
    let llmResponse;
    try {
      llmResponse = await callLLM(stats);
      if (!llmResponse || !Array.isArray(llmResponse.insights)) {
        throw new Error("Invalid LLM response");
      }
    } catch (llmErr) {
      console.error("LLM call failed, falling back to cache:", llmErr.message);
      if (existing?.insights?.length > 0) {
        return res.json({
          success:          true,
          insights:         existing.insights,
          week:             existing.week,
          created_at:       existing.created_at,
          weeklyTrend:      existing.weeklyTrend || [],
          adherenceRate:    existing.meta?.adherenceRate,
          weeklyTrendLabel: existing.meta?.weeklyTrendLabel,
          streak:           existing.meta?.streak,
          mostMissedTime:   existing.meta?.mostMissedTime,
          worstMedicine:    existing.meta?.worstMedicine,
          fromCache:        true,
          llmError:         true,
        });
      }
      return res.status(503).json({ success: false, message: "AI service temporarily unavailable. Please try again shortly." });
    }

    const meta = {
      adherenceRate:    stats.adherencePercent,
      weeklyTrendLabel: stats.trend,
      streak:           stats.currentStreak,
      mostMissedTime:   stats.mostMissedTimeSlot,
      worstMedicine:    stats.worstMedicine?.name || null,
    };

    const doc = await WeeklyInsight.findOneAndUpdate(
      { user_id: userId, week },
      {
        insights:          llmResponse.insights,
        weeklyTrend,
        meta,
        created_at:        new Date(),
        last_generated_at: new Date(),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return res.json({
      success:          true,
      insights:         doc.insights,
      week:             doc.week,
      created_at:       doc.created_at,
      weeklyTrend:      doc.weeklyTrend || [],
      adherenceRate:    meta.adherenceRate,
      weeklyTrendLabel: meta.weeklyTrendLabel,
      streak:           meta.streak,
      mostMissedTime:   meta.mostMissedTime,
      worstMedicine:    meta.worstMedicine,
      fromCache:        false,
    });
  } catch (err) {
    console.error("generateInsightsForUser error:", err);
    return res.status(500).json({ success: false, message: "Failed to generate insights" });
  }
};

export const getUserWeeklyInsights = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const doc    = await WeeklyInsight.findOne({ user_id: userId }).sort({ created_at: -1 });

    if (doc) {
      return res.json({
        success:          true,
        insights:         doc.insights,
        week:             doc.week,
        created_at:       doc.created_at,
        weeklyTrend:      doc.weeklyTrend || [],
        // meta is now persisted — return it on GET too
        adherenceRate:    doc.meta?.adherenceRate,
        weeklyTrendLabel: doc.meta?.weeklyTrendLabel,
        streak:           doc.meta?.streak,
        mostMissedTime:   doc.meta?.mostMissedTime,
        worstMedicine:    doc.meta?.worstMedicine,
      });
    }

    return res.json({ success: true, insights: [], weeklyTrend: [] });
  } catch (err) {
    console.error("getUserWeeklyInsights error:", err);
    return res.status(500).json({ success: false, message: "Failed to fetch insights" });
  }
};