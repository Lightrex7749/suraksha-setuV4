"""
AI Orchestrator
Central router: auth check → budget check → agent selection → function execution → logging.
"""
import logging
import json
import uuid
from typing import Dict, Any
from datetime import datetime, timezone

from ai.openai_client import ai_client
from ai.agents import AGENTS, CitizenAgent
from ai.function_executor import execute_tool_calls

logger = logging.getLogger(__name__)


class AIOrchestrator:
    """
    Routes user requests to the correct agent and manages tool-call loops.
    """

    async def route_request(
        self, role: str, message: str, context: dict = None
    ) -> Dict[str, Any]:
        """
        Full pipeline:
        1. Select agent by role
        2. Agent processes message (may return tool_calls)
        3. Execute tool_calls if present
        4. Feed tool results back for final answer
        5. Return response with usage metadata
        """
        context = context or {}

        # 1. Select agent
        agent = AGENTS.get(role, AGENTS["citizen"])
        logger.info(f"🤖 Routing '{role}' → {agent.__class__.__name__}")

        # 2. Initial processing
        result = await agent.process(message, context)

        if result.get("error"):
            return {
                "success": False,
                "message": result["error"],
                "role": role,
            }

        # 3. Handle tool_calls (single round)
        if result.get("tool_calls"):
            logger.info(f"🔧 Executing {len(result['tool_calls'])} tool calls")
            tool_results = await execute_tool_calls(result["tool_calls"])

            # 4. Feed tool results back to model for final answer
            messages = [
                {"role": "system", "content": agent.system_prompt(context)},
                {"role": "user", "content": message},
                {"role": "assistant", "content": None, "tool_calls": [
                    {"id": tc["function"]["name"] + "_call",
                     "type": "function",
                     "function": tc["function"]}
                    for tc in result["tool_calls"]
                ]},
            ]
            for tr in tool_results:
                messages.append({
                    "role": "tool",
                    "tool_call_id": tr["tool_call_id"],
                    "content": tr["content"],
                })

            try:
                followup = await ai_client.client.chat.completions.create(
                    model=agent.model,
                    messages=messages,
                    max_tokens=agent.max_tokens,
                    temperature=agent.temperature,
                )
                final_content = followup.choices[0].message.content
                total_tokens = (
                    result.get("usage", {}).get("total", 0)
                    + followup.usage.total_tokens
                )
                await ai_client._record_usage(
                    followup.usage.total_tokens, agent.model, "chat_followup"
                )
            except Exception as e:
                logger.error(f"Followup error: {e}")
                # Use tool results as fallback
                final_content = "\n".join(
                    json.loads(tr["content"]).get("actions", tr["content"])
                    if isinstance(tr["content"], str) else str(tr["content"])
                    for tr in tool_results
                )
                total_tokens = result.get("usage", {}).get("total", 0)

            return {
                "success": True,
                "message": final_content,
                "role": role,
                "tool_calls_executed": [tc["function"]["name"] for tc in result["tool_calls"]],
                "usage": {"total_tokens": total_tokens},
            }

        # 5. Direct response (no tools)
        return {
            "success": True,
            "message": result.get("content", ""),
            "role": role,
            "usage": result.get("usage"),
        }


# ── Singleton ──────────────────────────────────────────────
orchestrator = AIOrchestrator()
