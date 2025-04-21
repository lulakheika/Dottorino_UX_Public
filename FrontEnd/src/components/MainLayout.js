import React, { useState, useEffect, useRef } from "react";
import Sidebar from "./Sidebar";
import ChatArea from "./ChatArea";
import { sendMessage, createTopic, getChatHistory, createOrGetTopic } from '../services/api';
import { sendAgentChatMessage } from '../services/agentApi.js';
import { SIDEBAR_CONFIG } from '../config/layout';
import { Outlet, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabase/client';
import { logEvent, log, enableSequentialLogging } from '../utils/logger';
import loadingState from '../utils/loadingState';

// Definiamo le costanti una sola volta
const PADDING = SIDEBAR_CONFIG.PADDING;
const MAX_TEXT_WIDTH = SIDEBAR_CONFIG.MAX_TEXT_WIDTH;
const MIN_WIDTH = SIDEBAR_CONFIG.MIN_WIDTH;
const MAX_WIDTH = SIDEBAR_CONFIG.MAX_WIDTH;

function MainLayout() {
    // Controlla se la sidebar è abilitata
    const isSidebarEnabled = process.env.REACT_APP_ENABLE_SIDEBAR === 'true';

    // Manteniamo la logica della sidebar solo se è abilitata
    const getInitialSidebarState = () => {
        if (!isSidebarEnabled) return false;
        if (window.innerWidth < 768) return false;

        const savedState = localStorage.getItem('sidebarOpen');
        return savedState === null ? true : savedState === 'true';
    };

    const [isSidebarOpen, setIsSidebarOpen] = useState(getInitialSidebarState());
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const initializeRef = useRef(false);
    const [contentWidth, setContentWidth] = useState(0);
    const { user, isGuest } = useAuth();

    // Nuovo stato per la sorgente dati (trieve o supabase)
    const [dataSource, setDataSource] = useState(() => {
        // Recupera la preferenza salvata o usa 'trieve' come default
        return localStorage.getItem('dataSource') || 'trieve';
    });

    // Salva la preferenza quando cambia
    useEffect(() => {
        localStorage.setItem('dataSource', dataSource);
    }, [dataSource]);

    // Log per verificare la persistenza del client ID
    useEffect(() => {
        // Verifica se esiste già un clientId
        let clientId = localStorage.getItem('clientId');

        // Se non esiste, generane uno nuovo
        if (!clientId) {
            clientId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
            localStorage.setItem('clientId', clientId);
        }

        console.log("Client ID all'avvio:", clientId);
    }, []);

    // Gestisce la responsiveness
    useEffect(() => {
        const handleResize = () => {
            const isMobileView = window.innerWidth < 768;
            setIsMobile(isMobileView);
            if (isMobileView) {
                setIsSidebarOpen(false);
            } else {
                // Quando si torna a desktop, ripristina lo stato salvato
                const savedState = localStorage.getItem('sidebarOpen');
                if (savedState !== null) {
                    setIsSidebarOpen(savedState === 'true');
                }
            }
        };

        window.addEventListener('resize', handleResize);

        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Salva lo stato della sidebar quando cambia (solo per desktop)
    useEffect(() => {
        if (!isMobile) {
            localStorage.setItem('sidebarOpen', isSidebarOpen);
        }
    }, [isSidebarOpen, isMobile]);

    // Dichiariamo il ref fuori dall'effetto
    const hasLoadedRef = useRef(false);

    // Un unico effetto completo che gestisce tutte le situazioni
    useEffect(() => {
        // Genera una chiave univoca che rappresenta lo stato complessivo
        const stateKey = `trieve_load_${dataSource}_${user?.id || 'unknown'}_${Date.now()}`;
        console.log("🔄 Verifica caricamento con chiave:", stateKey);

        if (!hasLoadedRef.current) {
            hasLoadedRef.current = true;

            // Utilizza un flag globale una-tantum per il primo caricamento
            const initialLoadKey = `initial_load_${dataSource}_${user?.id || 'unknown'}`;

            // Verifica se è il primo caricamento in assoluto
            if (!window._loadedKeys) window._loadedKeys = new Set();

            if (!window._loadedKeys.has(initialLoadKey)) {
                console.log("🔄 Primo caricamento assoluto:", initialLoadKey);
                window._loadedKeys.add(initialLoadKey);

                // Ritarda leggermente per assicurarsi che tutti gli stati siano stabilizzati
                setTimeout(() => {
                    if (dataSource === 'trieve' && user) {
                        console.log("🔄 Esecuzione caricamento effettivo:", initialLoadKey);

                        // Verifica se abbiamo un topic ID valido
                        if (currentTopicId) {
                            // Se abbiamo già un topic ID, carichiamo la history con esso
                            loadChatHistoryWithId(currentTopicId, 'MainTopic');
                        } else {
                            // Altrimenti, creiamo o otteniamo prima un topic di default
                            console.log("⚠️ Nessun topic ID disponibile, non carichiamo la history al primo avvio");
                            // Non facciamo nulla - l'utente dovrà selezionare un topic dalla sidebar
                        }
                    }
                }, 100);
            }
        }
    }, [dataSource, user, isGuest]);

    // Aggiungiamo uno stato per tenere traccia dell'ID della conversazione attiva
    const [activeConversationId, setActiveConversationId] = useState(null);

    // Modifichiamo la funzione per generare chiavi diverse per Supabase e Trieve
    const getLastConversationStorageKey = (user, isGuest, source) => {
        const prefix = source === 'trieve' ? 'last_topic_' : 'last_conversation_';

        if (user && user.id) {
            return `${prefix}user_${user.id}`;
        } else {
            const clientId = localStorage.getItem('clientId') || 'unknown';
            return `${prefix}client_${clientId}`;
        }
    };

    // Aggiungiamo uno stato per tracciare se abbiamo già tentato di caricare l'ultima conversazione
    const [initialConversationLoaded, setInitialConversationLoaded] = useState(false);

    // All'inizio del componente MainLayout, dopo la dichiarazione degli stati
    const hasInitializedRef = useRef(false);
    const lockStorageUpdates = useRef(true); // Inizia bloccato per evitare aggiornamenti durante il caricamento

    // Aggiungiamo un flag di riferimento per tenere traccia se il caricamento è già avvenuto
    const conversationLoadedRef = useRef({});

    // Attiva il logger sequenziale all'avvio del componente
    useEffect(() => {
        // Attiva il logger sequenziale solo in modalità sviluppo
        if (process.env.NODE_ENV === 'development') {
            enableSequentialLogging();
            log('MainLayout', 'Logger sequenziale attivato');
        }
    }, []);

    // Modifichiamo il timeout nell'useEffect che invia il force-load-conversation
    useEffect(() => {
        const initializeConversation = async () => {
            if (dataSource === 'supabase' && user && !loadingState.isComponentInitialized('MainLayout')) {
                logEvent('MainLayout', 'Inizializzazione della conversazione attiva');

                // Blocca gli aggiornamenti a localStorage durante l'inizializzazione
                lockStorageUpdates.current = true;

                // Recupera l'ultima conversazione da localStorage
                const storageKey = getLastConversationStorageKey(user, isGuest, dataSource);
                const lastConversationId = localStorage.getItem(storageKey);
                logEvent('MainLayout', `Ultima conversazione salvata: ${lastConversationId}`);

                if (lastConversationId) {
                    logEvent('MainLayout', `Impostazione conversazione attiva: ${lastConversationId}`);
                    setActiveConversationId(lastConversationId);

                    // Controllo centralizzato per vedere se questa conversazione è già stata caricata
                    if (!loadingState.isConversationLoaded(lastConversationId)) {
                        // Marchiamo la conversazione come caricata nel sistema centrale
                        loadingState.markConversationLoaded(lastConversationId);

                        // Ritardiamo l'invio dell'evento per dare tempo ai componenti di montarsi completamente
                        const timerId = setTimeout(() => {
                            logEvent('MainLayout', `Invio evento force-load-conversation per: ${lastConversationId}`);
                            window.dispatchEvent(new CustomEvent('force-load-conversation', {
                                detail: { conversationId: lastConversationId }
                            }));
                        }, 1000); // Aumentiamo il ritardo per garantire che tutti i componenti siano montati

                        // Pulizia del timer in caso di smontaggio
                        return () => clearTimeout(timerId);
                    }
                }

                // Sblocca gli aggiornamenti dopo l'inizializzazione
                setTimeout(() => {
                    lockStorageUpdates.current = false;
                    hasInitializedRef.current = true;
                    // Marchia il componente come inizializzato a livello globale
                    loadingState.markComponentInitialized('MainLayout');
                    logEvent('MainLayout', 'Inizializzazione completata, aggiornamenti localStorage sbloccati');
                }, 1000);
            }
        };

        initializeConversation();
    }, [user, isGuest, dataSource]);

    // Aggiungi uno stato per memorizzare il trieve_id
    const [currentTopicId, setCurrentTopicId] = useState(null);

    // Modifichiamo la funzione handleSetActiveConversation
    const handleSetActiveConversation = (conversationId, trieveId) => {
        logEvent('MainLayout', `Richiesta nuova conversazione attiva: ${conversationId}`);

        // Log esplicito del dataSource per debug
        console.log("🔄 SET CONVERSATION - Parametri:", {
            conversationId,
            trieveId,
            dataSource,
            lockStorageUpdates: lockStorageUpdates.current
        });

        // Imposta l'ID della conversazione
        setActiveConversationId(conversationId);

        // Imposta il trieve_id
        if (trieveId) {
            setCurrentTopicId(trieveId);

            // Se siamo in modalità Trieve, carichiamo immediatamente i messaggi
            if (dataSource === 'trieve') {
                setTimeout(() => loadChatHistoryWithId(trieveId, 'MainTopic'), 100);
            }
        }

        // Logica di localStorage
        if (!lockStorageUpdates.current) {
            // Crea la chiave corretta in base al dataSource
            const storageKey = getLastConversationStorageKey(user, isGuest, dataSource);

            // Logging esplicito dello storage
            console.log("💾 STORAGE - Salvataggio:", {
                chiave: storageKey,
                valore: conversationId,
                dataSource,
                userId: user?.id
            });

            // Salva in localStorage
            localStorage.setItem(storageKey, conversationId);

            // Log di verifica dei dati salvati
            console.log("✅ VERIFICA - Valore salvato:", localStorage.getItem(storageKey));

            // La chiave topic va salvata solo se è un topic di Trieve
            if (dataSource === 'trieve') {
                console.log("🔄 TRIEVE - Salvataggio topic specifico");
            }
        } else {
            console.log("⚠️ BLOCCO - Storage bloccato:", lockStorageUpdates.current);
        }

        // Gestione messaggi per Supabase
        if (dataSource === 'supabase') {
            setMessages([]);
        }
    };

    // Funzione helper che carica la cronologia con un ID specifico
    const loadChatHistoryWithId = async (topicId, topicSuffix) => {
        try {
            console.log(`Caricamento history per topic: ${topicId}`);
            setIsLoading(true);

            // Ottieni la modalità appropriata
            const suffix = dataSource === 'trieve' ? topicSuffix : activeConversationId;

            // Poi recuperiamo la cronologia usando l'ID del topic
            const history = await getChatHistory(topicId, user, isGuest, suffix);

            console.log(`✅ TRIEVE - Caricati ${history.length || 0} messaggi per topic: ${topicId}`);

            if (history && Array.isArray(history)) {
                // Trasforma i messaggi nel formato richiesto
                const formattedMessages = history.map(msg => ({
                    text: msg.content,
                    isUser: msg.role === 'user',
                    chunks: msg.chunks || []
                }));

                setMessages(formattedMessages);
            } else {
                console.warn("⚠️ TRIEVE - Formato history non valido:", history);
                setMessages([]);
            }
        } catch (error) {
            console.error('❌ TRIEVE - Errore nel caricamento della cronologia:', error);
            setError('Impossibile caricare la cronologia dei messaggi.');
        } finally {
            setIsLoading(false);
        }
    };

    // Modifichiamo la funzione handleSubmit per assicurarci che isLoading venga sempre resettato
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!inputMessage.trim() || isLoading) return;

        const userMessage = {
            text: inputMessage,
            isUser: true
        };

        // Aggiungi il messaggio dell'utente alla chat
        setMessages(prev => [...prev, userMessage]);
        setInputMessage('');
        setIsLoading(true);

        try {
            // Determina il suffisso del topic in base alla modalità
            const topicSuffix = dataSource === 'trieve' ? 'MainTopic' : activeConversationId;

            if (dataSource === 'trieve') {
                // Logica esistente per Trieve
                const response = await sendMessage(
                    inputMessage,
                    user,
                    isGuest,
                    currentTopicId,
                    topicSuffix
                );

                // Aggiungi la risposta alla chat
                const botMessage = {
                    text: response.message,
                    isUser: false,
                    chunks: response.chunks || []
                };

                setMessages(prev => [...prev, botMessage]);
                // Aggiungiamo un reset esplicito di isLoading qui
                setIsLoading(false);
            } else {
                // Nuova logica integrata per Supabase
                const schema = (process.env.REACT_APP_BRAND_NAME || 'public').toLowerCase();

                if (!activeConversationId) {
                    setError('Nessuna conversazione attiva selezionata.');
                    setIsLoading(false); // Reset se non c'è conversazione attiva
                    return;
                }

                // 1. Salvare il messaggio dell'utente nel database Supabase
                const userMessageData = {
                    conversation_id: activeConversationId,
                    user_id: isGuest ? (process.env.REACT_APP_GUEST_USER_ID || user?.id) : user?.id,
                    role: 'user',
                    content: inputMessage,
                    created_at: new Date().toISOString(),
                    metadata: {
                        source: 'web',
                        client_id: localStorage.getItem('clientId') || 'unknown'
                    }
                };

                try {
                    // Inserisci il messaggio dell'utente in Supabase
                    const { data: userData, error: userError } = await supabase.rpc('insert_into_table_by_schema', {
                        input_schema_name: schema,
                        input_table_name: 'messages',
                        input_data: userMessageData
                    });

                    if (userError) throw userError;

                    // 2. Inviare il messaggio a Trieve per ottenere la risposta AI
                    try {
                        // Utilizziamo la stessa funzione sendMessage usata in modalità Trieve
                        const trieveResponse = await sendMessage(
                            inputMessage,
                            user,
                            isGuest,
                            currentTopicId,
                            topicSuffix
                        );

                        // 3. Salvare la risposta di Trieve in Supabase
                        const botMessageData = {
                            conversation_id: activeConversationId,
                            user_id: isGuest ? (process.env.REACT_APP_GUEST_USER_ID || user?.id) : user?.id,
                            role: 'assistant',
                            content: trieveResponse.message,
                            created_at: new Date().toISOString(),
                            tokens_used: inputMessage.length * 2,
                            chunks: trieveResponse.chunks || null,
                            metadata: {
                                source: 'trieve',
                                model: 'trieve-ai-response',
                                client_id: localStorage.getItem('clientId') || 'unknown'
                            }
                        };

                        // Inserisci la risposta del bot in Supabase
                        const { data: botData, error: botError } = await supabase.rpc('insert_into_table_by_schema', {
                            input_schema_name: schema,
                            input_table_name: 'messages',
                            input_data: botMessageData
                        });

                        if (botError) {
                            console.error('Errore nel salvare la risposta di Trieve in Supabase:', botError);
                            setError('Errore nel salvare la risposta.');
                        } else {
                            // 4. Aggiungi la risposta del bot alla chat
                            setMessages(prev => [...prev, {
                                text: trieveResponse.message,
                                isUser: false,
                                createdAt: new Date().toISOString(),
                                id: botData && botData.id ? botData.id : `temp-${Date.now()}`,
                                chunks: trieveResponse.chunks || []
                            }]);
                        }
                    } catch (trieveError) {
                        console.error('Errore nella comunicazione con Trieve:', trieveError);

                        // In caso di errore, creiamo una risposta di fallback
                        const errorMessage = 'Mi dispiace, si è verificato un errore nel generare una risposta. Riprova più tardi.';

                        // Salviamo anche il messaggio di errore in Supabase
                        const errorMessageData = {
                            conversation_id: activeConversationId,
                            user_id: isGuest ? (process.env.REACT_APP_GUEST_USER_ID || user?.id) : user?.id,
                            role: 'assistant',
                            content: errorMessage,
                            created_at: new Date().toISOString(),
                            metadata: {
                                source: 'error',
                                error: trieveError.message,
                                client_id: localStorage.getItem('clientId') || 'unknown'
                            }
                        };

                        // Inserisci il messaggio di errore
                        await supabase.rpc('insert_into_table_by_schema', {
                            input_schema_name: schema,
                            input_table_name: 'messages',
                            input_data: errorMessageData
                        }).catch(e => console.error('Errore nel salvare il messaggio di errore:', e));

                        // Aggiungi il messaggio di errore alla chat
                        setMessages(prev => [...prev, {
                            text: errorMessage,
                            isUser: false,
                            createdAt: new Date().toISOString(),
                            id: `error-${Date.now()}`
                        }]);
                    } finally {
                        // Assicuriamoci di resettare isLoading in ogni caso
                        setIsLoading(false);
                    }
                } catch (supabaseError) {
                    console.error('Errore con Supabase:', supabaseError);
                    setError('Errore nel salvare il messaggio. Riprova più tardi.');
                    setIsLoading(false);
                }
            }
        } catch (error) {
            console.error('Errore nell\'invio del messaggio:', error);
            setError('Impossibile inviare il messaggio. Riprova più tardi.');

            // Aggiungi un messaggio di errore alla chat
            const errorMessage = {
                text: 'Mi dispiace, si è verificato un errore. Riprova più tardi.',
                isUser: false
            };

            setMessages(prev => [...prev, errorMessage]);
            setIsLoading(false);
        } finally {
            // Ulteriore guardia per assicurarsi che isLoading venga resettato in tutti i casi
            setIsLoading(false);
        }
    };

    // Nuova funzione per gestire l'invio tramite agente
    const handleAgentSubmit = async (e) => {
        // Allow calling without event object if needed
        if (e && e.preventDefault) {
            e.preventDefault();
        }

        logEvent('MainLayout', 'handleAgentSubmit triggered');
        if (!inputMessage.trim() || isLoading) {
            logEvent('MainLayout', 'Agent submit blocked: empty message or loading');
            return;
        }
        if (dataSource !== 'supabase') {
            logEvent('MainLayout', 'Agent submit blocked: not in supabase mode');
            setError('Agent submit is only available in Supabase mode.');
            return;
        }
        if (!activeConversationId) {
            logEvent('MainLayout', 'Agent submit blocked: no active conversation');
            setError('Please select or start a conversation first.');
            return;
        }

        const currentInput = inputMessage;
        const userMessage = {
            text: currentInput,
            isUser: true,
            createdAt: new Date().toISOString(),
            id: `user-${Date.now()}` // Temporary ID for UI
        };

        // Optimistically add user message to UI
        setMessages(prev => [...prev, userMessage]);
        setInputMessage('');
        setIsLoading(true);
        setError(null); // Clear previous errors

        let currentContextFromDb = null;
        const schema = (process.env.REACT_APP_BRAND_NAME || 'public').toLowerCase();

        try {
            // 1. Read current agent context from Supabase
            logEvent('MainLayout', `Reading context for conversation: ${activeConversationId}`);
            const querySQL = `
                SELECT context 
                FROM "${schema}"."conversations"
                WHERE id = '${activeConversationId}' 
                LIMIT 1
            `;
            const { data: contextData, error: contextError } = await supabase.rpc('execute_sql', {
                sql_query: querySQL
            });

            if (contextError) throw new Error(`Error reading context: ${contextError.message}`);

            if (contextData && contextData.length > 0 && contextData[0].context) {
                currentContextFromDb = contextData[0].context;
                // Ensure it's a string for the API, although DB might return object
                if (typeof currentContextFromDb !== 'string') {
                    currentContextFromDb = JSON.stringify(currentContextFromDb);
                }
                logEvent('MainLayout', `Context read successfully (length: ${currentContextFromDb.length})`);
            } else {
                logEvent('MainLayout', 'No existing context found or context is null.');
                currentContextFromDb = null;
            }

            // 2. Call the agent API
            logEvent('MainLayout', 'Calling sendAgentChatMessage API');
            const agentResponse = await sendAgentChatMessage(
                currentInput,
                user,
                isGuest,
                currentContextFromDb
            );
            logEvent('MainLayout', 'Agent API call successful');

            // 3. Add AI response to UI
            const botMessage = {
                text: agentResponse.ai_response,
                isUser: false,
                createdAt: new Date().toISOString(),
                id: `agent-${Date.now()}` // Temporary ID for UI
                // We don't get chunks back from this endpoint currently
            };
            setMessages(prev => [...prev, botMessage]);

            // 4. Save updated context back to Supabase using dedicated RPC
            logEvent('MainLayout', `Saving updated context via RPC (length: ${agentResponse.updated_agent_context?.length || 0})`);

            // Parse the JSON string from the agent response into a JS object/array
            let contextToSave = null;
            try {
                if (agentResponse.updated_agent_context) {
                    contextToSave = JSON.parse(agentResponse.updated_agent_context);
                }
            } catch (parseError) {
                console.error("Error parsing updated_agent_context JSON:", parseError);
                throw new Error("Failed to parse agent context before saving.");
            }

            // Call the dedicated RPC function, passing the schema name
            const { error: updateError } = await supabase.rpc('update_conversation_context', {
                p_schema_name: schema, // Pass the dynamic schema name
                p_conversation_id: activeConversationId,
                p_context: contextToSave // Pass the parsed JS object/array (or null)
            });

            if (updateError) throw new Error(`Error saving context via RPC: ${updateError.message}`);

            logEvent('MainLayout', 'Context saved successfully via RPC.');

        } catch (error) {
            console.error('❌ Error in handleAgentSubmit:', error);
            setError(`Agent interaction failed: ${error.message}`);
            // Optionally add an error message to the chat
            setMessages(prev => [...prev, {
                text: `Error: ${error.message}`,
                isUser: false,
                createdAt: new Date().toISOString(),
                id: `error-${Date.now()}`
            }]);
        } finally {
            setIsLoading(false);
            logEvent('MainLayout', 'handleAgentSubmit finished');
        }
    };

    // Gestisce il cambio di larghezza del contenuto della sidebar
    const handleContentWidth = (width) => {
        // Assicura una larghezza minima per la sidebar
        const finalWidth = Math.max(
            MIN_WIDTH,
            Math.min(MAX_WIDTH, width || MIN_WIDTH)
        );

        setContentWidth(finalWidth);
    };

    // Debug per monitorare i cambiamenti di currentTopicId e forzare il caricamento
    useEffect(() => {
        if (dataSource === 'trieve' && currentTopicId) {
            console.log("🔍 DEBUG: currentTopicId cambiato in:", currentTopicId);
        }
    }, [currentTopicId, dataSource]);

    // All'inizio del componente, dopo altre dichiarazioni di useRef
    const trieveInitialLoadRef = useRef(false);

    // Modificare l'effect dedicato al caricamento del topic Trieve
    useEffect(() => {
        // Usiamo un flag separato solo per questo effetto
        if (dataSource === 'trieve' && user && !trieveInitialLoadRef.current) {
            console.log("📥 TRIEVE - Tentativo di caricare l'ultimo topic salvato");
            trieveInitialLoadRef.current = true;

            // Recupera l'ultima conversazione Trieve
            const storageKey = getLastConversationStorageKey(user, isGuest, 'trieve');
            const lastTopicId = localStorage.getItem(storageKey);

            console.log(`📥 TRIEVE - Chiave: ${storageKey}, Valore trovato:`, lastTopicId);

            if (lastTopicId) {
                console.log(`🎯 TRIEVE - Trovato topic da caricare: ${lastTopicId}`);
                setActiveConversationId(lastTopicId);
                setCurrentTopicId(lastTopicId);

                // Ritardiamo leggermente per assicurarci che lo stato sia aggiornato
                setTimeout(() => {
                    console.log(`🔄 TRIEVE - Caricamento messaggi per topic: ${lastTopicId}`);
                    loadChatHistoryWithId(lastTopicId, 'MainTopic');
                }, 500); // Aumentiamo il ritardo per sicurezza
            } else {
                console.log("⚠️ TRIEVE - Nessun topic salvato trovato");
            }
        }
    }, [dataSource, user, isGuest]);

    // Sblocchiamo immediatamente il localStorage per Trieve
    useEffect(() => {
        if (dataSource === 'trieve' && lockStorageUpdates.current) {
            console.log("🔓 TRIEVE - Sblocco immediato localStorage");
            lockStorageUpdates.current = false;
        }
    }, [dataSource]);

    return (
        <div className="flex h-screen bg-gray-100">
            {isSidebarEnabled && (
                <>
                    <aside
                        className={`
              fixed md:relative
              h-full bg-white
              transition-all duration-300 ease-in-out
              ${isSidebarOpen
                                ? `w-[${contentWidth}px] translate-x-0 opacity-100`
                                : 'w-0 -translate-x-full opacity-0'
                            }
              border-r border-gray-200
              z-30
              overflow-hidden
            `}
                    >
                        <div
                            className={`
                h-full
                transition-transform duration-300 ease-in-out
                ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
              `}
                            style={{
                                width: contentWidth ? `${contentWidth}px` : 'min-content'
                            }}
                        >
                            <div className="h-full">
                                <Sidebar
                                    onContentWidthChange={handleContentWidth}
                                    maxTextWidth={MAX_TEXT_WIDTH}
                                    padding={PADDING}
                                    dataSource={dataSource}
                                    onSelectConversation={handleSetActiveConversation}
                                    activeConversationId={activeConversationId}
                                />
                            </div>
                        </div>
                    </aside>

                    {/* Overlay mobile */}
                    {isMobile && isSidebarOpen && (
                        <div
                            className="fixed inset-0 bg-black bg-opacity-50 z-20"
                            onClick={() => setIsSidebarOpen(false)}
                        />
                    )}
                </>
            )}

            {/* Area chat */}
            <main className="flex-1 flex flex-col">
                <ChatArea
                    toggleSidebar={isSidebarEnabled ? () => setIsSidebarOpen(!isSidebarOpen) : undefined}
                    messages={messages}
                    setMessages={setMessages}
                    isLoading={isLoading}
                    error={error}
                    handleSubmit={handleSubmit}
                    inputMessage={inputMessage}
                    setInputMessage={setInputMessage}
                    dataSource={dataSource}
                    setDataSource={setDataSource}
                    activeConversationId={activeConversationId}
                    handleAgentSubmit={handleAgentSubmit}
                />
            </main>
        </div>
    );
}

export default MainLayout; 