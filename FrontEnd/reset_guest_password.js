#!/usr/bin/env node

/**
 * Script per reimpostare la password dell'utente guest in Supabase
 * 
 * Uso: 
 *   node reset_guest_password.js [nuova_password]
 * 
 * Se non viene fornita una password, verrà utilizzata "12345678" come default
 */

const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Carica le variabili d'ambiente
try {
    // Prova a caricare il file .env dalla cartella Supabase
    const envPath = path.resolve(__dirname, 'Supbase', '.env');
    if (fs.existsSync(envPath)) {
        dotenv.config({ path: envPath });
        console.log('✅ Configurazione caricata da Supbase/.env');
    } else {
        // Altrimenti, carica dalla directory corrente
        dotenv.config();
        console.log('✅ Configurazione caricata da .env');
    }
} catch (error) {
    console.warn('⚠️ Impossibile caricare il file .env:', error.message);
}

// Parametri di configurazione - prima da argomenti cli, poi da env, infine default
const SUPABASE_URL = 'http://supabase-kong:8000';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SERVICE_ROLE_KEY || process.env.REACT_APP_SUPABASE_SERVICE_KEY;
const GUEST_EMAIL = process.env.GUEST_EMAIL || process.env.REACT_APP_GUEST_USER_EMAIL || 'guest@dottorino.com';
const DEFAULT_PASSWORD = '12345678';

// Ottieni la nuova password dagli argomenti della riga di comando
const newPassword = process.argv[2] || DEFAULT_PASSWORD;

// Controlla se mancano parametri essenziali
if (!SUPABASE_SERVICE_KEY) {
    console.error('❌ Errore: SERVICE_ROLE_KEY non trovata!');
    console.log('Assicurati di avere una delle seguenti variabili d\'ambiente:');
    console.log('  - SUPABASE_SERVICE_KEY');
    console.log('  - SERVICE_ROLE_KEY');
    console.log('  - REACT_APP_SUPABASE_SERVICE_KEY');
    process.exit(1);
}

// Feedback sulla configurazione
console.log('🔧 Configurazione:');
console.log(`  URL Supabase: ${SUPABASE_URL}`);
console.log(`  Email utente: ${GUEST_EMAIL}`);
console.log(`  Chiave servizio: ${SUPABASE_SERVICE_KEY.substring(0, 10)}...`);
console.log(`  Nuova password: ${newPassword}`);

// Crea il client Supabase con la chiave di servizio
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function resetGuestPassword() {
    try {
        console.log(`\n🔑 Reimpostazione password per l'utente: ${GUEST_EMAIL}`);

        // Utilizziamo l'API admin per aggiornare la password
        const { data, error } = await supabase.auth.admin.updateUserById(
            process.env.REACT_APP_GUEST_USER_ID, // Se disponibile, altrimenti null
            { password: newPassword }
        );

        if (error) {
            // Se fallisce con l'ID, proviamo con la email
            console.log('⚠️ Metodo con ID non riuscito, tentativo con email...');

            const { data: userData, error: userError } = await supabase.auth.admin.listUsers();

            if (userError) {
                throw userError;
            }

            const guestUser = userData.users.find(user => user.email === GUEST_EMAIL);

            if (!guestUser) {
                throw new Error(`Utente con email ${GUEST_EMAIL} non trovato!`);
            }

            console.log(`✅ Utente trovato con ID: ${guestUser.id}`);

            const { data: updateData, error: updateError } = await supabase.auth.admin.updateUserById(
                guestUser.id,
                { password: newPassword }
            );

            if (updateError) {
                throw updateError;
            }

            console.log('✅ Password aggiornata con successo!');
            return;
        }

        console.log('✅ Password aggiornata con successo!');
    } catch (error) {
        console.error('❌ Errore durante l\'aggiornamento della password:', error.message);

        if (error.message.includes('404') || error.message.includes('not found')) {
            console.log('\n💡 Suggerimenti:');
            console.log('1. Verifica che l\'utente guest esista effettivamente');
            console.log('2. Controlla che l\'URL di Supabase sia corretto');
            console.log('3. Assicurati che la SERVICE_ROLE_KEY sia valida');
        }

        process.exit(1);
    }
}

// Esegui la funzione principale
resetGuestPassword(); 