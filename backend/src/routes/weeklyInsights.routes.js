import express from "express";
import { verifyJwt } from "../middleware/auth.middleware.js";
import {
  generateInsightsForUser,
  getUserWeeklyInsights,
} from "../controllers/weeklyInsights.controller.js";

const router = express.Router();

// Generate (or refresh) insights for the logged-in user
router.post("/generate", verifyJwt, generateInsightsForUser);

// Fetch the latest stored insights
router.get("/me", verifyJwt, getUserWeeklyInsights);

export default router;
