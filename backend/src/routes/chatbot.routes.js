import express from "express";
const router = express.Router();
import {chatbot} from "../controllers/chatbot.controller.js";
import { verifyJwt } from "../middleware/auth.middleware.js";
router.post("/",verifyJwt,chatbot); 
export default router;