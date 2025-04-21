// Elementi DOM
const logOutput = document.getElementById('logOutput');
const clearLogBtn = document.getElementById('clearLog');
const saveConfigBtn = document.getElementById('saveConfig');
const copyLogBtn = document.getElementById('copyLog');
const curlBox = document.getElementById('curlBox');
const copyCurlBtn = document.getElementById('copyCurl');

// Elementi di configurazione
const supabaseUrlInput = document.getElementById('supabaseUrl');
const supabaseKeyInput = document.getElementById('supabaseKey');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');

// Pulsanti di test
const testLatencyBtn = document.getElementById('testLatency');
const testHealthBtn = document.getElementById('testHealth');
const testCorsBtn = document.getElementById('testCors');
const testFetchLoginBtn = document.getElementById('testFetchLogin');
const testAxiosLoginBtn = document.getElementById('testAxiosLogin');
const testSupabaseLoginBtn = document.getElementById('testSupabaseLogin');
const testSessionBtn = document.getElementById('testSession');
const testUserInfoBtn = document.getElementById('testUserInfo');
const testLogoutBtn = document.getElementById('testLogout');

// Variabili di configurazione
let supabaseUrl = supabaseUrlInput.value;
let supabaseKey = supabaseKeyInput.value;
let email = emailInput.value;
let password = passwordInput.value;
let supabaseClient = null;
let currentSession = null;

// Funzioni di utilità
function log(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const entry = document.createElement('div');
    entry.className = `mb-2 ${type === 'error' ? 'text-red-600' : type === 'success' ? 'text-green-600' : ''}`;
    entry.innerHTML = `<span class="text-gray-500">[${timestamp}]</span> ${message}`;
    logOutput.appendChild(entry);
    logOutput.scrollTop = logOutput.scrollHeight;
}

function logObject(obj, label = '') {
    if (label) {
        log(`${label}:`);
    }
    log(`<pre>${JSON.stringify(obj, null, 2)}</pre>`);
}

function clearLog() {
    logOutput.innerHTML = '';
}

function copyLog() {
    const logText = logOutput.innerText;
    navigator.clipboard.writeText(logText)
        .then(() => {
            log('Log copiato negli appunti!', 'success');
        })
        .catch(err => {
            log('Errore durante la copia: ' + err.message, 'error');
        });
}

function saveConfig() {
    supabaseUrl = supabaseUrlInput.value;
    supabaseKey = supabaseKeyInput.value;
    email = emailInput.value;
    password = passwordInput.value;

    // Inizializza il client Supabase
    try {
        supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);
        log('Configurazione salvata e client Supabase inizializzato', 'success');
    } catch (error) {
        log(`Errore nell'inizializzazione del client Supabase: ${error.message}`, 'error');
    }
}

function setCurlCommand(command) {
    curlBox.textContent = command;
}

function clearCurlCommand() {
    curlBox.textContent = "Nessun comando CURL generato";
}

// Handler per copiare il comando curl
copyCurlBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(curlBox.textContent)
        .then(() => {
            log('Comando CURL copiato negli appunti!', 'success');
        })
        .catch(err => {
            log('Errore durante la copia: ' + err.message, 'error');
        });
});

