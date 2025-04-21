import React, { useState, useEffect, useRef } from "react";
import Tooltip from "./common/Tooltip";
import { SIDEBAR_CONFIG, TOPIC_CONFIG, getTheme } from '../config/layout';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faTrash, faEdit, faCheck, faTimes, faDatabase, faCloud, faCopy } from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabase/client';
import { v4 as uuidv4 } from 'uuid';
import { logEvent, log } from '../utils/logger';
import loadingState from '../utils/loadingState';
import { getTopicsByOwner, createOrGetTopic, rename_trieve_topic, delete_trieve_topic } from '../services/api';
import { getDynamicServiceUrl } from '../urlHelpers';

// Dati di esempio per lo storico delle chat
const chatHistory = [
  "Chat 1Nome lungo per vedere se c'è il tooltip",
  "Chat 2",
  "Chat 3",
  // Puoi aggiungere altre chat o sostituire con dati dinamici
];

// Aggiungi questa variabile all'esterno del componente per garantire che sia condivisa tra tutte le istanze
let isLoadingConversations = false;

// All'inizio del componente, dopo le dichiarazioni degli stati
// Aggiungiamo questa costante per assicurarci di usare sempre lo stesso ID per gli ospiti
const guestUserId = process.env.REACT_APP_GUEST_USER_ID || 'default-guest-id';
console.log('🔑 GUEST USER ID configurato:', guestUserId);

// Aggiungi questo all'inizio del componente
const fadeInStyle = {
  animation: 'fadeIn 0.5s ease-in-out forwards',
};

const fadeOutStyle = {
  animation: 'fadeOut 0.5s ease-in-out forwards',
};

