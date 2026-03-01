import 'dotenv/config';
import axios from 'axios';

const AGENT_URL = process.env.PYTHON_AGENT_URL || "http://localhost:8002";

export const chatbot = async (req, res) => {
  try {
    const { userId, message, sessionId } = req.body;

    // Security: ensure the logged-in user matches userId
    const loggedInUserId = req.user._id || req.user.id;
    if (!loggedInUserId || loggedInUserId.toString() !== userId.toString()) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    if (!message || !message.trim()) {
      return res.status(400).json({ error: "Message is required" });
    }

    if (!sessionId) {
      return res.status(400).json({ error: "sessionId is required" });
    }

    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ error: "No token found" });
    }

    // Forward to Python agent — no chat_history, agent fetches from Redis
    const agentResponse = await axios.post(
      `${AGENT_URL}/chat`,
      { userId, message, token, sessionId },
      { timeout: 90000 }
    );

    return res.json({
      reply: agentResponse.data.reply,
      sessionId: agentResponse.data.sessionId,
    });

  } catch (err) {
    console.error("Agent call failed:", err?.response?.data || err.message);
    const isTimeout = err?.code === "ECONNABORTED" || err?.message?.includes("timeout");
    const statusCode = err?.response?.status || (isTimeout ? 504 : 500);
    const message =
      statusCode === 503 ? "The AI assistant is currently unavailable. Please try again shortly."
      : isTimeout       ? "The request took too long. Please try again."
      :                   "Something went wrong. Please try again.";
    return res.status(statusCode).json({ error: message });
  }
};


export const clearChatSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    await axios.delete(`${AGENT_URL}/chat/${sessionId}`, { timeout: 5000 });
    return res.json({ status: "cleared" });
  } catch (err) {
    console.error("Clear session failed:", err.message);
    return res.status(500).json({ error: "Failed to clear session" });
  }
};