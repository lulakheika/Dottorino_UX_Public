from typing import Optional, Literal, Dict, Any, Callable
from agents import RunContextWrapper, function_tool, Runner, Agent
import datetime
import logging

# Setup logger for this module
logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO) # Ensure basic config is set if not done elsewhere

# Importazione diretta per evitare import circolare
# Usiamo il tipo stringa anziché l'import diretto
MedicalAssistantContext = "MedicalAssistantContext"

# Rimuovi l'import circolare e usa una variabile globale per lo storage dell'agente
_kb_agent = None

def set_kb_agent(agent: Agent) -> None:
    """
    Configura l'agente KB da utilizzare per il servizio di verifica disponibilità.
    Chiamare questa funzione durante l'inizializzazione dell'applicazione.
    
    Args:
        agent: L'istanza di Knowledge Base Agent da utilizzare
    """
    global _kb_agent
    _kb_agent = agent

@function_tool
async def check_service_availability(
    context: RunContextWrapper[Any], 
    service: str
) -> Dict:
    """
    Consulta il Knowledge Base Agent per verificare la disponibilità di un servizio.
    
    Args:
        service: Il servizio da verificare (es. "cardiologia", "dermatologia")
        
    Returns:
        Dizionario con informazioni sulla disponibilità
    """
    global _kb_agent
    
    if _kb_agent is None:
        # Fallback di emergenza in caso non sia stato configurato l'agente
        return {
            "available": False,
            "service": service,
            "kb_response": "Errore: Knowledge Base Agent non configurato correttamente."
        }
    
    # Creazione della query strutturata che richiede esplicitamente una risposta strutturata
    structured_query = (
        f"La clinica offre il servizio di {service}? "
        f"Rispondi SOLO con SI o NO all'inizio della tua risposta, "
        f"seguito da una breve spiegazione. Esempio: 'SI. Offriamo...' oppure 'NO. Non offriamo...'"
    )
    logger.info(f"[check_service_availability] Running KB Agent (as tool) with query: '{structured_query}'")

    try:
        # Use the list format for input, which is generally preferred/required by the SDK
        sub_input_items = [{"role": "user", "content": structured_query}]
        parent_context_obj = context.context # The actual MedicalAssistantContext

        # NON modifichiamo tool_choice qui. Lasciamo che KB Agent usi il suo default ("required")
        logger.info(f"[check_service_availability] Running KB Agent with its default settings (tool_choice='{_kb_agent.model_settings.tool_choice if _kb_agent.model_settings else 'auto'}')")

        kb_result = await Runner.run(_kb_agent, input=sub_input_items, context=parent_context_obj)

        # Process the result
        kb_response = kb_result.final_output # Use original variable name for clarity
        if not kb_response:
            kb_response = "Errore: L'agente KB non ha fornito una risposta testuale."
            logger.error(f"[check_service_availability] {kb_response}")
            return {"available": False, "service": service, "kb_response": kb_response, "error_details": "KB Agent failed to produce text output"}

        logger.info(f"[check_service_availability] KB Agent (as tool) raw response: '{kb_response}'")

        # Estrazione della disponibilità dalla risposta esplicita SI/NO (using .upper())
        is_available = kb_response.strip().upper().startswith("SI")
        logger.info(f"[check_service_availability] Parsed availability (SI/NO check): {is_available}")

        # Costruzione della risposta strutturata (senza .strip() su kb_response)
        return {"available": is_available, "service": service, "kb_response": kb_response}

    except Exception as e:
        # Log the full exception traceback for detailed debugging
        logger.exception(f"[check_service_availability] Error occurred while running KB Agent (as tool) for service check: {e}")
        # Provide a more informative error message in the tool output
        error_message = f"Mi dispiace, si è verificato un errore interno ({type(e).__name__}) nel verificare la disponibilità del servizio '{service}'. Si prega di riprovare o contattare l'assistenza."
        return {"available": False, "service": service, "kb_response": error_message, "error_details": str(e)}

