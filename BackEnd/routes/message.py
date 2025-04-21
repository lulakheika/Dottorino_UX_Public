from fastapi import APIRouter, HTTPException, Cookie, Response, Header, Query
from pydantic import BaseModel
from typing import List, Optional
from openai import OpenAI
from config import settings
from datetime import datetime
import requests
import uuid
from fastapi import status
import json

router = APIRouter(prefix="/api/messages", tags=["messages"])

class MessageRequest(BaseModel):
    message: str

class MessageResponse(BaseModel):
    response: str

class TopicCreate(BaseModel):
    owner_id: str
    name: str

class TopicResponse(BaseModel):
    id: str
    name: str
    deleted: bool
    created_at: datetime
    updated_at: datetime
    dataset_id: str
    owner_id: str

class TrieveMessage(BaseModel):
    topic_id: str
    new_message_content: str
    audio_input: Optional[str] = None
    search_type: str = "hybrid"
    llm_options: dict = {"completion_first": True}
    page_size: int = int(settings.TRIEVE_PAGE_SIZE)

class MessageHistory(BaseModel):
    completion_tokens: int
    content: str
    created_at: datetime
    dataset_id: str
    deleted: bool
    id: str
    prompt_tokens: int
    role: str
    sort_order: int
    topic_id: str
    updated_at: datetime

class ChatResponse(BaseModel):
    message: str
    chunks: List[dict] = []

async def get_topic_by_name(owner_id: str, topic_name: str):
    """Recupera un topic esistente per nome e owner_id"""
    headers = {
        "Authorization": f"Bearer {settings.TRIEVE_API_KEY}",
        "TR-Dataset": settings.TRIEVE_DATASET_ID}
    
    # Usa l'owner_id passato invece di quello fisso
    resp = requests.get(
        f"{settings.TRIEVE_BASE_URL}/topic/search?name={topic_name}&owner_id={owner_id}",
        headers=headers
    )
    
    if not resp.ok:
        print(f"Error searching for topic: {resp.text}")
        return None
    
    topics = resp.json()
    if topics and len(topics) > 0:
        return topics[0]
    
    return None

