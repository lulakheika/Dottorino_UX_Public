// Utility per il logging sequenziale degli eventi
let eventCounter = 0;
let isEnabled = false;  // Disabilitato di default

// Funzione principale di logging
export const logEvent = (component, description) => {
    if (!isEnabled) return null;

    const counter = ++eventCounter;
    console.log(`[${counter}] ${component} - ${description}`);
    return counter;
};

// Funzioni per controllare il logger
export const enableSequentialLogging = () => {
    isEnabled = true;
    console.log("Logger sequenziale abilitato");
    eventCounter = 0;  // Reset del contatore quando viene abilitato
};

export const disableSequentialLogging = () => {
    isEnabled = false;
    console.log("Logger sequenziale disabilitato");
};

// Attiva/disattiva il logger in base a un parametro
export const toggleSequentialLogging = (enabled) => {
    if (enabled) {
        enableSequentialLogging();
    } else {
        disableSequentialLogging();
    }
};

// Funzione per resettare il contatore
export const resetCounter = () => {
    eventCounter = 0;
    console.log("Contatore eventi resettato");
};

// Funzione di logging semplificata (usa la stessa formattazione senza numeri sequenziali)
export const log = (component, description) => {
    console.log(`${component} - ${description}`);
}; 