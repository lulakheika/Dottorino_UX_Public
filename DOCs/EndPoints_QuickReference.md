Riepilogo Endpoints

POST /topic - Crea o recupera un topic
    client_id: Header (X-Client-ID)
    user_id: Header (X-User-ID)
    is_guest: Header (X-Is-Guest)
    topic_suffix: Header (X-Topic-Suffix)
POST /chat - Invia un messaggio al topic
    request: Body (MessageRequest)
    topic_id: Cookie
    client_id: Header (X-Client-ID)
    user_id: Header (X-User-ID)
    is_guest: Header (X-Is-Guest)
GET /history - Recupera la cronologia dei messaggi
    topic_id: Query parameter
    client_id: Header (X-Client-ID)
    user_id: Header (X-User-ID)
    is_guest: Header (X-Is-Guest)
GET /topic/byowner - Recupera i topic di un utente
    client_id: Header (X-Client-ID)
    user_id: Header (X-User-ID)
    is_guest: Header (X-Is-Guest)
