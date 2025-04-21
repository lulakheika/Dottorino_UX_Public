# Strategia di azione

# Switch tra trieve e supabase
## 1 - Voglio poter popolare la finestra di chat o come avviene adesso (cioè da trieve) oppure attraverso supabase (dopo che avrò creato le tabelle) e voglio decidere cosa la chat sta visualizzando, sulla base di uno switch che volgio sull'header della chat. Quindi se switcho su trieve, la chat visualizzerà come sta facendo adesso, la history di trieve, altrimenti, se switcho su supabase visualizzerà la history di supabase (se presente, se già implementata ecc...)

# Sidebar conversazioni
## 2 - Voglio poter mettere le conversazioni nella sidebar, in modo che la chat visualizzera la conversazione selezionata nella sidebar. la sidebar dovrà visualizzare la lista delle conversazioni, pronte da selezionare, se esistenti. Questa funzionalità inizialmente sarà specifica di supabase, infatti, quando saremo in modalità trieve, dovrà al momento visualizzare solo una dummy list come sta già facendo adesso.

# Chat history
## 3 - Il sistema funziona grazie alle API di trieve, nel senso che trieve è il nostro rag che interroghiamo. Quindi in ogni caso noi facciamo chiamate a trieve, ciò che implementeremo è che ad ogni invio di messaggio devo salvare il messaggio nel supabase, appena arriva la risposta, salvo la risposta nel supabase. ovviamente ogni messaggio apparterrà ad una conversazione, ad un utente ed avrà un timestamp e/o una sequenzialità. in questo modo quando caricherò la chat history di supabase per un dato utente per una data conversazione, la chat mi si popolerà con la sua history.

# Context Memory
## 4 - Alla fine ci occuperemo della logica di context memory, facendo riassunti dei messaggi più vecchi al raggiungimento di un threshold di messaggi, e stabiliremo quanto e cosa inviare al modelllo linguistico e/o a trieve per avere memoria di contesto durante una conversazione

# Note Importanti
## L'obiettivo è andare coi piedi di piombo, implementare una cosa alla volta, man mano che io te lo dico, non metterti a sparare a zero sul codice, che ha una sua delicatezza, devo assorbirlo e digerirlo ad ogni modifica.