// Test di base
async function testLatency() {
    log('Test 1: Verifica latenza server...');

    const endpoint = `${supabaseUrl}/auth/v1/health`;

    // Costruisci il comando curl equivalente
    const curlCommand = `curl -w "\\n\\nConnessione: %{time_connect} sec\\nTempo totale: %{time_total} sec\\nVelocità: %{speed_download} bytes/sec" -o /dev/null -s -X GET "${endpoint}" \\
  -H "apikey: ${supabaseKey}"`;

    setCurlCommand(curlCommand);

    try {
        log('Effettuando 3 richieste per misurare la latenza media...');

        const times = [];
        for (let i = 0; i < 3; i++) {
            const startTime = performance.now();

            const response = await fetch(endpoint, {
                headers: {
                    'apikey': supabaseKey
                }
            });

            const endTime = performance.now();
            const latency = endTime - startTime;
            times.push(latency);

            log(`Richiesta ${i + 1}: ${latency.toFixed(2)} ms`);

            // Breve attesa tra le richieste
            if (i < 2) {
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }

        // Calcola la media e mostra i risultati
        const avgLatency = times.reduce((a, b) => a + b, 0) / times.length;
        const minLatency = Math.min(...times);
        const maxLatency = Math.max(...times);

        log(`Latenza minima: ${minLatency.toFixed(2)} ms`, minLatency > 1000 ? 'error' : 'success');
        log(`Latenza media: ${avgLatency.toFixed(2)} ms`, avgLatency > 1000 ? 'error' : 'success');
        log(`Latenza massima: ${maxLatency.toFixed(2)} ms`, maxLatency > 1000 ? 'error' : 'success');

        if (avgLatency < 300) {
            log('Connessione ottima! ⚡', 'success');
        } else if (avgLatency < 800) {
            log('Connessione buona 👍', 'success');
        } else if (avgLatency < 1500) {
            log('Connessione accettabile 🧐', 'info');
        } else {
            log('Connessione lenta ⚠️', 'error');
        }
    } catch (error) {
        log(`Errore: ${error.message}`, 'error');
    }
}

async function testHealth() {
    log('Test 2: Verifica health...');

    const endpoint = `${supabaseUrl}/auth/v1/health`;
    const curlCommand = `curl -X GET "${endpoint}" \\
  -H "apikey: ${supabaseKey}"`;

    setCurlCommand(curlCommand);

    try {
        const response = await fetch(endpoint, {
            headers: {
                'apikey': supabaseKey
            }
        });
        const data = await response.json();
        logObject(data, 'Risposta health');
        log('Health check completato', 'success');
    } catch (error) {
        log(`Errore: ${error.message}`, 'error');
    }
}

async function testCors() {
    log('Test 3: Verifica CORS...');

    const endpoint = `${supabaseUrl}/auth/v1/health`;
    const curlCommand = `curl -X OPTIONS "${endpoint}" \\
  -H "Origin: ${window.location.origin}" \\
  -H "Access-Control-Request-Method: GET" \\
  -H "Access-Control-Request-Headers: Content-Type, apikey" \\
  -H "apikey: ${supabaseKey}" \\
  -v`;

    setCurlCommand(curlCommand);

    try {
        const response = await fetch(endpoint, {
            method: 'OPTIONS',
            headers: {
                'Origin': window.location.origin,
                'Access-Control-Request-Method': 'GET',
                'Access-Control-Request-Headers': 'Content-Type, apikey',
                'apikey': supabaseKey
            }
        });

        log(`Status: ${response.status}`);
        log(`Headers CORS:`);

        const corsHeaders = [
            'Access-Control-Allow-Origin',
            'Access-Control-Allow-Methods',
            'Access-Control-Allow-Headers',
            'Access-Control-Allow-Credentials',
            'Access-Control-Max-Age'
        ];

        corsHeaders.forEach(header => {
            const value = response.headers.get(header);
            log(`${header}: ${value || 'non presente'}`);
        });

        if (response.headers.get('Access-Control-Allow-Origin')) {
            log('CORS configurato correttamente', 'success');
        } else {
            log('CORS non configurato correttamente', 'error');
        }
    } catch (error) {
        log(`Errore: ${error.message}`, 'error');
    }
}

// Test di autenticazione
async function testFetchLogin() {
    log('Test 4: Login con Fetch...');
    try {
        const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': supabaseKey
            },
            body: JSON.stringify({
                email,
                password
            })
        });

        log(`Status: ${response.status}`);

        const data = await response.json();

        if (response.ok) {
            logObject(data, 'Risposta login');
            log('Login con Fetch riuscito', 'success');
            currentSession = data;
        } else {
            logObject(data, 'Errore login');
            log('Login con Fetch fallito', 'error');
        }
    } catch (error) {
        log(`Errore: ${error.message}`, 'error');
    }
}

