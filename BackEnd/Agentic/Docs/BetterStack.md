# BetterStack Agents

Progetto: frmProgramming (https://www.notion.so/frmProgramming-144f77f91f1180b0a3ccef4608f84382?pvs=21)
Favorite: No

### Cursor Prompt: Medical Clinic Assistant Multi-Agent System

Create a comprehensive multi-agent system using OpenAI Agents SDK to support medical clinics and hospitals. The system should intelligently route user queries, provide medical information, manage appointments, and offer clinic-specific details using a combination of vectorstore knowledge retrieval, LLM-based advice, and database interactions.

## System Architecture

Build a FastAPI backend with React frontend that implements:

1. A central **Triage Agent** that evaluates user queries and coordinates specialized agents
2. A **Medical Knowledge Agent** for health advice with appropriate disclaimers
3. A **Clinic Information Agent** that leverages Trieve.ai for knowledge retrieval
4. An **Appointment Agent** with calendar integration for scheduling/managing appointments

## Implementation Requirements

### Context Management

- Implement a shared `MedicalAssistantContext` class to maintain:
    - User profile information (name, medical history references)
    - Current conversation state
    - Selected clinic/department
    - Appointment details when relevant
    - Previous diagnoses/symptoms mentioned

### Agent Design

- Define clear, specialized instructions for each agent with the `RECOMMENDED_PROMPT_PREFIX`
- Implement bidirectional handoffs allowing agents to return to triage when needed
- Optimize latency by maintaining the current agent across interactions
- Ensure proper type annotations with generics for context sharing

### Tool Integration

- Create function tools for appointment operations (create, cancel, reschedule)
- Integrate Trieve.ai vectorstore as a knowledge retrieval tool
- Implement medical database lookup tools that respect privacy regulations
- Add web search capabilities for general medical information

### Guardrails

- Add input guardrails to prevent non-medical queries
- Implement medical accuracy guardrails with disclaimer generation
- Create HIPAA compliance guardrails for sensitive information

### Conversation Flow

- Use proper `to_input_list()` methodology to maintain conversation state
- Store serialized conversation context in your database between user sessions
- Ensure agents can access full conversation history for contextual understanding
- Implement proper error handling with user-friendly messages

### API Structure

- Create `/conversation` endpoint that accepts messages and returns structured agent responses
- Implement proper session management via authentication headers
- Build database models for persistent conversation storage

## Example Agent Structure

```python
# Sample agent structure (expand upon this)
medical_triage_agent = Agent[MedicalAssistantContext](
    name="Medical Triage",
    instructions="""
        You are the first point of contact for patients seeking medical assistance.
        Evaluate if the query relates to: general medical advice, clinic information,
        or appointment scheduling. Route to the appropriate specialist agent.
        Always maintain a professional, compassionate tone. For emergencies,
        immediately advise the patient to call emergency services.
    """,
    handoffs=[medical_knowledge_agent, clinic_info_agent, appointment_agent],
    input_guardrails=[medical_query_guardrail],
    tools=[initial_symptom_classifier]
)

```

## Specialized Details

- Implement proper conversation serialization/deserialization for persistence
- Ensure all medical advice includes appropriate disclaimers
- Add authentication mechanisms to associate conversations with user accounts
- Implement proper error handling for when tools or APIs fail
- Use streaming responses for improved user experience

The implementation should focus on agent autonomy through well-crafted instructions and proper handoff mechanisms rather than explicit if/then logic. Each agent should have clear responsibilities and know when to delegate or return control to the triage agent.

### RECOMMENDED_PROMPT_PREFIX in the OpenAI Agents SDK

The `RECOMMENDED_PROMPT_PREFIX` is a predefined text template in the OpenAI Agents SDK that helps establish proper context and behavior for agents that participate in handoffs. It's specifically part of the `agents.extensions.handoff_prompt` module, which is designed to help developers create more effective agent instructions.

## Purpose and Function

The primary purposes of this prefix are:

1. **Establishing Handoff Awareness**: It adds standardized instructions that make agents aware they are part of a multi-agent system where they may receive control from other agents or need to hand off control.
2. **Setting Communication Standards**: It establishes consistent communication patterns between agents, ensuring smooth transitions that maintain context.
3. **Defining Collaboration Protocols**: It provides guidance on when and how to transfer control to other agents, helping create a cohesive user experience.
4. **Maintaining Conversational Coherence**: It helps agents understand that they're participating in an ongoing conversation, rather than starting fresh each time.

## How It Works

When you add this prefix to an agent's instructions, you're essentially giving the agent "meta-awareness" that it exists within a multi-agent ecosystem. The prefix might contain instructions like:

- How to acknowledge that the agent has received control from another agent
- When to consider transferring control to a different specialist agent
- How to maintain consistent tone and approach across handoffs
- How to properly reference information that was collected by previous agents

## Implementation Example

Here's how you would typically use the prefix in your agent definitions:

```python
from agents.extensions.handoff_prompt import RECOMMENDED_PROMPT_PREFIX

medical_advice_agent = Agent(
    name="Medical Advice Agent",
    instructions=f"""
    {RECOMMENDED_PROMPT_PREFIX}

    You are a medical information agent that provides general health information.
    Never provide diagnosis, but instead offer educational information about
    medical conditions, treatments, and preventive care. If users describe emergency
    symptoms, recommend they seek immediate medical attention.
    """,
    # other agent configuration...
)

```

## Alternative Approach

There's also a helper function in the same module that automatically applies the prefix:

```python
from agents.extensions.handoff_prompt import prompt_with_handoff_instructions

medical_advice_agent = Agent(
    name="Medical Advice Agent",
    instructions=prompt_with_handoff_instructions("""
    You are a medical information agent that provides general health information.
    Never provide diagnosis, but instead offer educational information about
    medical conditions, treatments, and preventive care. If users describe emergency
    symptoms, recommend they seek immediate medical attention.
    """),
    # other agent configuration...
)

```

## Benefits for Your Medical Assistant

For your medical clinic assistant application, using the `RECOMMENDED_PROMPT_PREFIX` ensures that:

1. Your medical triage agent can properly hand off to specialists
2. Your appointment scheduling agent can return control to triage after completing its task
3. Your clinic information agent knows when it should defer to the medical advice agent
4. The entire conversation feels cohesive to the user despite multiple agents working behind the scenes

The prefix helps create a seamless experience where different specialized agents can cooperate effectively on complex medical queries without the user perceiving abrupt transitions or context loss between different parts of the system.

### Integrating Trieve Endpoints with a Knowledge Base Agent

When transitioning from a direct Trieve integration to an agent-based architecture, your existing Trieve endpoints will transform from being the primary response mechanism to becoming tools that the Knowledge Base Agent can leverage. This represents a shift in your architecture from a direct query-response system to an intelligent agent that can decide when and how to use your Trieve knowledge base.

## Current Architecture vs. Agent-Based Architecture

### Current Architecture

In your current setup, your application likely follows this pattern:

1. User sends a query through your React frontend
2. Your FastAPI backend receives the query
3. Backend directly calls Trieve endpoints with the query
4. Trieve returns relevant information
5. Backend formats and returns this information to the frontend
6. Frontend displays the response to the user

### Agent-Based Architecture

In the new architecture, the flow changes to:

1. User sends a query through your React frontend
2. FastAPI backend receives the query
3. Backend passes the query to the Triage Agent
4. Triage Agent decides which specialized agent should handle the query
5. If Knowledge Base information is needed, the KB Agent is activated
6. The KB Agent uses Trieve as a tool to retrieve relevant information
7. The KB Agent processes, contextualizes, and enhances the Trieve response
8. Response flows back through the agent system to your backend
9. Backend returns the enhanced response to the frontend
10. Frontend displays the response to the user

## Integration Approaches

There are several ways to integrate your existing Trieve endpoints with the Knowledge Base Agent:

### 1. Custom Function Tools

The most common approach is to convert your existing Trieve API calls into custom function tools:

```python
@function_tool
async def search_clinic_knowledge_base(
    context: RunContextWrapper[MedicalAssistantContext],
    query: str,
    clinic_id: str | None = None
) -> str:
    """Search the clinic knowledge base for information.

    Args:
        query: The search query about clinic services, policies, or procedures
        clinic_id: Optional ID of a specific clinic to search within

    Returns:
        Information retrieved from the clinic knowledge base
    """
    # Your existing Trieve API call logic here
    clinic_id = clinic_id or context.context.selected_clinic_id
    results = await your_existing_trieve_client.search(
        topic_id=context.context.conversation_id,
        query=query,
        filters={"clinic_id": clinic_id} if clinic_id else None
    )

    # Format the results into a coherent response
    return format_trieve_results(results)

```

This function tool would be added to your KB Agent:

```python
kb_agent = Agent[MedicalAssistantContext](
    name="Clinic Knowledge Agent",
    instructions=f"""
    {RECOMMENDED_PROMPT_PREFIX}
    You are a clinic information specialist. You provide accurate information about
    clinic services, policies, procedures, and operational details. Always use the
    knowledge base search tool to ensure responses are factual and up-to-date.
    """,
    tools=[search_clinic_knowledge_base],
    handoffs=[medical_advice_agent, appointment_agent, triage_agent]
)

```

### 2. Using FileSearchTool (If Compatible)

If your Trieve implementation is structured as vector stores that are compatible with OpenAI's APIs, you might be able to use the built-in `FileSearchTool`:

```python
kb_agent = Agent[MedicalAssistantContext](
    name="Clinic Knowledge Agent",
    instructions=f"""
    {RECOMMENDED_PROMPT_PREFIX}
    You are a clinic information specialist...
    """,
    tools=[
        FileSearchTool(
            vector_store_ids=["your_trieve_store_id"],
            max_num_results=5,
            include_search_results=True
        )
    ],
    handoffs=[medical_advice_agent, appointment_agent, triage_agent]
)

```

However, this would only work if your Trieve implementation can be accessed through OpenAI's vector store IDs.

### 3. Hybrid Approach

You might use both direct function calls and structured data retrieval:

```python
@function_tool
async def get_clinic_details(
    context: RunContextWrapper[MedicalAssistantContext],
    clinic_id: str
) -> dict:
    """Get detailed information about a specific clinic.

    Args:
        clinic_id: ID of the clinic to retrieve details for

    Returns:
        Structured clinic information including address, hours, services
    """
    # Your existing Trieve API call for clinic details
    clinic_data = await your_existing_trieve_client.get_clinic(clinic_id)
    return clinic_data

@function_tool
async def search_procedures(
    context: RunContextWrapper[MedicalAssistantContext],
    procedure_name: str,
    clinic_id: str | None = None
) -> list[dict]:
    """Search for information about medical procedures offered.

    Args:
        procedure_name: Name or type of procedure to search for
        clinic_id: Optional ID of a specific clinic

    Returns:
        List of procedures matching the search criteria
    """
    # Your existing Trieve API call for procedures
    procedures = await your_existing_trieve_client.search_procedures(
        procedure_name,
        clinic_id=clinic_id or context.context.selected_clinic_id
    )
    return procedures

```

## Benefits of the Agent-Based Approach

Converting your Trieve endpoints into tools for a Knowledge Base Agent offers several advantages:

1. **Contextual Understanding**: The agent can understand the user's intent beyond keyword matching, and can frame Trieve results within the broader conversation context.
2. **Seamless Integration**: The agent can blend knowledge base information with other sources (medical advice, appointment information) for comprehensive responses.
3. **Intelligent Querying**: The agent can reformulate user questions into more effective Trieve queries, potentially yielding better results than direct user queries.
4. **Follow-up Handling**: The agent can recognize when Trieve results are incomplete and either refine the search or request clarification from the user.
5. **Prioritization**: The agent can filter and prioritize Trieve results based on relevance to the specific user question.

## Implementation Steps

1. **Create Function Tools**: Convert your existing Trieve API calls into function tools that the KB Agent can use.
2. **Define KB Agent Instructions**: Create clear instructions that help the KB Agent understand when and how to use the Trieve tools.
3. **Configure Handoffs**: Ensure the KB Agent can hand off to other specialized agents when non-KB information is needed.
4. **Update Backend Endpoints**: Modify your FastAPI endpoints to route through the agent system rather than directly to Trieve.
5. **Test Comprehensively**: Ensure the KB Agent provides responses at least as good as direct Trieve calls, but ideally enhanced with contextual understanding.

By integrating your Trieve endpoints as tools for a Knowledge Base Agent, you're essentially giving an intelligent assistant access to your clinic's knowledge base, allowing it to retrieve and contextualize information as part of a comprehensive multi-agent medical assistance system.

### Converting Trieve Endpoints to Function Tools in the Agents SDK

Converting your existing Trieve endpoints into function tools for your Knowledge Base Agent isn't just about adding a decorator - it involves reshaping how these endpoints are called and integrated into the agent system. Let me walk you through this transformation step by step.

## Understanding the Transformation Process

Your current Trieve endpoints likely exist as FastAPI route handlers that directly call Trieve's API. To convert these into function tools, you'll need to extract the core functionality and adapt it for the agent context.

### Step 1: Extract the Core Logic

First, identify the actual Trieve API call logic in your endpoint. For example, if you have an endpoint like this:

```python
@app.get("/api/search")
async def search_knowledge_base(query: str, topic_id: str = None):
    # Authentication/validation logic

    # Core Trieve API call
    results = trieve_client.search(
        query=query,
        topic_id=topic_id,
        hybrid=True,
        collection_id="clinic_docs"
    )

    # Formatting/processing logic
    formatted_results = process_results(results)

    return {"results": formatted_results}

```

### Step 2: Transform into a Function Tool

Now, reshape this into a function tool by:

1. Extracting the core functionality
2. Modifying the function signature for context access
3. Adding the `@function_tool` decorator
4. Ensuring it returns the appropriate data format

```python
@function_tool
async def search_kb(context: RunContextWrapper[MedicalAssistantContext], query: str) -> str:
    """Search the clinic knowledge base for information.

    Args:
        query: The search query about clinic services, policies, or procedures

    Returns:
        Information retrieved from the clinic knowledge base
    """
    # Reuse your existing Trieve client
    results = trieve_client.search(
        query=query,
        topic_id=context.context.conversation_id,  # Use context for topic ID
        hybrid=True,
        collection_id="clinic_docs"
    )

    # Format results into a coherent text response
    formatted_text = ""
    for result in results:
        formatted_text += f"• {result.title}: {result.snippet}\n\n"

    return formatted_text

```

## Key Adaptations Required

Simply adding the decorator isn't enough. Here are the specific adaptations you'll need to make:

### 1. Function Signature Changes

Your function tools need to:

- Accept a `RunContextWrapper` parameter (unless the tool doesn't need context)
- Have properly typed parameters that the agent can understand
- Return data in a format the agent can process (often strings or simple data structures)

### A proper function signature should look like:

```python
@function_tool
async def my_tool(
    context: RunContextWrapper[YourContextType],  # Add context parameter
    param1: str,                                 # Required parameters
    param2: int | None = None                    # Optional parameters
) -> str:                                        # Return type (often string)

```

### 2. Context Integration

Your function tools should use the shared context rather than request-specific data:

```python
# Instead of:
topic_id = request.query_params.get("topic_id")

# Use:
topic_id = context.context.conversation_id

```

This allows the tool to access the ongoing conversation state.

### 3. Documentation Changes

Function tools rely heavily on docstrings for the agent to understand how to use them:

```python
"""
Comprehensive docstring that explains:
1. What the tool does
2. When to use it
3. What parameters are required
4. What the return value represents
"""

```

### 4. Return Type Formatting

Agents typically work best with string responses rather than complex JSON objects:

```python
# Instead of:
return {"results": formatted_results}

# Return a formatted string:
return "\n".join([f"- {result.title}: {result.content}" for result in formatted_results])

```

## Example: Transforming an Actual Trieve Endpoint

Let's walk through a complete example of transforming a real Trieve endpoint:

### Original FastAPI Endpoint:

```python
@app.post("/api/trieve/search")
async def search_docs(request: SearchRequest):
    try:
        response = await trieve_client.post(
            f"/api/dataset/{settings.TRIEVE_DATASET_ID}/search",
            json={
                "query": request.query,
                "hybrid": True,
                "page": 1,
                "page_size": 5,
                "filters": request.filters,
                "topic_id": request.conversation_id
            },
            headers={"Authorization": f"Bearer {settings.TRIEVE_API_KEY}"}
        )
        search_results = response.json()

        # Process and format results
        formatted_results = []
        for chunk in search_results["chunks"]:
            formatted_results.append({
                "content": chunk["chunk_html"],
                "metadata": chunk["metadata"],
                "score": chunk["score"]
            })

        return {"results": formatted_results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

```

### Transformed Function Tool:

```python
@function_tool
async def search_clinic_knowledge(
    context: RunContextWrapper[MedicalAssistantContext],
    query: str,
    filter_service: str | None = None,
    filter_location: str | None = None
) -> str:
    """Search the clinic knowledge base for information about services, policies, or procedures.

    Args:
        query: The search query about clinic services, policies, procedures or other information
        filter_service: Optional service type to filter results (e.g., "cardiology", "pediatrics")
        filter_location: Optional clinic location to filter results (e.g., "downtown", "north campus")

    Returns:
        Relevant information from the clinic's knowledge base, with citations to sources
    """
    # Build filters from optional parameters
    filters = {}
    if filter_service:
        filters["service"] = filter_service
    if filter_location:
        filters["location"] = filter_location

    try:
        # Reuse your existing Trieve client call
        response = await trieve_client.post(
            f"/api/dataset/{settings.TRIEVE_DATASET_ID}/search",
            json={
                "query": query,
                "hybrid": True,
                "page": 1,
                "page_size": 5,
                "filters": filters,
                "topic_id": context.context.conversation_id  # Use context for topic ID
            },
            headers={"Authorization": f"Bearer {settings.TRIEVE_API_KEY}"}
        )
        search_results = response.json()

        # Format results as a readable text response
        if not search_results.get("chunks") or len(search_results["chunks"]) == 0:
            return "I couldn't find any relevant information about that in our knowledge base."

        formatted_text = "Here's what I found in our clinic information:\n\n"

        for chunk in search_results["chunks"]:
            # Extract plain text from HTML
            content = html_to_text(chunk["chunk_html"])
            source = chunk["metadata"].get("source", "Clinic Documentation")

            formatted_text += f"• {content}\n"
            formatted_text += f"  Source: {source}\n\n"

        return formatted_text
    except Exception as e:
        # Provide a graceful failure message the agent can use
        return f"I'm having trouble searching our knowledge base right now. Please try again later."

```

## Maintaining Your API Endpoints

You'll still need your original API endpoints for direct access, but they can be simplified to call the same underlying functions:

```python
@app.post("/api/trieve/search")
async def search_docs(request: SearchRequest):
    # Create a minimal context for the tool
    context = RunContextWrapper(MedicalAssistantContext(conversation_id=request.conversation_id))

    # Reuse the function tool directly
    try:
        result = await search_clinic_knowledge(
            context,
            request.query,
            filter_service=request.filters.get("service"),
            filter_location=request.filters.get("location")
        )

        # Convert the string result back to JSON for API compatibility
        return {"result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

```

## Integration with the KB Agent

Finally, add your new function tools to your KB Agent:

```python
kb_agent = Agent[MedicalAssistantContext](
    name="Clinic Knowledge Agent",
    instructions=f"""
    {RECOMMENDED_PROMPT_PREFIX}
    You are a clinic information specialist. Use the search_clinic_knowledge tool
    to find accurate information about our clinics, services, policies, and procedures.
    Always cite your sources and acknowledge when information might not be complete.
    """,
    tools=[search_clinic_knowledge],
    handoffs=[medical_advice_agent, appointment_agent, triage_agent]
)

```

By properly transforming your Trieve endpoints into function tools, you're giving your KB Agent the ability to intelligently access your knowledge base while maintaining the context of the ongoing conversation. This allows for much more sophisticated handling of clinic information than direct API calls could provide.

### Code from Better Stack

```python
import asyncio
from agents import Agent, GuardrailFunctionOutput, HandoffOutputItem, ItemHelpers, MessageOutputItem, RunContextWrapper, Runner, TResponseInputItem, ToolCallItem, ToolCallOutputItem, WebSearchTool, function_tool, input_guardrail
from agents.extensions.handoff_prompt import RECOMMENDED_PROMPT_PREFIX
from pydantic import BaseModel

class UserInfoContext(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    city: str | None = None

class TripPlanningGuardrailOutput(BaseModel):
    is_trip_planning: bool
    reasoning: str

@input_guardrail
async def trip_planning_guardrail( 
    ctx: RunContextWrapper[UserInfoContext], agent: Agent, input: str | list[TResponseInputItem]
) -> GuardrailFunctionOutput:
    result = await Runner.run(guardrail_agent, input, context=ctx.context)

    return GuardrailFunctionOutput(
        output_info=result.final_output, 
        tripwire_triggered=not result.final_output.is_trip_planning,
    )

@function_tool
async def get_city_weather(contextWrapper: RunContextWrapper[UserInfoContext], city: str) -> str:
    """Get the weather in a city.
    Args:
        city: The city to get the weather for.
    Returns:
        The weather in the city.
    """

    contextWrapper.context.city = city
    return f"The weather in {city} is sunny {contextWrapper.context.first_name}."

guardrail_agent = Agent( 
    name="Guardrail check",
    instructions="Check if the user is asking you a request that is related to trip planning.",
    output_type=TripPlanningGuardrailOutput,
)

city_info_agent = Agent[UserInfoContext](
    name="City Info Agent",
    handoff_description="A helpful agent that can answer questions about a city.",
    instructions=f"""
    {RECOMMENDED_PROMPT_PREFIX}
    You are a city info agent. If you are speaking to a customer, you probably were transferred to from the triage agent.
    Use the following routine to support the customer.
    # Routine
    1. Ask for the city name if not clear from the context.
    2. Use the web search tool to get information about restaurants in the city.
    3. Use the weather tool to get the live weather in the city, use your knowledge for climate questions.
    4. If the customer asks a question that is not related to the routine, transfer back to the triage agent. """,
    model="gpt-4o",
    tools=[WebSearchTool(), get_city_weather]
)

flight_finder_agent = Agent[UserInfoContext](
    name="Flight Finder Agent",
    handoff_description="A helpful agent that can find flights for a customer.",
    instructions=f"""
    {RECOMMENDED_PROMPT_PREFIX}
    You are a flight finder agent. If you are speaking to a customer, you probably were transferred to from the triage agent.
    Use the following routine to support the customer.
    # Routine
    1. Ask for the city name, if not clear.
    2. Use the web search tool to get information about flights to the city.
    3. If the customer asks a question that is not related to the routine, transfer back to the triage agent. """,
    model="gpt-4o-mini",
    tools=[WebSearchTool()],
)

router_agent = Agent[UserInfoContext](
    name="Router Agent",
    input_guardrails=[trip_planning_guardrail],
    handoff_description="A triage agent that can delegate a customer's request to the appropriate agent.",
    instructions=(
        f"{RECOMMENDED_PROMPT_PREFIX}"
        "You are a helpful routing agent. You can use your tools to delegate questions to other appropriate agents."
    ),
    handoffs=[
        city_info_agent,
        flight_finder_agent,
    ],
)

city_info_agent.handoffs.append(router_agent)
flight_finder_agent.handoffs.append(router_agent)

async def main():
    # Current agent can help reduce latency, when requests are similar. e.g, if the last question was to the city agent, current agent will = city agent, so the next question doesnt have to pass through the router. This means if the users input is about the city agent again, we have avoidedc going through the router. 
    current_agent: Agent[UserInfoContext] = router_agent
    # The LLMS context. Users Input + LLMs Output
    input_items: list[TResponseInputItem] = []
    context = UserInfoContext(first_name="James")
    while True:
        user_input = input("Enter message: ")
        input_items.append({"content": user_input, "role": "user"})
        result = await Runner.run(current_agent, input_items, context=context, workflow_name="Agents Demo")
        # print(result.final_output)

        for new_item in result.new_items:
            agent_name = new_item.agent.name
            if isinstance(new_item, MessageOutputItem):
                print(f"\033[94m{agent_name}\033[0m: {ItemHelpers.text_message_output(new_item)}")
            elif isinstance(new_item, HandoffOutputItem):
                print(f"Handed off from \033[92m{new_item.source_agent.name}\033[0m to \033[93m{new_item.target_agent.name}\033[0m")
            elif isinstance(new_item, ToolCallItem):
                print(f"\033[95m{agent_name}\033[0m: Calling a tool")
            elif isinstance(new_item, ToolCallOutputItem):
                print(f"\033[96m{agent_name}\033[0m: Tool call output: {new_item.output}")
            else:
                print(f"\033[91m{agent_name}\033[0m: Skipping item: {new_item.__class__.__name__}")

        input_items = result.to_input_list()
        current_agent = result.last_agent

if __name__ == "__main__":
    asyncio.run(main())
```