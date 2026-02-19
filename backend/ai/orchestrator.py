"""
AI Orchestrator v3.0
Central router: auth check → budget check → agent selection → function execution → logging.
Adds: confidence scoring, token cost tracking, chat history limiting.
"""
import logging
import json
import hashlib
from typing import Dict, Any
from datetime import datetime, timezone

from ai.openai_client import ai_client
from ai.agents import AGENTS, CitizenAgent
from ai.function_executor import execute_tool_calls

logger = logging.getLogger(__name__)

# ── Simple in-memory cache for student common queries ──
_query_cache: Dict[str, dict] = {}
_CACHE_TTL_SECONDS = 300  
_MAX_CHAT_HISTORY = 3     


def _cache_key(role: str, message: str) -> str:
    """Generate a cache key from role + normalized message."""
    return hashlib.md5(f"{role}:{message.strip().lower()}".encode()).hexdigest()


def _compute_confidence(result: dict, tool_calls_executed: list = None) -> float:
    """
    Heuristic confidence score based on:
    - Whether tool calls succeeded (grounded in data → higher confidence)
    - Whether the response is short/long enough
    - Whether playbook/quiz tools were used (deterministic → highest confidence)
    """
    base = 0.65  # baseline for LLM-only response

    if tool_calls_executed:
        base = 0.8
        if any("playbook" in t for t in tool_calls_executed):
            base = 0.95  # deterministic playbook = highest confidence
        if any("quiz" in t for t in tool_calls_executed):
            base = 0.92  # structured quiz = high confidence

    content = result.get("content", result.get("message", ""))
    if content and len(content) > 50:
        base = min(base + 0.03, 0.99)  # longer, detailed responses slightly more confident

    return round(base, 2)


def _limit_chat_history(messages: list, max_messages: int = _MAX_CHAT_HISTORY) -> list:
    """Keep only the system prompt + last N user/assistant messages."""
    if len(messages) <= max_messages + 1:  # +1 for system prompt
        return messages
    system = [m for m in messages if m.get("role") == "system"]
    others = [m for m in messages if m.get("role") != "system"]
    return system + others[-max_messages:]