async function testAxiosLogin() {
    log('Test 5: Login con Axios...');
    try {
        const response = await axios({
            method: 'post',
            url: `${supabaseUrl}/auth/v1/token?grant_type=password`,
            headers: {
                'Content-Type': 'application/json',
                'apikey': supabaseKey
            },
            data: {
                email,
                password
            }
        });

        log(`Status: ${response.status}`);
        logObject(response.data, 'Risposta login');
        log('Login con Axios riuscito', 'success');
        currentSession = response.data;
    } catch (error) {
        log(`Status: ${error.response?.status || 'N/A'}`);
        logObject(error.response?.data || error.message, 'Errore login');
        log('Login con Axios fallito', 'error');
    }
}

async function testSupabaseLogin() {
    log('Test 6: Login con Supabase.js...');

    if (!supabaseClient) {
        log('Client Supabase non inizializzato. Salva la configurazione prima.', 'error');
        return;
    }

    try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            logObject(error, 'Errore login');
            log('Login con Supabase.js fallito', 'error');
        } else {
            logObject(data, 'Risposta login');
            log('Login con Supabase.js riuscito', 'success');
            currentSession = data;
        }
    } catch (error) {
        log(`Errore: ${error.message}`, 'error');
    }
}

// Test avanzati
async function testSession() {
    log('Test 7: Verifica sessione...');

    if (!currentSession) {
        log('Nessuna sessione attiva. Effettua prima il login.', 'error');
        return;
    }

    try {
        const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
            headers: {
                'Authorization': `Bearer ${currentSession.access_token || currentSession.session?.access_token}`,
                'apikey': supabaseKey
            }
        });

        log(`Status: ${response.status}`);

        const data = await response.json();

        if (response.ok) {
            logObject(data, 'Dati sessione');
            log('Sessione valida', 'success');
        } else {
            logObject(data, 'Errore sessione');
            log('Sessione non valida', 'error');
        }
    } catch (error) {
        log(`Errore: ${error.message}`, 'error');
    }
}

async function testUserInfo() {
    log('Test 8: Info utente...');

    if (!supabaseClient) {
        log('Client Supabase non inizializzato. Salva la configurazione prima.', 'error');
        return;
    }

    try {
        const { data, error } = await supabaseClient.auth.getUser();

        if (error) {
            logObject(error, 'Errore info utente');
            log('Recupero info utente fallito', 'error');
        } else {
            logObject(data, 'Info utente');
            log('Recupero info utente riuscito', 'success');
        }
    } catch (error) {
        log(`Errore: ${error.message}`, 'error');
    }
}

async function testLogout() {
    log('Test 9: Logout...');

    if (!supabaseClient) {
        log('Client Supabase non inizializzato. Salva la configurazione prima.', 'error');
        return;
    }

    try {
        const { error } = await supabaseClient.auth.signOut();

        if (error) {
            logObject(error, 'Errore logout');
            log('Logout fallito', 'error');
        } else {
            log('Logout riuscito', 'success');
            currentSession = null;
        }
    } catch (error) {
        log(`Errore: ${error.message}`, 'error');
    }
}

// Event listeners
clearLogBtn.addEventListener('click', clearLog);
saveConfigBtn.addEventListener('click', saveConfig);
copyLogBtn.addEventListener('click', copyLog);

testLatencyBtn.addEventListener('click', testLatency);
testHealthBtn.addEventListener('click', testHealth);
testCorsBtn.addEventListener('click', testCors);
testFetchLoginBtn.addEventListener('click', testFetchLogin);
testAxiosLoginBtn.addEventListener('click', testAxiosLogin);
testSupabaseLoginBtn.addEventListener('click', testSupabaseLogin);
testSessionBtn.addEventListener('click', testSession);
testUserInfoBtn.addEventListener('click', testUserInfo);
testLogoutBtn.addEventListener('click', testLogout);

// Inizializzazione
saveConfig();
clearCurlCommand();
log('Interfaccia di debug inizializzata');
log('Clicca sui pulsanti per eseguire i test');