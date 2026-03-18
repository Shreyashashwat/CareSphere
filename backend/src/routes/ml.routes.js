import express from "express";

import { trainAdherenceModel } from "../ml/train.js";
import { getUserWeeklyInsights, processUserWeeklyInsights } from "../controllers/user.controller.js";
import { verifyJwt } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/train", async (req, res) => {
  try {
    await trainAdherenceModel();
    res.json({ success: true, message: "Model trained successfully" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/weekly-insights/:userId', getUserWeeklyInsights);

// On-demand insight generation for the logged-in user only
router.post('/weekly-insights/generate', verifyJwt, async (req, res) => {
  try {
    const userId = req.user._id;
    await processUserWeeklyInsights(userId);
    res.json({ success: true, message: "Insights generated" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