@function_tool
async def get_fake_appointment_slot(
    context: RunContextWrapper[Any], 
    date: str,
    department: str
) -> str:
    """
    Ottiene slot di appuntamento disponibili per una data e reparto specifici.
    
    Args:
        date: La data per cui cercare appuntamenti (formato: YYYY-MM-DD)
        department: Il reparto per cui cercare appuntamenti
    
    Returns:
        Elenco degli slot di appuntamento disponibili
    """
    # Memorizziamo il reparto selezionato nel contesto
    context.context.selected_department = department
    
    # Dati fake per test - date a partire dal 27 marzo 2025
    available_slots = {
        # Marzo 2025 (ultimi giorni)
        "2025-03-27": ["09:00", "11:30", "14:30", "16:30"],
        "2025-03-28": ["08:30", "10:00", "13:30", "15:00", "17:30"],
        "2025-03-29": ["10:00", "14:00"],  # Sabato (meno slot)
        "2025-03-30": ["11:00", "15:30"],  # Domenica (meno slot)
        "2025-03-31": ["08:00", "10:30", "13:00", "15:30", "17:00"],
        
        # Aprile 2025 - prima settimana
        "2025-04-01": ["09:00", "11:30", "14:00", "16:30", "18:00"],
        "2025-04-02": ["08:30", "10:00", "13:30", "15:00", "17:30"],
        "2025-04-03": ["09:00", "11:00", "14:30", "16:00", "18:00"],
        "2025-04-04": ["08:30", "10:30", "13:00", "15:30", "17:00"],
        "2025-04-05": ["10:00", "13:30"],  # Sabato (meno slot)
        "2025-04-06": ["11:30", "14:30"],  # Domenica (meno slot)
        
        # Aprile 2025 - seconda settimana
        "2025-04-07": ["08:00", "09:30", "11:00", "14:00", "16:30", "18:00"],
        "2025-04-08": ["08:30", "10:00", "13:30", "16:00", "17:30"],
        "2025-04-09": ["09:00", "11:30", "14:30", "16:00", "18:00"],
        "2025-04-10": ["08:00", "10:30", "13:00", "15:30", "17:00"],
        "2025-04-11": ["09:30", "12:00", "14:00", "16:30"],
        "2025-04-12": ["10:00", "13:00", "15:00"],  # Sabato
        "2025-04-13": ["11:00", "14:00"],  # Domenica (meno slot)
        
        # Aprile 2025 - terza settimana
        "2025-04-14": ["08:30", "10:00", "13:30", "15:00", "17:30"],
        "2025-04-15": ["09:00", "11:30", "14:00", "16:30", "18:00"],
        "2025-04-16": ["08:00", "10:30", "13:00", "15:30", "17:00"],
        "2025-04-17": ["09:30", "12:00", "14:30", "16:00", "18:00"],
        "2025-04-18": ["08:30", "11:00", "13:30", "15:00", "17:30"],
        "2025-04-19": ["10:00", "13:00", "15:30"],  # Sabato
        "2025-04-20": ["11:30", "14:30"],  # Domenica (meno slot)
        
        # Aprile 2025 - ultima settimana
        "2025-04-21": ["08:00", "10:30", "13:00", "15:30", "17:00"],
        "2025-04-22": ["09:00", "11:30", "14:00", "16:30", "18:00"],
        "2025-04-23": ["08:30", "10:00", "13:30", "15:00", "17:30"],
        "2025-04-24": ["09:00", "11:00", "14:30", "16:00", "18:00"],
        "2025-04-25": ["08:30", "10:30", "13:00", "15:30", "17:00"],
        "2025-04-26": ["10:00", "13:30", "15:00"],  # Sabato
        "2025-04-27": ["11:00", "14:00"],  # Domenica (meno slot)
        
        # Aprile-Maggio 2025 (transizione)
        "2025-04-28": ["08:00", "09:30", "11:00", "14:00", "16:30", "18:00"],
        "2025-04-29": ["08:30", "10:00", "13:30", "16:00", "17:30"],
        "2025-04-30": ["09:00", "11:30", "14:30", "16:00", "18:00"],
        
        # Maggio 2025 - primi giorni
        "2025-05-01": ["10:30", "13:00", "15:30"],  # Festivo (meno slot)
        "2025-05-02": ["08:30", "10:30", "13:00", "15:30", "17:00"],
        "2025-05-03": ["10:00", "13:30", "15:30"],  # Sabato
        "2025-05-04": ["11:30", "14:30"],  # Domenica (meno slot)
        
        # Maggio 2025 - seconda settimana
        "2025-05-05": ["08:00", "10:30", "13:00", "15:30", "17:00"],
        "2025-05-06": ["09:00", "11:30", "14:00", "16:30", "18:00"],
        "2025-05-07": ["08:30", "10:00", "13:30", "15:00", "17:30"],
        "2025-05-08": ["09:00", "11:00", "14:30", "16:00", "18:00"],
        "2025-05-09": ["08:30", "10:30", "13:00", "15:30", "17:00"],
        "2025-05-10": ["10:00", "13:30"],  # Sabato (meno slot)
        "2025-05-11": ["11:00", "14:00"],  # Domenica (meno slot)
    }
    
    if date in available_slots:
        slots = ", ".join(available_slots[date])
        return f"Slot disponibili per {department} il {date}: {slots}"
    else:
        return f"Nessuno slot disponibile per {department} il {date}."

@function_tool
async def get_current_datetime(context: RunContextWrapper[Any]) -> Dict:
    """
    Ottiene la data e l'ora corrente.
    
    Returns:
        Dizionario con informazioni dettagliate su data e ora corrente
    """
    now = datetime.datetime.now()
    
    # Creiamo un oggetto con formati multipli e informazioni utili sul tempo
    return {
        "datetime_iso": now.isoformat(),  # Formato ISO standard
        "date": now.strftime("%Y-%m-%d"),  # Solo data YYYY-MM-DD
        "time": now.strftime("%H:%M:%S"),  # Solo ora HH:MM:SS
        "formatted_date": now.strftime("%d %B %Y"),  # Data in formato leggibile (es. "15 Ottobre 2023")
        "formatted_datetime": now.strftime("%d %B %Y, %H:%M"),  # Data e ora in formato leggibile
        "day_of_week": now.strftime("%A"),  # Giorno della settimana
        "is_weekend": now.weekday() >= 5,  # True se è weekend
        "year": now.year,
        "month": now.month,
        "month_name": now.strftime("%B"),  # Nome del mese
        "day": now.day,
        "hour": now.hour,
        "minute": now.minute,
        "second": now.second
    }

