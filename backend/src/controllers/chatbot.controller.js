import 'dotenv/config';
const { InferenceClient } = await import("@huggingface/inference");
console.log("OK");
import { getHistory } from "./history.controller.js";
import {verifyJwt} from "../middleware/auth.middleware.js";

const hfApiToken = process.env.HUGGINGFACEHUB_API_TOKEN;
if (!hfApiToken) {
  throw new Error("HUGGINGFACEHUB_API_TOKEN is not defined");
}
const client = new InferenceClient(hfApiToken);

export const chatbot = async (req, res) => {
  try {
    const { user_id, message } = req.body;

    const user = await verifyJwt(req);
    if (!user || user.id !== user_id) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const userData = await getHistory(user_id);
    const contextString = userData
      ? `Schedule: ${JSON.stringify(userData.schedule)}; Last taken: ${userData.lastTaken}`
      : "No medication data found.";

    const messages = [
      { role: "system", content: `You are a medical assistant chatbot. Use the following user data to answer: ${contextString}` },
      { role: "user", content: message },
    ];

    const response = await client.chatCompletion({
      model: "mistralai/Mistral-7B-Instruct-v0.2",
      messages,
      max_tokens: 512,
      temperature: 0.7,
    });

    const reply = response.choices?.[0]?.message?.content ?? "";

    return res.json({ reply });
  } catch (err) {
    console.error("Error in /chat:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};