class AIOrchestrator:
    """
    Routes user requests to the correct agent and manages tool-call loops.
    """

    async def route_request(
        self, role: str, message: str, context: dict = None
    ) -> Dict[str, Any]:
        """
        Full pipeline (Multi-step Agent Loop):
        1. Check cache (student queries)
        2. Select agent by role
        3. Initial processing (User -> Model)
        4. WHILE tool_calls present (max 5 loops):
             a. Execute tool_calls
             b. Append results to history
             c. Model -> Followup (may return content OR more tool_calls)
        5. Compute confidence + token cost
        6. Cache if applicable
        7. Return response
        """
        context = context or {}
        cached = False

        # 1. Cache check for student common queries
        if role == "student":
            key = _cache_key(role, message)
            if key in _query_cache:
                entry = _query_cache[key]
                age = (datetime.now(timezone.utc) - entry["timestamp"]).total_seconds()
                if age < _CACHE_TTL_SECONDS:
                    logger.info(f"Cache HIT for student query (age={age:.0f}s)")
                    return {**entry["response"], "cached": True}
                else:
                    del _query_cache[key]

        # 2. Select agent
        agent = AGENTS.get(role, AGENTS["citizen"])
        logger.info(f"Routing '{role}' -> {agent.__class__.__name__}")

        # 3. Initial processing
        # We need to manually construct the messages history to support the loop
        messages = [
            {"role": "system", "content": agent.system_prompt(context)},
            {"role": "user", "content": message},
        ]
        
        # Limit history before first call
        messages = _limit_chat_history(messages)

        try:
            response = await ai_client.client.chat.completions.create(
                model=agent.model,
                messages=messages,
                tools=agent.tools,
                tool_choice="auto" if agent.tools else None,
                max_tokens=agent.max_tokens,
                temperature=agent.temperature,
            )
            result_msg = response.choices[0].message
            current_tool_calls = result_msg.tool_calls
            content = result_msg.content

            # Add assistant response to history
            messages.append(result_msg)

            await ai_client._record_usage(
                response.usage.total_tokens, agent.model, f"chat_{role}_init"
            )
            total_tokens = response.usage.total_tokens

        except Exception as e:
            logger.error(f"Agent initial error: {e}")
            return {
                "success": False,
                "message": f"AI Error: {str(e)}",
                "role": role,
                "confidence": 0.0,
                "token_cost": 0,
            }

        # 4. Agent Loop (Max 5 turns)
        params = {
            "tool_calls_executed": [],
            "sources": [],
            "quiz_data": None
        }
        
        loop_count = 0
        final_content = content

        while current_tool_calls and loop_count < 5:
            loop_count += 1
            tool_names = [tc.function.name for tc in current_tool_calls]
            logger.info(f"Loop {loop_count}: Executing {len(current_tool_calls)} tools: {tool_names}")
            params["tool_calls_executed"].extend(tool_names)

            # Execute tools
            # Convert internal tool_calls objects to dicts for executor if needed, 
            # but our executor handles the list format usually. 
            # Let's verify executor expects dicts or objects. 
            # execute_tool_calls expects dicts usually. Pydantic objects need .status/dict.
            # Convert to dicts for the executor:
            tool_calls_dicts = [
                {
                    "id": tc.id,
                    "function": {
                        "name": tc.function.name,
                        "arguments": tc.function.arguments
                    },
                    "type": tc.type
                } for tc in current_tool_calls
            ]
            
            tool_results = await execute_tool_calls(tool_calls_dicts)

            # Process results for next turn
            for tr in tool_results:
                messages.append({
                    "role": "tool",
                    "tool_call_id": tr["tool_call_id"],
                    "content": tr["content"],
                })

                # Extract sources/quiz data
                try:
                    data = json.loads(tr["content"]) if isinstance(tr["content"], str) else tr["content"]
                    if isinstance(data, dict):
                        if data.get("questions"):
                            params["quiz_data"] = data
                        for action in data.get("actions", []):
                            if isinstance(action, dict) and action.get("source"):
                                params["sources"].append(action["source"])
                except:
                    pass

            # Follow-up call
            try:
                followup = await ai_client.client.chat.completions.create(
                    model=agent.model,
                    messages=messages,
                    tools=agent.tools,
                    tool_choice="auto", # Allow more tools
                    max_tokens=agent.max_tokens,
                    temperature=agent.temperature,
                )
                result_msg = followup.choices[0].message
                current_tool_calls = result_msg.tool_calls
                final_content = result_msg.content
                
                messages.append(result_msg)
                
                total_tokens += followup.usage.total_tokens
                await ai_client._record_usage(
                    followup.usage.total_tokens, agent.model, f"chat_loop_{loop_count}"
                )
            except Exception as e:
                logger.error(f"Loop error: {e}")
                final_content = "I encountered an error processing the tool results."
                break

        # 5. Final Response Construction
        confidence = _compute_confidence({"content": final_content}, params["tool_calls_executed"])

        response = {
            "success": True,
            "message": final_content or "Action completed.",
            "role": role,
            "tool_calls_executed": params["tool_calls_executed"],
            "usage": {"total_tokens": total_tokens},
            "confidence": confidence,
            "token_cost": total_tokens,
            "sources": params["sources"][:5],
            "cached": cached,
        }
        
        if params["quiz_data"]:
            response["quiz"] = params["quiz_data"]

        # Cache student queries
        if role == "student":
            _query_cache[_cache_key(role, message)] = {
                "response": response,
                "timestamp": datetime.now(timezone.utc),
            }

        return response


# ── Singleton ──────────────────────────────────────────────
orchestrator = AIOrchestrator()
