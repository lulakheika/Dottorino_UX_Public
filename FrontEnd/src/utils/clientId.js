/**
 * Retrieves the client ID from localStorage or generates a new one if it doesn't exist.
 * @returns {string} The client ID.
 */
export const getClientId = () => {
    let clientId = localStorage.getItem('clientId');
    if (!clientId) {
        // Use crypto.randomUUID() if available (modern browsers), fallback for older environments
        clientId = typeof crypto !== 'undefined' && crypto.randomUUID
            ? 'client_' + crypto.randomUUID()
            : 'client_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
        console.log("Generato nuovo client ID:", clientId);
        localStorage.setItem('clientId', clientId);
    } else {
        // console.log("Riutilizzo client ID esistente:", clientId); // Optional: less verbose logging
    }
    return clientId;
}; 