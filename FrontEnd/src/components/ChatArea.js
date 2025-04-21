import React, { useRef, useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBars, faPaperPlane, faMicrophone, faPaperclip, faHeartPulse, faBell, faMicrophoneLines, faSignOutAlt, faUser, faDatabase, faCloud } from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../context/AuthContext';
import { getTheme } from '../config/layout';
import { supabase } from '../supabase/client';
import { logEvent, log } from '../utils/logger';
import loadingState from '../utils/loadingState';

function ChatArea({
  toggleSidebar,
  messages,
  setMessages,
  isLoading,
  error,
  handleSubmit,
  inputMessage,
  setInputMessage,
  dataSource,
  setDataSource,
  activeConversationId,
  handleAgentSubmit
}) {
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const { logout, user, isGuest } = useAuth();
  const [supabaseMessagesLoading, setSupabaseMessagesLoading] = useState(false);
  const [viewportAdjusted, setViewportAdjusted] = useState(false);
  const [headerHeight, setHeaderHeight] = useState(40);
  const [footerHeight, setFooterHeight] = useState(40);
  const headerRef = useRef(null);
  const footerRef = useRef(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [showScrollButton, setShowScrollButton] = useState(false);

  // Ottieni il tema corrente in base alla sorgente dati
  const theme = getTheme(dataSource);

  // Funzione per caricare i messaggi da Supabase
  const loadSupabaseMessages = async (conversationId) => {
    if (!conversationId || dataSource !== 'supabase') return;

    logEvent('ChatArea', `EFFETTIVO caricamento dei messaggi per conversazione: ${conversationId}`);

    try {
      setSupabaseMessagesLoading(true);

      // Ottieni lo schema dalla variabile d'ambiente
      const schema = (process.env.REACT_APP_BRAND_NAME || 'public').toLowerCase();

      console.log(`Caricamento messaggi per la conversazione ${conversationId} dallo schema ${schema}`);

      // Query SQL per ottenere i messaggi della conversazione
      const querySQL = `
        SELECT * 
        FROM "${schema}"."messages"
        WHERE conversation_id = '${conversationId}'
        ORDER BY created_at ASC
      `;

      const { data, error } = await supabase.rpc('execute_sql', {
        sql_query: querySQL
      });

      if (error) throw error;

      logEvent('ChatArea', `Caricati ${data ? data.length : 0} messaggi`);

      if (data && data.length > 0) {
        // Trasforma i dati nel formato richiesto da ChatArea
        const formattedMessages = data.map(msg => ({
          text: msg.content,
          isUser: msg.role === 'user',
          createdAt: msg.created_at,
          id: msg.id,
          chunks: msg.chunks || [],
          metadata: msg.metadata || {}
        }));

        setMessages(formattedMessages);
      } else {
        // Se non ci sono messaggi, mostra un messaggio di benvenuto
        setMessages([{
          text: `Benvenuto nella tua nuova conversazione! Questa è la modalità Supabase per l'utente ${isGuest ? 'OSPITE' : user?.email?.split('@')[0] || 'Utente'}.`,
          isUser: false,
          createdAt: new Date().toISOString(),
          id: 'welcome-message'
        }]);
      }
    } catch (error) {
      logEvent('ChatArea', `Errore caricamento messaggi: ${error.message}`);
    } finally {
      setSupabaseMessagesLoading(false);
    }
  };

  // Effetto per scorrere in fondo alla chat quando cambiano i messaggi
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      scrollToBottom();
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [messages, isLoading]);

  // Nuovo effetto per caricare i messaggi quando cambia la conversazione selezionata
  useEffect(() => {
    const effectId = logEvent('ChatArea', `activeConversationId cambiato: ${activeConversationId}`);

    // Il messaggio viene impostato a null nel MainLayout quando cambia conversazione
    // Aggiungiamo questa condizione per forzare il caricamento quando l'utente cambia conversazione
    const shouldForceLoad = activeConversationId && messages.length === 0;

    if (dataSource === 'supabase' && activeConversationId &&
      (!loadingState.isConversationLoaded(activeConversationId) || shouldForceLoad)) {

      loadingState.markConversationLoaded(activeConversationId);
      logEvent('ChatArea', `CARICAMENTO EFFETTIVO messaggi per: ${activeConversationId} (evento: ${effectId})`);
      loadSupabaseMessages(activeConversationId);
    } else if (loadingState.isConversationLoaded(activeConversationId) && !shouldForceLoad) {
      logEvent('ChatArea', `Caricamento già avvenuto via activeConversationId: ${activeConversationId}`);
    }
  }, [dataSource, activeConversationId, messages.length]);

  // Aggiungiamo un listener per l'evento personalizzato
  useEffect(() => {
    const handleForceLoad = (event) => {
      const conversationId = event.detail?.conversationId;
      const forceId = logEvent('ChatArea', `Ricevuto evento force-load-conversation: ${conversationId}`);

      if (dataSource === 'supabase' && conversationId && !loadingState.isConversationLoaded(conversationId + '_loaded')) {
        loadingState.markConversationLoaded(conversationId + '_loaded');

        logEvent('ChatArea', `Caricamento forzato per: ${conversationId} (evento: ${forceId})`);
        loadSupabaseMessages(conversationId);
      } else if (loadingState.isConversationLoaded(conversationId + '_loaded')) {
        logEvent('ChatArea', `Caricamento già avvenuto per: ${conversationId} (evento: ${forceId})`);
      }
    };

    // Aggiungi l'event listener
    window.addEventListener('force-load-conversation', handleForceLoad);

    // Cleanup
    return () => {
      window.removeEventListener('force-load-conversation', handleForceLoad);
    };
  }, [dataSource]); // Dipende solo da dataSource

  // Effetto per misurare e adattarsi alle dimensioni reali
  useEffect(() => {
    function adjustForMobileSafari() {
      // Misura le altezze effettive di header e footer
      if (headerRef.current) {
        setHeaderHeight(headerRef.current.offsetHeight);
      }
      if (footerRef.current) {
        setFooterHeight(footerRef.current.offsetHeight);
      }

      // Segnala che l'adattamento è stato completato
      setViewportAdjusted(true);
    }

    // Esegui l'adattamento all'inizio
    adjustForMobileSafari();

    // Esegui l'adattamento anche dopo un breve ritardo (per iOS Safari)
    const timer = setTimeout(adjustForMobileSafari, 500);

    // Funzione per gestire i cambiamenti di dimensione
    function handleResize() {
      adjustForMobileSafari();
    }

    // Ascolta cambiamenti di dimensione e orientamento
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    // Gestisci anche lo scroll (che può mostrare/nascondere la barra degli indirizzi)
    window.addEventListener('scroll', handleResize);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      window.removeEventListener('scroll', handleResize);
    };
  }, []);

  // Effetto per rilevare la dimensione dello schermo
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Funzione per scrollare in fondo garantendo visibilità
  const scrollToBottom = () => {
    if (messagesEndRef.current && chatContainerRef.current) {
      if (isMobile) {
        // Su mobile, calcola manualmente la posizione di scroll
        const scrollContainer = chatContainerRef.current;
        const containerHeight = scrollContainer.clientHeight;
        const scrollHeight = scrollContainer.scrollHeight;

        // Scrolla abbastanza in fondo da mostrare chiaramente l'ultimo messaggio
        // ma non troppo da avere spazio vuoto
        scrollContainer.scrollTo({
          top: scrollHeight - containerHeight + 20, // +20px per compensare padding
          behavior: 'smooth'
        });
      } else {
        // Su desktop usiamo scrollIntoView con opzioni adeguate
        messagesEndRef.current.scrollIntoView({
          behavior: 'smooth',
          block: 'end'  // Allinea alla fine per evitare che resti sotto il footer
        });
      }
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  // Funzione per cambiare la sorgente dati
  const toggleDataSource = () => {
    setDataSource(dataSource === 'trieve' ? 'supabase' : 'trieve');
  };

  useEffect(() => {
    // Funzione per controllare se siamo scrollati fino in fondo
    const checkScrollPosition = () => {
      if (chatContainerRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
        // Se siamo a più di 100px dal fondo, mostra il bottone
        setShowScrollButton(scrollHeight - scrollTop - clientHeight > 100);
      }
    };

    // Aggiungi listener per l'evento scroll
    const container = chatContainerRef.current;
    if (container) {
      container.addEventListener('scroll', checkScrollPosition);

      // Verifica anche dopo che i messaggi sono stati aggiornati
      checkScrollPosition();

      return () => container.removeEventListener('scroll', checkScrollPosition);
    }
  }, [messages]);

  return (
    <div
      className="flex flex-col w-full h-full"
      style={{
        backgroundColor: theme.BACKGROUND.CHAT,
        height: isMobile ? '100%' : '100%',
        overflow: 'hidden',
        position: isMobile ? 'relative' : 'static',
      }}
    >
      {/* Header con padding bilanciato */}
      <header
        ref={headerRef}
        className="w-full border-b px-2 md:px-3 flex items-center justify-center"
        style={{
          backgroundColor: theme.PRIMARY,
          borderColor: `${theme.ACCENT}20`,
          position: isMobile ? 'fixed' : 'relative',
          top: isMobile ? 0 : 'auto',
          left: isMobile ? 0 : 'auto',
          right: isMobile ? 0 : 'auto',
          zIndex: 20,
          minHeight: isMobile ? '50px' : '60px',
          paddingTop: isMobile ? 'env(safe-area-inset-top, 8px)' : '0px'
        }}
      >
        <div className="flex items-center justify-between w-full whitespace-nowrap overflow-x-auto">
          {/* Lato sinistro */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {toggleSidebar && (
              <button onClick={toggleSidebar} className="text-white p-1">
                <FontAwesomeIcon icon={faBars} />
              </button>
            )}

            <div className="w-7 h-7 rounded-full flex items-center justify-center"
              style={{ backgroundColor: theme.ACCENT }}>
              <FontAwesomeIcon icon={faHeartPulse} className="text-white" />
            </div>

            <span className="text-sm font-semibold text-white truncate max-w-[80px]">
              {process.env.REACT_APP_BRAND_NAME}
            </span>
          </div>

          {/* Centro più compatto */}
          <div className="flex items-center mx-1 flex-shrink-0">
            <button
              onClick={toggleDataSource}
              className="relative inline-flex h-5 w-9 items-center rounded-full"
              style={{ backgroundColor: dataSource === 'supabase' ? theme.STATUS.SUCCESS : theme.STATUS.INFO }}
            >
              <span className="inline-block h-3 w-3 transform rounded-full bg-white"
                style={{ transform: dataSource === 'supabase' ? 'translateX(5px)' : 'translateX(20px)' }} />
            </button>
            <FontAwesomeIcon icon={dataSource === 'trieve' ? faCloud : faDatabase}
              className="ml-2 text-white" />
          </div>

          {/* Lato destro */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              className="text-white px-4 py-1 rounded flex items-center justify-center min-w-[70px]"
              style={{ backgroundColor: theme.BUTTONS.GREEN }}
              onClick={() => console.log('Avvio widget VAPI')}
            >
              <FontAwesomeIcon icon={faMicrophoneLines} className="mr-1" />
              <span className="text-xs font-bold">VOCE</span>
            </button>

            {/* Bottone logout più largo */}
            <button
              className="text-white px-4 py-1 rounded flex items-center justify-center min-w-[70px]"
              style={{ backgroundColor: theme.BUTTONS.RED }}
              onClick={handleLogout}
            >
              <FontAwesomeIcon icon={faSignOutAlt} className="mr-1" />
              <span className="text-xs font-bold">ESCI</span>
            </button>
          </div>
        </div>
      </header>

      {/* Area messaggi con spazio aumentato tra i messaggi */}
      <div
        key={`messages-container-${dataSource}-${activeConversationId}`}
        ref={chatContainerRef}
        className={`${isMobile ? '' : 'flex-grow'} overflow-y-auto py-2 px-3 space-y-4`}
        style={isMobile ? {
          marginTop: viewportAdjusted ? `${headerHeight}px` : '50px',
          marginBottom: viewportAdjusted ? `${footerHeight}px` : '55px',
          height: 'auto',
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: 0,
          right: 0,
          WebkitOverflowScrolling: 'touch',
        } : {
          // Stile per desktop
          minHeight: 0,
          flex: 1,
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {/* Contenitore interno */}
        <div className="min-h-full relative pb-28">
          {/* Spacer iniziale */}
          <div className="h-2" />

          {/* Messaggi con padding verticale aumentato */}
          {messages.map((msg, index) => (
            <div key={msg.id || index} className="flex gap-2 mb-4">
              {!msg.isUser && (
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-1"
                  style={{ backgroundColor: theme.ACCENT }}
                >
                  <FontAwesomeIcon icon={dataSource === 'trieve' ? faCloud : faDatabase} className="text-white text-xs" />
                </div>
              )}
              <div
                className={`rounded-xl p-3 max-w-[85%] text-white text-sm ${msg.isUser
                  ? 'ml-auto rounded-tr-none'
                  : 'rounded-tl-none'
                  }`}
                style={{
                  backgroundColor: msg.isUser
                    ? theme.BACKGROUND.MESSAGE_USER
                    : theme.BACKGROUND.MESSAGE_AI,
                  marginBottom: '4px',
                  marginTop: '4px'
                }}
              >
                <p className="leading-relaxed">{msg.text}</p>
                {!msg.isUser && msg.chunks && msg.chunks.length > 0 && (
                  <div className="mt-2 text-xs opacity-75">
                    Fonte: {msg.chunks[0].metadata?.sezione || 'N/A'}
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Indicatore "sto pensando" - spostato qui PRIMA dell'elemento per lo scroll */}
          {isLoading && !supabaseMessagesLoading && (
            <div className="flex gap-2 mb-4" key="thinking-indicator">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-1"
                style={{ backgroundColor: theme.ACCENT }}
              >
                <FontAwesomeIcon icon={dataSource === 'trieve' ? faCloud : faDatabase} className="text-white text-xs" />
              </div>
              <div
                className="rounded-xl rounded-tl-none p-3 max-w-[85%] text-white text-sm"
                style={{ backgroundColor: theme.BACKGROUND.MESSAGE_AI }}
              >
                <p className="leading-relaxed">Sto pensando...</p>
              </div>
            </div>
          )}

          {/* Elemento finale con spazio significativo */}
          <div ref={messagesEndRef} className="h-4" />
        </div>
      </div>

      {/* Footer adattivo */}
      <footer
        ref={footerRef}
        className="w-full border-t py-1.5 px-2"
        style={{
          backgroundColor: theme.BACKGROUND.CHAT,
          borderColor: `${theme.ACCENT}20`,
          position: isMobile ? 'fixed' : 'relative',
          bottom: isMobile ? 0 : 'auto',
          left: isMobile ? 0 : 'auto',
          right: isMobile ? 0 : 'auto',
          zIndex: 20,
          paddingBottom: isMobile ? 'env(safe-area-inset-bottom, 0.75rem)' : '0.75rem'
        }}
      >
        <form onSubmit={handleSubmit} className="flex gap-2 items-center">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder={process.env.REACT_APP_INPUT_PLACEHOLDER}
            className="flex-1 rounded-lg px-3 py-1.5 text-sm placeholder-white/50 text-white"
            style={{ backgroundColor: `${theme.ACCENT}20` }}
          />
          <button
            type="submit"
            disabled={isLoading || !inputMessage.trim()}
            className="p-1.5 text-white disabled:opacity-50"
            aria-label="Invia messaggio"
          >
            <FontAwesomeIcon icon={faPaperPlane} />
          </button>

          {/* New Agent Submit Button - Visible only in Supabase mode */}
          {dataSource === 'supabase' && (
            <button
              type="button"
              onClick={handleAgentSubmit}
              disabled={isLoading || !inputMessage.trim()}
              className="p-1.5 text-white disabled:opacity-50 bg-purple-600 hover:bg-purple-700 rounded-lg ml-1"
              aria-label="Invia ad Agente"
              title="Invia ad Agente"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
              </svg>
            </button>
          )}
        </form>
      </footer>

      {/* Strato di background solo su mobile */}
      {isMobile && (
        <div
          style={{
            position: 'fixed',
            zIndex: -1,
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: theme.BACKGROUND.CHAT,
          }}
        />
      )}

      {showScrollButton && (
        <button
          className="fixed z-30 flex items-center justify-center w-12 h-12 rounded-full shadow-lg " // aggiungere " animate-bounce" dopo shadow-lg per farlo saltare
          style={{
            bottom: isMobile ? '65px' : '65px',
            right: isMobile ? '16px' : '28px',
            backgroundColor: theme.PRIMARY,
            boxShadow: `0 0 10px rgba(0,0,0,0.2), 0 0 0 2px ${theme.ACCENT}`

          }}
          onClick={scrollToBottom}
          aria-label="Vai a fine conversazione"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="white">
            <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
          </svg>
        </button>
      )}
    </div>
  );
}

export default ChatArea; 