def determine_owner_id(client_id, user_id, is_guest, topic_id=None, topic_suffix=None):
    """
    Determina l'owner_id in base ai parametri ricevuti.
    
    Args:
        client_id: ID del client (browser/dispositivo)
        user_id: ID dell'utente Supabase
        is_guest: Flag che indica se l'utente è ospite
        topic_id: ID del topic (opzionale, per la verifica)
        topic_suffix: Suffisso del topic (opzionale, per la creazione)
        
    Returns:
        owner_id: ID del proprietario da usare con Trieve
        topic_name: Nome del topic da usare (solo se topic_suffix è fornito)
    """
    print("\n***************** DETERMINAZIONE OWNER_ID *****************")
    print(f"Parametri: client_id={client_id}, user_id={user_id}, is_guest={is_guest}")
    print(f"Topic ID: {topic_id}, Topic Suffix: {topic_suffix}")
    
    # Assicuriamoci che client_id sia sempre disponibile per gli ospiti
    if is_guest and not client_id:
        client_id = f"anonymous_{str(uuid.uuid4())}"
        print(f"Generato nuovo client_id per ospite: {client_id}")
    
    # CASO 1: Stiamo creando un nuovo topic (abbiamo il topic_suffix)
    if topic_suffix is not None:
        # Se topic_suffix è "MainTopic", siamo in modalità Trieve
        if topic_suffix == "MainTopic":
            # In modalità Trieve
            if is_guest:
                # Per ospiti in modalità Trieve: usa sempre client_id
                owner_id = client_id
                topic_name = f"{client_id}_{topic_suffix}"
                print(f"Modalità Trieve + Ospite: usando client_id come owner: {owner_id}")
            else:
                # Per utenti autenticati in Trieve: comportamento standard
                owner_id = user_id
                topic_name = f"{user_id}_{topic_suffix}"
                print(f"Modalità Trieve + Autenticato: usando user_id come owner: {owner_id}")
            
            print("\n### RIEPILOGO DETERMINAZIONE ###")
            print(f"Scenario: Creazione Topic (suffix={topic_suffix})")
            print(f"Owner ID determinato: {owner_id}")
            print(f"Topic Name: {topic_name}")
            print("***************** FINE DETERMINAZIONE OWNER_ID *****************\n")
            return owner_id, topic_name
        else:
            # In modalità Supabase (suffisso è un conversationId)
            if not is_guest and user_id:
                owner_id = user_id
            else:
                owner_id = user_id if user_id else client_id
            
            topic_name = f"{owner_id}_{topic_suffix}"
            print(f"Modalità Supabase: usando owner_id: {owner_id}, suffisso: {topic_suffix}")
            
            print("\n### RIEPILOGO DETERMINAZIONE ###")
            print(f"Scenario: Creazione Topic Supabase (suffix={topic_suffix})")
            print(f"Owner ID determinato: {owner_id}")
            print(f"Topic Name: {topic_name}")
            print("***************** FINE DETERMINAZIONE OWNER_ID *****************\n")
            return owner_id, topic_name
    
    # CASO 2: Stiamo accedendo a un topic esistente (via topic_id)
    # Verifichiamo a quale owner appartiene effettivamente
    if topic_id:
        # Determiniamo i possibili owner in base al contesto
        possible_owners = []
        
        # Per gli ospiti, proviamo prima con client_id
        if is_guest:
            possible_owners.append(client_id)
        
        # Poi proviamo con user_id (in caso di Supabase)
        if user_id:
            possible_owners.append(user_id)
        
        # Se non siamo ospiti, c'è solo un possibile owner
        if not is_guest and user_id:
            possible_owners = [user_id]
        
        print(f"Possibili owner da verificare: {possible_owners}")
        
        # Cerchiamo il topic tra tutti i possibili owner
        headers = {
            "Authorization": f"Bearer {settings.TRIEVE_API_KEY}",
            "TR-Dataset": settings.TRIEVE_DATASET_ID,
            "Content-Type": "application/json"
        }
        
        for owner in possible_owners:
            verify_url = f"{settings.TRIEVE_BASE_URL}/topic/owner/{owner}"
            print(f"Verifico se topic {topic_id} appartiene all'owner: {owner}")
            
            verify_resp = requests.get(verify_url, headers=headers)
            
            if verify_resp.ok:
                topics = verify_resp.json()
                
                # Cerchiamo il topic specifico nella lista
                for topic in topics:
                    if topic["id"] == topic_id:
                        print(f"Topic trovato! Appartiene all'owner: {owner}")
                        
                        print("\n### RIEPILOGO DETERMINAZIONE ###")
                        print(f"Scenario: Accesso a Topic Esistente (id={topic_id})")
                        print(f"Owner ID determinato: {owner}")
                        print(f"Topic Name: {topic.get('name', 'N/A')}")
                        print("***************** FINE DETERMINAZIONE OWNER_ID *****************\n")
                        return owner, None
        
        # Se non troviamo il topic, usiamo un fallback
        fallback_owner = user_id if user_id else client_id
        print(f"Topic {topic_id} non trovato per nessun owner possibile, usando fallback: {fallback_owner}")
        
        print("\n### RIEPILOGO DETERMINAZIONE ###")
        print(f"Scenario: Fallback per Topic non trovato (id={topic_id})")
        print(f"Owner ID determinato (fallback): {fallback_owner}")
        print("***************** FINE DETERMINAZIONE OWNER_ID *****************\n")
        return fallback_owner, None
    
    # CASO 3: Non abbiamo né topic_id né topic_suffix (caso generico)
    if is_guest:
        # Per ospiti: usa l'ID utente se disponibile, altrimenti client_id
        owner_id = user_id if user_id else client_id
        print(f"Caso generico ospite: {owner_id}")
        
        print("\n### RIEPILOGO DETERMINAZIONE ###")
        print("Scenario: Caso Generico (ospite)")
        print(f"Owner ID determinato: {owner_id}")
        print("***************** FINE DETERMINAZIONE OWNER_ID *****************\n")
        return owner_id, None
    else:
        # Per utenti autenticati: comportamento standard
        owner_id = user_id
        print(f"Caso generico utente: {owner_id}")
        
        print("\n### RIEPILOGO DETERMINAZIONE ###")
        print("Scenario: Caso Generico (utente autenticato)")
        print(f"Owner ID determinato: {owner_id}")
        print("***************** FINE DETERMINAZIONE OWNER_ID *****************\n")
        return owner_id, None

