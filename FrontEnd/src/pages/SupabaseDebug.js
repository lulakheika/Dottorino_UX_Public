import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase/client';
import { createClient } from '@supabase/supabase-js';

const SupabaseDebug = () => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [connectionStatus, setConnectionStatus] = useState('Non verificato');
    const [supabaseInfo, setSupabaseInfo] = useState({});

    // Carica gli elementi esistenti
    const fetchItems = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('test_items')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setItems(data || []);
        } catch (error) {
            console.error('Errore nel caricamento degli elementi:', error);
            setMessage(`Errore: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    // Inserisci un nuovo elemento
    const insertItem = async () => {
        try {
            setLoading(true);
            setMessage('');

            if (!name.trim()) {
                setMessage('Il nome è obbligatorio');
                return;
            }

            const { data, error } = await supabase
                .from('test_items')
                .insert([{ name, description }])
                .select();

            if (error) throw error;

            setMessage('Elemento inserito con successo!');
            setName('');
            setDescription('');

            // Ricarica gli elementi
            fetchItems();
        } catch (error) {
            console.error('Errore nell\'inserimento:', error);
            setMessage(`Errore: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    // Verifica la connessione a Supabase
    const checkConnection = async () => {
        try {
            setLoading(true);
            setMessage('');

            // Verifica le variabili d'ambiente
            const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'http://localhost:8001';
            const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlLWRlbW8iLCJpYXQiOjE2NDE3NjkyMDAsImV4cCI6MTc5OTUzNTYwMH0.T2tbdl58_rRYPrVJ8NXUptk8sgl_qgLC9k28dRpaMt0';

            setSupabaseInfo({
                url: supabaseUrl,
                keyLength: supabaseAnonKey ? supabaseAnonKey.length : 0,
                keyValue: supabaseAnonKey || 'N/A'
            });

            // Prova una query semplice sulla tabella
            const { data, error } = await supabase
                .from('test_items')
                .select('*')
                .limit(5);

            if (error) {
                throw error;
            } else {
                setConnectionStatus(`Connesso alla tabella test_items. Numero di record: ${data.length}`);
            }
        } catch (error) {
            console.error('Errore nella verifica della connessione:', error);
            setConnectionStatus(`Errore: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    // Aggiungi questa funzione alla pagina di debug
    const testDirectFetch = async () => {
        try {
            setLoading(true);
            setMessage('');

            const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'http://localhost:8001';
            const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlLWRlbW8iLCJpYXQiOjE2NDE3NjkyMDAsImV4cCI6MTc5OTUzNTYwMH0.T2tbdl58_rRYPrVJ8NXUptk8sgl_qgLC9k28dRpaMt0';

            // Costruisci l'URL per la chiamata RPC diretta
            const rpcUrl = `${supabaseUrl}/rest/v1/rpc/hello_world`;

            const response = await fetch(rpcUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': supabaseAnonKey,
                    'Authorization': `Bearer ${supabaseAnonKey}`
                }
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Errore HTTP: ${response.status} - ${errorText}`);
            }

            const data = await response.json();
            setConnectionStatus(`Fetch diretto riuscito! Risposta: ${JSON.stringify(data)}`);
        } catch (error) {
            console.error('Errore nel fetch diretto:', error);
            setConnectionStatus(`Errore nel fetch diretto: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    // Aggiungi questa funzione per testare il client Supabase
    const testSupabaseClient = async () => {
        try {
            setLoading(true);
            setMessage('');

            // Test di connettività di base con il client Supabase
            const { data, error } = await supabase
                .from('test_items')
                .select('*')
                .limit(5);

            if (error) {
                throw error;
            }

            setConnectionStatus(`Client Supabase funzionante! Numero di record: ${data.length}`);
            console.log('Dati recuperati:', data);
        } catch (error) {
            console.error('Errore nel test del client Supabase:', error);
            setConnectionStatus(`Errore nel client Supabase: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    // Modifica temporanea per il test
    const testWithServiceRole = async () => {
        try {
            setLoading(true);
            setMessage('');

            // Usa la chiave SERVICE_ROLE hardcoded
            const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UtZGVtbyIsImlhdCI6MTY0MTc2OTIwMCwiZXhwIjoxNzk5NTM1NjAwfQ.QYhSBawC8O-gPZtYb87RClDbsfbDHI0VF7vNkmlP9yw';
            const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'http://localhost:8001';

            // Crea un client temporaneo con la chiave SERVICE_ROLE
            const tempClient = createClient(supabaseUrl, serviceRoleKey);

            // Prova una query semplice sulla tabella
            const { data, error } = await tempClient
                .from('test_items')
                .select('*')
                .limit(5);

            if (error) {
                throw error;
            } else {
                setConnectionStatus(`Test con SERVICE_ROLE riuscito. Numero di record: ${data.length}`);
                console.log('Dati recuperati con SERVICE_ROLE:', data);
            }
        } catch (error) {
            console.error('Errore nel test con SERVICE_ROLE:', error);
            setConnectionStatus(`Errore con SERVICE_ROLE: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    // Carica gli elementi all'avvio
    useEffect(() => {
        fetchItems();
    }, []);

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-2xl font-bold mb-4">Debug Supabase</h1>

            {/* Sezione di verifica connessione */}
            <div className="bg-white p-4 rounded shadow mb-6">
                <h2 className="text-xl font-semibold mb-3">Verifica Connessione Supabase</h2>

                <div className="mb-3">
                    <p><strong>Stato connessione:</strong>
                        <span className={`ml-2 ${connectionStatus.includes('Errore')
                            ? 'text-red-600'
                            : connectionStatus.includes('Connesso')
                                ? 'text-green-600'
                                : 'text-gray-600'
                            }`}>
                            {connectionStatus}
                        </span>
                    </p>
                </div>

                <div className="mb-3">
                    <p><strong>URL Supabase:</strong> <span className="ml-2">{supabaseInfo.url || 'Non disponibile'}</span></p>
                    <p><strong>Lunghezza chiave:</strong> <span className="ml-2">{supabaseInfo.keyLength || 'N/A'}</span></p>
                    <p><strong>Chiave completa:</strong> <span className="ml-2 break-all font-mono text-xs">{supabaseInfo.keyValue || 'N/A'}</span></p>
                </div>

                <button
                    onClick={checkConnection}
                    disabled={loading}
                    className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
                >
                    {loading ? 'Verifica in corso...' : 'Verifica Connessione'}
                </button>
            </div>

            {/* Form di inserimento */}
            <div className="bg-white p-4 rounded shadow mb-6">
                <h2 className="text-xl font-semibold mb-3">Inserisci nuovo elemento</h2>

                <div className="mb-3">
                    <label className="block mb-1">Nome*:</label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full p-2 border rounded"
                        placeholder="Inserisci un nome"
                    />
                </div>

                <div className="mb-3">
                    <label className="block mb-1">Descrizione:</label>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full p-2 border rounded"
                        placeholder="Inserisci una descrizione"
                        rows="3"
                    />
                </div>

                <button
                    onClick={insertItem}
                    disabled={loading}
                    className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
                >
                    {loading ? 'Inserimento in corso...' : 'Inserisci'}
                </button>

                {message && (
                    <div className={`mt-3 p-2 rounded ${message.includes('Errore') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                        {message}
                    </div>
                )}
            </div>

            {/* Lista elementi */}
            <div className="bg-white p-4 rounded shadow">
                <h2 className="text-xl font-semibold mb-3">Elementi inseriti</h2>

                {loading && <p>Caricamento in corso...</p>}

                {!loading && items.length === 0 && (
                    <p className="text-gray-500">Nessun elemento trovato</p>
                )}

                {items.length > 0 && (
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="bg-gray-100">
                                <th className="border p-2 text-left">ID</th>
                                <th className="border p-2 text-left">Nome</th>
                                <th className="border p-2 text-left">Descrizione</th>
                                <th className="border p-2 text-left">Data creazione</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((item) => (
                                <tr key={item.id} className="hover:bg-gray-50">
                                    <td className="border p-2">{item.id}</td>
                                    <td className="border p-2">{item.name}</td>
                                    <td className="border p-2">{item.description || '-'}</td>
                                    <td className="border p-2">
                                        {new Date(item.created_at).toLocaleString('it-IT')}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}

                <button
                    onClick={fetchItems}
                    className="mt-4 bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                >
                    Aggiorna lista
                </button>
            </div>

            {/* Aggiungi un pulsante per questa funzione nella UI */}
            <button
                onClick={testDirectFetch}
                disabled={loading}
                className="ml-2 bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:opacity-50"
            >
                {loading ? 'Test in corso...' : 'Test Fetch Diretto'}
            </button>

            {/* Aggiungi un pulsante per questa funzione */}
            <button
                onClick={testSupabaseClient}
                disabled={loading}
                className="ml-2 bg-indigo-500 text-white px-4 py-2 rounded hover:bg-indigo-600 disabled:opacity-50"
            >
                {loading ? 'Test in corso...' : 'Test Client Supabase'}
            </button>

            {/* Aggiungi un pulsante per questa funzione */}
            <button
                onClick={testWithServiceRole}
                disabled={loading}
                className="ml-2 bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600 disabled:opacity-50"
            >
                {loading ? 'Test in corso...' : 'Test con SERVICE_ROLE'}
            </button>
        </div>
    );
};

export default SupabaseDebug; 