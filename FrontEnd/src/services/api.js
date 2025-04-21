import { TOPIC_CONFIG } from '../config/layout';
import { getDynamicServiceUrl } from '../urlHelpers';
import { getClientId } from '../utils/clientId'; // Import the utility

// Usa la funzione helper per determinare l'URL dell'API
export const API_BASE_URL = getDynamicServiceUrl('api');

console.log('API Base URL:', API_BASE_URL);

// Timeout configurabile
const API_TIMEOUT = process.env.REACT_APP_API_TIMEOUT || 30000;

// Aggiungi l'ID dell'istanza agli header se specificato
const getHeaders = () => {
    const headers = {
        'Content-Type': 'application/json'
    };

    if (process.env.REACT_APP_INSTANCE_ID) {
        headers['X-Instance-ID'] = process.env.REACT_APP_INSTANCE_ID;
    }

    return headers;
};

// Debug
console.log('Variabile d\'ambiente REACT_APP_API_BASE_URL:', process.env.REACT_APP_API_BASE_URL || 'non impostata (usando fallback)');
console.log('API Base URL calcolato:', API_BASE_URL);
console.log('API Timeout:', API_TIMEOUT);
console.log('Instance ID:', process.env.REACT_APP_INSTANCE_ID || 'non specificato');

// Funzione per inviare un messaggio
export async function sendMessage(message, user, isGuest, topicId = null, topicSuffix = 'MainTopic') {
    try {
        console.log("=== SENDING MESSAGE ===");
        console.log("Message:", message);
        console.log("User:", user);
        console.log("Is Guest:", isGuest);
        console.log("Topic ID:", topicId);
        console.log("Topic Suffix:", topicSuffix);

        // Recupera o genera un ID cliente
        const clientId = getClientId();
        console.log("Client ID:", clientId);

        // Crea le intestazioni di base
        const headers = {
            'Content-Type': 'application/json',
            'X-Client-ID': clientId,
            'X-Is-Guest': isGuest ? 'true' : 'false',
            'X-Topic-Suffix': topicSuffix
        };

        // Aggiungi l'ID utente se presente
        if (user) {
            headers['X-User-ID'] = user.id;
        }

        console.log("Request headers:", headers);
        console.log("API URL:", `${API_BASE_URL}/messages/chat`);

        // Invia la richiesta al backend 
        const response = await fetch(`${API_BASE_URL}/messages/chat`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({
                topic_id: topicId,
                new_message_content: message,
                search_type: "hybrid",
                llm_options: { "completion_first": true },
                page_size: parseInt(process.env.REACT_APP_TRIEVE_PAGE_SIZE || '20', 10)
            }),
            credentials: 'include'
        });

        console.log("Response status:", response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Error response:", errorText);
            throw new Error(`Errore HTTP: ${response.status}`);
        }

        const data = await response.json();
        console.log("Response data:", {
            message: data.message ? data.message.substring(0, 50) + "..." : null,
            chunks: data.chunks ? data.chunks.length : 0
        });
        console.log("=== END SENDING MESSAGE ===");

        return data;
    } catch (error) {
        console.error('Errore nell\'invio del messaggio:', error);
        throw error;
    }
}

export const createTopic = async () => {
    const response = await fetch(`${API_BASE_URL}/messages/topic`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Client-ID': getClientId()
        },
        credentials: 'include'
    });
    return response.json();
};

export const getChatHistory = async (topicId = null, user = null, isGuest = true, topicSuffix = 'MainTopic') => {
    try {
        console.log("=== GETTING CHAT HISTORY ===");
        console.log("Topic ID:", topicId);
        console.log("User:", user ? { id: user.id, email: user.email } : null);
        console.log("Is Guest:", isGuest);
        console.log("Topic Suffix:", topicSuffix);

        // Costruisci l'URL con il parametro topic_id se fornito
        let url = `${API_BASE_URL}/messages/history`;
        if (topicId) {
            url += `?topic_id=${topicId}`;
            console.log("Using explicit topic ID:", topicId);
        }

        console.log("API URL:", url);

        const clientId = getClientId();
        console.log("Client ID:", clientId);

        // Prepara gli headers con le informazioni dell'utente
        const headers = {
            'Content-Type': 'application/json',
            'X-Client-ID': clientId,
            'X-Topic-Suffix': topicSuffix
        };

        // Aggiungi l'ID utente e lo stato guest
        if (user) {
            headers['X-User-ID'] = user.id;
            headers['X-Is-Guest'] = isGuest ? 'true' : 'false';
        } else {
            headers['X-Is-Guest'] = 'true';
        }

        console.log("Request headers:", headers);

        const response = await fetch(url, {
            method: 'GET',
            credentials: 'include',
            headers: headers
        });

        console.log("Response status:", response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Error response:", errorText);
            throw new Error('Errore nel recupero della cronologia');
        }

        const data = await response.json();
        console.log("History data:", {
            messagesCount: data.length,
            firstMessage: data.length > 0 ? {
                role: data[0].role,
                content: data[0].content.substring(0, 50) + "..."
            } : null,
            lastMessage: data.length > 0 ? {
                role: data[data.length - 1].role,
                content: data[data.length - 1].content.substring(0, 50) + "..."
            } : null
        });
        console.log("=== END GETTING CHAT HISTORY ===");

        return data;
    } catch (error) {
        console.error('Errore durante il recupero della cronologia:', error);
        throw error;
    }
};

