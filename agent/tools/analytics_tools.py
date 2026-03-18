from langchain_core.tools import tool
import os

from agent.utils.api_client import api_get, api_post


def make_analytics_tools(token: str, user_id: str):

    @tool
    def get_dashboard_stats(dummy_input: str = "") -> str:
        """
        Get the user's all-time overall medication adherence statistics.
        Call this for general health overview questions like:
        - "How am I doing overall?"
        - "What's my overall adherence?"
        - "Show me my health summary"
        No input needed — pass an empty string.
        """
        try:
            result = api_get("/api/v1/users/dashboard", token)
            data = result.get("data", {})

            taken = data.get("taken", 0)
            missed = data.get("missed", 0)
            total = taken + missed
            pct = round((taken / total) * 100) if total > 0 else 0

            performance = (
                "Outstanding! 🌟" if pct >= 90
                else "Good progress! 👍" if pct >= 70
                else "There's room to improve — the app can help! 💪" if pct >= 50
                else "Let's work on building better habits together. 🤝"
            )

            return (
                f"Your overall medication stats:\n"
                f"  ✅ Total doses taken: {taken}\n"
                f"  ❌ Total doses missed: {missed}\n"
                f"  📊 Overall adherence: {pct}%\n"
                f"  {performance}"
            )
        except Exception as e:
            return f"Error fetching dashboard stats: {str(e)}"

    @tool
    def get_weekly_insights(dummy_input: str = "") -> str:
        """
        Get AI-generated weekly health insights based on the user's medication data.
        Call this when the user asks for health insights, weekly report, AI analysis,
        personalized tips, or how to improve their adherence.
        No input needed — pass an empty string.
        """
        try:
            # Use the rich insights endpoint — it handles caching + rich LLM prompt
            result = api_post("/api/weekly-insights/generate", token, body={})
            insights = result.get("insights", [])

            if not insights:
                return (
                    "No insights are available yet. This usually means there isn't "
                    "enough medication history this week. Keep logging your doses and "
                    "check back soon! 💙"
                )

            priority_icon = {"high": "🔴", "medium": "🟡", "low": "🟢"}
            lines = []
            for i in insights:
                icon = priority_icon.get(i.get("priority", "medium"), "🟡")
                category = i.get("category", "General")
                text = i.get("text", "")
                lines.append(f"{icon} [{category}] {text}")

            from_cache = result.get("fromCache", False)
            freshness = " (updated just now)" if not from_cache else ""

            return f"Your weekly health insights{freshness}:\n\n" + "\n".join(lines)

        except Exception as e:
            return f"Error fetching weekly insights: {str(e)}"

    @tool
    def get_medicine_adherence(medicine_name: str) -> str:
        """
        Get detailed adherence statistics for one specific medicine.
        Call this when the user asks how well they are doing with a particular medicine.
        Input: the exact name of the medicine as a plain string (not JSON).
        Example input: "Metformin"
        """
        if not medicine_name or not medicine_name.strip():
            return "Please provide a medicine name."

        try:
            all_meds = api_get("/api/v1/medicine", token).get("data", [])
            match = next(
                (m for m in all_meds if m["medicineName"].lower() == medicine_name.strip().lower()),
                None,
            )
            if not match:
                return (
                    f"Could not find a medicine named '{medicine_name}'. "
                    "Use get_all_medicines to see your current list."
                )

            result = api_get(f"/api/v1/reminder/stats/medicine/{match['_id']}", token)
            data = result.get("data", {})

            taken = data.get("taken", 0)
            missed = data.get("missed", 0)
            pct = data.get("adherencePercent", 0)

            return (
                f"Adherence stats for {medicine_name}:\n"
                f"  ✅ Taken: {taken}\n"
                f"  ❌ Missed: {missed}\n"
                f"  📊 Adherence rate: {pct}%"
            )

        except Exception as e:
            return f"Error fetching medicine adherence: {str(e)}"

    return [get_dashboard_stats, get_weekly_insights, get_medicine_adherence]