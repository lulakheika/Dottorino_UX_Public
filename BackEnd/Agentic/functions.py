from typing import List, Optional
from agents import (
    HandoffOutputItem, 
    ItemHelpers, 
    MessageOutputItem, 
    Runner, 
    TResponseInputItem, 
    ToolCallItem, 
    ToolCallOutputItem,
    HandoffCallItem
)
import asyncio

# Importa le utility dalla nuova utility invece di definirle qui
from Agentic.string_utils import sanitize_context_items

# Importa le utility di gestione del contesto
from Agentic.context_utils import save_context_to_md, load_context_from_md, serialize_input_list
from Agentic.Agents import MedicalAssistantContext, orchestrator_agent, medical_agent, db_agent
from Agentic.tool_behaviors import ToolBehaviorManager

# ---------------------------------------------------------------------------
# Funzione principale di esecuzione con logging colorato
# ---------------------------------------------------------------------------

def sanitize_unicode(text):
    """
    Rimuove o sostituisce caratteri Unicode non validi che causerebbero errori di codifica.
    
    Args:
        text: Il testo da sanitizzare
        
    Returns:
        Testo pulito dai caratteri problematici
    """
    if not isinstance(text, str):
        return text
        
    # Rimuove i surrogati Unicode non validi
    return re.sub(r'[\uD800-\uDFFF]', '', text)

async def run_conversation(user_input: str, context: MedicalAssistantContext = None, input_items=None, is_internal=False, requesting_agent=None):
    """
    Esegue una conversazione con il sistema di agenti Dottorino.
    
    Args:
        user_input: Il messaggio dell'utente
        context: Il contesto medico da utilizzare
        input_items: Lista di input precedenti
        is_internal: Se True, questa è una comunicazione interna tra agenti
        requesting_agent: Nome dell'agente che ha richiesto l'informazione
    """
    if context is None:
        context = MedicalAssistantContext(
            conversation_id="test-conversation",
            user_id="test-user",
            user_name="Utente di Test"
        )
    
    # --- LOG DEI NUOVI CAMPI DI IDENTIFICATIVO ORIGINALE ---
    print(f"[Agentic] Identificativi originali dal frontend:")
    print(f"  request_user_id: {getattr(context, 'request_user_id', None)}")
    print(f"  request_client_id: {getattr(context, 'request_client_id', None)}")
    print(f"  request_is_guest: {getattr(context, 'request_is_guest', None)}")
    # ------------------------------------------------------
    
    # Impostiamo il tipo di comunicazione
    context.communication_type = "internal" if is_internal else "user"
    context.requesting_agent = requesting_agent
    
    # Aggiungiamo logging all'inizio della funzione per indicare il tipo di chiamata
    if is_internal:
        print(f"\n\033[91m[COMUNICAZIONE INTERNA] Da {requesting_agent or 'sconosciuto'}\033[0m")
    
    # Manteniamo l'agente corrente e la lista degli elementi di input tra le chiamate
    current_agent = orchestrator_agent
    
    # Se input_items è None, inizializziamo una nuova lista
    if input_items is None:
        input_items = []
    
    # Aggiungiamo l'input dell'utente
    input_items.append({"content": user_input, "role": "user"})
    
    # Sanitizziamo il contesto per rimuovere caratteri surrogati non validi
    sanitized_input_items = sanitize_context_items(input_items)
    
    # Eseguiamo l'agente con il contesto sanitizzato
    result = await Runner.run(
        current_agent, 
        sanitized_input_items, 
        context=context
    )
    
    # --- NUOVA Logica di Aggregazione POST-Esecuzione Agente ---
    last_agent_direct_message = None # Per riferimento nella logica finale
    for new_item in result.new_items:
        if isinstance(new_item, MessageOutputItem):
            message_text = ItemHelpers.text_message_output(new_item)
            agent_name = new_item.agent.name
            last_agent_direct_message = message_text # Memorizza l'ultimo messaggio

            # Aggiungi il messaggio diretto dell'agente all'aggregato
            if message_text and message_text.strip():
                # Pulisci spazi extra prima di aggiungere
                cleaned_message = message_text.strip()
                if context.aggregated_response is None or not context.aggregated_response.strip():
                    context.aggregated_response = cleaned_message
                else:
                    # Evita di aggiungere duplicati esatti consecutivi
                    if not context.aggregated_response.endswith(cleaned_message):
                        context.aggregated_response += f"\n\n{cleaned_message}"

            # Imposta last_agent/last_message (ora non più usati nei tool_behaviors, ma utili per debug)
            context.last_message = message_text
            context.last_agent = agent_name

        # Logica per handoff (potrebbe essere utile registrarli o processarli se necessario)
        # elif isinstance(new_item, HandoffToAgentItem):
            # print(f"Handoff a: {new_item.agent.name}")

    # --- Logging colorato (come prima) ---
    for new_item in result.new_items:
        agent_name = new_item.agent.name
        
        # Scegliamo il formato in base al tipo di comunicazione
        if is_internal:
            # Comunicazione interna (rosso chiaro)
            text_color = "\033[91m"  # Rosso chiaro
            prefix = "[INTERNAL] "
        else:
            # Comunicazione per l'utente (bianco)
            text_color = "\033[97m"  # Bianco brillante
            prefix = ""
        
        if isinstance(new_item, MessageOutputItem):
            message_text = ItemHelpers.text_message_output(new_item)
            print(f"{text_color}{prefix}\033[1m{agent_name}\033[0m{text_color}: {message_text}\033[0m")
        elif isinstance(new_item, HandoffOutputItem):
            print(f"{text_color}{prefix}Handoff da \033[92m{new_item.source_agent.name}\033[0m a \033[93m{new_item.target_agent.name}\033[0m")
        elif isinstance(new_item, ToolCallItem):
            print(f"{text_color}{prefix}\033[95m{agent_name}\033[0m: Chiamata tool {new_item.raw_item.name}\033[0m")
        elif isinstance(new_item, ToolCallOutputItem):
            print(f"{text_color}{prefix}\033[96m{agent_name}\033[0m: Output tool: {new_item.output}\033[0m")
        elif isinstance(new_item, HandoffCallItem):
            print(f"{text_color}{prefix}\033[95m{agent_name}\033[0m: Richiesta handoff\033[0m")
        else:
            print(f"{text_color}{prefix}\033[91m{agent_name}\033[0m: Item sconosciuto: {new_item.__class__.__name__}\033[0m")
    
    # Aggiungiamo un log di chiusura per comunicazioni interne
    if is_internal:
        print(f"\033[91m[FINE COMUNICAZIONE INTERNA] Risposta per {requesting_agent or 'sconosciuto'}\033[0m\n")
    
    # Aggiorniamo gli elementi di input per la prossima chiamata usando to_input_list()
    input_items = result.to_input_list()
    current_agent = result.last_agent
    
    # Stampiamo la lunghezza dell'input_list dopo ogni interazione
    print(f"\n\033[90mContesto attuale: {len(input_items)} elementi\033[0m")
    
    # --- Logica Finale per Stampa Risposta Utente (Riveduta) ---
    if not is_internal:
        agent_final_output_str = str(result.final_output).strip() if result.final_output else ""
        aggregated_response_str = str(context.aggregated_response).strip() if context.aggregated_response else ""

        final_response_to_print = agent_final_output_str # Default all'output diretto dell'ultimo agente

        # Se c'è una risposta aggregata e l'output finale è vuoto o è solo l'ultimo messaggio aggiunto,
        # allora usiamo l'intero aggregato.
        if aggregated_response_str:
            if not agent_final_output_str:
                 final_response_to_print = aggregated_response_str
            else:
                # Se l'output finale è l'ULTIMO messaggio nell'aggregato, mostra tutto l'aggregato
                # (Supponendo che l'ultimo agente abbia solo ripetuto l'ultimo pezzo)
                if aggregated_response_str.endswith(agent_final_output_str):
                    final_response_to_print = aggregated_response_str
                # Altrimenti, se l'aggregato non è già contenuto nell'output finale, combinali
                elif agent_final_output_str not in aggregated_response_str:
                     final_response_to_print = f"{aggregated_response_str}\n\n{agent_final_output_str}"
                # Se l'aggregato è GIA' contenuto, l'output finale è probabilmente completo
                # else: final_response_to_print rimane agent_final_output_str

        print(f"\n\033[92mRisposta finale all'utente: {final_response_to_print}\033[0m\n")

        # Reset aggregato nel contesto DOPO la stampa
        context.aggregated_response = None

    return result, input_items, current_agent

