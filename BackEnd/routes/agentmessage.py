from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel
from typing import Optional, Any
import json

# Import necessary components from the Agentic subsystem
# Assuming Agentic is in the parent directory relative to routes
import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))
from Agentic.functions import run_conversation
from Agentic.Agents import MedicalAssistantContext

# --- Pydantic Models ---

class AgentChatRequest(BaseModel):
    user_message: str
    agent_context: Optional[Any] = None # Serialized input_items (JSON string or dict/list)

class AgentChatResponse(BaseModel):
    ai_response: str
    updated_agent_context: Any # Serialized updated input_items (JSON string or dict/list)

# --- Router ---

router = APIRouter()

@router.post("/agentchat", response_model=AgentChatResponse)
async def agent_chat(
    request: AgentChatRequest,
    client_id: Optional[str] = Header(None, alias="X-Client-ID"),
    user_id: Optional[str] = Header(None, alias="X-User-ID"),
    is_guest: bool = Header(False, alias="X-Is-Guest")
):
    """
    Endpoint to handle chat interactions via the Agentic subsystem.
    Receives the user message and the current agent conversation context,
    invokes the agentic system, and returns the AI response along with
    the updated context.
    """
    print(f"Received agent chat request:")
    print(f"  User Message: {request.user_message}")
    print(f"  Client ID: {client_id}")
    print(f"  User ID: {user_id}")
    print(f"  Is Guest: {is_guest}")
    # print(f"  Agent Context: {request.agent_context}") # Careful logging context

    # --- Logic Implementation ---

    # 1. Deserialize agent_context into input_items list
    input_items = []
    if request.agent_context:
        try:
            # Assuming agent_context is passed as a JSON string
            # If it's passed as a dict/list directly by FastAPI, json.loads might not be needed
            # Depending on how the frontend sends it.
            # Let's assume JSON string for now.
            if isinstance(request.agent_context, str):
                input_items = json.loads(request.agent_context)
                if not isinstance(input_items, list):
                    print("Warning: Deserialized context is not a list, resetting.")
                    input_items = [] # Ensure it's a list
            elif isinstance(request.agent_context, list): # Handle if already parsed by FastAPI
                 input_items = request.agent_context
            else:
                print(f"Warning: agent_context is of unexpected type: {type(request.agent_context)}. Resetting context.")
                input_items = []

            print(f"Successfully deserialized/loaded agent_context. Items count: {len(input_items)}")

        except json.JSONDecodeError:
            print("Error: Failed to deserialize agent_context. Starting with empty context.")
            input_items = []
        except Exception as e:
            print(f"Error processing agent_context: {e}. Starting with empty context.")
            input_items = []
    else:
        print("No agent_context provided. Starting with empty context.")

    # 2. & 3. Create/Load MedicalAssistantContext using user identifiers
    # We need a way to uniquely identify this conversation session for the context.
    # Using user_id or client_id might work for simple cases, but ideally,
    # a dedicated conversation identifier should be managed, perhaps derived
    # from the Supabase conversation ID if available/passed, or generated.
    # For now, let's use user_id if available, otherwise client_id as a placeholder conversation_id.
    
    # Determine the primary identifier for the agent context
    agent_user_id = user_id if user_id else (f"guest_{client_id}" if client_id else "unknown_user")
    # Placeholder for conversation ID - might need refinement
    conversation_id_for_agent = f"conv_{agent_user_id}" 

    # Create the context object
    try:
        context = MedicalAssistantContext(
            user_id=agent_user_id,
            conversation_id=conversation_id_for_agent,
            user_name=agent_user_id,
            # Nuovi campi per tracciare gli identificativi originali della richiesta
            request_user_id=user_id,
            request_client_id=client_id,
            request_is_guest=is_guest
        )
        print(f"Created MedicalAssistantContext for user: {context.user_id}, conv: {context.conversation_id}")
    except Exception as e:
        print(f"Error creating MedicalAssistantContext: {e}")
        raise HTTPException(status_code=500, detail="Failed to create agent context.")

    # 4. Call Agentic.functions.run_conversation
    try:
        print(f"Calling run_conversation for user {context.user_id}...")
        # Ensure run_conversation is called asynchronously if it's an async function
        # and the endpoint `agent_chat` is also async.
        # run_conversation returns a tuple: (result_object, updated_input_items, current_agent)
        agent_result_object, updated_input_items_list, _ = await run_conversation(
            user_input=request.user_message,
            context=context, 
            input_items=input_items
            # is_internal and requesting_agent are likely not needed for user requests
        )
        # We mainly need the agent_result_object and updated_input_items_list
        print(f"run_conversation completed. Result type: {type(agent_result_object)}")

        # Ensure we import the necessary item types
        from agents import MessageOutputItem, ItemHelpers # Correct import path

    except Exception as e:
        print(f"Error during agent execution (run_conversation): {e}")
        # Consider more specific error handling based on potential agent errors
        raise HTTPException(status_code=500, detail=f"Agent execution failed: {e}")

    # 5. Reconstruct the full AI response by iterating through the result items first.
    ai_response = None
    reconstructed_response_parts = []
    if MessageOutputItem: # Proceed only if we could import the type
        print(f"--- Debug: Iterating new_items (Count: {len(agent_result_object.new_items)}) ---")
        for i, item in enumerate(agent_result_object.new_items):
            item_type = type(item).__name__
            is_message_output = isinstance(item, MessageOutputItem)
            # is_user_facing_flag = getattr(item, 'is_user_facing', 'N/A') # Check if flag exists safely
            # content_preview = getattr(item, 'content', '')[:50] + '...' if hasattr(item, 'content') else 'N/A'
            print(f"  Item {i}: Type={item_type}, IsMessageOutput={is_message_output}") # Simplified log
            
            if is_message_output:
                # Use ItemHelpers to reliably extract text content
                message_text = ItemHelpers.text_message_output(item)
                if message_text and message_text.strip(): # Check if content is not empty
                    print(f"    -> Adding content: '{message_text[:50]}...'")
                    reconstructed_response_parts.append(message_text.strip())
                else:
                    print(f"    -> Skipping: No text content extracted by ItemHelpers.")
            else:
                 print(f"    -> Skipping: Not a MessageOutputItem.")
        print(f"--- Debug: End Iteration --- Found {len(reconstructed_response_parts)} parts.")
    
    # Combine reconstructed parts first
    if reconstructed_response_parts:
        ai_response = "\n\n".join(reconstructed_response_parts).strip()
        print(f"Using reconstructed response initially. Preview: '{ai_response[:100]}...'")
    else:
        ai_response = "" # Initialize as empty string if no parts found

    # Check if final_output has content and potentially append it
    final_output_text = str(agent_result_object.final_output).strip() if agent_result_object.final_output else ""
    if final_output_text:
        print(f"final_output has content. Preview: '{final_output_text[:100]}...'")
        # Append if ai_response is empty OR if final_output is not already included at the end
        if not ai_response or not ai_response.endswith(final_output_text):
            print(f"Appending final_output to the response.")
            if ai_response: # If we have reconstructed parts, add separator
                ai_response += "\n\n" + final_output_text
            else: # If reconstruction was empty, final_output is the whole response
                 ai_response = final_output_text
        else:
             print(f"final_output seems already included in the reconstructed response. Skipping append.")

    # Final fallback if still no response after combining/checking
    if not ai_response:
        # Handle cases where no response was generated
        print("Warning: No AI response generated (reconstruction failed and final_output empty).")
        ai_response = "Sorry, I couldn't generate a response." # Default fallback

    # 6. Serialize the updated input_items into updated_agent_context.
    try:
        # Use the updated_input_items_list returned directly from run_conversation
        # Instead of calling agent_result_object.to_input_list() again
        # Although calling to_input_list() should yield the same result, using the returned list is cleaner.
        updated_agent_context_serialized = json.dumps(updated_input_items_list)
        print(f"Serialized updated context. Length: {len(updated_agent_context_serialized)}")
    except Exception as e:
        print(f"Error serializing updated agent context: {e}")
        # Handle error - maybe return the AI response but indicate context update failed?
        # For now, re-raise to signal a server error
        raise HTTPException(status_code=500, detail=f"Failed to serialize updated context: {e}")

    # Return the actual response
    return AgentChatResponse(
        ai_response=ai_response,
        updated_agent_context=updated_agent_context_serialized # Send serialized JSON string
    ) 