// Funzione per creare o recuperare un topic
export async function createOrGetTopic(user, isGuest, topicSuffix = TOPIC_CONFIG.DEFAULT_SUFFIX, trieve_title = null) {
    try {
        console.log("=== CREATING/GETTING TOPIC ===");
        console.log("User:", user ? { id: user.id, email: user.email } : null);
        console.log("Is Guest:", isGuest);
        console.log("Topic Suffix:", topicSuffix);
        console.log("Trieve Title:", trieve_title);

        const clientId = getClientId();
        console.log("Client ID:", clientId);

        const headers = {
            'Content-Type': 'application/json',
            'X-Client-ID': clientId
        };

        // Aggiungi l'ID utente e lo stato guest
        if (user) {
            headers['X-User-ID'] = user.id;
            headers['X-Is-Guest'] = isGuest ? 'true' : 'false';
        } else {
            headers['X-Is-Guest'] = 'true';
        }

        // Aggiungi il suffisso del topic
        headers['X-Topic-Suffix'] = topicSuffix;

        // Aggiungi il titolo personalizzato se presente
        if (trieve_title) {
            headers['X-Trieve-Title'] = trieve_title;
        }

        console.log("Request headers:", headers);
        console.log("API URL:", `${API_BASE_URL}/messages/topic`);

        const response = await fetch(`${API_BASE_URL}/messages/topic`, {
            method: 'POST',
            headers: headers,
            credentials: 'include'
        });

        console.log("Response status:", response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Error response:", errorText);
            throw new Error(`Errore HTTP: ${response.status}`);
        }

        const data = await response.json();
        console.log("Topic data:", data);
        console.log("=== END CREATING/GETTING TOPIC ===");

        return data;
    } catch (error) {
        console.error('Errore nella creazione del topic:', error);
        throw error;
    }
}

// Crea una nuova conversazione
export const createConversation = async (title = "Nuova conversazione", user, isGuest) => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/conversations`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-User-ID': user?.id || '',
                'X-Client-ID': localStorage.getItem('clientId') || '',
                'X-Is-Guest': isGuest ? 'true' : 'false'
            },
            body: JSON.stringify({ title })
        });

        if (!response.ok) {
            throw new Error(`Error: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error creating conversation:', error);
        throw error;
    }
};

