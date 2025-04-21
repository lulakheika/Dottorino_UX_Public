export const SIDEBAR_CONFIG = {
    PADDING: 40,
    MAX_TEXT_WIDTH: 180,
    MIN_WIDTH: 220,
    BUTTONS_WIDTH: 60, // Spazio per i due pulsanti di modifica e cancellazione
    get MAX_WIDTH() {
        // La larghezza massima della sidebar non può essere inferiore a MIN_WIDTH
        // e deve includere lo spazio per i pulsanti
        return Math.max(this.MIN_WIDTH, this.MAX_TEXT_WIDTH + this.PADDING + this.BUTTONS_WIDTH);
    }
};

// Configurazione per i topic
export const TOPIC_CONFIG = {
    DEFAULT_SUFFIX: "MainTopic"
};

// Definizione dei temi di colore
export const THEMES = {
    // Tema Trieve (blu/azzurro)
    TRIEVE: {
        // Colori principali
        PRIMARY: '#042459', // Blu scuro per header e sfondo chat
        SECONDARY: '#10B981', // Verde (emerald-500 in Tailwind)
        ACCENT: '#189AB4', // Azzurro per elementi di accento

        // Colori di sfondo
        BACKGROUND: {
            MAIN: '#F9FAFB', // Grigio chiaro (gray-50 in Tailwind)
            SIDEBAR: '#1f50a1', // Grigio chiaro
            CHAT: '#042459', // Blu scuro per lo sfondo della chat
            MESSAGE_USER: '#1FAB89', // Verde per messaggi utente
            MESSAGE_AI: '#189AB4', // Azzurro per messaggi AI
            CONVERSATION: {
                ACTIVE: '#2E7D32', // Verde scuro per conversazione attiva
                HOVER: '#E5E7EB', // Blu scuro per hover
            }
        },

        // Colori del testo
        TEXT: {
            PRIMARY: '#1F2937', // Grigio scuro (gray-800 in Tailwind)
            SECONDARY: '#6B7280', // Grigio medio (gray-500 in Tailwind)
            LIGHT: '#9CA3AF', // Grigio chiaro (gray-400 in Tailwind)
            ON_PRIMARY: '#FFFFFF', // Bianco (per testo su sfondo colorato)
        },

        // Colori di stato
        STATUS: {
            SUCCESS: '#10B981', // Verde (emerald-500 in Tailwind)
            ERROR: '#EF4444', // Rosso (red-500 in Tailwind)
            WARNING: '#F59E0B', // Giallo (amber-500 in Tailwind)
            INFO: '#3B82F6', // Blu (blue-500 in Tailwind)
        },

        // Colori specifici per i pulsanti
        BUTTONS: {
            GREEN: '#10B981', // Verde per pulsante VAPI
            RED: '#EF4444', // Rosso per pulsante Esci
        },

        // Colori specifici per la sidebar
        SIDEBAR: {
            TITLE: '#EEEEEE', // Colore del titolo della sidebar
            ICON: '#3B82F6', // Colore dell'icona della sidebar (blu)
            ICON_BACKGROUND: 'transparent', // Sfondo trasparente per l'icona
            TEXT: '#FFFFFF', // AGGIUNTO: Testo nero per le conversazioni non selezionate
            USER_TEXT: '#FFFFFF', // Colore per l'email utente
            USER_META: '#999999', // Colore per il testo sotto l'email (modalità)
            DEBUG: {
                TITLE: '#FFFFFF', // Grigio per il titolo della sezione debug
                TEXT: '#6B7280', // Grigio medio per il testo della sezione debug
                LABEL: '#CCCCCC', // Grigio scuro per le etichette nella sezione debug
                VALUE: '#1F2937', // Grigio molto scuro per i valori nella sezione debug
                BACKGROUND: '#1f50a1', // Grigio chiaro per lo sfondo dei valori
                BUTTON: '#DDDDDD', // Blu per i pulsanti nella sezione debug
                BUTTON_HOVER: '#E5E7EB' // Grigio chiaro per hover sui pulsanti
            }
        }
    },

    // Tema Custom (marrone/ocra)
    CUSTOM: {
        // Colori principali
        PRIMARY: '#5D4037', // Marrone scuro per header e sfondo chat
        SECONDARY: '#F57C00', // Arancione per accenti secondari
        ACCENT: '#D4A676', // Beige/ocra per elementi di accento

        // Colori di sfondo
        BACKGROUND: {
            MAIN: '#F9F6F2', // Beige chiaro
            SIDEBAR: '#3E2723', // Marrone più scuro per la sidebar
            CHAT: '#5D4037', // Marrone scuro per lo sfondo della chat
            MESSAGE_USER: '#F57C00', // Arancione per messaggi utente
            MESSAGE_AI: '#D4A676', // Beige/ocra per messaggi AI
            CONVERSATION: {
                ACTIVE: '#8D6E63', // Marrone medio per conversazione attiva
                HOVER: '#A1887F', // Marrone più chiaro per hover
            }
        },

        // Colori del testo
        TEXT: {
            PRIMARY: '#FFFFFF', // Bianco per il testo principale
            SECONDARY: '#EEEEEE', // Bianco leggermente più scuro per testo secondario
            LIGHT: '#E0E0E0', // Bianco ancora più scuro per testo leggero
            ON_PRIMARY: '#FFFFFF', // Bianco (per testo su sfondo colorato)
        },

        // Colori di stato
        STATUS: {
            SUCCESS: '#66BB6A', // Verde (più caldo)
            ERROR: '#EF5350', // Rosso (più caldo)
            WARNING: '#FFA726', // Arancione
            INFO: '#42A5F5', // Blu (più caldo)
        },

        // Colori specifici per i pulsanti
        BUTTONS: {
            GREEN: '#66BB6A', // Verde per pulsante VAPI
            RED: '#EF5350', // Rosso per pulsante Esci
        },

        // Colori specifici per la sidebar
        SIDEBAR: {
            TITLE: '#FFFFFF', // Colore bianco per il titolo della sidebar
            ICON: '#F57C00', // Colore arancione per l'icona della sidebar
            ICON_BACKGROUND: 'rgba(245, 124, 0, 0.1)', // Sfondo leggermente arancione per l'icona
            TEXT: '#FFFFFF',
            USER_TEXT: '#FFFFFF', // Colore per l'email utente
            USER_META: '#E1BEE7', // Colore per il testo sotto l'email (modalità)
            DEBUG: {
                TITLE: '#FFE0B2', // Arancione chiaro per il titolo della sezione debug
                TEXT: '#FFCC80', // Arancione più chiaro per il testo della sezione debug
                LABEL: '#FFE0B2', // Arancione chiaro per le etichette nella sezione debug
                VALUE: '#FFFFFF', // Bianco per i valori nella sezione debug
                BACKGROUND: '#5D4037', // Marrone per lo sfondo dei valori
                BUTTON: '#F57C00', // Arancione per i pulsanti nella sezione debug
                BUTTON_HOVER: '#FF9800' // Arancione più chiaro per hover sui pulsanti
            }
        }
    },

    // Tema Supabase (viola/verde)
    SUPABASE: {
        // Colori principali
        PRIMARY: '#4A148C', // Viola scuro per header e sfondo chat
        SECONDARY: '#00C853', // Verde brillante per accenti secondari
        ACCENT: '#7C4DFF', // Viola chiaro per elementi di accento

        // Colori di sfondo
        BACKGROUND: {
            MAIN: '#F3E5F5', // Lavanda chiaro
            SIDEBAR: '#311B92', // Viola molto scuro per la sidebar
            CHAT: '#4A148C', // Viola scuro per lo sfondo della chat
            MESSAGE_USER: '#00C853', // Verde brillante per messaggi utente
            MESSAGE_AI: '#7C4DFF', // Viola chiaro per messaggi AI
            CONVERSATION: {
                ACTIVE: '#B39DDB', // Viola chiaro per conversazione attiva
                HOVER: '#D1C4E9', // Viola ancora più chiaro per hover
            }
        },

        // Colori del testo
        TEXT: {
            PRIMARY: '#FFFFFF', // Bianco per il testo principale
            SECONDARY: '#E1BEE7', // Viola molto chiaro per testo secondario
            LIGHT: '#D1C4E9', // Viola ancora più chiaro per testo leggero
            ON_PRIMARY: '#FFFFFF', // Bianco (per testo su sfondo colorato)
        },

        // Colori di stato
        STATUS: {
            SUCCESS: '#00E676', // Verde brillante
            ERROR: '#FF1744', // Rosso acceso
            WARNING: '#FFAB00', // Ambra
            INFO: '#2979FF', // Blu brillante
        },

        // Colori specifici per i pulsanti
        BUTTONS: {
            GREEN: '#00E676', // Verde brillante per pulsante VAPI
            RED: '#FF1744', // Rosso acceso per pulsante Esci
        },

        // Colori specifici per la sidebar
        SIDEBAR: {
            TITLE: '#FFFFFF',
            ICON: '#00E676',
            ICON_BACKGROUND: 'rgba(0, 230, 118, 0.1)',
            TEXT: '#FFFFFF',
            USER_TEXT: '#FFFFFF', // Colore per l'email utente
            USER_META: '#AAAAAA', // Colore per il testo sotto l'email (modalità)
            DEBUG: {
                TITLE: '#B39DDB',
                TEXT: '#9575CD',
                LABEL: '#B39DDB',
                VALUE: '#FFFFFF',
                BACKGROUND: '#4A148C',
                BUTTON: '#00E676',
                BUTTON_HOVER: '#00C853'
            }
        }
    }
};

// Funzione per ottenere il tema corrente in base alla sorgente dati
export const getTheme = (dataSource) => {
    return dataSource === 'trieve' ? THEMES.TRIEVE : dataSource === 'supabase' ? THEMES.SUPABASE : THEMES.CUSTOM;
};

// Per retrocompatibilità, esportiamo anche COLOR_CONFIG che punta al tema Trieve
export const COLOR_CONFIG = THEMES.TRIEVE; 