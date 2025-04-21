from agents import function_tool, RunContextWrapper
from typing import Any, Optional, Dict
import httpx
import logging
from pydantic import Field

# Importa la funzione per determinare l'owner_id corretto per Trieve
from routes.message import determine_owner_id
# Importa le impostazioni (chiavi API, dataset, ecc.)
from config import settings

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Define custom exception for KB tools
class KBToolError(Exception):
    pass

# Qui potrai aggiungere i tool agentici per Trieve, ad esempio:
# @function_tool
# async def create_trieve_topic(...):
#     ...

# @function_tool
# async def send_trieve_message(...):
#     ... 

# Removed topic_tool_docstring
# Removed old create_trieve_topic
# Removed old send_trieve_message

# --- Helper Function ---
async def _get_trieve_topic_by_name(owner_id: str, topic_name: str, context: RunContextWrapper[Any]) -> Optional[Dict[str, Any]]:
    """Internal helper to find a Trieve topic by name for a specific owner."""
    headers = {
        "Authorization": settings.TRIEVE_API_KEY,
        "TR-Dataset": settings.TRIEVE_DATASET_ID,
        "Content-Type": "application/json",
    }
    # Note: Trieve API might not have a direct "get by name" endpoint exposed.
    # The common way is to list topics for the owner and filter by name.
    list_url = f"{settings.TRIEVE_BASE_URL}/topic/owner/{owner_id}"
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(list_url, headers=headers)
            response.raise_for_status()
            topics = response.json()
            for topic in topics:
                # Ensure we only match non-deleted topics with the exact name
                if topic.get("name") == topic_name and not topic.get("deleted"):
                    logger.info(f"Found existing Trieve topic '{topic_name}' with ID: {topic.get('id')}")
                    # Store the found ID in context for potential later use in the same turn
                    if hasattr(context.context, 'current_trieve_topic_id'):
                         context.context.current_trieve_topic_id = topic.get("id")
                    return topic
            logger.info(f"No existing Trieve topic found with name '{topic_name}' for owner '{owner_id}'.")
            return None
    except httpx.HTTPStatusError as e:
        # Log more details on HTTP errors
        logger.error(f"[_get_trieve_topic_by_name] HTTP error fetching topics for owner {owner_id}: {e.response.status_code} - {e.response.text}", exc_info=True)
        raise KBToolError(f"Error checking Trieve topics: Status {e.response.status_code}") from e
    except Exception as e:
        # Log details for other exceptions
        logger.error(f"[_get_trieve_topic_by_name] Error checking Trieve topics for owner {owner_id}: {e}", exc_info=True)
        raise KBToolError(f"Error checking Trieve topics: {type(e).__name__}") from e

@function_tool
async def ensure_trieve_topic_exists_tool(
    context: RunContextWrapper[Any],
    # No parameters for the LLM to decide here!
    # topic_suffix will be derived internally (e.g., from conversation_id or default)
    # trieve_title could be an optional param if needed, but start simple.
):
    """
    Ensures a Trieve topic exists for the current conversation context.
    It checks if a topic based on the context's identifiers already exists.
    If it exists, it uses that one. If not, it creates a new one.
    The resulting topic ID is stored in the context for use by other tools in the same turn.
    This tool should typically be called before sending a message if unsure a topic exists.
    """
    logger.info("Executing ensure_trieve_topic_exists_tool...")

    if not all(hasattr(context.context, attr) for attr in ['request_user_id', 'request_client_id', 'request_is_guest', 'conversation_id']):
         raise KBToolError("Context is missing required identifiers (request_user_id, request_client_id, request_is_guest, conversation_id).")

    # --- Determine Owner and Topic Name Internally ---
    # Decide the suffix strategy here: use conversation_id? or a default?
    # Using conversation_id ensures a unique topic per agentic conversation.
    # If conversation_id is not reliably unique or available, use a default.
    # Let's assume conversation_id is available and suitable for now.
    topic_suffix = context.context.conversation_id
    if not topic_suffix:
         # Fallback if conversation_id isn't set
         topic_suffix = "AgenticMainTopic"
         logger.warning(f"Context conversation_id missing, using default suffix: {topic_suffix}")

    # topic_id is None because we are trying to find/create based on name
    try:
        owner_id, base_topic_name = determine_owner_id(
            client_id=context.context.request_client_id,
            user_id=context.context.request_user_id,
            is_guest=context.context.request_is_guest,
            topic_suffix=topic_suffix,
            topic_id=None # Important: We are determining name, not verifying existing ID
        )
    except Exception as e:
        logger.error(f"[get_info_from_trieve_tool] Error calling determine_owner_id: {e}", exc_info=True)
        raise KBToolError(f"Failed to determine Trieve owner/topic name: {type(e).__name__}") from e

    if not owner_id or not base_topic_name:
        raise KBToolError("Could not determine valid owner_id or topic_name from context.")

    # For now, let's keep the name simple, without the §title part.
    # If title is needed, it could be passed as an optional arg or derived from context.
    final_topic_name = base_topic_name
    logger.info(f"Determined owner_id: {owner_id}, final_topic_name: {final_topic_name}")

    # --- Check if Topic Exists ---
    existing_topic = await _get_trieve_topic_by_name(owner_id, final_topic_name, context)

    if existing_topic:
        topic_id = existing_topic.get("id")
        if not topic_id:
             raise KBToolError(f"Existing topic found but has no ID: {existing_topic}")
        logger.info(f"Using existing Trieve topic ID: {topic_id}")
        # Ensure context is updated
        context.context.current_trieve_topic_id = topic_id
        return f"Confirmed Trieve topic '{final_topic_name}' exists with ID: {topic_id}"

    # --- Create Topic If Not Exists ---
    logger.info(f"Topic '{final_topic_name}' not found. Creating new topic...")
    create_url = f"{settings.TRIEVE_BASE_URL}/topic"
    headers = {
        "Authorization": settings.TRIEVE_API_KEY,
        "TR-Dataset": settings.TRIEVE_DATASET_ID,
        "Content-Type": "application/json",
    }
    payload = {
        "owner_id": owner_id,
        "name": final_topic_name,
        # Add other creation params if needed (first_user_message, etc.)
    }
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(create_url, headers=headers, json=payload)
            response.raise_for_status()
            new_topic = response.json()
            topic_id = new_topic.get("id")
            if not topic_id:
                 raise KBToolError(f"Topic created but API did not return an ID: {new_topic}")
            logger.info(f"[get_info_from_trieve_tool] Successfully created new Trieve topic ID: {topic_id}")
            # Store the new ID in context
            context.context.current_trieve_topic_id = topic_id
            return f"Successfully created new Trieve topic '{final_topic_name}' with ID: {topic_id}"
    except httpx.HTTPStatusError as e:
        logger.error(f"[get_info_from_trieve_tool] HTTP error creating topic: {e.response.status_code} - {e.response.text}", exc_info=True)
        raise KBToolError(f"Error creating Trieve topic: Status {e.response.status_code}") from e
    except Exception as e:
        logger.error(f"[get_info_from_trieve_tool] Error creating Trieve topic: {e}", exc_info=True)
        raise KBToolError(f"Error creating Trieve topic: {type(e).__name__}") from e