function Sidebar({ onContentWidthChange, maxTextWidth, padding, dataSource, onSelectConversation, activeConversationId }) {
  const [conversations, setConversations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const { user, isGuest, isAuthenticatedGuest } = useAuth();
  const contentRef = useRef(null);
  const [showDebug, setShowDebug] = useState(true);
  const [debugInfo, setDebugInfo] = useState({
    ownerId: 'Caricamento...',
    userId: 'Caricamento...',
    sessionId: 'Caricamento...',
    topicName: 'Caricamento...',
    topicId: 'Caricamento...',
    trieveId: 'No_ID_YET '
  });
  const [feedback, setFeedback] = useState({ type: null, message: null });
  const [pendingOperations, setPendingOperations] = useState({
    create: false,
    edit: null,  // ID della conversazione in fase di modifica
    delete: null  // ID della conversazione in fase di eliminazione
  });
  const [editMode, setEditMode] = useState({
    enabled: false,
    conversationId: null,
    currentTitle: ''
  });

  // Ottieni lo schema corretto basato su REACT_APP_BRAND_NAME (convertito in minuscolo)
  const schema = (process.env.REACT_APP_BRAND_NAME || 'public').toLowerCase();
  // Titolo predefinito per nuove conversazioni
  const defaultTitle = process.env.REACT_APP_DEFAULT_CONVERSATION_TITLE || 'Nuova conversazione';

  // Ottieni il tema corrente in base alla sorgente dati
  const theme = getTheme(dataSource);

  // Aggiungiamo uno stato per tracciare le conversazioni con effetti di transizione
  const [transitioningConversations, setTransitioningConversations] = useState({
    appearing: [],  // ID delle conversazioni che stanno apparendo
    disappearing: [], // ID delle conversazioni che stanno scomparendo
    shifting: false  // Flag per indicare che le conversazioni si stanno spostando
  });

  // Aggiungiamo stati per gestire l'editing e la conferma di eliminazione
  const [editingConversation, setEditingConversation] = useState(null); // ID della conversazione in fase di modifica
  const [editingTitle, setEditingTitle] = useState(''); // Nuovo titolo durante la modifica
  const [deletingConversation, setDeletingConversation] = useState(null); // ID della conversazione da eliminare

  // Aggiungiamo un ref per il campo di input
  const editInputRef = useRef(null);
  const confirmButtonRef = useRef(null);
  const cancelButtonRef = useRef(null);

  // Aggiungiamo un ref per tracciare l'ID della conversazione attiva
  const activeConversationRef = useRef(null);

  // Aggiungiamo uno stato per tracciare quando i pulsanti dovrebbero essere visibili
  const [buttonsVisible, setButtonsVisible] = useState(false);

  // Aggiungiamo un ref per tracciare se abbiamo già selezionato la conversazione iniziale
  const initialSelectionMadeRef = useRef(false);

  // Aggiungiamo una proprietà per tracciare se siamo nel caricamento iniziale
  const firstLoadRef = useRef(true);

  // Aggiungiamo un ref per tracciare l'ID che dovrebbe essere visivamente evidenziato
  const visibleSelectionRef = useRef(null);

  // All'inizio del componente, aggiungiamo un ref per memorizzare l'ID della conversazione che deve essere selezionata dopo il caricamento
  const initialConversationIdRef = useRef(null);

  // Usiamo un ref per tenere traccia della lunghezza dell'array conversazioni
  const conversationsLengthRef = useRef(0);

  // Aggiungiamo un ref per riferirci all'input di modifica
  const titleInputRef = useRef(null);

  // Aggiungiamo un ref diverso per la selezione del testo per evitare conflitti
  const textSelectionRef = useRef(null);

  // Modifichiamo la funzione loadConversations
  const loadConversations = async (showLoadingIndicator = true) => {
    // Verifica se il caricamento è già in corso o se è già stato completato
    const loadingKey = `sidebar_load_${dataSource}_${isGuest ? 'guest' : 'user'}_${user?.id || 'unknown'}`;
    if (loadingState.isOperationInProgress(loadingKey)) {
      logEvent('Sidebar', `Caricamento già in corso con chiave: ${loadingKey}`);
      return;
    }

    // Marca l'operazione come in corso
    loadingState.markOperationStarted(loadingKey);

    const loadId = logEvent('Sidebar', 'Inizio caricamento conversazioni');

    try {
      // Mostra l'indicatore di caricamento solo se richiesto
      if (showLoadingIndicator) {
        setIsLoading(true);
      }
      isLoadingConversations = true;

      // Esci subito se non ci sono le condizioni necessarie
      if (!user || dataSource !== 'supabase') {
        console.log('⛔ Condizioni non soddisfatte per caricare conversazioni - user:', !!user, 'dataSource:', dataSource);
        return;
      }

      console.log('🚩 Flag isLoadingConversations impostato a true');

      // Determina l'ID utente da utilizzare
      // Se l'utente è autenticato come guest, usa l'ID dell'utente autenticato
      // altrimenti usa l'ID guest o l'ID utente normale
      const effectiveUserId = isAuthenticatedGuest
        ? user.id  // Usa l'ID dell'utente autenticato (che è l'utente guest)
        : (isGuest ? guestUserId : user.id);

      // Determina se dobbiamo filtrare per client_id
      const shouldFilterByClientId = isGuest;

      const clientId = localStorage.getItem('clientId') || 'unknown-client';
      console.log('🔑 Client ID da localStorage:', clientId);

      console.log('🔍 Iniziando caricamento conversazioni per:',
        isGuest ? `ospite (${effectiveUserId}) con client ${clientId}` : user.id,
        'in schema:', schema);

      // Costruisci la query in base al tipo di utente
      let checkQuery;

      if (shouldFilterByClientId) {
        // Per gli ospiti non autenticati, filtra sia per user_id che per client_id
        const clientIdWithPrefix = `GUEST_${clientId}`;

        checkQuery = `
          SELECT COUNT(*) as count
          FROM "${schema}"."conversations"
          WHERE user_id = '${effectiveUserId}'
          AND client_id = '${clientIdWithPrefix}'
        `;

        // Log dettagliata con valori reali
        console.log('🔍 QUERY DETTAGLIATA:', {
          schema: schema,
          user_id: effectiveUserId,
          client_id: clientIdWithPrefix,
          query: checkQuery.replace(/\s+/g, ' ').trim()
        });
      } else {
        // Per gli utenti autenticati (inclusi gli ospiti autenticati), filtra solo per user_id
        checkQuery = `
          SELECT COUNT(*) as count
          FROM "${schema}"."conversations"
          WHERE user_id = '${effectiveUserId}'
        `;
      }

      console.log('🔍 Verifica esistenza conversazioni:', checkQuery);

      const checkResponse = await supabase.rpc('execute_sql', {
        sql_query: checkQuery
      });

      if (checkResponse.error) throw checkResponse.error;

      const conversationCount = checkResponse.data && checkResponse.data[0] ?
        parseInt(checkResponse.data[0].count) : 0;

      console.log(`📊 Trovate ${conversationCount} conversazioni esistenti`);

      if (conversationCount > 0) {
        // Esistono già conversazioni, caricale
        let loadQuery;

        if (shouldFilterByClientId) {
          // Per gli ospiti non autenticati, filtra sia per user_id che per client_id
          const clientIdWithPrefix = `GUEST_${clientId}`;

          loadQuery = `
            SELECT * 
            FROM "${schema}"."conversations"
            WHERE user_id = '${effectiveUserId}'
            AND client_id = '${clientIdWithPrefix}'
            ORDER BY created_at DESC
          `;

          // Log dettagliato con valori reali
          console.log('🔍 QUERY CARICAMENTO DETTAGLIATA:', {
            schema: schema,
            user_id: effectiveUserId,
            client_id: clientIdWithPrefix,
            query: loadQuery.replace(/\s+/g, ' ').trim()
          });
        } else {
          // Per gli utenti autenticati, filtra solo per user_id
          loadQuery = `
            SELECT * 
            FROM "${schema}"."conversations"
            WHERE user_id = '${effectiveUserId}'
            ORDER BY created_at DESC
          `;
        }

        const loadResponse = await supabase.rpc('execute_sql', {
          sql_query: loadQuery
        });

        if (loadResponse.error) throw loadResponse.error;

        if (loadResponse.data && loadResponse.data.length > 0) {
          console.log('=== VERIFICA CAMPO TRIEVE_ID ===');
          loadResponse.data.forEach(conv => {
            console.log(`${conv.id} = ${conv.trieve_id ? conv.trieve_id : 'trieve_id vuoto'}`);
          });
          console.log('=== FINE VERIFICA TRIEVE_ID ===');

          // Verifica i topic in Trieve per tutti gli utenti (anche ospiti)
          if (user) {
            await checkTopicsForUser(user, loadResponse.data, isGuest);
          }

          setConversations(loadResponse.data);

          // Se non abbiamo ancora un ID selezionato visivamente e abbiamo un activeConversationId, impostalo
          if (!visibleSelectionRef.current && activeConversationId) {
            visibleSelectionRef.current = activeConversationId;
          }
          // Altrimenti, se non abbiamo nemmeno un activeConversationId ma è il primo caricamento, usa la prima conversazione
          else if (!visibleSelectionRef.current && !activeConversationId && firstLoadRef.current && loadResponse.data.length > 0) {
            const firstId = loadResponse.data[0].id;
            visibleSelectionRef.current = firstId;

            // Notifica il parent
            if (onSelectConversation) {
              onSelectConversation(firstId);
            }
          }
        }
      } else {
        // Non esistono conversazioni, creane una nuova
        console.log('⚠️ Nessuna conversazione trovata, creazione nuova');

        // Crea una nuova conversazione
        const newConversationId = uuidv4();
        // Recuperiamo le variabili necessarie dal contesto
        const clientId = localStorage.getItem('clientId') || 'unknown-client';
        const effectiveUserId = isGuest ? guestUserId : user.id;

        // Verifichiamo in modo più rigoroso se l'utente è un ospite
        const isGuestUser = isGuest === true || guestUserId === effectiveUserId;

        // Crea l'oggetto conversazione
        const newConversation = {
          id: newConversationId,
          user_id: effectiveUserId,  // Usa l'ID utente effettivo
          // Assicuriamoci che il prefisso GUEST_ sia sempre presente per gli ospiti
          client_id: isGuestUser ?
            (clientId.startsWith('GUEST_') ? clientId : `GUEST_${clientId}`) :
            clientId,
          title: 'Nuova conversazione',  // Usa il titolo originale o definisci defaultTitle
          is_guest: isGuestUser,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        console.log('📝 Nuova conversazione:', newConversation);

        // Aggiungi la conversazione allo stato locale immediatamente
        setConversations(prevConversations => {
          // Controlliamo se già esiste per evitare duplicati
          const exists = prevConversations.some(conv => conv.id === newConversationId);
          if (exists) return prevConversations;
          return [newConversation, ...prevConversations];
        });

        // Salva una referenza alla nuova conversazione nel localStorage per prevenire perdite
        localStorage.setItem('lastCreatedConversation', JSON.stringify({
          id: newConversationId,
          timestamp: Date.now()
        }));

        // Inserisci la conversazione nel database
        try {
          if (schema === 'public') {
            // Per lo schema public, usa il metodo standard
            const { data, error } = await supabase
              .from('conversations')
              .insert(newConversation)
              .select();

            if (error) throw error;

            console.log('✅ Conversazione inserita con successo (metodo standard)');
          } else {
            // Per altri schemi, usa la funzione RPC
            const { data, error } = await supabase.rpc('insert_into_table_by_schema', {
              input_schema_name: schema,
              input_table_name: 'conversations',
              input_data: newConversation
            });

            if (error) throw error;

            console.log('✅ Conversazione inserita con successo (metodo RPC)');
          }
        } catch (insertError) {
          console.error('❌ Errore durante inserimento conversazione:', insertError);
          throw insertError;
        }

        // Dopo la creazione della conversazione in Supabase
        console.log('🔍 [FLOW] Conversazione creata in Supabase, ID:', newConversationId);

        // Prima della chiamata per il topic
        console.log('🔍 [FLOW] PRIMA della chiamata al backend per il topic');

        // Chiamata API per creare il topic
        const createResponse = await fetch(`${getDynamicServiceUrl('api')}/messages/topic`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Client-ID': localStorage.getItem('clientId') || 'unknown-client',
            'X-User-ID': user.id,
            'X-Is-Guest': isGuest ? 'true' : 'false',
            'X-Topic-Suffix': newConversationId
          },
          credentials: 'include'
        });

        console.log('🔍 [FLOW] DOPO la chiamata al backend per il topic');

        if (!createResponse.ok) {
          throw new Error(`Errore creazione topic: ${createResponse.status}`);
        }

        const topicData = await createResponse.json();
        console.log(`✅ Creato nuovo topic per nuova conversazione ${newConversationId}: ${topicData.id}`);

        // Aggiorna il campo trieve_id nella tabella conversations
        try {
          // Usa la funzione RPC
          const { data, error } = await supabase.rpc('update_field_by_schema', {
            input_schema_name: schema,
            input_table_name: 'conversations',
            input_id_value: newConversationId,
            input_field_name: 'trieve_id',
            input_field_value: topicData.id
          });

          if (error) {
            console.error(`Errore aggiornamento trieve_id per nuova conversazione ${newConversationId}:`, error);

            // Fallback alla query SQL se la RPC fallisce
            const updateQuery = `
              UPDATE "${schema}"."conversations"
              SET trieve_id = '${topicData.id}'::uuid
              WHERE id = '${newConversationId}'
            `;

            const { data: sqlData, error: sqlError } = await supabase.rpc('execute_sql', {
              sql_query: updateQuery
            });

            if (sqlError) {
              console.error(`Anche il fallback SQL è fallito:`, sqlError);
            } else {
              console.log(`✅ Aggiornato trieve_id con fallback SQL per nuova conversazione ${newConversationId} a ${topicData.id}`);
            }
          } else {
            console.log(`✅ Aggiornato trieve_id per nuova conversazione ${newConversationId} a ${topicData.id}`);
          }

          // AGGIUNGI QUESTO: Aggiorna anche lo stato locale delle conversazioni con il nuovo trieve_id
          setConversations(prevConversations =>
            prevConversations.map(conv =>
              conv.id === newConversationId
                ? { ...conv, trieve_id: topicData.id }
                : conv
            )
          );

        } catch (updateError) {
          console.error(`Errore aggiornamento trieve_id per nuova conversazione ${newConversationId}:`, updateError);
        }

        console.log('✅ Conversazione inserita con successo');
        showFeedback('success', 'Conversazione creata con successo');

        // Seleziona la nuova conversazione
        handleConversationClick(newConversationId);

        // Notifica il component parent
        if (onSelectConversation) {
          onSelectConversation(newConversationId);
        }
      }
    } catch (error) {
      logEvent('Sidebar', `Errore caricamento: ${error.message}`);
      setError(`Errore: ${error.message}`);
      setConversations([]);
    } finally {
      // Ripristina lo stato di loading solo se era stato impostato
      if (showLoadingIndicator) {
        setIsLoading(false);
      }
      console.log('🏁 Flag isLoadingConversations reimpostato a false');
      isLoadingConversations = false;
      logEvent('Sidebar', 'Caricamento completato');

      // Marca l'operazione come completata
      loadingState.markOperationCompleted(loadingKey);
    }
  };

  // Modifica la funzione checkTopicsForUser per supportare gli ospiti e aggiungere più log
  const checkTopicsForUser = async (user, conversations, isGuest) => {
    console.log('=== RECUPERO TOPIC UTENTE DA TRIEVE ===');
    console.log('Tipo utente:', isGuest ? 'OSPITE' : 'UTENTE NORMALE');
    console.log('User ID:', user.id);
    console.log('Is Guest:', isGuest);

    try {
      // Recupera clientId da localStorage
      const clientId = localStorage.getItem('clientId');
      console.log('Client ID da localStorage:', clientId);

      // Log delle conversazioni che necessitano aggiornamento
      const needUpdate = conversations.filter(c => !c.trieve_id || c.trieve_id === '');
      console.log('Conversazioni che necessitano di trieve_id:', needUpdate.length);
      needUpdate.forEach(conv => {
        console.log(`- Conv ID: ${conv.id}, user_id: ${conv.user_id}`);
      });

      console.log('Invio richiesta al backend con header:');
      console.log({
        'X-Client-ID': clientId,
        'X-User-ID': user.id,
        'X-Is-Guest': isGuest ? 'true' : 'false'
      });

      const response = await fetch(`${getDynamicServiceUrl('api')}/messages/topic/byowner`, {
        method: 'GET',
        headers: {
          'X-Client-ID': clientId,
          'X-User-ID': user.id,
          'X-Is-Guest': isGuest ? 'true' : 'false'
        },
        credentials: 'include'
      });

      if (!response.ok) throw new Error('Errore nel recupero dei topic');
      const topicsData = await response.json();

      console.log(`Recuperati ${topicsData.length} topic da Trieve`);
      console.log('Topic trovati:');
      topicsData.forEach(topic => {
        // Pulisci il nome per gestire titoli personalizzati
        const cleanName = topic.name.split('§')[0]; // Prende solo ciò che è prima di §
        console.log(`- Topic ID: ${topic.id}, Name: ${topic.name}, Clean Name: ${cleanName}, Owner: ${topic.owner_id}`);
      });

      console.log('=== VERIFICA CORRISPONDENZA TOPIC TRIEVE ===');
      // Array per tenere traccia delle conversazioni che necessitano aggiornamento
      const conversationsToUpdate = [];

      // Per ogni conversazione senza trieve_id, verifica se esiste un topic corrispondente
      for (const conv of conversations.filter(c => !c.trieve_id || c.trieve_id === '')) {
        // Determina il nome del topic atteso in base al tipo di utente
        let expectedNames = [];

        if (isGuest) {
          // Per gli ospiti, prova con diversi formati possibili
          const guestId = process.env.REACT_APP_GUEST_USER_ID || 'default-guest-id';
          console.log(`Guest ID da env: ${guestId}`);

          // Aggiungi formati specifici per gli ospiti, incluso quello con MainTopic
          expectedNames = [
            `${user.id}_${conv.id}`,                        // user.id_conversationId
            `${guestId}_${conv.id}`,                        // guestId_conversationId
            `chat_${clientId}`,                             // chat_clientId
            `GUEST_${clientId}_${conv.id}`,                 // GUEST_clientId_conversationId
            `${clientId}_${conv.id}`,                       // clientId_conversationId
            `${clientId}_MainTopic`                         // clientId_MainTopic (caso speciale)
          ];

          console.log('Conv ID:', conv.id);
          console.log('Nomi attesi:', expectedNames);
          console.log('Cerco anche topic che terminano con:', `_${conv.id}`);
        } else {
          // Per utenti autenticati, usa solo il formato standard
          expectedNames = [
            `${user.id}_${conv.id}`,           // user.id_conversationId
            `OK_${user.id}_${conv.id}`         // OK_user.id_conversationId
          ];
          console.log('Conv ID:', conv.id);
          console.log('Nomi attesi:', expectedNames);
        }

        // Cerca un topic corrispondente in base ai possibili nomi
        const matchingTopics = topicsData.filter(topic => {
          // Pulisci il nome del topic prima del confronto
          const cleanName = topic.name.split('§')[0];

          // Per ospiti, considera il caso speciale di MainTopic se non ci sono altri match
          if (isGuest && cleanName.includes('MainTopic') && conversationsToUpdate.length === 0) {
            console.log(`Trovato topic MainTopic per ospite: ${cleanName} (${topic.id})`);
            return true;
          }

          // Altrimenti usa la logica originale con il nome pulito
          return expectedNames.some(name => cleanName === name) ||
            cleanName.endsWith(`_${conv.id}`);
        });

        console.log(`Topic corrispondenti trovati: ${matchingTopics.length}`);

        matchingTopics.forEach(topic => {
          const cleanName = topic.name.split('§')[0];
          console.log(`Match trovato: ${topic.name} (pulito: ${cleanName}) (${topic.id})`);
        });

        const matchingTopic = matchingTopics[0]; // Prendiamo il primo se ce ne sono più di uno

        if (matchingTopic) {
          console.log(`MATCH FINALE: ${conv.id} = ${matchingTopic.name} (${matchingTopic.id})`);

          // Aggiungi questa conversazione all'array di quelle da aggiornare
          conversationsToUpdate.push({
            id: conv.id,
            trieve_id: matchingTopic.id
          });
        } else {
          console.log(`⚠️ Nessun match trovato per conv.id: ${conv.id}`);
        }
      }

      console.log('=== FINE VERIFICA CORRISPONDENZA ===');
      console.log(`Conversazioni da aggiornare: ${conversationsToUpdate.length}`);

      // Il resto della funzione rimane invariato, con l'aggiornamento dello stato e del database
      if (conversationsToUpdate.length > 0) {
        console.log('🔄 Aggiornamento di', conversationsToUpdate.length, 'conversazioni con trieve_id');

        // Aggiorna lo stato locale immediatamente
        setConversations(prev => prev.map(conv => {
          const update = conversationsToUpdate.find(u => u.id === conv.id);
          if (update) {
            return { ...conv, trieve_id: update.trieve_id };
          }
          return conv;
        }));

        // Aggiorna il database con gestione errori migliorata
        for (const update of conversationsToUpdate) {
          try {
            console.log(`📝 Aggiornamento conversazione ${update.id} con trieve_id ${update.trieve_id}`);

            if (schema === 'public') {
              const { data, error } = await supabase
                .from('conversations')
                .update({ trieve_id: update.trieve_id })
                .eq('id', update.id);

              if (error) throw error;
              console.log(`✅ Conversazione ${update.id} aggiornata nel DB (schema public)`);
            } else {
              // Utilizziamo la funzione RPC update_field_by_schema per gestire correttamente gli schemi
              console.log('🔍 Chiamata a update_field_by_schema per aggiornare trieve_id');

              const { data, error } = await supabase.rpc('update_field_by_schema', {
                input_schema_name: schema,
                input_table_name: 'conversations',
                input_id_value: update.id,
                input_field_name: 'trieve_id',
                input_field_value: update.trieve_id
              });

              if (error) throw error;
              console.log(`✅ Conversazione ${update.id} aggiornata nel DB (schema ${schema})`);
            }
          } catch (err) {
            console.error(`❌ Errore aggiornamento trieve_id per ${update.id}:`, err);
          }
        }
      } else {
        console.log('ℹ️ Nessuna conversazione aggiornata');
      }
    } catch (error) {
      console.error('Errore nella verifica dei topic:', error);
    }
  };

  // Calcola la larghezza ottimale della sidebar
  useEffect(() => {
    // Usa un timeout per assicurarsi che il DOM sia aggiornato
    const timer = setTimeout(() => {
      if (contentRef.current) {
        // Ottieni tutti gli elementi con classe conversation-title
        const elements = contentRef.current.querySelectorAll('.conversation-title');

        // Se non ci sono elementi, usa una larghezza predefinita
        if (elements.length === 0) {
          // Usa una larghezza predefinita ragionevole (ad esempio 200px + padding + buttons width)
          onContentWidthChange(200 + SIDEBAR_CONFIG.PADDING + SIDEBAR_CONFIG.BUTTONS_WIDTH);
          return;
        }

        let maxWidth = 0;

        // Per ogni elemento, calcola la larghezza reale del testo
        elements.forEach(el => {
          // Clona l'elemento per misurarlo senza influenzare il DOM visibile
          const clone = el.cloneNode(true);
          clone.style.position = 'absolute';
          clone.style.visibility = 'hidden';
          clone.style.whiteSpace = 'nowrap'; // Importante per misurare la larghezza completa
          clone.classList.remove('truncate');

          // Aggiungi il clone al DOM
          document.body.appendChild(clone);

          // Misura la larghezza
          const width = clone.offsetWidth;

          // Rimuovi il clone
          document.body.removeChild(clone);

          // Aggiorna la larghezza massima
          maxWidth = Math.max(maxWidth, Math.min(width, maxTextWidth));
        });

        // Assicurati che la larghezza non sia mai inferiore a un minimo ragionevole
        maxWidth = Math.max(maxWidth, SIDEBAR_CONFIG.MIN_WIDTH);

        // Aggiungi il padding e lo spazio per i pulsanti per ottenere la larghezza totale
        const totalWidth = maxWidth + SIDEBAR_CONFIG.PADDING + SIDEBAR_CONFIG.BUTTONS_WIDTH;

        // Notifica il componente padre della nuova larghezza
        onContentWidthChange(totalWidth);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [conversations, dataSource, maxTextWidth, onContentWidthChange]);

  // Aggiorna i valori di debug quando cambiano le conversazioni o la sorgente dati
  useEffect(() => {
    // Usa la costante centralizzata
    const topicSuffix = TOPIC_CONFIG.DEFAULT_SUFFIX;

    if (user) {
      const userId = user.id || 'Non disponibile';
      // Costruisci il nome del topic come nel backend: userId_topicSuffix
      const topicName = `${userId}_${topicSuffix}`;

      setDebugInfo(prev => ({
        ...prev,
        userId: userId,
        ownerId: userId,
        topicName: topicName
      }));
    }

    // Aggiorna sessionId
    const clientId = localStorage.getItem('clientId');
    if (clientId) {
      setDebugInfo(prev => ({
        ...prev,
        sessionId: clientId
      }));
    }

    // Aggiorna topicId se disponibile
    if (conversations && conversations.length > 0) {
      // Trova il topic attivo o usa il primo
      const activeTopic = conversations.find(t => t.isActive) || conversations[0];
      setDebugInfo(prev => ({
        ...prev,
        topicId: activeTopic.id || 'Non disponibile'
      }));
    }
  }, [user, isGuest, conversations]);

  // Aggiungi questo effetto per aggiornare il topic ID quando cambia
  useEffect(() => {
    // Funzione per controllare se il topic ID è cambiato
    const checkTopicId = () => {
      if (window.currentTopicId && window.currentTopicId !== debugInfo.topicId) {
        setDebugInfo(prev => ({
          ...prev,
          topicId: window.currentTopicId
        }));
      }
    };

    // Controlla subito
    checkTopicId();

    // Imposta un intervallo per controllare periodicamente
    const interval = setInterval(checkTopicId, 1000);

    return () => clearInterval(interval);
  }, [debugInfo.topicId]);

  // Aggiungi questa funzione per copiare il testo negli appunti
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        // Feedback visivo che la copia è avvenuta con successo
        alert('Copiato negli appunti: ' + text);
      })
      .catch(err => {
        console.error('Errore durante la copia: ', err);
      });
  };

  // Aggiungi questa funzione per copiare tutte le informazioni di debug
  const copyAllDebugInfo = () => {
    // Ottieni il nome utente o "Utente Ospite" se è guest
    const userName = isGuest ? 'Utente Ospite' : user?.email || 'Utente Sconosciuto';

    // Crea un oggetto con tutte le informazioni di debug
    const debugData = {
      userName: userName,
      userId: debugInfo.userId,
      sessionId: debugInfo.sessionId,
      ownerId: debugInfo.ownerId,
      topicName: debugInfo.topicName,
      topicId: debugInfo.topicId
    };

    // Converti l'oggetto in una stringa JSON formattata
    const jsonString = JSON.stringify(debugData, null, 2);

    // Copia la stringa negli appunti
    navigator.clipboard.writeText(jsonString)
      .then(() => {
        alert('Tutte le informazioni di debug sono state copiate negli appunti in formato JSON');
      })
      .catch(err => {
        console.error('Errore durante la copia: ', err);
      });
  };

  // Modifichiamo la funzione showFeedback per preservare la conversazione attiva
  const showFeedback = (type, message, activeConversationId = null) => {
    // Imposta il feedback
    setFeedback({ type, message });

    // Se è stata fornita una conversazione attiva, assicurati che rimanga tale
    if (activeConversationId) {
      // Forza l'aggiornamento delle conversazioni mantenendo attiva quella specificata
      setConversations(prevConversations =>
        prevConversations.map(conv => ({
          ...conv,
          isActive: conv.id === activeConversationId
        }))
      );
    }

    // Rimuovi il feedback dopo 3 secondi
    setTimeout(() => {
      setFeedback({ type: null, message: null });

      // Ancora una volta, assicurati che la conversazione rimanga attiva
      if (activeConversationId) {
        setConversations(prevConversations =>
          prevConversations.map(conv => ({
            ...conv,
            isActive: conv.id === activeConversationId
          }))
        );
      }
    }, 3000);
  };

  // Funzione di utilità per riprovare un'operazione
  const retryOperation = async (operation, maxRetries = 3, delay = 1000) => {
    let lastError;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        console.warn(`Tentativo ${attempt + 1}/${maxRetries} fallito:`, error);
        lastError = error;

        // Attendi prima di riprovare
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    // Se arriviamo qui, tutti i tentativi sono falliti
    throw lastError;
  };

  // Modifichiamo la funzione handleNewConversation per aggiungere l'effetto di fade-in
  const handleNewConversation = async () => {
    try {
      // Se siamo in modalità Trieve, usiamo la logica per Trieve
      if (dataSource === 'trieve') {
        console.log('🆕 Creazione nuovo topic Trieve');

        // Imposta lo stato di caricamento
        setPendingOperations(prev => ({ ...prev, create: true }));

        // Crea il titolo con la data attuale
        const dataAttuale = new Date().toISOString().split('T')[0]; // formato YYYY-MM-DD
        const trieve_title = `Nuova_${dataAttuale}`;

        // Usa la funzione createOrGetTopic con suffisso "MainTopic" e il titolo personalizzato
        const response = await createOrGetTopic(user, isGuest, 'MainTopic', trieve_title);

        if (response && response.id) {
          console.log('✅ Nuovo topic Trieve creato:', response);

          // Aggiungi il nuovo topic alla lista
          const newTopic = {
            id: response.id,
            title: 'Nuova conversazione',
            is_active: true,
            created_at: new Date().toISOString(),
            trieve_id: response.id,  // Salva l'ID Trieve per uso futuro
            is_trieve_topic: true
          };

          // Aggiorna la lista delle conversazioni
          setConversations(prev => [newTopic, ...prev]);

          // Seleziona automaticamente il nuovo topic
          if (onSelectConversation) {
            onSelectConversation(newTopic.id, newTopic.id); // Passa sia l'ID che il trieve_id
          }

          // Imposta come nuova conversazione da modificare
          setEditMode({
            enabled: true,
            conversationId: newTopic.id,
            currentTitle: newTopic.title
          });

          // Focus sull'input per la modifica
          setTimeout(() => {
            if (titleInputRef.current) {
              titleInputRef.current.focus();
              titleInputRef.current.select();
            }
          }, 100);
        }

        setPendingOperations(prev => ({ ...prev, create: false }));
        return; // Interrompi qui se stiamo usando Trieve
      }

      // INIZIO DELLA LOGICA ORIGINALE PER SUPABASE
      // Iniziamo a monitorare il flusso
      console.log('🔍 [FLOW] Inizio creazione nuova conversazione');

      if (!user) return;
      if (dataSource !== 'supabase') return;

      console.log('🔍 Creazione nuova conversazione per:', user.id, 'in schema:', schema);

      // Imposta lo stato di caricamento
      setPendingOperations(prev => ({ ...prev, create: true }));

      // Crea la nuova conversazione
      const newConversationId = uuidv4();
      // Recuperiamo le variabili necessarie dal contesto
      const clientId = localStorage.getItem('clientId') || 'unknown-client';
      const effectiveUserId = isGuest ? guestUserId : user.id;

      // Verifichiamo in modo più rigoroso se l'utente è un ospite
      const isGuestUser = isGuest === true || guestUserId === effectiveUserId;

      // Crea l'oggetto conversazione
      const newConversation = {
        id: newConversationId,
        user_id: effectiveUserId,  // Usa l'ID utente effettivo
        // Assicuriamoci che il prefisso GUEST_ sia sempre presente per gli ospiti
        client_id: isGuestUser ?
          (clientId.startsWith('GUEST_') ? clientId : `GUEST_${clientId}`) :
          clientId,
        title: 'Nuova conversazione',  // Usa il titolo originale o definisci defaultTitle
        is_guest: isGuestUser,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      console.log('📝 Nuova conversazione:', newConversation);

      // Aggiungi la conversazione allo stato locale immediatamente
      setConversations(prevConversations => {
        // Controlliamo se già esiste per evitare duplicati
        const exists = prevConversations.some(conv => conv.id === newConversationId);
        if (exists) return prevConversations;
        return [newConversation, ...prevConversations];
      });

      // Salva una referenza alla nuova conversazione nel localStorage per prevenire perdite
      localStorage.setItem('lastCreatedConversation', JSON.stringify({
        id: newConversationId,
        timestamp: Date.now()
      }));

      // Inserisci la conversazione nel database
      try {
        if (schema === 'public') {
          // Per lo schema public, usa il metodo standard
          const { data, error } = await supabase
            .from('conversations')
            .insert(newConversation)
            .select();

          if (error) throw error;

          console.log('✅ Conversazione inserita con successo (metodo standard)');
        } else {
          // Per altri schemi, usa la funzione RPC
          const { data, error } = await supabase.rpc('insert_into_table_by_schema', {
            input_schema_name: schema,
            input_table_name: 'conversations',
            input_data: newConversation
          });

          if (error) throw error;

          console.log('✅ Conversazione inserita con successo (metodo RPC)');
        }
      } catch (insertError) {
        console.error('❌ Errore durante inserimento conversazione:', insertError);
        throw insertError;
      }

      // Dopo la creazione della conversazione in Supabase
      console.log('🔍 [FLOW] Conversazione creata in Supabase, ID:', newConversationId);

      // Prima della chiamata per il topic
      console.log('🔍 [FLOW] PRIMA della chiamata al backend per il topic');

      // Chiamata API per creare il topic
      const createResponse = await fetch(`${getDynamicServiceUrl('api')}/messages/topic`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Client-ID': localStorage.getItem('clientId') || 'unknown-client',
          'X-User-ID': user.id,
          'X-Is-Guest': isGuest ? 'true' : 'false',
          'X-Topic-Suffix': newConversationId
        },
        credentials: 'include'
      });

      console.log('🔍 [FLOW] DOPO la chiamata al backend per il topic');

      if (!createResponse.ok) {
        throw new Error(`Errore creazione topic: ${createResponse.status}`);
      }

      const topicData = await createResponse.json();
      console.log(`✅ Creato nuovo topic per nuova conversazione ${newConversationId}: ${topicData.id}`);

      // Aggiorna il campo trieve_id nella tabella conversations
      try {
        // Usa la funzione RPC
        const { data, error } = await supabase.rpc('update_field_by_schema', {
          input_schema_name: schema,
          input_table_name: 'conversations',
          input_id_value: newConversationId,
          input_field_name: 'trieve_id',
          input_field_value: topicData.id
        });

        if (error) {
          console.error(`Errore aggiornamento trieve_id per nuova conversazione ${newConversationId}:`, error);

          // Fallback alla query SQL se la RPC fallisce
          const updateQuery = `
            UPDATE "${schema}"."conversations"
            SET trieve_id = '${topicData.id}'::uuid
            WHERE id = '${newConversationId}'
          `;

          const { data: sqlData, error: sqlError } = await supabase.rpc('execute_sql', {
            sql_query: updateQuery
          });

          if (sqlError) {
            console.error(`Anche il fallback SQL è fallito:`, sqlError);
          } else {
            console.log(`✅ Aggiornato trieve_id con fallback SQL per nuova conversazione ${newConversationId} a ${topicData.id}`);
          }
        } else {
          console.log(`✅ Aggiornato trieve_id per nuova conversazione ${newConversationId} a ${topicData.id}`);
        }

        // AGGIUNGI QUESTO: Aggiorna anche lo stato locale delle conversazioni con il nuovo trieve_id
        setConversations(prevConversations =>
          prevConversations.map(conv =>
            conv.id === newConversationId
              ? { ...conv, trieve_id: topicData.id }
              : conv
          )
        );

      } catch (updateError) {
        console.error(`Errore aggiornamento trieve_id per nuova conversazione ${newConversationId}:`, updateError);
      }

      console.log('✅ Conversazione inserita con successo');
      showFeedback('success', 'Conversazione creata con successo');

      // Seleziona la nuova conversazione
      handleConversationClick(newConversationId);

      // Notifica il component parent
      if (onSelectConversation) {
        onSelectConversation(newConversationId);
      }
      // FINE DELLA LOGICA ORIGINALE PER SUPABASE

    } catch (error) {
      console.error('🔍 [FLOW] ERRORE durante la creazione:', error);
      console.error(' [FLOW] Stack trace:', error.stack);
      // Mostra l'errore ma non interrompere il flusso dell'utente
      setError(`Errore nell'inserimento della conversazione: ${error.message}`);
      // Mostra feedback di errore
      showFeedback('error', `Errore: ${error.message}`);
    } finally {
      setPendingOperations(prev => ({ ...prev, create: false }));
    }
  };

  // Nuova funzione per creare il topic per una conversazione
  const createTopicForConversation = async (user, conversationId) => {
    try {
      const clientId = localStorage.getItem('clientId') || 'unknown-client';

      // Verifica se l'utente è definito
      if (!user && !isGuest) {
        console.warn('⚠️ Impossibile creare topic: utente non definito');
        return;
      }

      // Determina l'ID utente e lo stato ospite
      const userId = isGuest ? guestUserId : (user ? user.id : null);
      if (!userId) {
        console.warn('⚠️ Impossibile creare topic: ID utente non disponibile');
        return;
      }

      console.log('🔍 Creazione topic per conversazione:', conversationId);
      console.log('👤 Parametri utente:', {
        userId,
        isGuest,
        clientId
      });

      // Crea un nuovo topic in Trieve
      const createResponse = await fetch(`${getDynamicServiceUrl('api')}/messages/topic`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Client-ID': clientId,
          'X-User-ID': userId,
          'X-Is-Guest': isGuest ? 'true' : 'false',
          'X-Topic-Suffix': conversationId
        },
        credentials: 'include'
      });

      if (!createResponse.ok) {
        throw new Error(`Errore creazione topic: ${createResponse.status}`);
      }

      const newTopic = await createResponse.json();
      console.log(`✅ Creato nuovo topic per nuova conversazione ${conversationId}: ${newTopic.id}`);

      // Aggiorna il campo trieve_id nella tabella conversations
      try {
        // Usa la funzione RPC
        const { data, error } = await supabase.rpc('update_field_by_schema', {
          input_schema_name: schema,
          input_table_name: 'conversations',
          input_id_value: conversationId,
          input_field_name: 'trieve_id',
          input_field_value: newTopic.id
        });

        if (error) {
          console.error(`Errore aggiornamento trieve_id per nuova conversazione ${conversationId}:`, error);

          // Fallback alla query SQL se la RPC fallisce
          const updateQuery = `
            UPDATE "${schema}"."conversations"
            SET trieve_id = '${newTopic.id}'::uuid
            WHERE id = '${conversationId}'
          `;

          const { data: sqlData, error: sqlError } = await supabase.rpc('execute_sql', {
            sql_query: updateQuery
          });

          if (sqlError) {
            console.error(`Anche il fallback SQL è fallito:`, sqlError);
          } else {
            console.log(`✅ Aggiornato trieve_id con fallback SQL per nuova conversazione ${conversationId} a ${newTopic.id}`);
          }
        } else {
          console.log(`✅ Aggiornato trieve_id per nuova conversazione ${conversationId} a ${newTopic.id}`);
        }
      } catch (updateError) {
        console.error(`Errore aggiornamento trieve_id per nuova conversazione ${conversationId}:`, updateError);
      }
    } catch (error) {
      console.error(`Errore creazione topic per nuova conversazione ${conversationId}:`, error);
    }
  };

  // Aggiungiamo una funzione specifica per impostare la conversazione attiva
  const setActiveConversation = (conversationId) => {
    // Questa funzione si occupa solo di impostare quale conversazione è attiva
    console.log(`🎯 Impostazione conversazione attiva: ${conversationId}`);

    setConversations(currentConversations =>
      currentConversations.map(conv => ({
        ...conv,
        isActive: conv.id === conversationId
      }))
    );
  };

  // Modifichiamo handleDeleteConversation
  const handleDeleteConversation = (conversationId, e) => {
    e?.stopPropagation(); // Previeni che il click si propaghi all'item della conversazione

    // Se già stiamo eliminando questa conversazione, procedi con l'eliminazione
    if (deletingConversation === conversationId) {
      confirmDelete(conversationId);
      return;
    }

    // Altrimenti, imposta lo stato per mostrare il cestino rosso più grande
    setDeletingConversation(conversationId);

    // Aggiungi un listener per annullare quando si clicca altrove
    const handleClickOutside = (event) => {
      // Verifica se il click è avvenuto fuori dai pulsanti di eliminazione
      const targetIsDeleteButton = event.target.closest('[data-delete-button]');
      const targetIsForConversation = targetIsDeleteButton &&
        targetIsDeleteButton.getAttribute('data-conversation-id') === conversationId;

      if (!targetIsForConversation) {
        // Annulla l'eliminazione
        setDeletingConversation(null);
        // Rimuovi il listener
        document.removeEventListener('click', handleClickOutside);
      }
    };

    // Aggiungi il listener con un leggero ritardo per evitare che si attivi immediatamente
    setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
    }, 10);
  };

  // Modifichiamo renderConversations per modificare il pulsante di eliminazione
  const renderConversations = () => {
    // Se non ci sono conversazioni o stiamo caricando, mostra un messaggio
    if (isLoading) {
      return (
        <div className="p-2 text-gray-500">
          Caricamento conversazioni...
        </div>
      );
    }

    if (conversations.length === 0) {
      return (
        <div className="p-2 text-gray-500">
          Nessuna conversazione trovata
        </div>
      );
    }

    // Altrimenti, renderizza le conversazioni
    return conversations.map(conversation => {
      // Determina se questa conversazione dovrebbe essere evidenziata
      const isActive = conversation.id === visibleSelectionRef.current;
      // Determina se questa conversazione è in modalità modifica
      const isEditing = conversation.id === editingConversation;
      // Aggiunta per le animazioni
      const isAppearing = transitioningConversations.appearing.includes(conversation.id);
      const isDisappearing = transitioningConversations.disappearing.includes(conversation.id);

      // Determina se questa conversazione è in fase di eliminazione
      const isDeleting = conversation.id === deletingConversation;

      return (
        <div
          key={conversation.id}
          className={`
            flex items-center justify-between p-2 rounded-md mb-1 cursor-pointer
            ${transitioningConversations.shifting ? 'transition-colors duration-300' : ''}
          `}
          style={{
            backgroundColor: isActive
              ? theme.BACKGROUND.CONVERSATION.ACTIVE  // Usa il colore specifico dal tema
              : 'transparent',
            color: isActive ? '#FFFFFF' : theme.SIDEBAR.TEXT,
            ...(isAppearing ? fadeInStyle : {}),
            ...(isDisappearing ? fadeOutStyle : {})
          }}
          onMouseEnter={(e) => {
            if (!isActive) {
              e.currentTarget.style.backgroundColor = theme.BACKGROUND.CONVERSATION.HOVER;
            }
          }}
          onMouseLeave={(e) => {
            if (!isActive) {
              e.currentTarget.style.backgroundColor = 'transparent';
            }
          }}
          onClick={() => handleConversationClick(conversation.id)}
        >
          {/* Contenuto principale della conversazione */}
          <div className="flex items-center flex-grow">
            {isEditing ? (
              // Campo di input per la modifica del titolo
              <input
                type="text"
                value={editingTitle}
                onChange={(e) => setEditingTitle(e.target.value)}
                className="w-full px-2 py-1 text-sm bg-white bg-opacity-20 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                id={`editing-input-${conversation.id}`}
                style={{
                  color: theme.SIDEBAR.EDIT_TEXT || '#000000',
                  backgroundColor: theme.SIDEBAR.EDIT_BACKGROUND || 'rgba(255, 255, 255, 0.2)'
                }}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    confirmEdit(conversation.id);
                  }
                  if (e.key === 'Escape') {
                    e.preventDefault();
                    cancelEdit();
                  }
                }}
              />
            ) : (
              // Titolo normale
              <Tooltip text={conversation.title}>
                <div
                  className="flex items-center"
                  onDoubleClick={(e) => handleEditConversation(conversation.id, e)}
                >
                  <span
                    className="conversation-title truncate block"
                    style={{ maxWidth: `${maxTextWidth}px` }}
                  >
                    {conversation.title}
                  </span>
                </div>
              </Tooltip>
            )}
          </div>

          {/* Pulsanti di azione */}
          <div className={`flex space-x-1 ${isActive ? '' : 'opacity-0 group-hover:opacity-100'}`}>
            <button
              onClick={(e) => handleEditConversation(conversation.id, e)}
              className="p-1 rounded-full text-gray-600 hover:bg-gray-300"
              title="Modifica conversazione"
            >
              <FontAwesomeIcon icon={faEdit} size="xs" />
            </button>

            {/* Pulsante cestino dinamico (normale o in modalità conferma) */}
            <button
              data-delete-button
              data-conversation-id={conversation.id}
              onClick={(e) => handleDeleteConversation(conversation.id, e)}
              className={`p-1 rounded-full transition-all duration-200 ${isDeleting ? 'text-red-600 hover:bg-red-100' : 'text-gray-600 hover:bg-gray-300'
                }`}
              style={{
                transform: isDeleting ? 'scale(1.4)' : 'none',
                transition: 'transform 0.2s ease-in-out',
              }}
              title={isDeleting ? "Clicca di nuovo per confermare l'eliminazione" : "Elimina conversazione"}
            >
              <FontAwesomeIcon icon={faTrash} size={isDeleting ? "sm" : "xs"} />
            </button>
          </div>

          {/* Pulsanti di conferma solo per l'editing, non per l'eliminazione */}
          {isEditing && (
            <div className="flex space-x-1">
              <button
                onClick={(e) => confirmEdit(conversation.id)}
                className="p-1 rounded-full text-green-600 hover:bg-green-100"
                title="Conferma modifica"
              >
                <FontAwesomeIcon icon={faCheck} size="xs" />
              </button>
              <button
                onClick={cancelEdit}
                className="p-1 rounded-full text-red-600 hover:bg-red-100"
                title="Annulla modifica"
              >
                <FontAwesomeIcon icon={faTimes} size="xs" />
              </button>
            </div>
          )}
        </div>
      );
    });
  };

  // Modifichiamo handleConversationClick per mantenere i controlli ma ripristinare la funzionalità originale
  const handleConversationClick = (id) => {
    const clickId = logEvent('Sidebar', `Click su conversazione: ${id}`);
    visibleSelectionRef.current = id;
    logEvent('Sidebar', `ID di riferimento per evidenziazione impostato a: ${id}`);

    // Sincronizza la selezione visiva
    syncVisualSelection();

    // Trova la conversazione selezionata
    const selectedConversation = conversations.find(conv => conv.id === id);

    if (selectedConversation) {
      // In modalità Trieve, l'ID del topic è lo stesso ID della conversazione
      if (dataSource === 'trieve') {
        console.log('🔍 Selezione topic Trieve:', id, 'dataSource:', dataSource);

        // Notifica il MainLayout - per Trieve passiamo direttamente l'ID del topic
        if (onSelectConversation) {
          // Aggiungiamo un terzo parametro per essere sicuri che dataSource sia passato correttamente
          console.log('📊 Chiamando onSelectConversation con:', id, id, dataSource);
          onSelectConversation(id, id);
        }
      } else {
        // Modalità Supabase - usa la logica esistente
        console.log('🔍 Notifica MainLayout della nuova selezione:', id);

        if (onSelectConversation) {
          onSelectConversation(id, selectedConversation.trieve_id);
        }
      }
    }
  };

  // Funzione per sincronizzare visivamente la selezione attiva
  const syncVisualSelection = () => {
    const syncId = logEvent('Sidebar', `Sincronizzazione selezione visiva per: ${visibleSelectionRef.current}`);

    if (!visibleSelectionRef.current) return;

    // Verifica se la conversazione esiste nell'array
    const conversationExists = conversations.some(conv => conv.id === visibleSelectionRef.current);

    if (conversationExists) {
      // Verifica se è già selezionata per evitare aggiornamenti inutili
      const alreadySelected = conversations.some(
        conv => conv.id === visibleSelectionRef.current && conv.isActive
      );

      if (!alreadySelected) {
        logEvent('Sidebar', `Aggiornamento selezione visiva: ${visibleSelectionRef.current} (evento: ${syncId})`);
        setConversations(prev =>
          prev.map(conv => ({
            ...conv,
            isActive: conv.id === visibleSelectionRef.current
          }))
        );
      } else {
        console.log('🔄 Selezione già aggiornata, nessuna modifica necessaria');
      }

      // Aggiorna anche lo stato in MainLayout se necessario
      if (onSelectConversation && activeConversationId !== visibleSelectionRef.current) {
        console.log('🔍 Notifica MainLayout della nuova selezione:', visibleSelectionRef.current);
        onSelectConversation(visibleSelectionRef.current);
      }
    } else {
      logEvent('Sidebar', `Conversazione ${visibleSelectionRef.current} non trovata, impossibile evidenziarla (evento: ${syncId})`);

      // Se la conversazione selezionata non esiste, seleziona la prima se disponibile
      if (conversations.length > 0) {
        console.log('🔍 Seleziono la prima conversazione come fallback');
        visibleSelectionRef.current = conversations[0].id;

        setConversations(prev =>
          prev.map(conv => ({
            ...conv,
            isActive: conv.id === visibleSelectionRef.current
          }))
        );

        if (onSelectConversation) {
          onSelectConversation(visibleSelectionRef.current);
        }
      }
    }
  };

  // Aggiungiamo l'effetto mancante per caricare le conversazioni all'avvio
  useEffect(() => {
    console.log('🔄 Effect triggered - dataSource:', dataSource, 'isGuest:', isGuest, 'user:', user);

    if (dataSource === 'supabase') {
      console.log('🚀 Avvio caricamento conversazioni');
      loadConversations();
    }
    // Rimuoviamo la parte che carica le conversazioni dummy in modalità Trieve
    // poiché ora abbiamo un effetto separato per quello
  }, [dataSource, schema, isGuest, user, isAuthenticatedGuest]);

  // Aggiungiamo anche la funzionalità per annullare l'editing quando si clicca altrove
  const handleEditConversation = (conversationId, e) => {
    e?.stopPropagation();

    // Ottieni il titolo della conversazione
    const conversation = conversations.find(c => c.id === conversationId);
    if (!conversation) return;

    // Imposta lo stato per l'editing
    setEditingConversation(conversationId);
    setEditingTitle(conversation.title);

    // Memorizza l'ID dell'elemento che sarà visibile per la selezione
    textSelectionRef.current = `editing-input-${conversationId}`;

    // Seleziona il testo dell'input dopo che è stato renderizzato
    setTimeout(() => {
      const inputElement = document.getElementById(textSelectionRef.current);
      if (inputElement) {
        inputElement.select();
        inputElement.focus();
      }
    }, 50);

    // Aggiungi un listener per annullare quando si clicca altrove
    const handleClickOutside = (event) => {
      const isEditButton = event.target.closest('[data-edit-button]');
      const isInputField = event.target.tagName.toLowerCase() === 'input';
      const isConfirmButton = event.target.closest('[data-confirm-edit]');
      const isCancelButton = event.target.closest('[data-cancel-edit]');

      if (!isEditButton && !isInputField && !isConfirmButton && !isCancelButton) {
        cancelEdit();
        document.removeEventListener('click', handleClickOutside);
      }
    };

    // Aggiungi il listener con un leggero ritardo
    setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
    }, 10);
  };

  // Funzione per confermare l'eliminazione
  const confirmDelete = async (conversationId) => {
    try {
      console.log('Avvio eliminazione conversazione:', conversationId);
      console.log('Modalità corrente:', dataSource);

      // Salva il riferimento alla conversazione che stiamo eliminando
      const conversationToDelete = conversations.find(conv => conv.id === conversationId);
      console.log('Conversazione da eliminare:', conversationToDelete);

      // Aggiornamento locale delle conversazioni (comune a entrambe le modalità)
      const updatedConversations = conversations.filter(conv => conv.id !== conversationId);

      // Se stiamo eliminando la conversazione attiva, dobbiamo selezionarne un'altra
      if (conversationId === activeConversationId) {
        const newActiveId = updatedConversations.length > 0 ? updatedConversations[0].id : null;

        if (newActiveId) {
          visibleSelectionRef.current = newActiveId;

          if (onSelectConversation) {
            onSelectConversation(newActiveId);
          }
        } else if (updatedConversations.length === 0) {
          visibleSelectionRef.current = null;
        }
      }

      setConversations(updatedConversations);

      // Gestione diversa in base alla modalità
      if (dataSource === 'trieve') {
        // Cancellazione in modalità Trieve
        console.log('🔄 TRIEVE - Eliminazione topic:', conversationId);
        try {
          await delete_trieve_topic(conversationId, user, isGuest);
          console.log('✅ TRIEVE - Topic eliminato con successo');
          showFeedback('success', 'Topic eliminato con successo');
        } catch (trieveError) {
          console.error('❌ TRIEVE - Errore nell\'eliminazione del topic:', trieveError);
          throw trieveError; // Propaghiamo l'errore per la gestione comune
        }
      } else {
        // Logica per Supabase
        const { data, error } = await supabase.rpc('delete_conversation', {
          p_schema: schema,
          p_conversation_id: conversationId,
          p_user_id: user.id
        });

        if (error) throw error;

        if (data === true) {
          console.log('✅ Conversazione eliminata con successo da Supabase');

          // NUOVA LOGICA: Elimina anche il topic Trieve associato, se esiste
          if (conversationToDelete && conversationToDelete.trieve_id) {
            console.log('🔄 La conversazione ha un trieve_id associato:', conversationToDelete.trieve_id);
            try {
              await delete_trieve_topic(conversationToDelete.trieve_id, user, isGuest);
              console.log('✅ Topic Trieve associato eliminato con successo:', conversationToDelete.trieve_id);
              // Non mostriamo un feedback specifico per questa operazione all'utente
            } catch (trieveError) {
              // Registriamo l'errore solo in console, senza mostrarlo all'utente
              console.error('ℹ️ Non è stato possibile eliminare il topic Trieve associato:', trieveError);
              // Non lanciamo l'errore per non compromettere il flusso di eliminazione Supabase
            }
          } else {
            console.log('ℹ️ La conversazione non ha un topic Trieve associato da eliminare');
          }

          // Feedback all'utente (solo per l'eliminazione Supabase)
          showFeedback('success', 'Conversazione eliminata');
        } else {
          console.warn('⚠️ Nessuna conversazione eliminata');
        }
      }
    } catch (err) {
      console.error('❌ Errore nella cancellazione:', err);
      setError(`Errore: ${err.message}`);
      showFeedback('error', `Errore: ${err.message}`);
    } finally {
      // Resetta lo stato di eliminazione
      setDeletingConversation(null);
      setPendingOperations(prev => ({ ...prev, delete: null }));
    }
  };

  // Funzione per annullare l'eliminazione
  const cancelDelete = () => {
    setDeletingConversation(null);
  };

  // Modifico la funzione confirmEdit che gestisce il salvataggio del titolo
  const confirmEdit = async (conversationId) => {
    if (!editingTitle || editingTitle.trim() === '') {
      return cancelEdit();
    }

    try {
      // Prima di tutto, recuperiamo la conversazione corrente
      const conversation = conversations.find(c => c.id === conversationId);
      if (!conversation) {
        showFeedback('error', 'Conversazione non trovata');
        setEditingConversation(null);
        return;
      }

      console.log(`🔄 Avvio aggiornamento titolo per conversazione: ${conversationId}`);
      setPendingOperations(prev => ({ ...prev, update: true }));

      if (dataSource === 'trieve') {
        // MODALITÀ TRIEVE: utilizziamo la nuova funzione per rinominare il topic
        console.log(`🔄 Aggiornamento titolo in modalità Trieve per: ${conversation.id}`);

        // Per Trieve, l'ID della conversazione in sidebar è l'ID del topic
        const topicId = conversation.id;

        // Aggiorniamo immediatamente l'UI per dare una sensazione di velocità
        const updatedConversations = conversations.map(c => {
          if (c.id === conversationId) {
            return { ...c, title: editingTitle };
          }
          return c;
        });

        setConversations(updatedConversations);
        setEditingConversation(null);
        setPendingOperations(prev => ({ ...prev, update: false }));
        showFeedback('success', 'Titolo aggiornato');

        // Eseguiamo il fetch e l'aggiornamento in background
        (async () => {
          try {
            // Otteniamo il topic completo per vedere il nome attuale
            const topics = await getTopicsByOwner(user, isGuest);
            const topic = topics.find(t => t.id === topicId);

            if (!topic) {
              console.error(`Topic ${topicId} non trovato`);
              return;
            }

            // Prendiamo il nome attuale del topic
            const currentName = topic.name;
            console.log(`Nome attuale del topic: ${currentName}`);

            // Prepariamo il nuovo nome mantenendo la parte prima di § (se esiste)
            let newName;
            if (currentName.includes('§')) {
              // Se esiste già un §, sostituiamo solo la parte dopo
              const baseName = currentName.split('§')[0];
              newName = `${baseName}§${editingTitle}`;
            } else {
              // Altrimenti aggiungiamo § e il nuovo titolo
              newName = `${currentName}§${editingTitle}`;
            }

            // Chiamata all'API per rinominare il topic (in background)
            rename_trieve_topic(topicId, newName, user, isGuest)
              .then(() => console.log(`✅ Topic ${topicId} rinominato con successo in background`))
              .catch(err => {
                console.error(`⚠️ Errore nella rinomina del topic ${topicId}:`, err);
                // Non mostriamo feedback negativo all'utente per non disturbare l'esperienza
              });
          } catch (err) {
            console.error("Errore nel processo di rinomina topic in background:", err);
          }
        })();

        return;
      } else {
        // MODALITÀ SUPABASE: aggiorna direttamente nel database
        try {
          // Aggiorniamo nel database Supabase
          const schema = (process.env.REACT_APP_BRAND_NAME || 'public').toLowerCase();

          console.log(`🔄 Aggiornamento titolo in modalità Supabase (schema: ${schema})`);

          if (schema === 'public') {
            const { data, error } = await supabase
              .from('conversations')
              .update({ title: editingTitle })
              .eq('id', conversationId);

            if (error) throw error;
          } else {
            // Utilizziamo la funzione corretta con i parametri corretti
            console.log(`🔄 Chiamata update_conversation_title con parametri:`, {
              p_schema: schema,
              p_conversation_id: conversationId,
              p_user_id: user.id,
              p_new_title: editingTitle
            });

            const { data, error } = await supabase.rpc('update_conversation_title', {
              p_schema: schema,
              p_conversation_id: conversationId,
              p_user_id: user.id,
              p_new_title: editingTitle
            });

            if (error) throw error;
          }

          // Aggiorniamo lo stato locale
          const updatedConversations = conversations.map(c => {
            if (c.id === conversationId) {
              return { ...c, title: editingTitle };
            }
            return c;
          });

          setConversations(updatedConversations);
          setEditingConversation(null);
          setPendingOperations(prev => ({ ...prev, update: false }));
          showFeedback('success', 'Titolo aggiornato');

          // Se c'è un trieve_id associato, aggiorniamo anche il topic in Trieve (non bloccante)
          if (conversation.trieve_id) {
            console.log(`🔄 Sincronizzazione titolo anche in Trieve per topic: ${conversation.trieve_id}`);

            try {
              // Gestiamo in modo sicuro l'aggiornamento di Trieve in background
              // CORREZIONE: Specifico esplicitamente un suffisso diverso per indicare che siamo in Supabase
              const supabaseSuffix = `Supabase_${conversationId}`;
              console.log(`📌 Uso suffisso specifico per modalità Supabase: ${supabaseSuffix}`);

              // Utilizziamo il suffisso Supabase specifico
              const topics = await getTopicsByOwner(user, isGuest, supabaseSuffix);

              // Cerchiamo il topic corrispondente
              const topic = topics.find(t => t.id === conversation.trieve_id);

              if (topic) {
                // Prendiamo il nome attuale del topic
                const currentName = topic.name;
                console.log(`Nome attuale del topic Trieve: ${currentName}`);

                // Prepariamo il nuovo nome mantenendo il formato corretto
                let newName;
                if (currentName.includes('§')) {
                  // Se esiste già un §, sostituiamo solo la parte dopo
                  const baseName = currentName.split('§')[0];
                  newName = `${baseName}§${editingTitle}`;
                } else {
                  // Altrimenti aggiungiamo § e il nuovo titolo
                  newName = `${currentName}§${editingTitle}`;
                }

                // Log dettagliato dei parametri
                console.log(`🔑 Parametri per rename_trieve_topic:`, {
                  topicId: conversation.trieve_id,
                  newName,
                  userId: user?.id,
                  isGuest: isGuest,
                  topicSuffix: supabaseSuffix // Passiamo anche qui il suffisso Supabase
                });

                // Chiamata all'API per rinominare il topic (non bloccante)
                // Passiamo esplicitamente il suffisso anche alla funzione di rinomina
                rename_trieve_topic(conversation.trieve_id, newName, user, isGuest, supabaseSuffix)
                  .then(() => console.log('✅ Topic Trieve aggiornato con successo'))
                  .catch(err => console.error('⚠️ Errore nell\'aggiornamento del topic Trieve (non bloccante):', err));
              } else {
                console.log(`⚠️ Topic con ID ${conversation.trieve_id} non trovato nelle risposte da Trieve`);
              }
            } catch (err) {
              // Questo errore è non bloccante - lo loggiamo ma non interrompiamo il flusso
              console.error('⚠️ Errore nella sincronizzazione con Trieve (non bloccante):', err);
            }
          }
        } catch (updateError) {
          console.error('Errore nell\'aggiornamento del titolo:', updateError);
          showFeedback('error', 'Si è verificato un errore nell\'aggiornamento del titolo');
        }
      }
    } catch (error) {
      console.error('Errore nell\'aggiornamento del titolo:', error);
      showFeedback('error', 'Si è verificato un errore nell\'aggiornamento del titolo');
    } finally {
      setPendingOperations(prev => ({ ...prev, update: false }));
      setEditingConversation(null);
      setEditingTitle('');
    }
  };

  // Funzione per annullare la modifica
  const cancelEdit = () => {
    setEditingConversation(null);
    setEditingTitle('');
  };

  // Aggiungi un effetto per verificare la presenza della conversazione appena creata
  useEffect(() => {
    const lastCreatedJson = localStorage.getItem('lastCreatedConversation');
    if (!lastCreatedJson) return;

    const lastCreated = JSON.parse(lastCreatedJson);
    // Verifica se è recente (meno di 10 secondi)
    if (Date.now() - lastCreated.timestamp > 10000) return;

    // Verifica se la conversazione è nell'array locale
    const exists = conversations.some(conv => conv.id === lastCreated.id);
    if (!exists && conversations.length > 0) {
      console.warn(`⚠️ Conversazione appena creata ${lastCreated.id} non trovata nell'array locale`);

      // Tenta di recuperare la conversazione da Supabase
      const fetchMissingConversation = async () => {
        try {
          let missingConversation;
          if (schema === 'public') {
            const { data, error } = await supabase
              .from('conversations')
              .select('*')
              .eq('id', lastCreated.id)
              .single();

            if (!error && data) missingConversation = data;
          } else {
            // Per altri schemi, usa la funzione RPC
            const query = `SELECT * FROM "${schema}"."conversations" WHERE id = '${lastCreated.id}'`;
            const { data, error } = await supabase.rpc('execute_sql', { sql_query: query });

            if (!error && data && data[0]) missingConversation = data[0];
          }

          if (missingConversation) {
            console.log('✅ Recuperata conversazione mancante:', missingConversation);
            // Aggiungi all'array delle conversazioni
            setConversations(prev => [missingConversation, ...prev]);
          }
        } catch (err) {
          console.error('❌ Errore recupero conversazione mancante:', err);
        }
      };

      fetchMissingConversation();
    }
  }, [conversations, schema]);

  // Effetto per impostare visibleSelectionRef quando cambia activeConversationId
  useEffect(() => {
    if (activeConversationId) {
      console.log('🔍 Aggiornamento selezione da activeConversationId:', activeConversationId);
      visibleSelectionRef.current = activeConversationId;

      // Se abbiamo già caricato le conversazioni, sincronizza subito
      if (conversations.length > 0) {
        console.log('🔍 Sincronizzazione immediata della selezione visiva');
        syncVisualSelection();
      }
    }
  }, [activeConversationId, conversations.length]);

  // Effetto separato per sincronizzare la selezione visuale quando le conversazioni vengono caricate
  useEffect(() => {
    if (conversations.length > 0 &&
      visibleSelectionRef.current &&
      conversations.length !== conversationsLengthRef.current) {

      console.log('🔍 Dimensione array conversazioni cambiata da',
        conversationsLengthRef.current, 'a', conversations.length);
      conversationsLengthRef.current = conversations.length;

      // Controllo aggiuntivo: verifica se la conversazione è già selezionata
      const alreadySelected = conversations.some(
        conv => conv.id === visibleSelectionRef.current && conv.isActive
      );

      if (!alreadySelected) {
        console.log('🔍 Sincronizzazione necessaria - conversazione non ancora selezionata');
        // Sincronizza dopo un breve ritardo
        setTimeout(() => {
          syncVisualSelection();
        }, 50);
      }
    }
  }, [conversations.length]); // Dipende solo dalla lunghezza

  // Aggiungiamo questo effetto in Sidebar.js per sincronizzare il trieve_id
  // E' stato implementato per popolare la variabile trieve_id da passare a sendmessage, anche al primo caricamento della pagina
  // e non solo quando si clicca su una conversazione.
  useEffect(() => {
    // Viene eseguito quando activeConversationId è valido ma non è stata fatta una selezione manuale
    if (activeConversationId && conversations.length > 0 && !initialSelectionMadeRef.current) {
      // Trova la conversazione corrispondente
      const selectedConversation = conversations.find(conv => conv.id === activeConversationId);

      if (selectedConversation && selectedConversation.trieve_id) {
        console.log("🔄 Sincronizzazione trieve_id per selezione iniziale:", selectedConversation.trieve_id);

        // Notifica il MainLayout del trieve_id per la conversazione selezionata automaticamente
        if (onSelectConversation) {
          onSelectConversation(activeConversationId, selectedConversation.trieve_id);
        }

        // Imposta il flag per indicare che la sincronizzazione è avvenuta
        initialSelectionMadeRef.current = true;
      }
    }
  }, [activeConversationId, conversations, onSelectConversation]);

  // All'interno del componente Sidebar
  // Modifichiamo l'useEffect per la modalità Trieve
  useEffect(() => {
    const loadTrieveTopics = async () => {
      // Chiave unica per questa operazione
      const loadingKey = `trieve_topics_load_${user?.id || 'unknown'}`;

      // Verifica se l'operazione è già in corso o è già stata completata
      if (loadingState.isOperationInProgress(loadingKey)) {
        console.log(`🔍 Caricamento topic Trieve già in corso per: ${user?.id}`);
        return;
      }

      // Marca l'operazione come in corso
      loadingState.markOperationStarted(loadingKey);

      if (dataSource === 'trieve' && user) {
        try {
          setIsLoading(true);
          console.log('📚 Caricamento topic Trieve per utente:', user.id, 'ospite:', isGuest);

          // Passa 'MainTopic' come topicSuffix per Trieve
          const topics = await getTopicsByOwner(user, isGuest, 'MainTopic');

          // Filtriamo solo i topic attivi (non cancellati)
          const activeTopics = topics.filter(topic => !topic.deleted);

          // Trasformiamo i topic in un formato compatibile con la sidebar
          const formattedTopics = activeTopics.map(topic => {
            // Controlla se il nome contiene il separatore § per il titolo personalizzato
            let displayTitle;
            if (topic.name.includes('§')) {
              // Estrai la parte dopo §
              const customTitlePart = topic.name.split('§')[1];
              // Formatta il titolo personalizzato sostituendo underscore con spazi
              displayTitle = customTitlePart.replace(/_/g, ' ');
            } else {
              // Se non c'è un titolo personalizzato, usa le ultime 5 cifre dell'ID
              const idSuffix = topic.id.slice(-5);
              displayTitle = `Nuova ${idSuffix}`;
            }

            return {
              id: topic.id,
              title: displayTitle,
              is_active: true,
              created_at: topic.created_at || new Date().toISOString(),
              is_trieve_topic: true
            };
          });

          console.log(`📚 Caricati ${formattedTopics.length} topic Trieve`);
          setConversations(formattedTopics);
        } catch (error) {
          console.error('❌ Errore caricamento topic Trieve:', error);
          setError('Impossibile caricare le conversazioni');
          // In caso di errore, mostriamo almeno le conversazioni dummy
          setConversations(chatHistory.map((title, index) => ({
            id: `dummy-${index}`,
            title,
            is_active: true,
            created_at: new Date().toISOString(),
            is_trieve_topic: false
          })));
        } finally {
          setIsLoading(false);
          // Marca l'operazione come completata
          loadingState.markOperationCompleted(loadingKey);
        }
      }
    };

    loadTrieveTopics();
  }, [dataSource, user, isGuest]);

  // Aggiungiamo un effetto per resettare initialSelectionMadeRef quando cambia dataSource
  useEffect(() => {
    // Reset del flag quando cambia dataSource
    initialSelectionMadeRef.current = false;
    console.log("🔄 Reset flag inizializzazione per cambio dataSource:", dataSource);
  }, [dataSource]);

  // Aggiungiamo un effetto separato che si attiva SOLO quando cambia dataSource
  useEffect(() => {
    if (dataSource === 'trieve') {
      // Reset forzato dello stato dell'operazione quando si passa a Trieve
      const loadingKey = `trieve_topics_load_${user?.id || 'unknown'}`;
      console.log("🔄 TRIEVE - Reset forzato stato caricamento topic:", loadingKey);

      // Rimuove l'operazione dallo stato per forzare il ricaricamento
      loadingState.resetOperation(loadingKey);

      // Avvia immediatamente il caricamento dei topic Trieve
      if (user) {
        console.log("🔄 TRIEVE - Forzatura caricamento topic dopo cambio dataSource");
        // Aggiungiamo un leggero ritardo per assicurarci che il cambio di dataSource sia completato
        setTimeout(() => loadTrieveTopics(), 100);
      }
    }
  }, [dataSource]); // Dipendenza solo da dataSource

  // Definiamo la funzione loadTrieveTopics completa all'inizio del componente
  const loadTrieveTopics = async () => {
    // Chiave unica per questa operazione
    const loadingKey = `trieve_topics_load_${user?.id || 'unknown'}`;

    // Verifica se l'operazione è già in corso o è già stata completata
    if (loadingState.isOperationInProgress(loadingKey)) {
      console.log(`🔍 Caricamento topic Trieve già in corso per: ${user?.id}`);
      return;
    }

    // Marca l'operazione come in corso
    loadingState.markOperationStarted(loadingKey);

    if (dataSource === 'trieve' && user) {
      try {
        setIsLoading(true);
        console.log('📚 Caricamento topic Trieve per utente:', user.id, 'ospite:', isGuest);

        // Passa 'MainTopic' come topicSuffix per Trieve
        const topics = await getTopicsByOwner(user, isGuest, 'MainTopic');

        // Filtriamo solo i topic attivi (non cancellati)
        const activeTopics = topics.filter(topic => !topic.deleted);

        // Trasformiamo i topic in un formato compatibile con la sidebar
        const formattedTopics = activeTopics.map(topic => {
          // Controlla se il nome contiene il separatore § per il titolo personalizzato
          let displayTitle;
          if (topic.name.includes('§')) {
            // Estrai la parte dopo §
            const customTitlePart = topic.name.split('§')[1];
            // Formatta il titolo personalizzato sostituendo underscore con spazi
            displayTitle = customTitlePart.replace(/_/g, ' ');
          } else {
            // Se non c'è un titolo personalizzato, usa le ultime 5 cifre dell'ID
            const idSuffix = topic.id.slice(-5);
            displayTitle = `Nuova ${idSuffix}`;
          }

          return {
            id: topic.id,
            title: displayTitle,
            is_active: true,
            created_at: topic.created_at || new Date().toISOString(),
            is_trieve_topic: true
          };
        });

        console.log(`📚 Caricati ${formattedTopics.length} topic Trieve`);
        setConversations(formattedTopics);
      } catch (error) {
        console.error('❌ Errore caricamento topic Trieve:', error);
        setError('Impossibile caricare le conversazioni');
        // In caso di errore, mostriamo almeno le conversazioni dummy
        setConversations(chatHistory.map((title, index) => ({
          id: `dummy-${index}`,
          title,
          is_active: true,
          created_at: new Date().toISOString(),
          is_trieve_topic: false
        })));
      } finally {
        setIsLoading(false);
        // Marca l'operazione come completata
        loadingState.markOperationCompleted(loadingKey);
      }
    }
  };

  // Modifica questa funzione per gestire anche i topic Trieve
  const handleSaveTitleEdit = async () => {
    try {
      const targetId = editMode.conversationId;
      const newTitle = editMode.currentTitle;

      // Trova la conversazione da aggiornare
      const conversationToUpdate = conversations.find(conv => conv.id === targetId);

      if (!conversationToUpdate) {
        throw new Error(`Conversazione con ID ${targetId} non trovata`);
      }

      // Modalità differenti per Trieve e Supabase
      if (dataSource === 'trieve' && conversationToUpdate.is_trieve_topic) {
        console.log('📝 Aggiornamento titolo topic Trieve:', targetId);
        // Qui dovresti implementare la chiamata API per aggiornare il titolo del topic
        // Per ora, aggiorniamo solo il titolo locale

        // Aggiorna la lista delle conversazioni
        setConversations(conversations.map(conv =>
          conv.id === targetId ? { ...conv, title: newTitle } : conv
        ));
      } else {
        // Logica esistente per Supabase
        // ...codice originale per Supabase...
      }

      // Esci dalla modalità di modifica
      setEditMode({ enabled: false, conversationId: null, currentTitle: '' });
    } catch (error) {
      console.error('❌ Errore aggiornamento titolo:', error);
      setError('Impossibile aggiornare il titolo');
    }
  };

  return (
    <div
      className="h-full flex flex-col overflow-hidden"
      style={{ backgroundColor: theme.BACKGROUND.SIDEBAR }}
    >
      {/* Header della sidebar */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center">
          <FontAwesomeIcon
            icon={dataSource === 'trieve' ? faCloud : faDatabase}
            className="mr-2"
            style={{
              color: theme.SIDEBAR.ICON,
              backgroundColor: theme.SIDEBAR.ICON_BACKGROUND,
              padding: theme.SIDEBAR.ICON_BACKGROUND !== 'transparent' ? '4px' : '0',
              borderRadius: theme.SIDEBAR.ICON_BACKGROUND !== 'transparent' ? '50%' : '0'
            }}
          />
          <h2
            className="text-lg font-semibold truncate"
            style={{ color: theme.SIDEBAR.TITLE }}
          >
            {dataSource === 'trieve' ? 'Topics Cloud' : 'Conversazioni'}
          </h2>
        </div>
        <button
          className="p-2 rounded-full flex-shrink-0"
          style={{
            color: theme.SIDEBAR.ICON,
            backgroundColor: 'transparent',
            ':hover': { backgroundColor: `${theme.SIDEBAR.ICON}20` }
          }}
          title="Nuova conversazione"
          onClick={handleNewConversation}
        >
          <FontAwesomeIcon icon={faPlus} />
        </button>
      </div>

      {/* Lista conversazioni */}
      <div ref={contentRef} className="flex-1 overflow-y-auto p-2 overflow-x-hidden">
        {renderConversations()}
      </div>

      {/* Sezione di debug */}
      {showDebug && (
        <div
          className="p-2 border-t border-gray-200"
          style={{
            backgroundColor: `${theme.BACKGROUND.SIDEBAR}80`, // Versione semi-trasparente
            borderColor: `${theme.ACCENT}20`
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center">
              <h3
                className="text-xs font-semibold"
                style={{ color: theme.SIDEBAR.DEBUG.TITLE }}
              >
                Debug Info
              </h3>
              <button
                onClick={copyAllDebugInfo}
                className="ml-2 text-xs"
                style={{
                  color: theme.SIDEBAR.DEBUG.BUTTON,
                  ':hover': { color: theme.SIDEBAR.DEBUG.BUTTON_HOVER }
                }}
                title="Copia tutte le informazioni"
              >
                <FontAwesomeIcon icon={faCopy} size="xs" />
              </button>
            </div>
            <button
              onClick={() => setShowDebug(false)}
              className="text-xs"
              style={{
                color: theme.SIDEBAR.DEBUG.TEXT,
                ':hover': { color: theme.SIDEBAR.DEBUG.TITLE }
              }}
              title="Nascondi debug"
            >
              <FontAwesomeIcon icon={faTimes} size="xs" />
            </button>
          </div>

          <div
            className="space-y-2 text-xs"
            style={{ color: theme.SIDEBAR.DEBUG.TEXT }}
          >
            <div>
              <div
                className="font-medium mb-0.5"
                style={{ color: theme.SIDEBAR.DEBUG.LABEL }}
              >
                User ID:
              </div>
              <div className="flex items-center">
                <div
                  className="rounded p-1 pr-2 flex-grow text-[10px] break-all"
                  style={{
                    backgroundColor: theme.SIDEBAR.DEBUG.BACKGROUND,
                    color: theme.SIDEBAR.DEBUG.VALUE
                  }}
                >
                  {debugInfo.userId}
                </div>
                <button
                  onClick={() => copyToClipboard(debugInfo.userId)}
                  className="ml-1"
                  style={{
                    color: theme.SIDEBAR.DEBUG.BUTTON,
                    ':hover': { color: theme.SIDEBAR.DEBUG.BUTTON_HOVER }
                  }}
                  title="Copia negli appunti"
                >
                  <FontAwesomeIcon icon={faCopy} size="xs" />
                </button>
              </div>
            </div>

            <div>
              <div
                className="font-medium mb-0.5"
                style={{ color: theme.SIDEBAR.DEBUG.LABEL }}
              >
                Session ID:
              </div>
              <div className="flex items-center">
                <div
                  className="rounded p-1 pr-2 flex-grow text-[10px] break-all"
                  style={{
                    backgroundColor: theme.SIDEBAR.DEBUG.BACKGROUND,
                    color: theme.SIDEBAR.DEBUG.VALUE
                  }}
                >
                  {debugInfo.sessionId}
                </div>
                <button
                  onClick={() => copyToClipboard(debugInfo.sessionId)}
                  className="ml-1"
                  style={{
                    color: theme.SIDEBAR.DEBUG.BUTTON,
                    ':hover': { color: theme.SIDEBAR.DEBUG.BUTTON_HOVER }
                  }}
                  title="Copia negli appunti"
                >
                  <FontAwesomeIcon icon={faCopy} size="xs" />
                </button>
              </div>
            </div>

            <div>
              <div
                className="font-medium mb-0.5"
                style={{ color: theme.SIDEBAR.DEBUG.LABEL }}
              >
                Owner ID:
              </div>
              <div className="flex items-center">
                <div
                  className="rounded p-1 pr-2 flex-grow text-[10px] break-all"
                  style={{
                    backgroundColor: theme.SIDEBAR.DEBUG.BACKGROUND,
                    color: theme.SIDEBAR.DEBUG.VALUE
                  }}
                >
                  {debugInfo.ownerId}
                </div>
                <button
                  onClick={() => copyToClipboard(debugInfo.ownerId)}
                  className="ml-1"
                  style={{
                    color: theme.SIDEBAR.DEBUG.BUTTON,
                    ':hover': { color: theme.SIDEBAR.DEBUG.BUTTON_HOVER }
                  }}
                  title="Copia negli appunti"
                >
                  <FontAwesomeIcon icon={faCopy} size="xs" />
                </button>
              </div>
            </div>

            <div>
              <div
                className="font-medium mb-0.5"
                style={{ color: theme.SIDEBAR.DEBUG.LABEL }}
              >
                Topic Name:
              </div>
              <div className="flex items-center">
                <div
                  className="rounded p-1 pr-2 flex-grow text-[10px] break-all"
                  style={{
                    backgroundColor: theme.SIDEBAR.DEBUG.BACKGROUND,
                    color: theme.SIDEBAR.DEBUG.VALUE
                  }}
                >
                  {debugInfo.topicName}
                </div>
                <button
                  onClick={() => copyToClipboard(debugInfo.topicName)}
                  className="ml-1"
                  style={{
                    color: theme.SIDEBAR.DEBUG.BUTTON,
                    ':hover': { color: theme.SIDEBAR.DEBUG.BUTTON_HOVER }
                  }}
                  title="Copia negli appunti"
                >
                  <FontAwesomeIcon icon={faCopy} size="xs" />
                </button>
              </div>
            </div>

            <div>
              <div
                className="font-medium mb-0.5"
                style={{ color: theme.SIDEBAR.DEBUG.LABEL }}
              >
                Topic ID:
              </div>
              <div className="flex items-center">
                <div
                  className="rounded p-1 pr-2 flex-grow text-[10px] break-all"
                  style={{
                    backgroundColor: theme.SIDEBAR.DEBUG.BACKGROUND,
                    color: theme.SIDEBAR.DEBUG.VALUE
                  }}
                >
                  {debugInfo.topicId}
                </div>
                <button
                  onClick={() => copyToClipboard(debugInfo.topicId)}
                  className="ml-1"
                  style={{
                    color: theme.SIDEBAR.DEBUG.BUTTON,
                    ':hover': { color: theme.SIDEBAR.DEBUG.BUTTON_HOVER }
                  }}
                  title="Copia negli appunti"
                >
                  <FontAwesomeIcon icon={faCopy} size="xs" />
                </button>
              </div>
            </div>

            <div className="flex flex-col">
              <div className="text-xs" style={{ color: theme.SIDEBAR.DEBUG.LABEL }}>Cloud ID:</div>
              <div className="p-1 rounded text-xs overflow-x-auto whitespace-nowrap"
                style={{ backgroundColor: theme.SIDEBAR.DEBUG.BACKGROUND, color: theme.SIDEBAR.DEBUG.VALUE }}>
                {conversations.find(conv => conv.id === activeConversationId)?.trieve_id || "No_ID_Yet"}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer con info utente */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center">
          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white flex-shrink-0">
            {user?.email?.charAt(0).toUpperCase() || 'G'}
          </div>
          <div className="ml-2 overflow-hidden">
            <div className="text-sm font-medium truncate" style={{ color: theme.SIDEBAR.USER_TEXT }}>
              {isGuest ? 'Utente Ospite' : user?.email || 'Utente'}
            </div>
            <div className="text-xs truncate" style={{ color: theme.SIDEBAR.USER_META }}>
              {dataSource === 'trieve' ? 'Modalità Cloud' : 'Modalità Supabase'}
            </div>
          </div>
        </div>
      </div>

      {/* Feedback temporaneo */}
      {feedback.type && (
        <div
          className={`fixed bottom-4 right-4 p-3 rounded-lg shadow-lg ${feedback.type === 'success' ? 'bg-green-500' : 'bg-red-500'
            } text-white`}
        >
          {feedback.message}
        </div>
      )}
    </div>
  );
}

export default Sidebar; 