async def initialize_agents():
    """
    Inizializza tutti gli agenti e configura correttamente le loro relazioni.
    Questa funzione deve essere chiamata all'avvio dell'applicazione.
    """
    from Agentic.Agents import kb_agent
    from Agentic.tools import set_kb_agent
    
    # Configura il kb_agent nello strumento check_service_availability
    set_kb_agent(kb_agent)
    
    return True

async def interactive_chat(use_saved_context=False):
    """
    Avvia una chat interattiva con il sistema di agenti Dottorino.
    L'utente può inserire messaggi dal terminale e ottenere risposte in tempo reale.
    Digitare 'exit' per uscire.
    
    Args:
        use_saved_context: Se True, carica il contesto da un file salvato precedentemente
    """
    # Assicuriamo che gli agenti siano inizializzati correttamente
    await initialize_agents()
    
    context = MedicalAssistantContext(
        conversation_id="interactive-session",
        user_id="user-1",
        user_name="Utente"
    )
    
    current_agent = orchestrator_agent
    
    # Carica il contesto da file se richiesto
    if use_saved_context:
        input_items = load_context_from_md()
        print(f"\033[95mContesto caricato: {len(input_items)} elementi\033[0m")
    else:
        input_items = []
        print("\033[95mNuova conversazione iniziata\033[0m")
    
    print("\n\033[1m=== Dottorino Chat Interattiva ===\033[0m")
    print("Scrivi 'exit' per uscire o 'save' per salvare il contesto corrente.")
    
    while True:
        user_input = input("\n\033[93mTu:\033[0m ")
        
        # Gestione comandi speciali
        if user_input.lower() == 'exit':
            # Prima di uscire, salviamo il contesto
            save_context_to_md(input_items)
            print("\n\033[95m=== Contesto serializzato per Supabase ===\033[0m")
            print(serialize_input_list(input_items))
            print("\n\033[1m=== Sessione terminata ===\033[0m")
            break
        elif user_input.lower() == 'save':
            save_context_to_md(input_items)
            print("\033[95mContesto salvato!\033[0m")
            continue
            
        result, input_items, current_agent = await run_conversation(user_input, context, input_items)
        
        # Stampiamo la lunghezza dell'input_list dopo ogni interazione
        print(f"\n\033[90mContesto attuale: {len(input_items)} elementi\033[0m")
        print("\n") 