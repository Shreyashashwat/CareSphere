import Groq from "groq-sdk";
import dotenv from "dotenv";
dotenv.config();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export const callLLM = async (stats) => {
  const {
    adherencePercent,
    total,
    taken,
    missed,
    trend,
    worstMedicine,
    byMedicine,
    worstDay,
    mostMissedTimeSlot,
    byTime,
    currentStreak,
  } = stats;

 const medicineLines = (byMedicine || [])
  .map((m) => {
    const deltaStr = m.delta !== null && m.delta !== undefined
      ? ` [${m.delta >= 0 ? "+" : ""}${m.delta}% vs last week]`
      : "";
    return `  - ${m.name}: ${m.taken} taken, ${m.missed} missed (${m.adherence}% adherence${deltaStr})`;
  })
  .join("\n");

  const byTimeOfDay = byTime || {};
  const timeLines = Object.entries(byTimeOfDay)
    .map(([slot, v]) => `  - ${slot}: ${v.taken} taken, ${v.missed} missed`)
    .join("\n");

  const prompt = `
You are a compassionate medication adherence coach. Analyze the patient's weekly data and generate 4-5 highly specific, actionable insights.

STRICT RULES:
- Every insight MUST reference actual numbers or patterns from the data
- Category must be EXACTLY one of: "Timing", "Consistency", "Progress", "Medicine", "Lifestyle"
- Priority must be EXACTLY one of: "high", "medium", "low"
  "high" → urgent problems (0% adherence, missing 80%+ doses, worsening trend)
  "medium" → patterns worth improving
  "low" → positive observations, streaks, encouragement
- NEVER mark a positive insight as "high" or "medium"
- Respond ONLY in valid JSON — no markdown, no code fences

Example:
{
  "insights": [
    { "text": "You missed 8 afternoon doses — try a 2 PM alarm.", "category": "Timing", "priority": "high" },
    { "text": "Your adherence improved vs last week — great momentum!", "category": "Progress", "priority": "low" }
  ]
}

PATIENT DATA:
- Adherence: ${adherencePercent}% (${taken} taken / ${total} total)
- Missed: ${missed}
- Trend vs last week: ${trend}
- Streak: ${currentStreak} consecutive doses taken
- Most missed time: ${mostMissedTimeSlot}
- Worst day: ${worstDay || "none"}
${worstMedicine
    ? `- Hardest medicine: ${worstMedicine.name} (${worstMedicine.adherence}% adherence, missed ${worstMedicine.missed} times)`
    : "- All medicines taken consistently"}

Per-medicine:
${medicineLines || "  No data"}

Time-of-day:
${timeLines || "  No data"}
`;

  const response = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.4,
  });

  const text = response.choices[0].message.content;
  const cleaned = text.replace(/```json|```/g, "").trim();

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (err) {
    console.error("❌ Failed to parse Groq response:", cleaned);
    throw new Error("Groq returned invalid JSON");
  }

  const validCategories = ["Timing", "Consistency", "Progress", "Medicine", "Lifestyle"];
  const categoryFallbackMap = {
    "medication management": "Consistency",
    "medication reminders": "Timing",
    "adherence barriers": "Consistency",
    "medication review": "Medicine",
    "general": "Lifestyle",
  };
  const positiveKeywords = ["improved", "great", "keep up", "well done", "streak",
    "consistent", "doing well", "momentum", "progress", "all doses", "100%"];

  parsed.insights = parsed.insights.map((insight) => {
    if (!validCategories.includes(insight.category)) {
      insight.category = categoryFallbackMap[insight.category?.toLowerCase()] || "Lifestyle";
    }
    if (!["high", "medium", "low"].includes(insight.priority)) {
      insight.priority = "medium";
    }
    const isPositive = positiveKeywords.some((kw) => insight.text?.toLowerCase().includes(kw));
    if (isPositive && insight.priority === "high") insight.priority = "low";
    return insight;
  });

  if (!parsed.insights || !Array.isArray(parsed.insights)) {
    throw new Error("Groq response missing insights array");
  }

  return parsed;
};