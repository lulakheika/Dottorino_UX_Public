/**
 * Modulo per la gestione dinamica degli URL in diversi ambienti
 */

/**
 * Determina l'URL dinamicamente in base all'ambiente e al servizio richiesto
 * @param {string} serviceType - Tipo di servizio ('api' o 'supabase')
 * @param {boolean} includePath - Se includere il path finale ('/api' per il backend)
 * @returns {string} URL appropriato per l'ambiente
 */
export const getDynamicServiceUrl = (serviceType, includePath = true) => {
    // Verifico che serviceType sia stato fornito
    if (!serviceType) {
        console.error('serviceType è obbligatorio. Specificare "api" o "supabase"');
        throw new Error('serviceType è un parametro obbligatorio');
    }

    // Configurazione di default per ciascun servizio
    const serviceConfig = {
        'api': {
            port: 8000,
            path: includePath ? '/api' : '',
            envVar: process.env.REACT_APP_API_BASE_URL,
            defaultUrl: 'http://localhost:8000'
        },
        'supabase': {
            port: 8001,
            path: '',
            envVar: process.env.REACT_APP_SUPABASE_URL,
            defaultUrl: 'http://localhost:8001'
        }
    };

    // Verifica che il tipo di servizio sia valido
    if (!serviceConfig[serviceType]) {
        console.error(`Tipo di servizio '${serviceType}' non supportato`);
        return serviceConfig['api'].defaultUrl;
    }

    const config = serviceConfig[serviceType];

    // Se siamo in un browser, usa il dominio corrente invece di localhost
    if (typeof window !== 'undefined') {
        const currentDomain = window.location.hostname;

        // Se è localhost, usa la configurazione locale
        if (currentDomain === 'localhost' || currentDomain === '127.0.0.1') {
            // CORREZIONE: verifico se siamo in ambiente Docker o se il backend è accessibile direttamente
            // In Docker, l'API potrebbe essere accessibile tramite il nome del servizio o host.docker.internal
            if (serviceType === 'api') {
                // Verifica se REACT_APP_API_BASE_URL è impostato
                if (config.envVar) {
                    return `${config.envVar}${config.path}`;
                }
                // Altrimenti, assicurati che l'URL sia corretto per l'accesso locale
                return `${config.defaultUrl}${config.path}`;
            } else {
                return config.envVar || config.defaultUrl;
            }
        }

        // Controlla se è un indirizzo IP (contiene solo numeri e punti)
        const isIpAddress = /^[0-9.]+$/.test(currentDomain);

        if (isIpAddress) {
            // Se è un indirizzo IP, usa la porta appropriata con lo stesso IP
            return `http://${currentDomain}:${config.port}${config.path}`;
        } else {
            // È un nome di dominio, procedi con la logica del sottodominio
            const domainParts = currentDomain.split('.');

            // Se abbiamo già un sottodominio (es. dottorino.pcok.it)
            if (domainParts.length >= 3) {
                // Sostituisci il primo sottodominio con il tipo di servizio
                domainParts[0] = serviceType;
                return `https://${domainParts.join('.')}${config.path}`;
            } else {
                // Aggiungi il tipo di servizio come sottodominio
                return `https://${serviceType}.${currentDomain}${config.path}`;
            }
        }
    }

    // Altrimenti usa l'URL configurato nelle variabili d'ambiente
    return `${config.envVar || config.defaultUrl}${config.path}`;
}; 