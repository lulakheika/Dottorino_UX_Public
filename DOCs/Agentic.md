# Agentic Subsystem Analysis

This document details the functionality and structure of the code within the `BackEnd/Agentic` directory, which implements a multi-agent system for handling user requests, particularly in a medical assistant context.

## Overview

The `Agentic` subsystem utilizes the `agents-py` library (implied by the import structure `from agents import ...`) to create a system of specialized AI agents that collaborate to understand user intent, gather information, and provide responses or perform actions. The system is designed around an orchestrator pattern, where a central "Triage Agent" routes requests to specialized agents based on the user's query.

## Core Components

### 1. `Agents.py` - Agent Definitions and Orchestration

This file defines the core agents, their instructions, tools, and how they interact (handoffs).

*   **`MedicalAssistantContext` (Pydantic Model):** Defines the shared state or context passed between agents during a conversation. It includes:
    *   Basic identifiers: `conversation_id`, `user_id`, `user_name`.
    *   State relevant to the interaction: `selected_clinic_id`, `selected_department`.
    *   Communication tracking: `communication_type` ("user" or "internal"), `requesting_agent` (for internal calls).
    *   Response aggregation: `aggregated_response` (to build a coherent final answer across multiple agent steps).
    *   Tracking last action: `last_message`, `last_agent`.
