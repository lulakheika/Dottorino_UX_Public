import React, { useState } from 'react';
import { supabase } from '../supabase/client';

const SupabaseDebugAlt = () => {
    const [result, setResult] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const testConnection = async () => {
        setLoading(true);
        setError('');
        setResult('');

        try {
            // Usa il client standard ma con un header custom
            const { data, error: queryError } = await supabase
                .from('test_items')
                .select('*')
                .limit(5)
                .headers({
                    // Passa un header che richiede autorizzazioni elevate
                    'Authorization': `Bearer ${process.env.REACT_APP_SUPABASE_SERVICE_KEY}`
                });

            if (queryError) {
                throw new Error(`Errore nella query: ${queryError.message}`);
            }

            setResult(`Query riuscita! Risultato: ${JSON.stringify(data)}`);

            // Prova a eseguire una funzione RPC
            try {
                const { data: rpcData, error: rpcError } = await supabase
                    .rpc('hello_world')
                    .headers({
                        'Authorization': `Bearer ${process.env.REACT_APP_SUPABASE_SERVICE_KEY}`
                    });

                if (rpcError) {
                    console.error('Errore RPC:', rpcError);
                    setResult(prev => `${prev}\n\nRPC fallita: ${rpcError.message}`);
                } else {
                    setResult(prev => `${prev}\n\nRPC riuscita! Risultato: ${rpcData}`);
                }
            } catch (rpcCatchError) {
                console.error('Errore catch RPC:', rpcCatchError);
                setResult(prev => `${prev}\n\nRPC exception: ${rpcCatchError.message}`);
            }

        } catch (e) {
            console.error('Errore generale:', e);
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    const testDirectFetch = async () => {
        setLoading(true);
        setError('');
        setResult('');

        try {
            const supabaseUrl = 'http://localhost:8001';
            const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UtZGVtbyIsImlhdCI6MTY0MTc2OTIwMCwiZXhwIjoxNzk5NTM1NjAwfQ.QYhSBawC8O-gPZtYb87RClDbsfbDHI0VF7vNkmlP9yw';

            // Test di connettività di base
            const pingResponse = await fetch(`${supabaseUrl}/rest/v1/`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': serviceRoleKey,
                    'Authorization': `Bearer ${serviceRoleKey}`
                }
            });

            setResult(`Ping response status: ${pingResponse.status}`);

            if (!pingResponse.ok) {
                const errorText = await pingResponse.text();
                throw new Error(`Errore ping: ${pingResponse.status} - ${errorText}`);
            }

            // Test query sulla tabella
            const tableResponse = await fetch(`${supabaseUrl}/rest/v1/test_items?select=*&limit=5`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': serviceRoleKey,
                    'Authorization': `Bearer ${serviceRoleKey}`
                }
            });

            if (!tableResponse.ok) {
                const errorText = await tableResponse.text();
                throw new Error(`Errore query: ${tableResponse.status} - ${errorText}`);
            }

            const data = await tableResponse.json();
            setResult(prev => `${prev}\n\nQuery riuscita! Risultato: ${JSON.stringify(data)}`);

        } catch (error) {
            console.error('Errore nel fetch diretto:', error);
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    const testStudioAPI = async () => {
        setLoading(true);
        setError('');
        setResult('');

        try {
            const studioUrl = 'http://localhost:8001';

            // Prova con l'endpoint corretto per l'autenticazione
            const loginResponse = await fetch(`${studioUrl}/api/platform/auth/signin`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: 'supabase',
                    password: 'Puttanaeva3oia'
                })
            });

            if (!loginResponse.ok) {
                const errorText = await loginResponse.text();
                throw new Error(`Errore login: ${loginResponse.status} - ${errorText}`);
            }

            const loginData = await loginResponse.json();
            console.log('Login riuscito:', loginData);

            // Usa il token per effettuare una query
            const response = await fetch(`${studioUrl}/api/platform/pg-meta/default/query`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${loginData.access_token || loginData.token}`
                },
                body: JSON.stringify({
                    query: 'SELECT * FROM test_items LIMIT 5'
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Errore query: ${response.status} - ${errorText}`);
            }

            const data = await response.json();
            setResult(`Query riuscita! Risultato: ${JSON.stringify(data)}`);

        } catch (error) {
            console.error('Errore nell\'API di Studio:', error);
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    const testDirectAPI = async () => {
        setLoading(true);
        setError('');
        setResult('');

        try {
            const response = await fetch('http://localhost:3001/api/test-items');

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Errore API: ${response.status} - ${errorText}`);
            }

            const data = await response.json();
            setResult(`API diretta riuscita! Risultato: ${JSON.stringify(data)}`);

        } catch (error) {
            console.error('Errore nell\'API diretta:', error);
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    const testDirectRest = async () => {
        setLoading(true);
        setError('');
        setResult('');

        try {
            // Usa la porta 3333 esposta direttamente
            const restUrl = 'http://localhost:3333';
            const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UtZGVtbyIsImlhdCI6MTY0MTc2OTIwMCwiZXhwIjoxNzk5NTM1NjAwfQ.QYhSBawC8O-gPZtYb87RClDbsfbDHI0VF7vNkmlP9yw';

            // Test query sulla tabella
            const response = await fetch(`${restUrl}/test_items?select=*&limit=5`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${serviceRoleKey}`
                }
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Errore query diretta: ${response.status} - ${errorText}`);
            }

            const data = await response.json();
            setResult(`Query diretta a REST riuscita! Risultato: ${JSON.stringify(data)}`);

        } catch (error) {
            console.error('Errore nella query diretta a REST:', error);
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    const testProxyAPI = async () => {
        setLoading(true);
        setError('');
        setResult('');

        try {
            const response = await fetch('http://localhost:3001/rest/test_items?select=*&limit=5');

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Errore proxy: ${response.status} - ${errorText}`);
            }

            const data = await response.json();
            setResult(`Proxy riuscito! Risultato: ${JSON.stringify(data)}`);

        } catch (error) {
            console.error('Errore nel proxy:', error);
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    const testStudioSQLAPI = async () => {
        setLoading(true);
        setError('');
        setResult('');

        try {
            const studioUrl = 'http://localhost:8001';

            // Prova con l'endpoint corretto per l'autenticazione
            const loginResponse = await fetch(`${studioUrl}/api/platform/auth/signin`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: 'supabase',
                    password: 'Puttanaeva3oia'
                })
            });

            if (!loginResponse.ok) {
                const errorText = await loginResponse.text();
                throw new Error(`Errore login: ${loginResponse.status} - ${errorText}`);
            }

            const loginData = await loginResponse.json();
            console.log('Login riuscito:', loginData);

            // Usa il token per effettuare una query SQL diretta
            const sqlResponse = await fetch(`${studioUrl}/api/platform/pg-meta/default/query`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${loginData.access_token || loginData.token}`
                },
                body: JSON.stringify({
                    query: 'SELECT * FROM test_items LIMIT 5'
                })
            });

            if (!sqlResponse.ok) {
                const errorText = await sqlResponse.text();
                throw new Error(`Errore SQL: ${sqlResponse.status} - ${errorText}`);
            }

            const data = await sqlResponse.json();
            setResult(`Query SQL riuscita! Risultato: ${JSON.stringify(data)}`);

        } catch (error) {
            console.error('Errore nell\'API di Studio SQL:', error);
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    // Aggiungi questa funzione per decodificare il token JWT
    const decodeJWT = (token) => {
        try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(function (c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));

            return JSON.parse(jsonPayload);
        } catch (e) {
            console.error('Errore nella decodifica JWT:', e);
            return null;
        }
    };

    // Aggiungi questa funzione per testare il token
    const testJWT = () => {
        setLoading(true);
        setError('');
        setResult('');

        try {
            const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UtZGVtbyIsImlhdCI6MTY0MTc2OTIwMCwiZXhwIjoxNzk5NTM1NjAwfQ.QYhSBawC8O-gPZtYb87RClDbsfbDHI0VF7vNkmlP9yw';
            const decoded = decodeJWT(serviceRoleKey);

            setResult(`Token decodificato: ${JSON.stringify(decoded, null, 2)}\n\nScadenza: ${new Date(decoded.exp * 1000).toLocaleString()}`);
        } catch (error) {
            console.error('Errore nel test JWT:', error);
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    // Aggiungi questa funzione per creare un nuovo token JWT
    const createJWT = () => {
        setLoading(true);
        setError('');
        setResult('');

        try {
            // Usa la libreria jsonwebtoken (dovrai installarla)
            // npm install jsonwebtoken
            const jwt = require('jsonwebtoken');

            const payload = {
                role: 'service_role',
                iss: 'supabase-demo',
                iat: Math.floor(Date.now() / 1000),
                exp: Math.floor(Date.now() / 1000) + 3600 // 1 ora
            };

            const secret = 'questaèlaChiaveSegretaenonvogliodarlaanessuno';
            const token = jwt.sign(payload, secret);

            setResult(`Nuovo token JWT: ${token}`);
        } catch (error) {
            console.error('Errore nella creazione JWT:', error);
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-2xl font-bold mb-4">Debug Alternativo Supabase</h1>

            <div className="bg-white p-4 rounded shadow mb-6">
                <button
                    onClick={testConnection}
                    disabled={loading}
                    className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
                >
                    {loading ? 'Test in corso...' : 'Testa Connessione Alternativa'}
                </button>

                <button
                    onClick={testDirectFetch}
                    disabled={loading}
                    className="ml-2 bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:opacity-50"
                >
                    {loading ? 'Test in corso...' : 'Test Fetch Diretto'}
                </button>

                <button
                    onClick={testStudioAPI}
                    disabled={loading}
                    className="ml-2 bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600 disabled:opacity-50"
                >
                    {loading ? 'Test in corso...' : 'Test API di Studio'}
                </button>

                <button
                    onClick={testDirectAPI}
                    disabled={true}
                    className="ml-2 bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600 disabled:opacity-50"
                >
                    {loading ? 'Test in corso...' : 'Test API Diretta (Disabilitato)'}
                </button>

                <button
                    onClick={testDirectRest}
                    disabled={loading}
                    className="ml-2 bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 disabled:opacity-50"
                >
                    {loading ? 'Test in corso...' : 'Test REST Diretto'}
                </button>

                <button
                    onClick={testProxyAPI}
                    disabled={true}
                    className="ml-2 bg-pink-500 text-white px-4 py-2 rounded hover:bg-pink-600 disabled:opacity-50"
                >
                    {loading ? 'Test in corso...' : 'Test Proxy API (Disabilitato)'}
                </button>

                <button
                    onClick={testStudioSQLAPI}
                    disabled={loading}
                    className="ml-2 bg-teal-500 text-white px-4 py-2 rounded hover:bg-teal-600 disabled:opacity-50"
                >
                    {loading ? 'Test in corso...' : 'Test API di Studio SQL'}
                </button>

                <button
                    onClick={testJWT}
                    disabled={loading}
                    className="ml-2 bg-indigo-500 text-white px-4 py-2 rounded hover:bg-indigo-600 disabled:opacity-50"
                >
                    {loading ? 'Test in corso...' : 'Test JWT'}
                </button>

                <button
                    onClick={createJWT}
                    disabled={loading}
                    className="ml-2 bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600 disabled:opacity-50"
                >
                    {loading ? 'Test in corso...' : 'Crea Nuovo JWT'}
                </button>

                {error && (
                    <div className="mt-4 p-3 bg-red-100 text-red-700 rounded">
                        <strong>Errore:</strong> {error}
                    </div>
                )}

                {result && (
                    <div className="mt-4 p-3 bg-green-100 text-green-700 rounded">
                        <pre className="whitespace-pre-wrap">{result}</pre>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SupabaseDebugAlt; 