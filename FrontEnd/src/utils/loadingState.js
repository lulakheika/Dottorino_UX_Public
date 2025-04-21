// Nuovo file di utilità per gestire lo stato globale dei caricamenti
const loadingState = {
    loadedConversations: new Set(),
    initializedComponents: new Set(),
    operationsInProgress: new Set(),
    isAppMounted: false,

    // Aggiungiamo funzioni per tracciare operazioni in corso
    markOperationStarted(operationKey) {
        this.operationsInProgress.add(operationKey);
        console.log(`⚙️ Operazione iniziata: ${operationKey}`);
        return true;
    },

    markOperationCompleted(operationKey) {
        const result = this.operationsInProgress.delete(operationKey);
        console.log(`✅ Operazione completata: ${operationKey}`);
        return result;
    },

    isOperationInProgress(operationKey) {
        return this.operationsInProgress.has(operationKey);
    },

    // Aggiungiamo anche una funzione per resettare operazioni in stallo
    resetStaleOperations() {
        console.log(`🔄 Reset delle operazioni in stallo. Operazioni presenti: ${this.operationsInProgress.size}`);
        this.operationsInProgress.clear();
    },

    // Funzioni per il controllo dello stato
    markConversationLoaded(conversationId) {
        this.loadedConversations.add(conversationId);
        return this.loadedConversations.has(conversationId);
    },

    isConversationLoaded(conversationId) {
        return this.loadedConversations.has(conversationId);
    },

    markComponentInitialized(componentName) {
        this.initializedComponents.add(componentName);
        return this.initializedComponents.has(componentName);
    },

    isComponentInitialized(componentName) {
        return this.initializedComponents.has(componentName);
    },

    setAppMounted(isMounted) {
        this.isAppMounted = isMounted;
    },

    // Aggiungiamo questa funzione
    forceReloadConversation(conversationId) {
        // Rimuove la conversazione dalle conversazioni caricate, forzando un nuovo caricamento
        this.loadedConversations.delete(conversationId);
        this.loadedConversations.delete(conversationId + '_loaded');
        console.log(`🔄 Forzato ricaricamento per conversazione: ${conversationId}`);
    },

    resetOperation(operationKey) {
        const wasInProgress = this.operationsInProgress.delete(operationKey);
        console.log(`🔄 Reset operazione: ${operationKey} (era in corso: ${wasInProgress})`);
        return wasInProgress;
    }
};

export default loadingState; 