// Invia un messaggio e salva nella conversazione
export const SendMessage_Supabase = async (message, conversationId, user, isGuest) => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/messages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-User-ID': user?.id || '',
                'X-Client-ID': localStorage.getItem('clientId') || '',
                'X-Is-Guest': isGuest ? 'true' : 'false'
            },
            body: JSON.stringify({
                message,
                conversation_id: conversationId
            })
        });

        if (!response.ok) {
            throw new Error(`Error: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error sending message:', error);
        throw error;
    }
};

// Funzione dedicata per rinominare un topic in Trieve
export async function rename_trieve_topic(topicId, newName, user, isGuest, topicSuffix = "MainTopic") {
    try {
        console.log("=== RENAME TRIEVE TOPIC REQUEST ===");
        console.log("Topic ID:", topicId);
        console.log("New Name:", newName);
        console.log("User:", user ? { id: user.id } : null);
        console.log("Is Guest:", isGuest);
        console.log("Topic Suffix:", topicSuffix);

        const clientId = getClientId();
        console.log("Client ID:", clientId);

        // Prepara gli header appropriati
        const headers = {
            'Content-Type': 'application/json',
            'X-Client-ID': clientId,
            'X-Topic-Suffix': topicSuffix
        };

        if (user) {
            headers['X-User-ID'] = user.id;
            headers['X-Is-Guest'] = isGuest ? 'true' : 'false';
        } else {
            headers['X-Is-Guest'] = 'true';
        }

        // Costruisci l'URL con i parametri di query
        const url = `${API_BASE_URL}/messages/rename_trieve_topic?topic_id=${topicId}&new_name=${encodeURIComponent(newName)}`;
        console.log("API URL:", url);
        console.log("Request headers:", headers);

        const response = await fetch(url, {
            method: 'PUT',
            headers,
            credentials: 'include'
        });

        console.log("Response status:", response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Error response:", errorText);
            throw new Error(`HTTP error: ${response.status}`);
        }

        console.log("✅ Topic rinominato con successo");
        console.log("=== FINE RENAME TRIEVE TOPIC REQUEST ===");

        return true;
    } catch (error) {
        console.error('Errore nella rinomina del topic:', error);
        throw error;
    }
};

// Funzione per recuperare i topic di un owner
export const getTopicsByOwner = async (user, isGuest, topicSuffix = 'MainTopic') => {
    try {
        console.log("=== GETTING TOPICS BY OWNER ===");
        console.log("User:", user ? { id: user.id, email: user.email } : null);
        console.log("Is Guest:", isGuest);
        console.log("Topic Suffix:", topicSuffix);

        // Recupera o genera un ID cliente
        const clientId = getClientId();
        console.log("Client ID:", clientId);

        // Prepara gli header appropriati
        const headers = {
            'Content-Type': 'application/json',
            'X-Client-ID': clientId,
            'X-Topic-Suffix': topicSuffix
        };

        if (user) {
            headers['X-User-ID'] = user.id;
            headers['X-Is-Guest'] = isGuest ? 'true' : 'false';
        } else {
            headers['X-Is-Guest'] = 'true';
        }

        console.log("Request headers:", headers);
        console.log("API URL:", `${API_BASE_URL}/messages/topic/byowner`);

        const response = await fetch(`${API_BASE_URL}/messages/topic/byowner`, {
            method: 'GET',
            headers,
            credentials: 'include'
        });

        console.log("Response status:", response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Error response:", errorText);
            throw new Error(`HTTP error: ${response.status}`);
        }

        const data = await response.json();
        console.log(`Retrieved ${data.length} topics`);
        console.log("=== END GETTING TOPICS BY OWNER ===");

        return data;
    } catch (error) {
        console.error('Errore nel recupero dei topic:', error);
        throw error;
    }
};

// Funzione dedicata per eliminare un topic in Trieve
export async function delete_trieve_topic(topicId, user, isGuest, topicSuffix = "MainTopic") {
    try {
        console.log("=== DELETE TRIEVE TOPIC REQUEST ===");
        console.log("Topic ID:", topicId);
        console.log("User:", user ? { id: user.id } : null);
        console.log("Is Guest:", isGuest);
        console.log("Topic Suffix:", topicSuffix);

        const clientId = getClientId();
        console.log("Client ID:", clientId);

        // Prepara gli header appropriati
        const headers = {
            'Content-Type': 'application/json',
            'X-Client-ID': clientId,
            'X-Topic-Suffix': topicSuffix
        };

        if (user) {
            headers['X-User-ID'] = user.id;
            headers['X-Is-Guest'] = isGuest ? 'true' : 'false';
        } else {
            headers['X-Is-Guest'] = 'true';
        }

        // Costruisci l'URL con il parametro topic_id nella query
        const url = `${API_BASE_URL}/messages/delete_trieve_topic?topic_id=${topicId}`;
        console.log("API URL:", url);
        console.log("Request headers:", headers);

        const response = await fetch(url, {
            method: 'DELETE',
            headers,
            credentials: 'include'
        });

        console.log("Response status:", response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Error response:", errorText);
            throw new Error(`HTTP error: ${response.status}`);
        }

        console.log("✅ Topic eliminato con successo");
        console.log("=== FINE DELETE TRIEVE TOPIC REQUEST ===");

        return true;
    } catch (error) {
        console.error('Errore nell\'eliminazione del topic:', error);
        throw error;
    }
}

// Esempio di funzione per effettuare chiamate API
export const fetchApi = async (endpoint, options = {}) => {
    const url = `${API_BASE_URL}${endpoint}`;

    // Imposta le opzioni predefinite
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
            // Puoi aggiungere altri header predefiniti qui
        },
    };

    // Unisci le opzioni predefinite con quelle fornite
    const fetchOptions = { ...defaultOptions, ...options };

    try {
        const response = await fetch(url, fetchOptions);

        // Gestisci risposte non-ok
        if (!response.ok) {
            throw new Error(`API error: ${response.status} ${response.statusText}`);
        }

        // Controlla se la risposta è JSON
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            return await response.json();
        }

        return await response.text();
    } catch (error) {
        console.error('API request failed:', error);
        throw error;
    }
}; 