import json
import os
import traceback
from Agentic.string_utils import sanitize_context_items

def save_context_to_md(input_list, filename="chat_context.md"):
    """
    Salva il contesto serializzato in un file .md
    
    Args:
        input_list: Lista di input da serializzare
        filename: Nome del file .md dove salvare il contesto
    """
    try:
        # Crea il path completo nella directory Agentic
        filepath = os.path.join(os.path.dirname(__file__), filename)
        
        # Sanitizziamo l'input_list prima della serializzazione
        sanitized_list = sanitize_context_items(input_list)
        
        # Serializza la lista di input
        serialized = json.dumps(sanitized_list, ensure_ascii=False, indent=2)
        
        # Salva nel file .md con contenuti formattati
        with open(filepath, 'w', encoding='utf-8') as file:
            file.write(f"```json\n{serialized}\n```")
        
        print(f"\033[92mContesto salvato con successo in {filename}\033[0m")
        return True
    except Exception as e:
        print(f"\033[91mErrore nel salvataggio del contesto: {str(e)}\033[0m")
        traceback.print_exc()
        return False

def load_context_from_md(filename="chat_context.md"):
    """
    Carica il contesto da un file .md
    
    Args:
        filename: Nome del file .md da cui caricare il contesto
        
    Returns:
        Lista di input caricata dal file, o None se fallisce
    """
    try:
        # Crea il path completo nella directory Agentic
        filepath = os.path.join(os.path.dirname(__file__), filename)
        
        # Verifica se il file esiste
        if not os.path.exists(filepath):
            print(f"\033[93mFile {filename} non trovato. Inizializzazione con contesto vuoto.\033[0m")
            return []
        
        # Legge il file .md
        with open(filepath, 'r', encoding='utf-8') as file:
            content = file.read()
        
        # Estrae il JSON dal contenuto markdown
        # Cerca il contenuto tra ```json e ```
        if "```json" in content and "```" in content.split("```json", 1)[1]:
            json_content = content.split("```json", 1)[1].split("```", 1)[0].strip()
            input_list = json.loads(json_content)
            print(f"\033[92mContesto caricato con successo da {filename} ({len(input_list)} elementi)\033[0m")
            return input_list
        else:
            print(f"\033[93mFormato non valido in {filename}. Inizializzazione con contesto vuoto.\033[0m")
            return []
    except Exception as e:
        print(f"\033[91mErrore nel caricamento del contesto: {str(e)}\033[0m")
        traceback.print_exc()
        return []

def serialize_input_list(input_list):
    """
    Serializza l'input_list in formato JSON.
    
    Args:
        input_list: Lista di input generata da to_input_list()
        
    Returns:
        Stringa JSON che rappresenta l'input_list
    """
    try:
        # Sanitizziamo prima della serializzazione
        sanitized_list = sanitize_context_items(input_list)
        serialized = json.dumps(sanitized_list, ensure_ascii=False, indent=2)
        return serialized
    except Exception as e:
        print(f"\033[91mErrore nella serializzazione: {str(e)}\033[0m")
        return None 