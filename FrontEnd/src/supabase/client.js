import { createClient } from '@supabase/supabase-js';
import { getDynamicServiceUrl } from '../urlHelpers';

// Usa la funzione helper per determinare l'URL di Supabase
const supabaseUrl = getDynamicServiceUrl('supabase');
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlLWRlbW8iLCJpYXQiOjE2NDE3NjkyMDAsImV4cCI6MTc5OTUzNTYwMH0.K3i4ppC1sxZR48hjkfLBwsu8g4_aJYMGenXHqRI-iiU';

// Aggiungi questo log per debug
console.log('Inizializzazione client Supabase con URL:', supabaseUrl);
console.log('Lunghezza chiave anon:', supabaseKey ? supabaseKey.length : 0);

// Variabile di controllo per i log di debug
const ENABLE_DEBUG_LOGS = false;

// Opzioni avanzate per il client standard
const options = {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        debug: false,
    },
    global: {
        headers: {
            'x-client-info': 'supabase-js-debug'
        }
    }
};

// Crea solo il client standard
let supabaseClient;
if (supabaseUrl && supabaseKey) {
    if (ENABLE_DEBUG_LOGS) console.log('=== INIZIALIZZAZIONE CLIENT SUPABASE ===');
    if (ENABLE_DEBUG_LOGS) console.log('URL completo:', supabaseUrl);

    if (ENABLE_DEBUG_LOGS) console.log('Opzioni:', JSON.stringify(options, null, 2));

    try {
        supabaseClient = createClient(supabaseUrl, supabaseKey, options);

        if (ENABLE_DEBUG_LOGS) console.log('Client Supabase creato con successo');

        // Stampa i metodi disponibili
        if (ENABLE_DEBUG_LOGS) console.log('Metodi auth disponibili:', Object.keys(supabaseClient.auth));
    } catch (error) {
        console.error('Errore nella creazione del client Supabase:', error);
    }

    // Intercetta tutte le richieste fetch per il debug
    const originalFetch = window.fetch;
    window.fetch = function (url, options = {}) {
        const isSupabaseRequest = url.toString().includes('supabase') ||
            url.toString().includes('localhost:8001') ||
            url.toString().includes('auth');

        if (isSupabaseRequest && ENABLE_DEBUG_LOGS) {
            console.log('\n=== RICHIESTA SUPABASE ===');
            console.log('URL:', url.toString());
            console.log('Metodo:', options.method || 'GET');

            // Stampa gli header in modo leggibile
            if (options.headers) {
                console.log('Headers:');
                const headers = options.headers instanceof Headers
                    ? Object.fromEntries([...options.headers.entries()])
                    : options.headers;

                for (const [key, value] of Object.entries(headers)) {
                    // Nascondi parte della chiave di autorizzazione per sicurezza
                    if (key.toLowerCase() === 'authorization' || key.toLowerCase() === 'apikey') {
                        console.log(`  ${key}: ${value.substring(0, 15)}...`);
                    } else {
                        console.log(`  ${key}: ${value}`);
                    }
                }
            }

            // Stampa il body in modo leggibile
            if (options.body) {
                try {
                    const bodyContent = typeof options.body === 'string'
                        ? JSON.parse(options.body)
                        : options.body;

                    // Mostra la password in chiaro per debug
                    console.log('Body:', JSON.stringify(bodyContent, null, 2));
                } catch (e) {
                    console.log('Body: [Non JSON]', options.body.substring(0, 50) + '...');
                }
            }

            // Intercetta anche la risposta per il debug
            return originalFetch.apply(this, arguments)
                .then(response => {
                    console.log('\n=== RISPOSTA SUPABASE ===');
                    console.log('Status:', response.status);
                    console.log('Status Text:', response.statusText);

                    // Clona la risposta per poterla leggere senza consumarla
                    const clonedResponse = response.clone();

                    // Prova a leggere il corpo della risposta come JSON
                    clonedResponse.json().then(data => {
                        console.log('Risposta:', JSON.stringify(data, null, 2));
                    }).catch(() => {
                        console.log('Risposta: [Non JSON]');
                    });

                    return response;
                })
                .catch(error => {
                    console.error('\n=== ERRORE RICHIESTA SUPABASE ===');
                    console.error('Errore:', error);
                    throw error;
                });
        }

        return originalFetch.apply(this, arguments);
    };

    if (ENABLE_DEBUG_LOGS) console.log('=== FINE INIZIALIZZAZIONE CLIENT SUPABASE ===');
} else {
    // Crea un client fittizio con metodi simulati
    console.warn('ATTENZIONE: Supabase non configurato. Utilizzo della modalità simulata.');
    supabaseClient = {
        auth: {
            signInWithPassword: async () => ({ data: null, error: new Error('Supabase non configurato') }),
            signUp: async () => ({ data: null, error: new Error('Supabase non configurato') }),
            signOut: async () => ({ error: null }),
            getSession: async () => ({ data: { session: null } }),
            onAuthStateChange: () => ({ data: null, subscription: { unsubscribe: () => { } } })
        }
    };
}

// Esporta il client standard
export const supabase = supabaseClient; 