@function_tool
async def send_trieve_message_tool(
    context: RunContextWrapper[Any],
    user_message: str = Field(..., description="The message content to send to the Trieve chat topic."),
    # No topic_id parameter for the LLM! It comes from context.
):
    """
    Sends the user's message to the currently active Trieve topic associated with this conversation context.
    Requires 'ensure_trieve_topic_exists_tool' to have been called previously in the turn to set the topic ID in the context.
    """
    logger.info(f"Executing send_trieve_message_tool with message: '{user_message}'")

    if not hasattr(context.context, 'current_trieve_topic_id') or not context.context.current_trieve_topic_id:
        raise KBToolError("Cannot send message: Trieve topic ID not found in context. Was ensure_trieve_topic_exists_tool called first?")

    topic_id = context.context.current_trieve_topic_id
    logger.info(f"Sending message to Trieve topic ID: {topic_id}")

    send_url = f"{settings.TRIEVE_BASE_URL}/message"
    headers = {
        "Authorization": settings.TRIEVE_API_KEY,
        "TR-Dataset": settings.TRIEVE_DATASET_ID,
        "Content-Type": "application/json",
    }
    # Construct the payload similar to routes/message.py
    payload = {
        "topic_id": topic_id,
        "new_message_content": user_message,
        "stream_response": False, # Assuming non-streaming for agent tools for simplicity
        # Add llm_options if needed, potentially derived from context or settings
        "llm_options": {
             "model": settings.MODEL_NAME # Example
        },
        "search_type": "semantic", # Or make this configurable if needed
        "page_size": settings.TRIEVE_PAGE_SIZE,
    }

    try:
        async with httpx.AsyncClient(timeout=60.0) as client: # Increased timeout
            response = await client.post(send_url, headers=headers, json=payload)
            response.raise_for_status()
            trieve_response_raw = response.text # Trieve often sends text containing JSON

            # Parse the Trieve response (similar to routes/message.py)
            # Expected format: "AI message ||[chunks_json]"
            split_index = trieve_response_raw.find("||[")
            ai_message = trieve_response_raw
            chunks_str = "[]" # Default to empty chunks

            if split_index != -1:
                ai_message = trieve_response_raw[:split_index].strip()
                chunks_str = trieve_response_raw[split_index + 2:].strip()
                if not chunks_str.endswith("]"): # Basic check for completeness
                     logger.warning(f"Potential parsing issue with chunks string: {chunks_str}")
                     chunks_str = "[]" # Reset if it seems malformed
            else:
                 logger.warning("Trieve response delimiter '||[' not found.")

            logger.info(f"Received Trieve response: '{ai_message[:100]}...'") # Log truncated message
            # Return the AI message part; the agent will formulate the final response.
            # We could also return the chunks if needed by the agent.
            return f"Message sent to Trieve. Response: {ai_message}"

    except httpx.HTTPStatusError as e:
        logger.error(f"[get_info_from_trieve_tool] HTTP error sending message to topic {topic_id}: {e.response.status_code} - {e.response.text}", exc_info=True)
        raise KBToolError(f"Error sending message to Trieve: Status {e.response.status_code}") from e
    except Exception as e:
        logger.error(f"[get_info_from_trieve_tool] Error sending message to topic {topic_id}: {e}", exc_info=True)
        raise KBToolError(f"Error sending message to Trieve: {type(e).__name__}") from e

# Removed get_trieve_history_tool 