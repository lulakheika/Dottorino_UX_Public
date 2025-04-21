import { supabase } from '../supabase/client';

// Ottieni tutte le chat dell'utente
export async function getUserChats() {
    const { data, error } = await supabase
        .from('chats')
        .select('*')
        .order('updated_at', { ascending: false });

    if (error) throw error;
    return data;
}

// Crea una nuova chat
export async function createChat(title) {
    const { data, error } = await supabase
        .from('chats')
        .insert([{ title }])
        .select();

    if (error) throw error;
    return data[0];
}

// Ottieni i messaggi di una chat
export async function getChatMessages(chatId) {
    const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true });

    if (error) throw error;
    return data;
}

// Aggiungi un messaggio a una chat
export async function addMessage(chatId, content, role) {
    const { data, error } = await supabase
        .from('messages')
        .insert([{ chat_id: chatId, content, role }])
        .select();

    if (error) throw error;
    return data[0];
} 