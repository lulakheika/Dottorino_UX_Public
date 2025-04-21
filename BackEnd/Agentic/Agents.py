import asyncio
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from agents import (
    Agent, 
    ModelSettings,
    RunContextWrapper,
    FunctionToolResult,
    ToolsToFinalOutputResult
)
from agents.extensions.handoff_prompt import RECOMMENDED_PROMPT_PREFIX

# Importo il tool dal nuovo file tools.py
from Agentic.tools import (
    get_fake_appointment_slot, 
    check_service_availability, 
    set_kb_agent,
    get_current_datetime
)
# Importo i nuovi tool Trieve
from Agentic.kb_tools import ensure_trieve_topic_exists_tool, send_trieve_message_tool
# Importo il manager dei tool behaviors
from Agentic.tool_behaviors import ToolBehaviorManager
from . import prompts # Added import

# ---------------------------------------------------------------------------
# Definizione del contesto medico
# ---------------------------------------------------------------------------
class MedicalAssistantContext(BaseModel):
    """
    Contesto condiviso tra gli agenti del sistema Dottorino.
    """
    conversation_id: str = ""
    user_id: str = ""
    user_name: str = ""
    selected_clinic_id: Optional[str] = None
    selected_department: Optional[str] = None
    communication_type: str = "user"
    requesting_agent: Optional[str] = None
    current_agent_name: Optional[str] = None
    aggregated_response: Optional[str] = None
    medical_info: Optional[str] = None  # Campo per info mediche (potrebbe non essere più usato se aggregated_response funziona)

    # !!! ASSICURATI CHE QUESTI CAMPI SIANO PRESENTI !!!
    last_message: Optional[str] = None  # Campo per l'ultimo messaggio dell'agente
    last_agent: Optional[str] = None    # Campo per l'ultimo agente che ha generato il messaggio

    # Nuovi campi per tracciare gli identificativi originali della richiesta
    request_user_id: Optional[str] = None
    request_client_id: Optional[str] = None
    request_is_guest: Optional[bool] = None

    # Campo per memorizzare l'ID del topic Trieve attivo nel turno corrente
    current_trieve_topic_id: Optional[str] = None

    # Aggiungiamo questi campi per tracciare le comunicazioni interne
    # Aggiungeremo altri campi in seguito, come:
    # - appointment_details
    # - medical_history_reference
    # - previous_symptoms_mentioned

# ---------------------------------------------------------------------------
# Definizione degli agenti specializzati - Orchestrator per primo
# ---------------------------------------------------------------------------

# ##############################################################################################
# ##############################################################################################
# ##############################################################################################



orchestrator_agent = Agent[MedicalAssistantContext](
    name="Triage Agent",
    instructions=f"{RECOMMENDED_PROMPT_PREFIX}\n{prompts.ORCHESTRATOR_AGENT_PROMPT}",  # Use imported prompt
    model="gpt-4o",
    tools=[check_service_availability, get_current_datetime],
)




# ##############################################################################################
# ##############################################################################################
# ##############################################################################################



# 1. First define all agents without any references to other agents
kb_agent = Agent[MedicalAssistantContext](
    name="Knowledge Base Agent",
    handoff_description="Specialista per informazioni su servizi, procedure e politiche della clinica",
    instructions=f"{RECOMMENDED_PROMPT_PREFIX}\n{prompts.KB_AGENT_PROMPT}",  # Use imported prompt
    model="gpt-4o",
    tools=[ensure_trieve_topic_exists_tool, send_trieve_message_tool],  # Use new tools
    model_settings=ModelSettings(tool_choice="required") # Force tool use
)

# Configura il kb_agent nello strumento check_service_availability
set_kb_agent(kb_agent)






# ##############################################################################################
# ##############################################################################################
# ##############################################################################################




medical_agent = Agent[MedicalAssistantContext](
    name="Medical Information Agent",
    handoff_description="Specialista per informazioni mediche generali e consigli sanitari",
    instructions=f"{RECOMMENDED_PROMPT_PREFIX}\n{prompts.MEDICAL_AGENT_PROMPT}",  # Use imported prompt
    model="gpt-4o",
    tools=[], # Il Medical Agent non usa tool diretti per servizi/appuntamenti
)




# ##############################################################################################
# ##############################################################################################
# ##############################################################################################



db_agent = Agent[MedicalAssistantContext](
    name="Appointment Agent",
    handoff_description="Specialista per la prenotazione e gestione degli appuntamenti",
    instructions=f"{RECOMMENDED_PROMPT_PREFIX}\n{prompts.DB_AGENT_PROMPT}",  # Use imported prompt
    model="gpt-4o",
    tools=[
        get_fake_appointment_slot,
        kb_agent.as_tool(
            tool_name="check_service_availability",
            tool_description="Verifica se un servizio o una specialità medica è disponibile presso la clinica"
        ),
        get_current_datetime
    ],
)


# ##############################################################################################
# ##############################################################################################
# ##############################################################################################



# Update tool assignments
# Remove old KB agent as tool
orchestrator_agent.tools = [tool for tool in orchestrator_agent.tools 
                          if getattr(tool, "name", "") != "check_service_availability"]
db_agent.tools = [tool for tool in db_agent.tools 
                if getattr(tool, "name", "") != "check_service_availability"]

# Add new structured tool
orchestrator_agent.tools.append(check_service_availability)
db_agent.tools.append(check_service_availability)

# Setup tool behaviors
orchestrator_agent.tool_use_behavior = ToolBehaviorManager.get_behavior_for_agent("Triage Agent")
db_agent.tool_use_behavior = ToolBehaviorManager.get_behavior_for_agent("Appointment Agent")
medical_agent.tool_use_behavior = ToolBehaviorManager.get_behavior_for_agent("Medical Information Agent")

# Keep forcing tools
orchestrator_agent.model_settings = ModelSettings(tool_choice="required")
db_agent.model_settings = ModelSettings(tool_choice="required")

# Orchestrator può fare handoff a qualsiasi agente specializzato
orchestrator_agent.handoffs = [kb_agent, medical_agent, db_agent]

# Handoff bidirezionali - ogni agente specializzato può tornare all'orchestrator
kb_agent.handoffs.append(orchestrator_agent)
medical_agent.handoffs.append(orchestrator_agent)
db_agent.handoffs.append(orchestrator_agent)

# Comunicazione diretta tra agenti specializzati
kb_agent.handoffs.extend([db_agent, medical_agent])
db_agent.handoffs.extend([kb_agent, medical_agent])
medical_agent.handoffs.extend([kb_agent, db_agent])

# ---------------------------------------------------------------------------
# Punto di ingresso principale
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    # Importiamo qui le funzioni per evitare import circolari
    from Agentic.functions import interactive_chat
    
    # Scegliamo quale funzione eseguire
    mode = "interactive"  # Cambia in "test" per la modalità test
    use_saved_context = True  # Cambia in False per iniziare una nuova conversazione
    
    asyncio.run(interactive_chat(use_saved_context)) 