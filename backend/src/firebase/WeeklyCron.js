import cron from "node-cron";
// Weekly insights are now generated on-demand via POST /api/weekly-insights/generate
// The old cron-based batch generation has been replaced by the new system.
// This file is kept for reference but the cron is disabled.

// cron.schedule("0 0 * * 0", async () => {
//   await generateWeeklyInsightsForAllUsers();
// });
