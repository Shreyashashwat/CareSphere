import express from "express";
const router = express.Router();
import {chatbot} from "../controllers/chatbot.controller.js";

router.post("/chat",chatbot); 
export default router;