*   **Agent Definitions:** Four main agents are defined using `agents.Agent`:
    *   **`kb_agent` (Knowledge Base Agent):**
        *   **Purpose:** Provides information about clinic services, procedures, policies, and preparation for visits. Acts as a knowledge source.
        *   **Knowledge:** Hardcoded knowledge includes available specialities (Dermatology, Orthopedics, etc.) and explicitly states that **Cardiology is NOT offered**. Knows about COVID tests.
        *   **Instructions:** Answer questions using KB, cite sources (though no KB tool is explicitly defined/used yet), handoff to Appointment Agent for booking or Medical Agent for general health questions.
        *   **Tools:** Initially defined with no tools, but later configured globally via `set_kb_agent` to be callable by `check_service_availability`.
    *   **`orchestrator_agent` (Triage Agent):**
        *   **Purpose:** The central router. Determines user intent and hands off to the appropriate specialist agent.
        *   **Routing Logic:**
            *   Medical symptoms/conditions -> `Medical Information Agent` FIRST.
            *   Appointment requests -> Use `check_service_availability` tool first. If available, handoff to `Appointment Agent`. If not, inform the user and consult `Knowledge Base Agent` for alternatives.
            *   Clinic info/policies/procedures -> `Knowledge Base Agent`.
        *   **Tools:**
            *   `check_service_availability`: Checks if a service is offered (calls `kb_agent`).
            *   `get_current_datetime`: Gets the current date/time for context.
        *   **Instructions:** Be empathetic, clarify ambiguity by choosing the best path (no user clarification prompts), handoff proactively.
        *   **Model Settings:** `tool_choice="required"` suggests it's expected to use a tool in most turns.
    *   **`medical_agent` (Medical Information Agent):**
        *   **Purpose:** Provides general medical information (symptoms, conditions, treatments) for *educational purposes only*.
        *   **Instructions:**
            1.  Provide textual medical explanation.
            2.  Add a disclaimer (not a substitute for professional advice).
            3.  ONLY THEN, evaluate handoff: to `Knowledge Base Agent` for clinic specifics, or to `Triage Agent` for appointment requests.
        *   **Tools:** None. Relies on its internal knowledge and LLM capabilities.
    *   **`db_agent` (Appointment Agent):**
        *   **Purpose:** Manages appointment scheduling (checking availability, booking, modifying, canceling).
        *   **Instructions (Strict Sequence):**
            1.  Check context for existing bookings for the slot.
            2.  Use `check_service_availability` tool.
            3.  If service unavailable, inform and terminate.
            4.  If available, use `get_current_datetime` to validate requested dates are in the future and provide context.
            5.  If no date provided, choose one arbitrarily in the future.
            6.  Use `get_fake_appointment_slot` tool to find specific times for the chosen/provided date.
            7.  After booking, consider handoff to KB (preparation info) or Medical (health questions).
        *   **Tools:**
            *   `get_fake_appointment_slot`: Returns hardcoded available time slots for specific dates (simulated booking system).
            *   `check_service_availability`: (Same as orchestrator's) Checks if the *service type* is offered.
            *   `get_current_datetime`: Gets current time.
        *   **Instructions:** Do NOT ask the user for clarification; infer department/specialist; choose date if not provided; avoid double-booking.
        *   **Model Settings:** `tool_choice="required"`.
*   **Handoff Configuration:**
    *   Orchestrator can handoff to any specialist (`kb`, `medical`, `db`).
    *   All specialists can handoff back to the Orchestrator.
    *   Specialists can also handoff directly to each other.
*   **Tool Behavior Integration:** Associates specific behaviors from `tool_behaviors.py` with each agent's tool usage (`tool_use_behavior`).
*   **Initialization (`if __name__ == "__main__":`)**: Contains code to run an interactive chat session using `Agentic.functions.interactive_chat`.

### 2. `functions.py` - Core Logic and Execution

This file contains the main functions for running conversations and managing the agent flow.

*   **`run_conversation` (async function):**
    *   The main entry point for processing a user message within the agent system.
    *   Takes `user_input`, optional `context` (`MedicalAssistantContext`), optional `input_items` (previous conversation turns), `is_internal` flag, and `requesting_agent` name.
    *   Initializes context if none provided.
    *   Sets `communication_type` and `requesting_agent` in the context.
    *   Appends the new user input to `input_items`.
    *   Sanitizes `input_items` using `sanitize_context_items` before passing them to the agent.
    *   Calls `Runner.run` on the `current_agent` (starts with `orchestrator_agent`).
    *   **Post-Execution Logic:** Iterates through `result.new_items` (actions taken by the agent(s) during the run):
        *   Logs agent messages, tool calls/outputs, and handoffs with colored output for readability (differentiates internal vs. user-facing steps).
        *   Aggregates direct text messages from agents into `context.aggregated_response` to build a final response, attempting to avoid duplicates.
    *   Updates `input_items` using `result.to_input_list()` for the next turn.
    *   Determines the final response to print (if not an internal call), prioritizing `result.final_output` but falling back to/combining with `context.aggregated_response` under certain conditions.
    *   Resets `context.aggregated_response`.
    *   Returns the `result` object, updated `input_items`, and the `current_agent`.
*   **`initialize_agents` (async function):** Ensures agents are set up correctly, specifically calling `set_kb_agent` to link the `kb_agent` instance to the `check_service_availability` tool function.
*   **`interactive_chat` (async function):**
    *   Provides a command-line interface for chatting with the agent system.
    *   Calls `initialize_agents`.
    *   Optionally loads previous conversation context using `load_context_from_md`.
    *   Enters a loop, taking user input.
    *   Handles special commands: `exit` (saves context, prints serialized context, breaks), `save` (saves context).
    *   Calls `run_conversation` for regular input.
    *   Prints context size after each turn.

### 3. `tools.py` - Agent Tool Definitions

Defines the functions available for agents to call.

*   **`@function_tool` decorator:** Marks functions as agent tools.
*   **`set_kb_agent` / `_kb_agent`:** Mechanism to inject the `kb_agent` instance into the `check_service_availability` tool, avoiding circular imports.
*   **`check_service_availability` (async tool):**
    *   **Purpose:** Checks if a specific `service` is offered by the clinic.
    *   **Logic:** Takes the `service` name, constructs a specific query asking for a SI/NO answer (`"La clinica offre il servizio di {service}? Rispondi SOLO con SI o NO..."`), runs this query on the globally set `_kb_agent`, parses the SI/NO from the response, and returns a dictionary `{"available": bool, "service": str, "kb_response": str}`.
*   **`get_fake_appointment_slot` (async tool):**
    *   **Purpose:** Simulates fetching available appointment slots.
    *   **Logic:** Takes a `date` (YYYY-MM-DD) and `department`. Returns a hardcoded string listing available times for that date from a predefined dictionary (`available_slots`). Stores the `department` in `context.context.selected_department`.
*   **`get_current_datetime` (async tool):**
    *   **Purpose:** Provides the current date and time.
    *   **Logic:** Gets `datetime.datetime.now()` and returns a dictionary with various formatted representations (ISO, date-only, time-only, readable formats, day of week, is_weekend, individual components).

### 4. `tool_behaviors.py` - Handling Tool Results

Defines how agents should react *immediately after* a tool call returns, before generating their next text response. This allows for standardized post-tool logic, like immediate termination if a service is unavailable.

*   **`ToolBehaviorManager` (class):** Contains static methods for different behaviors.
    *   **`handle_handoff_response`:** (Appears unused currently, but designed for aggregating responses during handoffs).
    *   **`handle_availability_check`:** Used by Triage Agent. If `check_service_availability` result has `"available": False`, it immediately creates a final output using the `kb_response` message and terminates the agent run (`is_final_output=True`). Otherwise, continues (`is_final_output=False`).
    *   **`handle_knowledge_lookup`:** Used by Medical Agent. Does nothing; allows the agent to process the tool result normally.
    *   **`handle_appointment_tools`:** Used by Appointment Agent. Similar to `handle_availability_check`, it terminates immediately with a specific message if `check_service_availability` returns `False`. For other tools (`get_datetime`, `get_slots`), it does nothing, letting the agent proceed.
    *   **`get_behavior_for_agent` (Factory Method):** Returns the appropriate handler function based on the agent's name. This function is assigned to the `agent.tool_use_behavior` attribute in `Agents.py`.

### 5. Utility Files

*   **`context_utils.py`:**
    *   `save_context_to_md`: Sanitizes (using `string_utils.sanitize_context_items`) and saves the `input_list` (conversation history) as JSON within a markdown code block to a file (default `chat_context.md`).
    *   `load_context_from_md`: Loads the JSON conversation history from the specified markdown file.
    *   `serialize_input_list`: Sanitizes and serializes the `input_list` to a JSON string (used before exiting interactive chat).
*   **`string_utils.py`:**
    *   `sanitize_unicode`: Removes invalid Unicode surrogate characters from text.
    *   `sanitize_context_items`: Recursively applies `sanitize_unicode` to all string values (specifically under the key `"content"`) within a list of context items (dictionaries).

### 6. Documentation/Log Files

*   **`chat_context.md`:** Default file for saving/loading interactive chat history.
*   **`Logs.md`:** Empty file, potentially intended for logging.
*   **`Docs/` directory:** Contains further documentation (`BetterStack.md`, `to_input_list.md`) and examples related to the agent framework or specific integrations (like BetterStack).

## Workflow Summary

1.  A user message comes into `run_conversation`.
2.  The message is added to the `input_items` list.
3.  The list is sanitized.
4.  `Runner.run` is called on the `orchestrator_agent`.
5.  The Orchestrator analyzes the intent.
    *   It might use `get_current_datetime` for context.
    *   It might use `check_service_availability` (calling the `kb_agent` implicitly).
    *   The `tool_use_behavior` (`handle_availability_check`) might terminate the run early if the service is unavailable.
6.  Based on intent and tool results, the Orchestrator either generates a response or initiates a handoff to a specialist agent (`kb_agent`, `medical_agent`, or `db_agent`).
7.  If handed off, the specialist agent receives the context and `input_items`.
8.  The specialist agent follows its instructions:
    *   `Medical Agent`: Generates text, adds disclaimer, considers handoff.
    *   `KB Agent`: Provides info, considers handoff.
    *   `Appointment Agent`: Follows strict tool sequence (`check_service_availability` -> `get_current_datetime` -> `get_fake_appointment_slot`), potentially terminating early based on `tool_use_behavior` (`handle_appointment_tools`).
9.  Specialist agents might handoff back to the Orchestrator or to another specialist.
10. This process (agent execution, tool use, handoff) continues until an agent produces a final output or a tool behavior forces termination.
11. `run_conversation` logs the steps and aggregates text responses.
12. A final response is constructed and returned/printed.
13. The updated `input_items` list is prepared for the next turn.
14. Context can be saved/loaded between sessions using the `.md` file.

This agentic system provides a structured way to handle complex conversational flows by breaking down tasks among specialized agents and tools.

## Detailed Analysis: Context Management

Context management is critical in this multi-agent system to ensure seamless conversation flow, both between user turns and during internal agent handoffs. The implementation relies on several key mechanisms:

*   **`MedicalAssistantContext` (Pydantic Model):** This acts as the primary shared state carrier *within* a single `Runner.run` execution. It holds information like `conversation_id`, `user_id`, potentially selected department (`selected_department`), and crucially, `aggregated_response` which is used in `functions.py` to build a coherent final output if multiple agents contribute text messages during a single turn.
*   **`input_items` List:** This list holds the structured conversation history. It's the primary mechanism for maintaining context *between* separate user interactions (API calls). It contains dictionaries representing user messages (`{"role": "user", "content": ...}`), agent messages (`MessageOutputItem`), tool calls (`ToolCallItem`), tool outputs (`ToolCallOutputItem`), and handoffs (`HandoffOutputItem`).
*   **`result.to_input_list()`:** This method, provided by the `agents-py` SDK (as documented in `Docs/to_input_list.md`), is fundamental. After a `Runner.run` completes, calling `result.to_input_list()` serializes the *entire* sequence of events (user inputs, agent messages, tool interactions, handoffs) from that run into the precise list-of-dictionaries format expected by the SDK for the *next* run. This ensures that subsequent agent executions have the complete history, including implicit context derived from tool calls or handoffs.
*   **Persistence (`context_utils.py`):**
    *   **Serialization Strategy:** The system adopts the recommended approach (from `Docs/to_input_list.md`) of storing the *output* of `to_input_list()` rather than attempting to serialize the complex `RunResult` object directly. `save_context_to_md` takes the `input_items` list (which is the result of a previous `to_input_list()` call), sanitizes it using `string_utils.sanitize_context_items` (removing problematic Unicode characters), and saves it as a JSON string within a Markdown code block in `chat_context.md` (or a specified file).
    *   **Loading:** `load_context_from_md` reads this file, extracts the JSON string, parses it back into the `input_items` list structure, ready to be used for the next `Runner.run` call.
    *   **`serialize_input_list`:** Provides a direct way to get the serializable JSON string representation of the current `input_items`, used when exiting the interactive chat.
*   **`RECOMMENDED_PROMPT_PREFIX` (`Agents.py`):** Imported from `agents.extensions.handoff_prompt` (as noted in `Docs/BetterStack.md`), this prefix is added to each agent's instructions. It provides standardized meta-instructions, making agents aware they operate within a multi-agent system, guiding them on how to handle receiving/initiating handoffs and maintaining conversational coherence when taking over from another agent.
*   **Sanitization (`string_utils.py`):** `sanitize_context_items` plays a vital role before saving or passing context to the LLM, preventing errors caused by invalid Unicode characters (like surrogates) sometimes present in web data or LLM outputs.

**In essence:** Context *within* a single complex turn (involving multiple agents/tools) is managed via `MedicalAssistantContext` and the internal state of `Runner.run`. Context *between* user turns (separate API calls) is managed by explicitly saving the serialized `input_items` list (generated by `to_input_list()`) to persistent storage (`chat_context.md` via `context_utils.py`) and reloading it for the next interaction.

## Detailed Analysis: Handoff Logic and Agent-as-Tool

The system employs both explicit handoffs and an "agent-as-tool" pattern to facilitate collaboration:

*   **Explicit Handoffs (`agent.handoffs` in `Agents.py`):**
    *   Agents are configured with a list of other agents they *can* hand off to.
    *   The `orchestrator_agent` acts as the central hub, capable of handing off to any specialist (`kb_agent`, `medical_agent`, `db_agent`).
    *   Specialists can hand back to the orchestrator and also directly to each other, enabling flexible routing.
    *   The decision to handoff is driven by the agent's LLM based on its instructions and the conversation context (e.g., "If the user asks about appointments, transfer to the Appointment Agent").
    *   The `RECOMMENDED_PROMPT_PREFIX` provides foundational instructions for how agents should behave during handoffs.
    *   When a handoff occurs, the `Runner` automatically passes the *entire* conversation history (formatted via `to_input_list()` internally) to the target agent.
*   **Agent-as-Tool (`kb_agent.as_tool`):**
    *   This pattern is used specifically for `check_service_availability`.
    *   Instead of defining `check_service_availability` as a regular tool that *contains* the logic to query the KB, the `kb_agent` itself is wrapped *as if* it were a tool.
    *   In `Agents.py`, `kb_agent.as_tool(...)` is used within the `tools` list of the `db_agent`. The name and description provided here (`tool_name="check_service_availability"`, `tool_description="..."`) are what the `db_agent` sees when deciding to call the tool.
    *   **Execution Flow:** When the `db_agent` (or `orchestrator_agent` which uses the direct `check_service_availability` function tool defined in `tools.py`) decides to call `check_service_availability`:
        1.  The call is intercepted.
        2.  The *actual* `kb_agent` is invoked via `Runner.run` with a specific, structured query generated within the `check_service_availability` function (`"La clinica offre il servizio di {service}? Rispondi SOLO con SI o NO..."`).
        3.  The `kb_agent` processes this internal query based on its own instructions (which include hardcoded knowledge about available/unavailable services).
        4.  The `kb_agent`'s textual response (e.g., "SI. Offriamo dermatologia...") is captured.
        5.  The `check_service_availability` function parses this text response to extract the boolean availability and the full explanation.
        6.  This parsed dictionary (`{"available": bool, ...}`) is returned as the *output* of the `check_service_availability` tool call to the original calling agent (`db_agent` or `orchestrator_agent`).
    *   **Benefits:** This allows the `kb_agent`'s internal knowledge and reasoning capabilities (even if simple hardcoding in this case) to be accessed like a standard tool, abstracting the knowledge source from the agents that need to query it.
*   **Tool Behaviors (`tool_behaviors.py`):** These functions provide immediate post-tool-call logic, often influencing the flow *before* the agent generates its next text response. For example, `handle_availability_check` and `handle_appointment_tools` check the output of `check_service_availability` and can force an immediate end to the interaction (`is_final_output=True`) if a service is found to be unavailable, preventing further unnecessary steps.

## Agent Tool Breakdown

Here's a summary of which agent uses which tools:

1.  **`orchestrator_agent` (Triage Agent):**
    *   `check_service_availability`: (Function Tool defined in `tools.py`) Checks if a service is offered by internally running the `kb_agent` with a specific query.
    *   `get_current_datetime`: (Function Tool) Gets the current date and time.
    *   **Tool Behavior:** `handle_availability_check` (terminates if service unavailable).

2.  **`medical_agent` (Medical Information Agent):**
    *   **Tools:** None. Relies on its LLM capabilities and instructions for generating information.
    *   **Tool Behavior:** `handle_knowledge_lookup` (effectively does nothing, standard flow).

3.  **`db_agent` (Appointment Agent):**
    *   `check_service_availability`: (Agent-as-Tool via `kb_agent.as_tool`) Checks service availability by invoking the `kb_agent`.
    *   `get_fake_appointment_slot`: (Function Tool) Simulates fetching appointment slots for a given date/department.
    *   `get_current_datetime`: (Function Tool) Gets the current date and time for validation/context.
    *   **Tool Behavior:** `handle_appointment_tools` (terminates if `check_service_availability` returns unavailable).

4.  **`kb_agent` (Knowledge Base Agent):**
    *   **Tools (as caller):** None explicitly defined in its `tools` list. It primarily acts as a knowledge source.
    *   **Tools (as target):** Is implicitly used *as a tool* by `check_service_availability`.
    *   **Tool Behavior:** Default (does nothing special). 