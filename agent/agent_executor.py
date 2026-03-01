import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env from agent directory (uvicorn cwd may be project root)
load_dotenv(Path(__file__).resolve().parent / ".env")

from langchain_openai import ChatOpenAI
from langchain.agents import create_tool_calling_agent, AgentExecutor
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.messages import HumanMessage, AIMessage

from agent.tools.medicine_tools import make_medicine_tools
from agent.tools.reminder_tools import make_reminder_tools
from agent.tools.appointment_tools import make_appointment_tools
from agent.tools.analytics_tools import make_analytics_tools
from agent.prompts.system_prompt import SYSTEM_PROMPT
from agent.guardrails.input_guardrail import validate_input
from agent.guardrails.output_guardrail import validate_output, add_medical_disclaimer


def _build_agent(token: str, user_id: str) -> AgentExecutor:
    """
    Builds a fresh AgentExecutor for one request.
    A fresh executor is created per request — this is intentional.
    Tools capture the token via closure so the LLM never sees it.
    """
    llm = ChatOpenAI(
        model="gpt-4o-mini",
        temperature=0.2,
        openai_api_key=os.getenv("OPENAI_API_KEY"),
    )

    # Assemble all tools — token is baked in via closure
    all_tools = (
        make_medicine_tools(token)
        + make_reminder_tools(token)
        + make_appointment_tools(token)
        + make_analytics_tools(token, user_id)
    )


    prompt = ChatPromptTemplate.from_messages([
        ("system", SYSTEM_PROMPT),
        MessagesPlaceholder(variable_name="chat_history"),
        ("human", "{input}"),
        MessagesPlaceholder(variable_name="agent_scratchpad"),
    ])

    agent = create_tool_calling_agent(llm, all_tools, prompt)

    executor = AgentExecutor(
        agent=agent,
        tools=all_tools,
        verbose=True,             
        max_iterations=6,         
        handle_parsing_errors=True,
        return_intermediate_steps=False,
    )

    return executor


def run_agent(
    token: str,
    user_id: str,
    message: str,
    chat_history: list = None,
) -> str:
    """
    Main entry point called by main.py for every chat request.

    Flow:
    1. Input guardrail — block harmful messages
    2. Format conversation history
    3. Run LangChain agent (GPT-4o-mini + tools)
    4. Output guardrail — sanitize response
    5. Add medical disclaimer if flagged
    6. Return final reply string
    """

   
    is_valid, flag = validate_input(message)
    if not is_valid:
        return flag

    medical_flag = flag == "medical_flag"

    formatted_history = []
    if chat_history:
        
        for msg in chat_history:
            if msg.get("role") == "user":
                formatted_history.append(HumanMessage(content=msg["content"]))
            elif msg.get("role") == "assistant":
                formatted_history.append(AIMessage(content=msg["content"]))

    # ── 3. Run agent ──────────────────────────────────────────────────────────
    try:
        executor = _build_agent(token, user_id)
        result = executor.invoke({
            "input": message,
            "chat_history": formatted_history,
        })
        response = result.get("output", "").strip()

        if not response:
            return "I wasn't able to process that. Could you rephrase your question?"

    except Exception as e:
        import traceback
        error_str = str(e)
        print(f"[Agent Error] user={user_id} | error={error_str}")
        print(traceback.format_exc())

        if "429" in error_str or "rate_limit" in error_str.lower():
            return "I'm temporarily unavailable due to high demand. Please try again in a minute. ⏳"
        if "API_KEY" in error_str or "authentication" in error_str.lower() or "invalid_api_key" in error_str.lower():
            return "There's a configuration issue on our end. Please contact support."
        return "I ran into an issue processing your request. Please try again in a moment."

    # ── 4. Output guardrail ───────────────────────────────────────────────────
    is_safe, sanitized_response = validate_output(response)
    if not is_safe:
        return sanitized_response

    # ── 5. Medical disclaimer ─────────────────────────────────────────────────
    if medical_flag:
        sanitized_response = add_medical_disclaimer(sanitized_response)

    return sanitized_response
