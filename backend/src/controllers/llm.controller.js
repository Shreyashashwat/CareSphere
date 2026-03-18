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
    byTimeOfDay,
    currentStreak,
  } = stats;

  const medicineLines = byMedicine
    .map((m) => `  - ${m.name}: ${m.taken} taken, ${m.missed} missed (${m.adherence}% adherence)`)
    .join("\n");

  const timeLines = Object.entries(byTimeOfDay)
    .map(([slot, v]) => `  - ${slot}: ${v.taken} taken, ${v.missed} missed`)
    .join("\n");

  const prompt = `
You are a compassionate medication adherence coach. Analyze the patient's weekly data below and generate 4-5 highly specific, actionable insights.

STRICT RULES:
- Every insight MUST reference actual numbers or patterns from the data below — no generic advice
- Be encouraging, not alarming
- Category must be EXACTLY one of these 5 strings, spelled and capitalized exactly like this:
  "Timing"      → use for insights about WHEN doses are missed (time of day, morning/evening/night)
  "Consistency" → use for insights about daily habits, streaks, and day-of-week patterns
  "Progress"    → use for insights about trends, improvement or worsening vs last week
  "Medicine"    → use for insights about a specific named medicine's adherence
  "Lifestyle"   → use for insights about routines, environment, and general habits
- DO NOT invent new category names. ONLY use the exact 5 strings above.

- Priority must be EXACTLY one of: "high", "medium", "low" with these strict meanings:
  "high"   → ONLY for urgent problems (e.g. 0% adherence on a medicine, missing 80%+ of doses, worsening trend, critical pattern)
  "medium" → for patterns worth improving but not critical (e.g. missing doses on specific days, one medicine slightly lagging)
  "low"    → for positive observations, encouragement, lifestyle tips, streaks, or anything going well
- NEVER mark a positive or encouraging insight as "high" or "medium"
- A streak, improvement vs last week, good adherence on a medicine = ALWAYS "low" priority
- Priority reflects URGENCY, not importance. Good news is never urgent.

- Respond ONLY in valid JSON — no markdown, no code fences, no explanation

Example of correct output:
{
  "insights": [
    { "text": "You missed 8 afternoon doses this week — try setting a 2 PM phone alarm to stay on track.", "category": "Timing", "priority": "high" },
    { "text": "Metformin was only taken 17% of the time — your hardest medicine this week.", "category": "Medicine", "priority": "high" },
    { "text": "Sundays are your toughest day with the most missed doses — try preparing your doses the night before.", "category": "Consistency", "priority": "medium" },
    { "text": "Your adherence improved vs last week — great momentum, keep building on this!", "category": "Progress", "priority": "low" },
    { "text": "You took all your dolo doses consistently this week — apply that same routine to your other medicines.", "category": "Medicine", "priority": "low" }
  ]
}

PATIENT DATA THIS WEEK:
- Overall adherence: ${adherencePercent}% (${taken} taken out of ${total} total doses)
- Missed doses: ${missed}
- Trend vs last week: ${trend}
- Current streak of consecutive taken doses: ${currentStreak}
- Most missed time of day: ${mostMissedTimeSlot}
- Worst day of the week: ${worstDay || "none identified"}
${worstMedicine
    ? `- Hardest medicine to remember: ${worstMedicine.name} (only ${worstMedicine.adherence}% adherence, missed ${worstMedicine.missed} times)`
    : "- All medicines taken consistently"}

Per-medicine breakdown:
${medicineLines || "  No medicine data"}

Time-of-day breakdown:
${timeLines}
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

  // Sanitize categories — if LLM still returns a wrong one, map it to closest valid
  const validCategories = ["Timing", "Consistency", "Progress", "Medicine", "Lifestyle"];
  const categoryFallbackMap = {
    "medication management": "Consistency",
    "medication reminders":  "Timing",
    "adherence barriers":    "Consistency",
    "medication review":     "Medicine",
    "general":               "Lifestyle",
  };

  // Sanitize priorities — positive/encouraging insights must never be high
  const positiveKeywords = ["improved", "great", "keep up", "well done", "streak", "consistent",
    "doing well", "momentum", "progress", "all doses", "100%", "nicely done"];

  parsed.insights = parsed.insights.map((insight) => {
    // Fix bad categories
    if (!validCategories.includes(insight.category)) {
      const mapped = categoryFallbackMap[insight.category?.toLowerCase()];
      insight.category = mapped || "Lifestyle";
    }

    // Fix bad priorities
    if (!["high", "medium", "low"].includes(insight.priority)) {
      insight.priority = "medium";
    }

    // Server-side safety net: if insight text is positive/encouraging, cap at low
    const textLower = insight.text?.toLowerCase() || "";
    const isPositive = positiveKeywords.some((kw) => textLower.includes(kw));
    if (isPositive && insight.priority === "high") {
      insight.priority = "low";
    }

    return insight;
  });

  if (!parsed.insights || !Array.isArray(parsed.insights)) {
    throw new Error("Groq response missing insights array");
  }

  return parsed;
};