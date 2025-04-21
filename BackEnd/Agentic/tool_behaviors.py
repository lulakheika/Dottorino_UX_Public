from typing import Dict, List, Optional, Union, Any, Callable
from agents import (
    RunContextWrapper, 
    FunctionToolResult, 
    ToolsToFinalOutputResult
)

class ToolBehaviorManager:
    """
    Gestisce i comportamenti degli strumenti per i diversi agenti.
    Centralizza la logica di gestione delle risposte per migliorare la coerenza.
    """
    
    @staticmethod
    async def handle_handoff_response(
        context: RunContextWrapper[Any],
        current_response: str,
        is_final: bool = False
    ) -> ToolsToFinalOutputResult:
        """
        Gestisce l'aggregazione delle risposte durante gli handoff.
        
        Args:
            context: Il contesto dell'agente
            current_response: La risposta corrente da aggiungere
            is_final: Se True, questa è l'ultima risposta da aggregare
            
        Returns:
            ToolsToFinalOutputResult che indica se terminare l'esecuzione dell'agente
        """
        if context.context.aggregated_response is None:
            context.context.aggregated_response = current_response
        else:
            # Aggiungiamo la nuova risposta a quella esistente
            context.context.aggregated_response = (
                f"{context.context.aggregated_response}\n\n"
                f"{current_response}"
            )
        
        if is_final:
            final_response = context.context.aggregated_response
            context.context.aggregated_response = None  # Reset per la prossima conversazione
            return ToolsToFinalOutputResult(
                is_final_output=True,
                final_output=final_response
            )
        
        return ToolsToFinalOutputResult(is_final_output=False)

    @staticmethod
    async def handle_availability_check(
        context: RunContextWrapper[Any],
        results: List[FunctionToolResult]
    ) -> ToolsToFinalOutputResult:
        """Gestisce solo la terminazione se il servizio non è disponibile."""
        if not results or len(results) == 0:
            return ToolsToFinalOutputResult(is_final_output=False)

        response = results[0].output
        if isinstance(response, dict) and "available" in response and not response["available"]:
            # Servizio non disponibile, termina con il messaggio KB
            kb_message = response.get("kb_response", "Servizio non disponibile.")
            # Ritorna direttamente l'output finale senza aggregazione qui
            return ToolsToFinalOutputResult(
                is_final_output=True,
                final_output=kb_message
            )
        # Altrimenti continua
        return ToolsToFinalOutputResult(is_final_output=False)

    @staticmethod
    async def handle_knowledge_lookup(
        context: RunContextWrapper[Any],
        results: List[FunctionToolResult]
    ) -> ToolsToFinalOutputResult:
        """Non fa nulla di speciale qui. L'aggregazione avviene dopo."""
        # Lasciamo che l'agente continui dopo aver ricevuto l'output del tool.
        return ToolsToFinalOutputResult(is_final_output=False)

    @staticmethod
    async def handle_appointment_tools(
        context: RunContextWrapper[Any],
        results: List[FunctionToolResult]
    ) -> ToolsToFinalOutputResult:
        """Gestisce solo la terminazione se check_service_availability fallisce."""
        if not results or len(results) == 0:
            return ToolsToFinalOutputResult(is_final_output=False)

        tool_result = results[0].output

        # Solo caso di terminazione esplicita: servizio non disponibile (da check_service_availability)
        if isinstance(tool_result, dict) and "available" in tool_result and not tool_result["available"]:
            message = (f"Mi dispiace, il servizio richiesto non è disponibile. "
                       f"{tool_result.get('kb_response', '')}")
            # Ritorna direttamente l'output finale
            return ToolsToFinalOutputResult(
                is_final_output=True,
                final_output=message
            )

        # Per tutti gli altri output dei tool (get_datetime, get_slots), non fare nulla qui.
        # L'agente riceverà l'output e procederà. L'aggregazione avverrà dopo.
        return ToolsToFinalOutputResult(is_final_output=False)

    @staticmethod
    def get_behavior_for_agent(agent_name: str) -> Callable:
        """Factory method che restituisce il comportamento appropriato per un agente."""
        # Associa gli agenti alle funzioni semplificate
        behaviors = {
            "Triage Agent": ToolBehaviorManager.handle_availability_check, # Gestisce solo terminazione
            "Appointment Agent": ToolBehaviorManager.handle_appointment_tools, # Gestisce solo terminazione
            "Medical Information Agent": ToolBehaviorManager.handle_knowledge_lookup, # Non fa nulla
            "Knowledge Base Agent": lambda ctx, res: ToolsToFinalOutputResult(is_final_output=False) # Non fa nulla
        }
        return behaviors.get(agent_name, lambda ctx, res: ToolsToFinalOutputResult(is_final_output=False))