@router.post("/topic", response_model=TopicResponse)
async def create_topic(
    client_id: str = Header(None, alias="X-Client-ID"),
    user_id: str = Header(None, alias="X-User-ID"),
    is_guest: bool = Header(False, alias="X-Is-Guest"),
    topic_suffix: str = Header("MainTopic", alias="X-Topic-Suffix"),
    trieve_title: Optional[str] = Header(None, alias="X-Trieve-Title")
):
    """Crea un nuovo topic per le conversazioni"""
    print("\n=== CREATE TOPIC REQUEST ===")
    print(f"client_id: {client_id}")
    print(f"user_id: {user_id}")
    print(f"is_guest: {is_guest}")
    print(f"topic_suffix: {topic_suffix}")
    print(f"trieve_title: {trieve_title}")
    
    try:
        # Usa determine_owner_id per trovare l'owner_id e il topic_name
        owner_id, topic_name = determine_owner_id(client_id, user_id, is_guest, None, topic_suffix)
        print(f"Owner ID determinato: {owner_id}")
        print(f"Topic name: {topic_name}")
        
        # Aggiungi il suffisso personalizzato al nome del topic se presente
        if trieve_title:
            topic_name = f"{topic_name}§{trieve_title}"
            print(f"Topic name con titolo personalizzato: {topic_name}")
        
        # Controllo: esiste già un topic con questo nome per questo owner?
        existing_topic = await get_topic_by_name(owner_id, topic_name)
        if existing_topic:
            print(f"Topic esistente trovato: {existing_topic['id']}")
            return existing_topic
        
        # Crea il nuovo topic
        topic_data = TopicCreate(
            owner_id=owner_id,
            name=topic_name
        )
        
        # Chiama l'API Trieve per creare il topic
        headers = {
            "Authorization": f"Bearer {settings.TRIEVE_API_KEY}",
            "TR-Dataset": settings.TRIEVE_DATASET_ID,
            "Content-Type": "application/json"
        }
        
        print(f"🔍 Creazione topic: {topic_data}")
        resp = requests.post(
            f"{settings.TRIEVE_BASE_URL}/topic",
            json=topic_data.dict(),
            headers=headers
        )
        
        if not resp.ok:
            print(f"Error creating topic: {resp.status_code} - {resp.text}")
            raise HTTPException(
                status_code=resp.status_code,
                detail=f"Trieve API error: {resp.text}"
            )
        
        topic = resp.json()
        print(f"✅ Topic creato con successo: {topic['id']}")
        return topic
    except Exception as e:
        print(f"Error creating topic: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.post("/chat", response_model=ChatResponse)
async def chat(
    request: TrieveMessage,
    client_id: str = Header(None, alias="X-Client-ID"),
    user_id: str = Header(None, alias="X-User-ID"),
    is_guest: bool = Header(False, alias="X-Is-Guest"),
    topic_suffix: str = Header("MainTopic", alias="X-Topic-Suffix")
):
    """Invia un messaggio al backend e ritorna una risposta"""
    print("\n=== CHAT REQUEST ===")
    print(f"Received chat request for topic_id: {request.topic_id}")
    print(f"client_id: {client_id}")
    print(f"user_id: {user_id}")
    print(f"is_guest: {is_guest}")
    print(f"topic_suffix: {topic_suffix}")
    
    try:
        # Usa determine_owner_id per determinare il proprietario corretto
        owner_id, _ = determine_owner_id(client_id, user_id, is_guest, request.topic_id, topic_suffix)
        print(f"owner_id determinato: {owner_id}")
        
        headers = {
            "Authorization": f"Bearer {settings.TRIEVE_API_KEY}",
            "TR-Dataset": settings.TRIEVE_DATASET_ID,
            "Content-Type": "application/json"
        }
        
        # Verifichiamo che il topic appartenga all'utente
        verify_url = f"{settings.TRIEVE_BASE_URL}/topic/owner/{owner_id}"
        print(f"Fetching topics from URL: {verify_url}")
        
        verify_resp = requests.get(
            verify_url,
            headers=headers
        )
        
        print(f"Verify response status: {verify_resp.status_code}")
        
        if not verify_resp.ok:
            print(f"Verify error response: {verify_resp.text}")
            raise HTTPException(
                status_code=400,
                detail=f"Failed to verify topics. Status: {verify_resp.status_code}, Response: {verify_resp.text}"
            )

        # Cerchiamo il topic specifico nella lista
        topics = verify_resp.json()
        print(f"Topics found for owner: {len(topics)}")
        for topic in topics:
            print(f"  - Topic ID: {topic['id']}, Name: {topic['name']}")
        
        topic_exists = any(topic["id"] == request.topic_id for topic in topics)
        
        if not topic_exists:
            print(f"Topic {request.topic_id} not found for owner {owner_id}")
            raise HTTPException(
                status_code=400,
                detail="Topic not found for this owner"
            )
        
        # Procediamo con l'invio del messaggio
        payload = {
            "topic_id": request.topic_id,
            "new_message_content": request.new_message_content,
            "search_type": request.search_type,
            "llm_options": request.llm_options,
            "page_size": request.page_size
        }
        print(f"Impossible Page Size: {request.page_size}")
        print(f"Sending request to Trieve with payload: {payload}")
        
        resp = requests.post(
            f"{settings.TRIEVE_BASE_URL}/message",
            json=payload,
            headers=headers,
            timeout=30
        )
        
        print(f"Trieve response status: {resp.status_code}")
        
        if not resp.ok:
            print(f"Trieve error response: {resp.text}")
            raise HTTPException(
                status_code=resp.status_code,
                detail=f"Trieve API error: {resp.text}"
            )
        
        raw_data = resp.text
        print(f"Raw response text length: {len(raw_data)}")
        print(f"First 100 chars: {raw_data[:100]}...")
        
        split_index = raw_data.find("||[")
        
        if split_index != -1:
            message = raw_data[:split_index].strip()
            chunks_str = raw_data[split_index + 2:]
            
            try:
                chunks = json.loads(chunks_str)
                print(f"Parsed {len(chunks)} chunks")
            except json.JSONDecodeError as e:
                print(f"Failed to parse chunks JSON: {e}")
                chunks = []
        else:
            message = raw_data
            chunks = []
            print("No chunks found in response")
        
        print("=== END CHAT REQUEST ===\n")
        return ChatResponse(
            message=message,
            chunks=chunks if isinstance(chunks, list) else [chunks]
        )
            
    except requests.exceptions.RequestException as e:
        print(f"Request error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error communicating with Trieve API"
        )
    except Exception as e:
        print(f"Unexpected error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get("/history", response_model=List[MessageHistory])
async def get_chat_history(
    topic_id: Optional[str] = Query(None),
    cookie_topic_id: Optional[str] = Cookie(None, alias="topic_id"),
    client_id: str = Header(None, alias="X-Client-ID"),
    user_id: str = Header(None, alias="X-User-ID"),
    is_guest: bool = Header(False, alias="X-Is-Guest"),
    topic_suffix: str = Header("MainTopic", alias="X-Topic-Suffix")
):
    """Recupera la cronologia dei messaggi per un topic"""
    print("\n=== HISTORY REQUEST ===")
    
    # Usa il topic_id dalla query se fornito, altrimenti usa quello dal cookie
    effective_topic_id = topic_id # or cookie_topic_id
    print(f"Query topic_id: {topic_id}")
    print(f"Cookie topic_id: {cookie_topic_id}")
    print(f"Effective topic_id: {effective_topic_id}")
    print(f"client_id: {client_id}")
    print(f"user_id: {user_id}")
    print(f"is_guest: {is_guest}")
    print(f"topic_suffix: {topic_suffix}")
    
    if not effective_topic_id:
        raise HTTPException(status_code=400, detail="No active topic found")
    
    try:
        # Determina l'owner_id usando la funzione esistente
        owner_id, _ = determine_owner_id(client_id, user_id, is_guest, effective_topic_id, topic_suffix)
        print(f"owner_id determinato per history: {owner_id}")
        
        headers = {
            "Authorization": f"Bearer {settings.TRIEVE_API_KEY}",
            "TR-Dataset": settings.TRIEVE_DATASET_ID,
            "Content-Type": "application/json"
        }
        
        # Verifichiamo che il topic esista cercandolo tra i topic dell'owner
        verify_url = f"{settings.TRIEVE_BASE_URL}/topic/owner/{owner_id}"
        print(f"Verifying topic ownership: {verify_url}")
        
        verify_resp = requests.get(
            verify_url,
            headers=headers
        )
        
        print(f"Verify response status: {verify_resp.status_code}")
        
        if not verify_resp.ok:
            print(f"Verify error response: {verify_resp.text}")
            raise HTTPException(
                status_code=400,
                detail=f"Failed to verify topics. Status: {verify_resp.status_code}, Response: {verify_resp.text}"
            )

        # Cerchiamo il topic specifico nella lista
        topics = verify_resp.json()
        print(f"Topics found for owner: {len(topics)}")
        for topic in topics:
            print(f"  - Topic ID: {topic['id']}, Name: {topic['name']}")
        
        topic_exists = any(topic["id"] == effective_topic_id for topic in topics)
        
        if not topic_exists:
            print(f"Topic {effective_topic_id} not found for owner {owner_id}")
            raise HTTPException(
                status_code=400,
                detail="Topic not found for this owner"
            )
        
        print(f"Fetching messages for topic: {effective_topic_id}")
        
        resp = requests.get(
            f"{settings.TRIEVE_BASE_URL}/messages/{effective_topic_id}",
            headers=headers
        )
        
        print(f"History response status: {resp.status_code}")
        
        if not resp.ok:
            print(f"History error response: {resp.text}")
            raise HTTPException(
                status_code=resp.status_code,
                detail=f"Trieve API error: {resp.text}"
            )
        
        messages = resp.json()
        print(f"Retrieved {len(messages)} messages from history")
        
        # Sostituiamo il primo messaggio (il prompt di sistema) con il messaggio di default
        if messages and len(messages) > 0:
            messages[0]["content"] = settings.FIRST_BOT_MESSAGE
            print(f"Replaced first message with default: {settings.FIRST_BOT_MESSAGE[:30]}...")
        
        # Pulisci i messaggi dell'assistente rimuovendo i chunks
        cleaned_count = 0
        for message in messages:
            if message["role"] == "assistant" and "||" in message["content"]:
                original_length = len(message["content"])
                message["content"] = message["content"].split("||")[0].strip()
                cleaned_count += 1
                print(f"Cleaned message: {original_length} chars -> {len(message['content'])} chars")
        
        print(f"Cleaned {cleaned_count} assistant messages")
        print("=== END HISTORY REQUEST ===\n")
        return messages
        
    except Exception as e:
        print(f"Error fetching history: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        ) 

@router.get("/topic/byowner", response_model=List[TopicResponse])
async def get_topics_by_owner(
    client_id: str = Header(None, alias="X-Client-ID"),
    user_id: str = Header(None, alias="X-User-ID"),
    is_guest: bool = Header(False, alias="X-Is-Guest"),
    topic_suffix: str = Header("MainTopic", alias="X-Topic-Suffix")
):
    """Recupera i topic di proprietà dell'utente specificato"""
    print("\n=== TOPICS BY OWNER REQUEST ===")
    print(f"client_id: {client_id}")
    print(f"user_id: {user_id}")
    print(f"is_guest: {is_guest}")
    print(f"topic_suffix: {topic_suffix}")
    
    try:
        # Determina l'owner_id usando la funzione esistente
        owner_id, _ = determine_owner_id(client_id, user_id, is_guest, None, topic_suffix)
        print(f"owner_id determinato per topics: {owner_id}")
        
        # Chiama l'API Trieve per ottenere i topic dell'utente
        url = f"{settings.TRIEVE_BASE_URL}/topic/owner/{owner_id}"
        
        # Aggiunto l'header TR-Dataset
        headers = {
            "Authorization": f"Bearer {settings.TRIEVE_API_KEY}",
            "TR-Dataset": settings.TRIEVE_DATASET_ID
        }
        
        print(f"🔑 Headers: Authorization=Bearer *****, TR-Dataset={settings.TRIEVE_DATASET_ID}")
        
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        topics = response.json()
        
        print(f"✅ Recuperati {len(topics)} topic da Trieve")
        
        # Filtra i topic cancellati
        active_topics = [topic for topic in topics if not topic.get("deleted", False)]
        
        return active_topics
        
    except Exception as e:
        print(f"Error fetching topics: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.put("/rename_trieve_topic", status_code=204)
async def rename_trieve_topic(
    topic_id: str = Query(..., description="L'ID del topic da rinominare"),
    new_name: str = Query(..., description="Il nuovo nome del topic"),
    client_id: str = Header(None, alias="X-Client-ID"),
    user_id: str = Header(None, alias="X-User-ID"),
    is_guest: bool = Header(False, alias="X-Is-Guest")
):
    """Rinomina un topic esistente in Trieve senza alterare il formato del nome"""
    print("\n=== RENAME TRIEVE TOPIC REQUEST ===")
    print(f"topic_id: {topic_id}")
    print(f"new_name: {new_name}")
    print(f"client_id: {client_id}")
    print(f"user_id: {user_id}")
    print(f"is_guest: {is_guest}")
    
    try:
        # Determina l'owner_id usando la funzione esistente
        owner_id, _ = determine_owner_id(client_id, user_id, is_guest, topic_id)
        print(f"owner_id determinato: {owner_id}")
        
        headers = {
            "Authorization": f"Bearer {settings.TRIEVE_API_KEY}",
            "TR-Dataset": settings.TRIEVE_DATASET_ID,
            "Content-Type": "application/json"
        }
        
        # Verifichiamo che il topic appartenga all'utente
        verify_url = f"{settings.TRIEVE_BASE_URL}/topic/owner/{owner_id}"
        verify_resp = requests.get(verify_url, headers=headers)
        
        if not verify_resp.ok:
            print(f"Errore verifica topic: {verify_resp.text}")
            raise HTTPException(
                status_code=400,
                detail=f"Impossibile verificare il topic. Stato: {verify_resp.status_code}"
            )

        # Verifichiamo l'esistenza del topic
        topics = verify_resp.json()
        matching_topic = None
        
        for topic in topics:
            if topic["id"] == topic_id:
                matching_topic = topic
                break
        
        if not matching_topic:
            print(f"Topic {topic_id} non trovato per owner {owner_id}")
            raise HTTPException(
                status_code=404,
                detail="Topic non trovato per questo utente"
            )
        
        print(f"Topic trovato: {matching_topic['name']}")
        
        # Chiamata all'API Trieve per rinominare il topic
        payload = {
            "topic_id": topic_id,
            "name": new_name
        }
        
        print(f"Invio richiesta a Trieve con payload: {payload}")
        
        resp = requests.put(
            f"{settings.TRIEVE_BASE_URL}/topic",
            json=payload,
            headers=headers
        )
        
        print(f"Risposta Trieve: {resp.status_code}")
        
        if not resp.ok:
            print(f"Errore risposta Trieve: {resp.text}")
            raise HTTPException(
                status_code=resp.status_code,
                detail=f"Errore API Trieve: {resp.text}"
            )
        
        print("✅ Topic rinominato con successo")
        print("=== FINE RENAME TRIEVE TOPIC REQUEST ===\n")
        return Response(status_code=204)
            
    except Exception as e:
        print(f"Errore nella rinomina del topic: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.delete("/delete_trieve_topic", status_code=204)
async def delete_trieve_topic(
    topic_id: str = Query(..., description="L'ID del topic da eliminare"),
    client_id: str = Header(None, alias="X-Client-ID"),
    user_id: str = Header(None, alias="X-User-ID"),
    is_guest: bool = Header(False, alias="X-Is-Guest"),
    topic_suffix: str = Header("MainTopic", alias="X-Topic-Suffix")
):
    """Elimina un topic esistente in Trieve"""
    try:
        print(f"Richiesta di eliminazione del topic: {topic_id}")
        
        # Determina l'owner_id appropriato
        owner_id, _ = determine_owner_id(client_id, user_id, is_guest, topic_id, topic_suffix)
        print(f"owner_id determinato: {owner_id}")
        
        # Prepara gli header per Trieve
        headers = {
            "Content-Type": "application/json",
            "TR-Dataset": settings.TRIEVE_DATASET_ID,
            "Authorization": settings.TRIEVE_API_KEY
        }
        
        # URL corretto per l'eliminazione dei topic secondo la documentazione Trieve
        delete_url = f"{settings.TRIEVE_BASE_URL}/topic/{topic_id}"
        print(f"URL eliminazione: {delete_url}")
        
        # Invia la richiesta DELETE a Trieve
        delete_resp = requests.delete(delete_url, headers=headers)
        
        # Gestione della risposta
        if not delete_resp.ok:
            print(f"Errore nella richiesta a Trieve: {delete_resp.status_code} - {delete_resp.text}")
            raise HTTPException(
                status_code=delete_resp.status_code, 
                detail=f"Errore nell'eliminazione del topic: {delete_resp.text}"
            )
        
        print(f"Topic eliminato con successo: {topic_id}")
        return {"success": True}
        
    except HTTPException as http_e:
        # Rilancia eccezioni HTTP specifiche
        raise http_e
    except Exception as e:
        # Gestione generica delle eccezioni
        print(f"❌ Errore nell'eliminazione del topic: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Errore nel server: {str(e)}")