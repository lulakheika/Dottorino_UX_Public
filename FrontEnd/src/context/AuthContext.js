import React, { createContext, useContext, useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../supabase/client';
// Rimuovere questo import se non è necessario altrove
// import { createClient } from '@supabase/supabase-js';

// Variabile di controllo per i log di debug
const ENABLE_DEBUG_LOGS = false;

// Creiamo il contesto
const AuthContext = createContext(null);

// Hook personalizzato per usare il contesto
export const useAuth = () => useContext(AuthContext);

// Costanti per le modalità di autenticazione
const AUTH_MODES = {
    FULL: 'full',
    GUEST_ONLY: 'guest-only',
    DISABLED: 'disabled'
};

// All'inizio del file, dopo l'inizializzazione di supabase
if (ENABLE_DEBUG_LOGS) {
    console.log("Inizializzazione Supabase in AuthContext:");
    console.log("URL:", supabase.supabaseUrl);
    console.log("API Key:", supabase.supabaseKey.substring(0, 10) + "...");
    console.log("Auth disponibile:", !!supabase.auth);
    console.log("Metodi auth:", Object.keys(supabase.auth));
}

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isGuest, setIsGuest] = useState(false);
    const [isAuthenticatedGuest, setIsAuthenticatedGuest] = useState(false);

    // Ottieni la modalità di autenticazione dalle variabili d'ambiente
    const [authMode, setAuthMode] = useState(process.env.REACT_APP_AUTH_MODE || AUTH_MODES.FULL);

    useEffect(() => {
        const checkAuth = async () => {
            try {
                // Se l'autenticazione è disabilitata, crea un utente fittizio
                if (authMode === AUTH_MODES.DISABLED) {
                    const disabledUser = {
                        id: 'system-user',
                        email: 'system@example.com',
                        isSystemUser: true
                    };
                    setUser(disabledUser);
                    setLoading(false);
                    return;
                }

                // Se è in modalità solo ospite, crea o recupera un utente ospite
                if (authMode === AUTH_MODES.GUEST_ONLY) {
                    await continueAsGuest();
                    return;
                }

                // Prima controlla se c'è un utente ospite nel localStorage
                const guestUserStr = localStorage.getItem('guestUser');
                if (guestUserStr) {
                    try {
                        const guestUser = JSON.parse(guestUserStr);
                        // Verifica se la sessione ospite è scaduta
                        if (guestUser.expiresAt && new Date(guestUser.expiresAt) > new Date()) {
                            setUser(guestUser);
                            setIsGuest(true);
                            setLoading(false);
                            return; // Termina qui se abbiamo trovato un utente ospite valido
                        } else {
                            // Sessione scaduta, rimuovi l'utente ospite
                            localStorage.removeItem('guestUser');
                        }
                    } catch (e) {
                        console.error('Errore nel parsing dell\'utente ospite:', e);
                        localStorage.removeItem('guestUser');
                    }
                }

                // Controlla se c'è un utente autenticato con Supabase
                const { data: { session } } = await supabase.auth.getSession();

                if (session) {
                    // Verifica se l'utente autenticato è l'utente guest
                    const isUserGuest = session.user.id === process.env.REACT_APP_GUEST_USER_ID;

                    console.log('👤 Utente autenticato:', session.user.id);
                    console.log('🔑 ID utente guest:', process.env.REACT_APP_GUEST_USER_ID);
                    console.log('🔍 È l\'utente guest?', isUserGuest);

                    setUser(session.user);
                    setIsGuest(isUserGuest);  // Imposta isGuest in base all'ID
                    setIsAuthenticatedGuest(isUserGuest);  // Imposta anche isAuthenticatedGuest
                } else {
                    // Nessun utente trovato
                    setUser(null);
                    setIsGuest(false);
                    setIsAuthenticatedGuest(false);
                }
            } catch (error) {
                console.error('Errore durante il controllo dell\'autenticazione:', error);
            } finally {
                setLoading(false);
            }
        };

        checkAuth();

        // Configura il listener per i cambiamenti di autenticazione
        const { data: authListener } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                if (session) {
                    // Verifica se l'utente autenticato è l'utente guest
                    const isUserGuest = session.user.id === process.env.REACT_APP_GUEST_USER_ID;

                    console.log('👤 Cambio stato auth - Utente:', session.user.id);
                    console.log('🔍 È l\'utente guest?', isUserGuest);

                    setUser(session.user);
                    setIsGuest(isUserGuest);  // Imposta isGuest in base all'ID
                    setIsAuthenticatedGuest(isUserGuest);  // Imposta anche isAuthenticatedGuest
                } else if (!isGuest) {
                    // Non reimpostare l'utente a null se siamo un ospite
                    // Modifica questa parte per evitare di perdere l'utente ospite
                    const guestUserStr = localStorage.getItem('guestUser');
                    if (!guestUserStr) {
                        setUser(null);
                        setIsGuest(false);
                        setIsAuthenticatedGuest(false);
                    }
                }
            }
        );

        return () => {
            if (authListener) authListener.subscription.unsubscribe();
        };
    }, [authMode]);

    const login = async (email, password) => {
        setLoading(true);
        if (ENABLE_DEBUG_LOGS) {
            console.log('\n=== INIZIO LOGIN ===');
            console.log('Email:', email);
            console.log('Password: [NASCOSTA]');
            console.log('URL Supabase:', supabase.supabaseUrl);
            console.log('Chiave API:', supabase.supabaseKey.substring(0, 10) + '...');
            console.log('Chiamata a supabase.auth.signInWithPassword...');
            console.log('Parametri:', { email, password: '[NASCOSTA]' });
        }

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (ENABLE_DEBUG_LOGS) {
                console.log('Risposta ricevuta:', error ? 'ERRORE' : 'SUCCESSO');
            }

            if (error) {
                console.error('Errore Supabase:', error);
                console.error('Codice errore:', error.code);
                console.error('Messaggio errore:', error.message);
                return { success: false, error: error.message };
            }

            if (ENABLE_DEBUG_LOGS) {
                console.log('Login riuscito:', data);
            }
            setUser(data.user);
            setIsGuest(false);
            return { success: true, data };
        } catch (error) {
            console.error('\n=== ERRORE LOGIN ===');
            console.error('Tipo di errore:', error.constructor.name);
            console.error('Messaggio:', error.message);
            console.error('Stack:', error.stack);
            return { success: false, error: error.message };
        } finally {
            setLoading(false);
        }
    };

    const signup = async (email, password) => {
        setLoading(true);
        if (ENABLE_DEBUG_LOGS) {
            console.log('\n=== INIZIO REGISTRAZIONE ===');
            console.log('Email:', email);
            console.log('Password: [NASCOSTA]');
            console.log('Brand Name:', process.env.REACT_APP_BRAND_NAME);
            console.log('Chiamata a supabase.auth.signUp...');
        }

        try {
            // Verifica che il metodo esista
            if (!supabase.auth.signUp) {
                console.error('ERRORE: Il metodo signUp non esiste!');
                if (ENABLE_DEBUG_LOGS) {
                    console.log('Metodi disponibili:', Object.keys(supabase.auth));
                }
                throw new Error('Metodo di registrazione non disponibile');
            }

            // Esegui la chiamata usando SOLO la variabile d'ambiente
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        email_confirmed: true,
                        display_name: process.env.REACT_APP_BRAND_NAME || ''
                    }
                }
            });

            if (ENABLE_DEBUG_LOGS) {
                console.log('\n=== RISPOSTA REGISTRAZIONE ===');
            }

            if (error) {
                console.error('Errore di registrazione:', error);
                console.error('Codice:', error.code);
                console.error('Messaggio:', error.message);
                console.error('Dettagli:', error.details);
                throw error;
            }

            if (ENABLE_DEBUG_LOGS) {
                console.log('Registrazione riuscita!');
                console.log('Dati completi:', JSON.stringify(data, null, 2));
            }

            // Verifica se l'utente è stato creato correttamente
            if (data.user) {
                if (ENABLE_DEBUG_LOGS) {
                    console.log('Utente creato:', {
                        id: data.user.id,
                        email: data.user.email,
                        role: data.user.role,
                        createdAt: data.user.created_at,
                        identities: data.user.identities ? data.user.identities.length : 0
                    });
                }

                // Verifica se l'email deve essere confermata
                if (data.user.identities && data.user.identities.length === 0) {
                    if (ENABLE_DEBUG_LOGS) {
                        console.log('Email deve essere confermata');
                    }
                    return {
                        success: true,
                        message: 'Controlla la tua email per verificare il tuo account.'
                    };
                }

                setUser(data.user);
                setIsGuest(false);
                if (ENABLE_DEBUG_LOGS) {
                    console.log('=== FINE REGISTRAZIONE ===');
                }
                return { success: true };
            } else {
                console.error('Utente non creato correttamente');
                console.error('Dati ricevuti:', data);
                return { success: false, error: 'Utente non creato correttamente' };
            }
        } catch (error) {
            console.error('\n=== ERRORE REGISTRAZIONE ===');
            console.error('Tipo di errore:', error.constructor.name);
            console.error('Messaggio:', error.message);
            console.error('Stack:', error.stack);
            return { success: false, error: error.message };
        } finally {
            setLoading(false);
        }
    };

    const logout = async () => {
        setLoading(true);
        try {
            if (isGuest && !isAuthenticatedGuest) {
                // Per gli utenti ospiti non autenticati, rimuovi solo i dati locali
                localStorage.removeItem('guestUser');
                setUser(null);
                setIsGuest(false);
                setIsAuthenticatedGuest(false);
            } else {
                // Per gli utenti autenticati (inclusi gli ospiti autenticati), esegui il logout da Supabase
                console.log("Iniziando logout da Supabase...");

                // Pulisci manualmente i dati di autenticazione da localStorage
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key && (
                        key.startsWith('supabase.auth.') ||
                        key.includes('supabase_auth') ||
                        key.includes('sb-')
                    )) {
                        console.log(`Rimozione chiave localStorage: ${key}`);
                        localStorage.removeItem(key);
                    }
                }

                // Esegui il logout da Supabase
                const { error } = await supabase.auth.signOut();
                if (error) {
                    console.error("Errore durante il logout da Supabase:", error);
                } else {
                    console.log("Logout da Supabase completato con successo");
                }

                // Rimuovi i cookie relativi a Supabase
                document.cookie.split(";").forEach(function (c) {
                    if (c.trim().startsWith("sb-")) {
                        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
                        console.log(`Rimosso cookie: ${c.trim()}`);
                    }
                });

                // Aggiorna lo stato
                setUser(null);
                setIsGuest(false);
                setIsAuthenticatedGuest(false);

                // Forza il refresh della pagina
                console.log("Forzando il refresh della pagina...");
                window.location.href = '/login';
            }
        } catch (error) {
            console.error('Errore durante il logout:', error);

            // Anche in caso di errore, tenta di resettare lo stato
            setUser(null);
            setIsGuest(false);
            setIsAuthenticatedGuest(false);

            // Forza comunque il refresh
            window.location.href = '/login';
        } finally {
            setLoading(false);
        }
    };

    const continueAsGuest = async () => {
        try {
            setLoading(true);

            // Controlla se esiste già un ID utente ospite nel localStorage
            let guestId = localStorage.getItem('guestUserId');

            // Se non esiste, genera un nuovo ID
            if (!guestId) {
                guestId = uuidv4();
                localStorage.setItem('guestUserId', guestId);
            }

            // Crea un oggetto utente ospite con una scadenza (24 ore)
            const expiresAt = new Date();
            expiresAt.setHours(expiresAt.getHours() + 24);

            const guestUser = {
                id: guestId,
                isGuest: true,
                createdAt: new Date().toISOString(),
                expiresAt: expiresAt.toISOString(),
            };

            // Salva l'utente ospite nel localStorage
            localStorage.setItem('guestUser', JSON.stringify(guestUser));

            setUser(guestUser);
            setIsGuest(true);
            return { success: true };
        } catch (error) {
            console.error('Errore durante l\'accesso come ospite:', error);
            return { success: false, error: error.message };
        } finally {
            setLoading(false);
        }
    };

    const loginAsGuest = async () => {
        console.log('🔑 Inizio loginAsGuest');
        try {
            // Credenziali dell'utente guest
            const guestEmail = process.env.REACT_APP_GUEST_USER_EMAIL;
            const guestPassword = process.env.REACT_APP_GUEST_USER_PASSWORD;
            console.log('👤 Email guest:', guestEmail);
            console.log('🔒 Password guest disponibile:', !!guestPassword);

            if (!guestEmail || !guestPassword) {
                console.error('❌ Credenziali guest non configurate');
                throw new Error('Credenziali guest non configurate');
            }

            console.log('🔄 Tentativo di login con Supabase...');

            // Usa il client Supabase esistente invece di crearne uno nuovo
            const { data, error } = await supabase.auth.signInWithPassword({
                email: guestEmail,
                password: guestPassword
            });

            if (error) {
                console.error('❌ Errore Supabase:', error);
                throw error;
            }

            console.log('✅ Login Supabase riuscito:', data.user.id);

            // Imposta lo stato come guest autenticato
            setIsGuest(true);
            setIsAuthenticatedGuest(true);
            setUser(data.user);
            console.log('👤 Utente impostato come guest autenticato');

            return true;
        } catch (error) {
            console.error('❌ Errore durante l\'autenticazione come guest:', error);
            return false;
        }
    };

    // Aggiungi una funzione per diagnosticare problemi di sessione
    const checkSession = async () => {
        const { data, error } = await supabase.auth.getSession();
        console.log('📋 Controllo sessione:', {
            sessionPresente: !!data?.session,
            accessToken: data?.session?.access_token ? 'Presente' : 'Assente',
            expiresAt: data?.session?.expires_at ? new Date(data.session.expires_at * 1000).toLocaleString() : 'N/A',
            error: error?.message
        });
        return data?.session;
    };

    const value = {
        user,
        loading,
        isGuest,
        isAuthenticatedGuest,
        login,
        signup,
        logout,
        continueAsGuest,
        authMode,
        loginAsGuest,
        checkSession
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}; 