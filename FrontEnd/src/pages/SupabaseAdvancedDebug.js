import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// Stile CSS personalizzato per supportare l'altezza maggiore della tabella
const customStyles = `
  .max-h-120 {
    max-height: 30rem; /* 480px, doppio di 240px */
  }
`;

const SupabaseAdvancedDebug = () => {
    const [tables, setTables] = useState([]);
    const [selectedTable, setSelectedTable] = useState('');
    const [keyType, setKeyType] = useState('anon'); // 'anon', 'service_role' o 'custom'
    const [customKey, setCustomKey] = useState('');
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [result, setResult] = useState('');
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');

    // Stato per i campi dinamici
    const [tableColumns, setTableColumns] = useState([]);
    const [formData, setFormData] = useState({});

    // Stato per gli schemi
    const [schemas, setSchemas] = useState([]);
    const [selectedSchema, setSelectedSchema] = useState('public');

    // Nuovi stati per la ricerca di funzioni
    const [customFunctions, setCustomFunctions] = useState([]);
    const [schemaFilter, setSchemaFilter] = useState('%'); // Wildcard di default
    const [securityTypeFilter, setSecurityTypeFilter] = useState('%'); // Wildcard di default
    const [customSecurityTypeFilter, setCustomSecurityTypeFilter] = useState('');
    const [selectedFunction, setSelectedFunction] = useState(null);
    const [functionSearchLoading, setFunctionSearchLoading] = useState(false);
    const [functionSearchError, setFunctionSearchError] = useState('');

    // Nuovi stati per la modifica delle funzioni
    const [isEditingFunction, setIsEditingFunction] = useState(false);
    const [editedFunctionDefinition, setEditedFunctionDefinition] = useState('');
    const [isEditingDescription, setIsEditingDescription] = useState(false);
    const [editedDescription, setEditedDescription] = useState('');
    const [updateFunctionLoading, setUpdateFunctionLoading] = useState(false);
    const [updateFunctionError, setUpdateFunctionError] = useState('');
    const [updateFunctionSuccess, setUpdateFunctionSuccess] = useState('');

    // Aggiungi questi nuovi stati al componente
    const [isExecutingFunction, setIsExecutingFunction] = useState(false);
    const [functionParams, setFunctionParams] = useState({});
    const [functionResult, setFunctionResult] = useState(null);
    const [functionExecutionError, setFunctionExecutionError] = useState('');
    const [functionExecutionSuccess, setFunctionExecutionSuccess] = useState('');

    // Aggiungi questo stato per tenere traccia dei permessi delle tabelle
    const [tablePermissions, setTablePermissions] = useState({});

    // Aggiungi questo stato
    const [updateCounter, setUpdateCounter] = useState(0);

    // Chiavi e URL
    const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'http://localhost:8001';
    const anonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlLWRlbW8iLCJpYXQiOjE2NDE3NjkyMDAsImV4cCI6MTc5OTUzNTYwMH0.T2tbdl58_rRYPrVJ8NXUptk8sgl_qgLC9k28dRpaMt0';
    const serviceRoleKey = process.env.REACT_APP_SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UtZGVtbyIsImlhdCI6MTY0MTc2OTIwMCwiZXhwIjoxNzk5NTM1NjAwfQ.QYhSBawC8O-gPZtYb87RClDbsfbDHI0VF7vNkmlP9yw';

    // Effetto per caricare gli schemi all'avvio
    useEffect(() => {
        fetchSchemas();
    }, []);

    // Effetto per caricare le tabelle quando cambia lo schema
    useEffect(() => {
        if (selectedSchema) {
            fetchTables();
        }
    }, [selectedSchema]);

    // Effetto per caricare le colonne quando cambia la tabella
    useEffect(() => {
        if (selectedTable) {
            fetchTableColumns();
        }
    }, [selectedTable]);

    // Aggiungi questo effetto per monitorare i cambiamenti in tablePermissions
    useEffect(() => {
        console.log('Permessi delle tabelle aggiornati:', tablePermissions);
    }, [tablePermissions]);

    // Crea un client Supabase in base al tipo di chiave selezionato
    const getClient = () => {
        let key;
        if (keyType === 'anon') {
            key = anonKey;
        } else if (keyType === 'service_role') {
            key = serviceRoleKey;
        } else {
            key = customKey;
        }
        return createClient(supabaseUrl, key);
    };

    // Imposta una chiave predefinita nel campo custom
    const setPresetKey = (preset) => {
        if (preset === 'anon') {
            setCustomKey(anonKey);
        } else if (preset === 'service_role') {
            setCustomKey(serviceRoleKey);
        }
    };

    // Carica l'elenco degli schemi
    const fetchSchemas = async () => {
        try {
            setLoading(true);
            setError('');

            // Usa sempre la chiave SERVICE_ROLE per questa operazione
            const client = createClient(supabaseUrl, serviceRoleKey);

            // Query per ottenere l'elenco degli schemi
            const { data, error } = await client.rpc('get_schemas');

            if (error) throw error;

            // Filtra gli schemi che non vogliamo mostrare
            const filteredSchemas = data
                .filter(schema =>
                    !['information_schema', 'pg_catalog', 'pg_toast'].includes(schema.schema_name))
                .map(schema => schema.schema_name);

            setSchemas(filteredSchemas);

            // Se c'è 'public' tra gli schemi, selezionalo di default
            if (filteredSchemas.includes('public')) {
                setSelectedSchema('public');
            } else if (filteredSchemas.length > 0) {
                setSelectedSchema(filteredSchemas[0]);
            }
        } catch (error) {
            console.error('Errore nel caricamento degli schemi:', error);
            setError(`Errore nel caricamento degli schemi: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    // Sostituisci completamente la funzione checkTablePermissions
    const checkTablePermissions = async (schemaName, tableName) => {
        try {
            // Usa sempre la chiave SERVICE_ROLE per questa operazione
            const client = createClient(supabaseUrl, serviceRoleKey);

            // Esegui una query SQL diretta per verificare i permessi
            const { data, error } = await client.rpc('check_permissions_direct', {
                p_schema: schemaName,
                p_table: tableName
            });

            if (error) throw error;

            console.log(`Permessi diretti per ${schemaName}.${tableName}:`, data);

            // Restituisci true o false in base al risultato
            return data.has_permissions;
        } catch (error) {
            console.error(`Errore nella verifica dei permessi per ${schemaName}.${tableName}:`, error);
            return false;
        }
    };

    // Carica l'elenco delle tabelle per lo schema selezionato
    const fetchTables = async () => {
        if (!selectedSchema) return;

        try {
            setLoading(true);
            setError('');
            setSelectedTable('');
            setTables([]);
            setTablePermissions({});

            // Usa sempre la chiave SERVICE_ROLE per ottenere l'elenco delle tabelle
            const client = createClient(supabaseUrl, serviceRoleKey);

            // Query per ottenere l'elenco delle tabelle dello schema selezionato
            const { data, error } = await client.rpc('get_tables_by_schema', {
                input_schema_name: selectedSchema
            });

            if (error) throw error;

            // Assicurati che i dati siano un array di stringhe
            const tableNames = data ? data.map(item => item.table_name) : [];
            setTables(tableNames);

            // Se ci sono tabelle, seleziona la prima
            if (tableNames.length > 0) {
                setSelectedTable(tableNames[0]);

                // Verifica i permessi per tutte le tabelle
                const permissionsObj = {};
                for (const tableName of tableNames) {
                    permissionsObj[tableName] = await checkTablePermissions(selectedSchema, tableName);
                }

                setTablePermissions(permissionsObj);
            }
        } catch (error) {
            console.error(`Errore nel caricamento delle tabelle per lo schema ${selectedSchema}:`, error);
            setError(`Errore nel caricamento delle tabelle: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    // Carica le colonne della tabella selezionata
    const fetchTableColumns = async () => {
        if (!selectedTable || !selectedSchema) return;

        try {
            setLoading(true);
            setError('');
            setTableColumns([]);
            setFormData({});

            // Usa sempre la chiave SERVICE_ROLE per questa operazione
            const client = createClient(supabaseUrl, serviceRoleKey);

            // Query per ottenere le colonne della tabella
            const { data, error } = await client.rpc('get_table_columns_by_schema', {
                input_schema_name: selectedSchema,
                input_table_name: selectedTable
            });

            if (error) throw error;

            // Filtra le colonne che non vogliamo mostrare nel form
            const filteredColumns = data.filter(col =>
                !['created_at', 'updated_at'].includes(col.column_name)
            );

            setTableColumns(filteredColumns);

            // Inizializza formData con valori vuoti per ogni colonna
            const initialFormData = {};
            filteredColumns.forEach(col => {
                initialFormData[col.column_name] = '';
            });
            setFormData(initialFormData);
        } catch (error) {
            console.error(`Errore nel caricamento delle colonne per ${selectedSchema}.${selectedTable}:`, error);
            setError(`Errore nel caricamento delle colonne: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    // Gestisce il cambio di valore nei campi del form
    const handleInputChange = (columnName, value) => {
        setFormData(prev => ({
            ...prev,
            [columnName]: value
        }));
    };

    // Modifica la funzione setSelectedTable per pulire gli elementi quando cambia la tabella
    const handleTableSelection = (tableName) => {
        // Se stiamo cambiando tabella, pulisci gli elementi
        if (tableName !== selectedTable) {
            setItems([]);
            setError('');
            setResult('');
        }

        // Imposta la nuova tabella selezionata
        setSelectedTable(tableName);
    };

    // Correggi la funzione fetchItems per gestire correttamente le tabelle in schemi diversi
    const fetchItems = async () => {
        if (!selectedTable || !selectedSchema) return;

        try {
            setLoading(true);
            setError('');
            setResult('');

            // Pulisci gli elementi prima di caricare i nuovi
            setItems([]);

            // Crea un client Supabase con la chiave selezionata
            const client = getClient();

            let data, error;

            if (selectedSchema === 'public') {
                // Per lo schema public, usiamo il metodo standard che rispetta RLS
                const response = await client
                    .from(selectedTable)
                    .select('*')
                    .limit(10);

                data = response.data;
                error = response.error;
            } else {
                // Per altri schemi, usiamo la funzione RPC con privilegi elevati
                const sqlQuery = `
                    SELECT * 
                    FROM "${selectedSchema}"."${selectedTable}"
                    LIMIT 10
                `;

                // Usa la funzione con privilegi elevati se stiamo usando la chiave service_role
                const functionName = keyType === 'service_role' ? 'execute_sql_elevated' : 'execute_sql';

                const response = await client.rpc(functionName, {
                    sql_query: sqlQuery
                });

                data = response.data;
                error = response.error;
            }

            if (error) throw error;

            setItems(data || []);
            setResult(`Caricati ${data.length} elementi da ${selectedSchema}.${selectedTable}`);
        } catch (error) {
            console.error(`Errore nel caricamento degli elementi da ${selectedSchema}.${selectedTable}:`, error);
            setError(`Errore nel caricamento degli elementi: ${error.message}`);

            // Assicurati che items sia vuoto in caso di errore
            setItems([]);
        } finally {
            setLoading(false);
        }
    };

    // Modifica la funzione insertItem per aggiungere un refresh automatico
    const insertItem = async () => {
        if (!selectedTable || !selectedSchema || !tableColumns.length) return;

        try {
            setLoading(true);
            setError('');
            setResult('');

            // Verifica che almeno un campo sia compilato
            const hasValue = Object.values(formData).some(val => val && val.toString().trim() !== '');
            if (!hasValue) {
                setError('Compila almeno un campo');
                return;
            }

            const client = getClient();

            // Filtra i campi vuoti e assicurati che i dati siano nel formato corretto
            const dataToInsert = {};
            Object.entries(formData).forEach(([key, value]) => {
                if (value && value.toString().trim() !== '') {
                    // Rimuovi eventuali virgolette aggiuntive per i valori stringa
                    if (typeof value === 'string') {
                        dataToInsert[key] = value.replace(/^"(.*)"$/, '$1');
                    } else {
                        dataToInsert[key] = value;
                    }
                }
            });

            // Log dei dati per debug
            console.log('Data to insert:', dataToInsert);
            console.log('JSON stringified:', JSON.stringify(dataToInsert));

            let data, error;

            if (selectedSchema === 'public') {
                // Per lo schema public, usiamo il metodo standard
                const response = await client
                    .from(selectedTable)
                    .insert(dataToInsert)
                    .select();

                data = response.data;
                error = response.error;
            } else {
                // Per altri schemi, usiamo una funzione RPC
                const response = await client.rpc('insert_into_table_by_schema', {
                    input_schema_name: selectedSchema,
                    input_table_name: selectedTable,
                    input_data: dataToInsert
                });

                data = response.data;
                error = response.error;
            }

            if (error) throw error;

            // Mostra un messaggio di successo
            setResult(`Elemento inserito con successo in ${selectedSchema}.${selectedTable}`);

            // Resetta il form
            const initialFormData = {};
            tableColumns.forEach(col => {
                initialFormData[col.column_name] = '';
            });
            setFormData(initialFormData);

            // Aggiorna automaticamente la lista degli elementi
            await fetchItems();
        } catch (error) {
            console.error(`Errore nell'inserimento dell'elemento in ${selectedSchema}.${selectedTable}:`, error);
            setError(`Errore nell'inserimento dell'elemento: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    // Modifica la funzione renderFormField per adattarsi alla struttura effettiva dei dati
    const renderFormField = (column) => {
        // Verifica la struttura dell'oggetto column e adatta i nomi delle proprietà
        const columnName = column.column_name;
        const columnType = column.data_type;
        const value = formData[columnName] || '';

        console.log('Column structure:', column); // Debug per vedere la struttura effettiva

        // Stile comune per tutti i campi di input
        const inputStyle = "w-full p-1.5 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-500";

        // Gestisci i diversi tipi di dati, con controlli di sicurezza
        if (columnType && columnType.includes('timestamp')) {
            return (
                <input
                    type="datetime-local"
                    value={value}
                    onChange={(e) => handleInputChange(columnName, e.target.value)}
                    className={inputStyle}
                />
            );
        } else if (columnType && columnType.includes('date')) {
            return (
                <input
                    type="date"
                    value={value}
                    onChange={(e) => handleInputChange(columnName, e.target.value)}
                    className={inputStyle}
                />
            );
        } else if (columnType && columnType.includes('boolean')) {
            return (
                <select
                    value={value}
                    onChange={(e) => handleInputChange(columnName, e.target.value)}
                    className={inputStyle}
                >
                    <option value="">-- Seleziona --</option>
                    <option value="true">Vero</option>
                    <option value="false">Falso</option>
                </select>
            );
        } else if (columnType && (columnType.includes('json') || columnType.includes('jsonb'))) {
            return (
                <textarea
                    value={value}
                    onChange={(e) => handleInputChange(columnName, e.target.value)}
                    className={`${inputStyle} h-20`}
                    placeholder="{ ... }"
                />
            );
        } else if (columnType && (columnType.includes('text') || columnType.includes('varchar'))) {
            return (
                <input
                    type="text"
                    value={value}
                    onChange={(e) => handleInputChange(columnName, e.target.value)}
                    className={inputStyle}
                    placeholder={`Inserisci ${columnName}`}
                />
            );
        } else if (columnType && (columnType.includes('int') || columnType.includes('numeric') || columnType.includes('decimal'))) {
            return (
                <input
                    type="number"
                    value={value}
                    onChange={(e) => handleInputChange(columnName, e.target.value)}
                    className={inputStyle}
                    step={columnType.includes('decimal') || columnType.includes('numeric') ? '0.01' : '1'}
                />
            );
        } else {
            // Per tutti gli altri tipi, usa un campo di testo generico
            return (
                <input
                    type="text"
                    value={value}
                    onChange={(e) => handleInputChange(columnName, e.target.value)}
                    className={inputStyle}
                    placeholder={`Inserisci ${columnName} (${columnType || 'unknown type'})`}
                />
            );
        }
    };

    // Funzione per verificare RLS
    const checkRLS = async () => {
        if (!selectedTable || !selectedSchema) return;

        try {
            setLoading(true);
            setError('');
            setResult('');

            // Pulisci gli elementi
            setItems([]);

            // Usa sempre la chiave SERVICE_ROLE per questa operazione
            const client = createClient(supabaseUrl, serviceRoleKey);

            // Verifica se RLS è attivo sulla tabella
            const { data: rlsData, error: rlsError } = await client.rpc('check_rls_status_by_schema', {
                input_schema_name: selectedSchema,
                input_table_name: selectedTable
            });

            if (rlsError) throw rlsError;

            // Ottieni le policy RLS per la tabella
            const { data: policiesData, error: policiesError } = await client.rpc('get_table_policies_by_schema', {
                input_schema_name: selectedSchema,
                input_table_name: selectedTable
            });

            if (policiesError) throw policiesError;

            // Formatta il risultato
            const rlsStatus = rlsData && rlsData.length > 0 ?
                (rlsData[0].rls_enabled ? 'Attivo' : 'Non attivo') :
                'Sconosciuto';

            const formattedResult = `
Stato RLS per ${selectedSchema}.${selectedTable}: ${rlsStatus}

Policy attive:
${JSON.stringify(policiesData, null, 2)}
            `;

            setResult(formattedResult);
        } catch (error) {
            console.error(`Errore nella verifica RLS per ${selectedSchema}.${selectedTable}:`, error);
            setError(`Errore nella verifica RLS: ${error.message}`);

            // Assicurati che items sia vuoto in caso di errore
            setItems([]);
        } finally {
            setLoading(false);
        }
    };

    // Funzione per cercare funzioni personalizzate
    const searchCustomFunctions = async () => {
        try {
            setFunctionSearchLoading(true);
            setFunctionSearchError('');

            // Usa sempre la chiave SERVICE_ROLE per questa operazione
            const client = createClient(supabaseUrl, serviceRoleKey);

            // Determina il filtro di sicurezza effettivo
            let effectiveSecurityFilter = securityTypeFilter;
            if (securityTypeFilter === 'custom' && customSecurityTypeFilter) {
                effectiveSecurityFilter = customSecurityTypeFilter;
            }

            const { data, error } = await client.rpc('search_custom_functions', {
                schema_filter: schemaFilter,
                security_type_filter: effectiveSecurityFilter
            });

            if (error) throw error;

            // Assicurati che i dati siano un array
            const functions = data || [];

            // Per ogni funzione, carica i parametri
            for (let i = 0; i < functions.length; i++) {
                try {
                    const func = functions[i];
                    // Estrai i parametri dalla stringa degli argomenti
                    const parametersArray = parseParameters(func.function_arguments);
                    func.parameters = parametersArray;
                } catch (paramError) {
                    console.error(`Errore nell'analisi dei parametri per ${functions[i].function_name}:`, paramError);
                    functions[i].parameters = [];
                }
            }

            setCustomFunctions(functions);

            // Deseleziona la funzione corrente se non è più nei risultati
            if (selectedFunction && !functions.some(f =>
                f.schema_name === selectedFunction.schema_name &&
                f.function_name === selectedFunction.function_name)) {
                setSelectedFunction(null);
            }

        } catch (error) {
            console.error('Errore nella ricerca delle funzioni:', error);
            setFunctionSearchError(`Errore nella ricerca delle funzioni: ${error.message}`);
        } finally {
            setFunctionSearchLoading(false);
        }
    };

    // Aggiungi questa funzione per analizzare i parametri dalla stringa degli argomenti
    const parseParameters = (argsString) => {
        if (!argsString || argsString.trim() === '') {
            return [];
        }

        // Dividi la stringa degli argomenti in singoli parametri
        const params = [];
        const argPairs = argsString.split(',');

        for (const argPair of argPairs) {
            const trimmed = argPair.trim();
            if (trimmed) {
                // Estrai nome e tipo del parametro
                const parts = trimmed.split(' ');
                if (parts.length >= 2) {
                    const name = parts[0].replace(/^[_p]_/, ''); // Rimuovi prefissi comuni come p_ o _
                    const type = parts.slice(1).join(' ');
                    params.push({ name, type });
                }
            }
        }

        return params;
    };

    // Funzione per visualizzare i dettagli di una funzione
    const showFunctionDetails = async (func) => {
        try {
            setSelectedFunction(func);
            setIsEditingDescription(false);
            setIsEditingFunction(false);
            setEditedDescription(func.function_description || '');
            setEditedFunctionDefinition(func.function_definition || '');
            setUpdateFunctionError('');
            setUpdateFunctionSuccess('');
            setFunctionExecutionError('');
            setFunctionExecutionSuccess('');
            setFunctionResult(null);

            // Inizializza i parametri della funzione
            const params = {};

            // Usa i parametri già analizzati
            if (func.parameters && Array.isArray(func.parameters)) {
                func.parameters.forEach(param => {
                    params[param.name] = {
                        type: param.type,
                        value: ''
                    };
                });
            }

            setFunctionParams(params);

            // Debug
            console.log('Funzione selezionata:', func);
            console.log('Parametri analizzati:', func.parameters);
            console.log('Parametri inizializzati:', params);
        } catch (error) {
            console.error('Errore nel mostrare i dettagli della funzione:', error);
        }
    };

    // Funzione per copiare il testo negli appunti con istruzioni
    const copyWithInstructions = (text, type) => {
        navigator.clipboard.writeText(text)
            .then(() => {
                // Mostra un messaggio di successo con istruzioni
                if (type === 'function') {
                    setUpdateFunctionSuccess('Definizione copiata negli appunti! Esegui questa query nel SQL Editor di Supabase per aggiornare la funzione.');
                } else if (type === 'comment') {
                    const commentSql = `COMMENT ON FUNCTION ${selectedFunction.schema_name}.${selectedFunction.function_name}(${selectedFunction.function_arguments}) IS $comment$${editedDescription}$comment$;`;
                    navigator.clipboard.writeText(commentSql);
                    setUpdateFunctionSuccess('Query COMMENT copiata negli appunti! Esegui questa query nel SQL Editor di Supabase per aggiornare la descrizione.');
                } else if (type === 'result') {
                    setFunctionExecutionSuccess('Risultato copiato negli appunti!');
                }
                setTimeout(() => {
                    setUpdateFunctionSuccess('');
                    setFunctionExecutionSuccess('');
                }, 5000);
            })
            .catch(err => {
                console.error('Errore nella copia del testo:', err);
                setUpdateFunctionError('Errore nella copia del testo');
            });
    };

    // Funzione per iniziare la modifica della definizione della funzione
    const startEditingFunction = () => {
        if (selectedFunction) {
            setEditedFunctionDefinition(selectedFunction.function_definition);
            setIsEditingFunction(true);
        }
    };

    // Funzione per iniziare la modifica della descrizione
    const startEditingDescription = () => {
        if (selectedFunction) {
            setEditedDescription(selectedFunction.function_description || '');
            setIsEditingDescription(true);
        }
    };

    // Funzione per annullare la modifica
    const cancelEditing = () => {
        setIsEditingFunction(false);
        setIsEditingDescription(false);
        setUpdateFunctionError('');
        setUpdateFunctionSuccess('');
    };

    // Funzione per eseguire query SQL direttamente tramite API REST
    const executeSqlDirectly = async (sqlQuery) => {
        try {
            // Costruisci l'URL dell'API REST
            const apiUrl = `${supabaseUrl}/rest/v1/`;

            // Esegui la richiesta
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': serviceRoleKey,
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'Prefer': 'params=single-object'
                },
                body: JSON.stringify({
                    query: sqlQuery
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Errore nell\'esecuzione della query SQL');
            }

            return await response.json();
        } catch (error) {
            throw error;
        }
    };

    // Modifica la funzione updateFunctionDefinitionViaRest per utilizzare l'approccio con copia
    const updateFunctionDefinitionViaRest = async () => {
        if (!selectedFunction || !editedFunctionDefinition.trim()) return;

        try {
            // Verifica se la definizione della funzione inizia con CREATE OR REPLACE FUNCTION
            let sqlQuery = editedFunctionDefinition.trim();
            if (!sqlQuery.toUpperCase().startsWith('CREATE OR REPLACE FUNCTION')) {
                throw new Error('La definizione della funzione deve iniziare con CREATE OR REPLACE FUNCTION');
            }

            // Copia la query negli appunti e mostra istruzioni
            navigator.clipboard.writeText(sqlQuery)
                .then(() => {
                    setUpdateFunctionSuccess(
                        'Definizione della funzione copiata negli appunti! ' +
                        'Per aggiornare la funzione, incolla e esegui questa query nel SQL Editor di Supabase.'
                    );
                    setTimeout(() => setUpdateFunctionSuccess(''), 10000);
                })
                .catch(err => {
                    console.error('Errore nella copia del testo:', err);
                    setUpdateFunctionError('Errore nella copia del testo');
                });

            // Aggiorna localmente la funzione selezionata con la nuova definizione
            setSelectedFunction({
                ...selectedFunction,
                function_definition: editedFunctionDefinition
            });

            setIsEditingFunction(false);

        } catch (error) {
            console.error('Errore nell\'aggiornamento della funzione:', error);
            setUpdateFunctionError(`Errore nell'aggiornamento della funzione: ${error.message}`);
        }
    };

    // Funzione per aggiornare la descrizione della funzione
    const updateFunctionDescription = async () => {
        if (!selectedFunction) return;

        try {
            setUpdateFunctionLoading(true);
            setUpdateFunctionError('');
            setUpdateFunctionSuccess('');

            // Usa sempre la chiave SERVICE_ROLE per questa operazione
            const client = createClient(supabaseUrl, serviceRoleKey);

            // Usa la funzione specifica per aggiornare la descrizione
            const { data, error } = await client.rpc('update_function_comment', {
                schema_name: selectedFunction.schema_name,
                function_name: selectedFunction.function_name,
                function_args: selectedFunction.function_arguments,
                new_comment: editedDescription
            });

            if (error) throw error;

            // Aggiorna la funzione selezionata con la nuova descrizione
            setSelectedFunction({
                ...selectedFunction,
                function_description: editedDescription
            });

            setUpdateFunctionSuccess('Descrizione aggiornata con successo!');
            setIsEditingDescription(false);

            // Aggiorna l'elenco delle funzioni
            searchCustomFunctions();

        } catch (error) {
            console.error('Errore nell\'aggiornamento della descrizione:', error);
            setUpdateFunctionError(`Errore nell'aggiornamento della descrizione: ${error.message}`);
        } finally {
            setUpdateFunctionLoading(false);
        }
    };

    // Modifica la funzione checkSqlSyntax per utilizzare un approccio più semplice
    const checkSqlSyntax = async (sql) => {
        try {
            // Verifica solo se la definizione inizia con CREATE OR REPLACE FUNCTION
            if (!sql.trim().toUpperCase().startsWith('CREATE OR REPLACE FUNCTION')) {
                return { isValid: false, error: 'La definizione della funzione deve iniziare con CREATE OR REPLACE FUNCTION' };
            }

            // Verifica se la definizione contiene elementi essenziali
            const hasLanguage = sql.toLowerCase().includes('language');
            const hasReturn = sql.toLowerCase().includes('returns');
            const hasBeginEnd = sql.toLowerCase().includes('begin') && sql.toLowerCase().includes('end');

            if (!hasLanguage) {
                return { isValid: false, error: 'Manca la dichiarazione LANGUAGE nella definizione della funzione' };
            }

            if (!hasReturn) {
                return { isValid: false, error: 'Manca la dichiarazione RETURNS nella definizione della funzione' };
            }

            if (!hasBeginEnd && sql.toLowerCase().includes('language plpgsql')) {
                return { isValid: false, error: 'Mancano i blocchi BEGIN/END nella definizione della funzione PL/pgSQL' };
            }

            // Se arriviamo qui, la sintassi sembra valida (controllo basilare)
            return { isValid: true, error: null };

        } catch (error) {
            return { isValid: false, error: error.message };
        }
    };

    // Funzione per aprire l'SQL Editor di Supabase
    const openSqlEditor = () => {
        const editorUrl = `${supabaseUrl}/project/sql/sql/1`;
        window.open(editorUrl, '_blank');
    };

    // Funzione per analizzare gli argomenti della funzione e creare un oggetto di parametri
    const parseFunctionArguments = (argsString) => {
        if (!argsString || argsString.trim() === '') return {};

        // Dividi gli argomenti per virgola, ma ignora le virgole all'interno di parentesi
        const args = [];
        let currentArg = '';
        let parenCount = 0;

        for (let i = 0; i < argsString.length; i++) {
            const char = argsString[i];

            if (char === '(' || char === '[' || char === '{') {
                parenCount++;
                currentArg += char;
            } else if (char === ')' || char === ']' || char === '}') {
                parenCount--;
                currentArg += char;
            } else if (char === ',' && parenCount === 0) {
                args.push(currentArg.trim());
                currentArg = '';
            } else {
                currentArg += char;
            }
        }

        if (currentArg.trim()) {
            args.push(currentArg.trim());
        }

        // Crea un oggetto di parametri
        const paramsObj = {};
        args.forEach(arg => {
            // Estrai nome e tipo dal parametro
            // Formato tipico: "nome_parametro tipo_parametro"
            const parts = arg.trim().split(/\s+/);
            if (parts.length >= 1) {
                const paramName = parts[0].replace(/^IN\s+/i, ''); // Rimuovi "IN" se presente
                const cleanName = paramName.replace(/[^a-zA-Z0-9_]/g, '');

                // Determina il tipo e il valore predefinito
                let paramType = parts.slice(1).join(' ');
                let defaultValue = '';

                // Imposta valori predefiniti in base al nome e al tipo del parametro
                if (cleanName.includes('schema') && selectedSchema) {
                    defaultValue = selectedSchema;
                } else if (cleanName.includes('table') && selectedTable) {
                    defaultValue = selectedTable;
                } else if (paramType) {
                    const lowerType = paramType.toLowerCase();
                    if (lowerType.includes('int') || lowerType.includes('numeric') || lowerType.includes('float')) {
                        defaultValue = 0;
                    } else if (lowerType.includes('bool')) {
                        defaultValue = false;
                    } else if (lowerType.includes('json') || lowerType.includes('jsonb')) {
                        defaultValue = '{}';
                    } else if (lowerType.includes('array')) {
                        defaultValue = '[]';
                    } else if (lowerType.includes('uuid')) {
                        defaultValue = '';
                    } else if (lowerType.includes('date') || lowerType.includes('time')) {
                        defaultValue = new Date().toISOString();
                    }
                }

                paramsObj[cleanName] = {
                    name: cleanName,
                    type: paramType || 'unknown',
                    value: defaultValue,
                    originalName: paramName // Mantieni il nome originale per l'invio
                };
            }
        });

        return paramsObj;
    };

    // Funzione per iniziare l'esecuzione della funzione
    const startExecutingFunction = () => {
        if (selectedFunction) {
            // Analizza gli argomenti della funzione
            const params = parseFunctionArguments(selectedFunction.function_arguments);
            setFunctionParams(params);
            setIsExecutingFunction(true);
            setFunctionResult(null);
            setFunctionExecutionError('');
            setFunctionExecutionSuccess('');
        }
    };

    // Funzione per gestire il cambio di valore nei parametri
    const handleParamChange = (paramName, value) => {
        setFunctionParams(prev => ({
            ...prev,
            [paramName]: {
                ...prev[paramName],
                value: value
            }
        }));
    };

    // Funzione per eseguire la funzione con i parametri specificati
    const executeFunction = async () => {
        if (!selectedFunction) return;

        try {
            setUpdateFunctionLoading(true);
            setFunctionExecutionError('');
            setFunctionExecutionSuccess('');

            // Ottieni il client in base al tipo di chiave selezionato
            const client = getClient();

            // Prepara i parametri per l'esecuzione
            const execParams = {};
            Object.entries(functionParams).forEach(([key, paramInfo]) => {
                const value = paramInfo.value;
                const type = paramInfo.type.toLowerCase();
                const originalName = paramInfo.originalName || key;

                // Converti il valore in base al tipo
                if (type.includes('json') || type.includes('jsonb')) {
                    try {
                        execParams[originalName] = JSON.parse(value);
                    } catch (e) {
                        throw new Error(`Il parametro ${key} deve essere un JSON valido`);
                    }
                } else if (type.includes('int') && !isNaN(parseInt(value))) {
                    execParams[originalName] = parseInt(value);
                } else if ((type.includes('float') || type.includes('numeric')) && !isNaN(parseFloat(value))) {
                    execParams[originalName] = parseFloat(value);
                } else if (type.includes('bool')) {
                    execParams[originalName] = value === 'true' || value === true;
                } else if (type.includes('array')) {
                    try {
                        execParams[originalName] = JSON.parse(value);
                        if (!Array.isArray(execParams[originalName])) {
                            throw new Error(`Il parametro ${key} deve essere un array`);
                        }
                    } catch (e) {
                        throw new Error(`Il parametro ${key} deve essere un array valido`);
                    }
                } else {
                    execParams[originalName] = value;
                }
            });

            // Aggiungi informazioni di debug
            console.log('Esecuzione funzione:', selectedFunction.schema_name + '.' + selectedFunction.function_name);
            console.log('Parametri:', execParams);

            let result;

            // Gestisci diversamente in base allo schema
            if (selectedFunction.schema_name === 'public') {
                // Per le funzioni nello schema public, possiamo chiamarle direttamente
                const { data, error } = await client.rpc(
                    selectedFunction.function_name,
                    execParams
                );

                if (error) throw error;
                result = data;

                // Aggiungi informazioni di debug
                console.log('Risultato diretto:', result);
            } else {
                // Per le funzioni in altri schemi, dobbiamo usare un approccio diverso
                const paramsString = Object.entries(execParams)
                    .map(([key, value]) => {
                        if (typeof value === 'string') {
                            return `'${value.replace(/'/g, "''")}'`;
                        } else if (typeof value === 'object') {
                            return `'${JSON.stringify(value).replace(/'/g, "''")}'::jsonb`;
                        } else {
                            return value;
                        }
                    })
                    .join(', ');

                // Costruisci la query SQL per chiamare la funzione direttamente
                const sqlQuery = `SELECT * FROM ${selectedFunction.schema_name}.${selectedFunction.function_name}(${paramsString})`;

                // Aggiungi informazioni di debug
                console.log('Query SQL:', sqlQuery);

                // Usa la funzione con privilegi elevati se stiamo usando la chiave service_role
                const functionName = keyType === 'service_role' ? 'execute_sql_elevated' : 'execute_sql';

                const { data, error } = await client.rpc(functionName, {
                    sql_query: sqlQuery
                });

                if (error) throw error;

                // Aggiungi informazioni di debug
                console.log('Risultato execute_sql:', data);

                // Il risultato è nell'array data, dobbiamo estrarlo
                if (Array.isArray(data) && data.length > 0) {
                    // Se il risultato è un array di oggetti con una sola proprietà, estraiamo il valore
                    if (data.length === 1 && Object.keys(data[0]).length === 1) {
                        const firstKey = Object.keys(data[0])[0];
                        result = data[0][firstKey];
                    } else {
                        result = data;
                    }
                } else {
                    result = data;
                }
            }

            // Imposta il risultato
            setFunctionResult(result);
            setFunctionExecutionSuccess('Funzione eseguita con successo!');

        } catch (error) {
            console.error('Errore nell\'esecuzione della funzione:', error);
            setFunctionExecutionError(`Errore nell'esecuzione della funzione: ${error.message}`);
        } finally {
            setUpdateFunctionLoading(false);
        }
    };

    // Funzione per annullare l'esecuzione
    const cancelExecuting = () => {
        setIsExecutingFunction(false);
        setFunctionParams({});
        setFunctionResult(null);
        setFunctionExecutionError('');
        setFunctionExecutionSuccess('');
    };

    // Funzione per formattare il risultato JSON
    const formatJsonResult = (result) => {
        try {
            if (typeof result === 'object') {
                return JSON.stringify(result, null, 2);
            }
            return String(result);
        } catch (e) {
            return String(result);
        }
    };

    // Renderizza la sezione di ricerca funzioni
    const renderFunctionSearchSection = () => {
        return (
            <div className="bg-white p-4 rounded shadow mb-6">
                <h2 className="text-xl font-semibold mb-3">Ricerca Funzioni SQL</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    {/* Filtro Schema */}
                    <div>
                        <label className="block mb-2 font-medium">Schema:</label>
                        <select
                            value={schemaFilter}
                            onChange={(e) => setSchemaFilter(e.target.value)}
                            className="p-2 border rounded w-full"
                        >
                            <option value="%">Tutti gli schemi</option>
                            {schemas.map(schema => (
                                <option key={schema} value={schema}>
                                    {schema}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Filtro Tipo Sicurezza */}
                    <div>
                        <label className="block mb-2 font-medium">Tipo Sicurezza:</label>
                        <select
                            value={securityTypeFilter}
                            onChange={(e) => setSecurityTypeFilter(e.target.value)}
                            className="p-2 border rounded w-full"
                        >
                            <option value="%">Tutti i tipi</option>
                            <option value="SECURITY DEFINER">SECURITY DEFINER</option>
                            <option value="SECURITY INVOKER">SECURITY INVOKER</option>
                            <option value="custom">Personalizzato</option>
                        </select>

                        {securityTypeFilter === 'custom' && (
                            <input
                                type="text"
                                value={customSecurityTypeFilter}
                                onChange={(e) => setCustomSecurityTypeFilter(e.target.value)}
                                placeholder="Inserisci filtro personalizzato..."
                                className="mt-2 p-2 border rounded w-full"
                            />
                        )}
                    </div>
                </div>

                <button
                    onClick={searchCustomFunctions}
                    disabled={functionSearchLoading}
                    className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
                >
                    {functionSearchLoading ? 'Ricerca...' : 'Cerca Funzioni'}
                </button>

                {functionSearchError && (
                    <div className="mt-4 p-3 bg-red-100 text-red-700 rounded">
                        <strong>Errore:</strong> {functionSearchError}
                    </div>
                )}

                {/* Lista delle funzioni trovate */}
                <div className="mt-4">
                    <h3 className="font-semibold mb-2">Funzioni Trovate ({customFunctions.length})</h3>

                    {functionSearchLoading && <p>Ricerca in corso...</p>}

                    {!functionSearchLoading && customFunctions.length === 0 && (
                        <p className="text-gray-500">Nessuna funzione trovata</p>
                    )}

                    {customFunctions.length > 0 && (
                        <div className="max-h-120 overflow-y-auto border rounded"> {/* Altezza aumentata */}
                            <table className="w-full border-collapse">
                                <thead className="bg-gray-100 sticky top-0">
                                    <tr>
                                        <th className="border p-2 text-left">Schema</th>
                                        <th className="border p-2 text-left">Funzione</th>
                                        <th className="border p-2 text-left">Sicurezza</th>
                                        <th className="border p-2 text-left">Azioni</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {customFunctions.map((func, index) => (
                                        <tr key={index} className={`hover:bg-gray-50 ${selectedFunction && selectedFunction.schema_name === func.schema_name && selectedFunction.function_name === func.function_name ? 'bg-blue-50' : ''}`}>
                                            <td className="border p-2">{func.schema_name}</td>
                                            <td className="border p-2">{func.function_name}</td>
                                            <td className="border p-2">
                                                <span className={`px-2 py-1 rounded text-xs ${func.security_type === 'SECURITY DEFINER' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                                                    {func.security_type}
                                                </span>
                                            </td>
                                            <td className="border p-2">
                                                <button
                                                    onClick={() => showFunctionDetails(func)}
                                                    className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200"
                                                >
                                                    Dettagli
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Dettagli della funzione selezionata */}
                {selectedFunction && (
                    <div className="mt-4 p-4 border rounded bg-gray-50">
                        <h3 className="font-semibold mb-2">
                            {selectedFunction.schema_name}.{selectedFunction.function_name}
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                                <p className="font-medium">Argomenti:</p>
                                <p className="font-mono text-sm bg-white p-2 rounded border">
                                    {selectedFunction.function_arguments || 'Nessun argomento'}
                                </p>
                            </div>

                            <div>
                                <p className="font-medium">Sicurezza:</p>
                                <p className={`font-mono text-sm p-2 rounded border ${selectedFunction.security_type === 'SECURITY DEFINER' ? 'bg-yellow-50' : 'bg-green-50'}`}>
                                    {selectedFunction.security_type}
                                </p>
                            </div>
                        </div>

                        {/* Descrizione con possibilità di modifica */}
                        <div className="mb-4">
                            <div className="flex justify-between items-center mb-1">
                                <p className="font-medium">Descrizione:</p>
                                {!isEditingDescription && (
                                    <button
                                        onClick={startEditingDescription}
                                        className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200"
                                    >
                                        Modifica
                                    </button>
                                )}
                            </div>

                            {isEditingDescription ? (
                                <div>
                                    <textarea
                                        value={editedDescription}
                                        onChange={(e) => setEditedDescription(e.target.value)}
                                        className="w-full p-2 border rounded font-mono text-sm"
                                        rows="3"
                                        placeholder="Inserisci una descrizione..."
                                    />
                                    <div className="flex gap-2 mt-2">
                                        <button
                                            onClick={updateFunctionDescription}
                                            disabled={updateFunctionLoading}
                                            className="px-3 py-1 bg-green-100 text-green-700 rounded text-sm hover:bg-green-200 disabled:opacity-50"
                                        >
                                            {updateFunctionLoading ? 'Salvataggio...' : 'Salva'}
                                        </button>
                                        <button
                                            onClick={cancelEditing}
                                            disabled={updateFunctionLoading}
                                            className="px-3 py-1 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200 disabled:opacity-50"
                                        >
                                            Annulla
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <p className="bg-white p-2 rounded border">
                                    {selectedFunction.function_description || 'Nessuna descrizione'}
                                </p>
                            )}
                        </div>

                        {/* Definizione con possibilità di modifica e copia */}
                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <p className="font-medium">Definizione:</p>
                                <div className="flex gap-2">
                                    {!isEditingFunction && (
                                        <>
                                            <button
                                                onClick={() => copyWithInstructions(selectedFunction.function_definition, 'function')}
                                                className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs hover:bg-purple-200"
                                            >
                                                Copia per SQL Editor
                                            </button>
                                            <button
                                                onClick={openSqlEditor}
                                                className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs hover:bg-green-200"
                                            >
                                                Apri SQL Editor
                                            </button>
                                            <button
                                                onClick={startExecutingFunction}
                                                className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-xs hover:bg-indigo-200"
                                            >
                                                Esegui Funzione
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>

                            {isEditingFunction ? (
                                <div>
                                    <textarea
                                        value={editedFunctionDefinition}
                                        onChange={(e) => setEditedFunctionDefinition(e.target.value)}
                                        className="w-full p-2 border rounded font-mono text-xs"
                                        rows="20"
                                        placeholder="Inserisci la definizione della funzione..."
                                    />
                                    <div className="flex gap-2 mt-2">
                                        <button
                                            onClick={updateFunctionDefinitionViaRest}
                                            disabled={updateFunctionLoading}
                                            className="px-3 py-1 bg-green-100 text-green-700 rounded text-sm hover:bg-green-200 disabled:opacity-50"
                                        >
                                            {updateFunctionLoading ? 'Salvataggio...' : 'Salva'}
                                        </button>
                                        <button
                                            onClick={async () => {
                                                const result = checkSqlSyntax(editedFunctionDefinition);
                                                if (result.isValid) {
                                                    setUpdateFunctionSuccess('La sintassi della funzione sembra valida. Nota: questa è solo una verifica basilare.');
                                                } else {
                                                    setUpdateFunctionError(`Errore di sintassi: ${result.error}`);
                                                }
                                            }}
                                            className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200"
                                        >
                                            Verifica Sintassi
                                        </button>
                                        <button
                                            onClick={cancelEditing}
                                            disabled={updateFunctionLoading}
                                            className="px-3 py-1 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200 disabled:opacity-50"
                                        >
                                            Annulla
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <pre className="font-mono text-xs bg-white p-2 rounded border overflow-x-auto max-h-80">
                                    {selectedFunction.function_definition}
                                </pre>
                            )}
                        </div>

                        {/* Messaggi di successo o errore */}
                        {updateFunctionError && (
                            <div className="mt-4 p-3 bg-red-100 text-red-700 rounded">
                                <strong>Errore:</strong> {updateFunctionError}
                            </div>
                        )}

                        {updateFunctionSuccess && (
                            <div className="mt-4 p-3 bg-green-100 text-green-700 rounded">
                                <strong>Successo:</strong> {updateFunctionSuccess}
                            </div>
                        )}

                        {/* Sezione per eseguire la funzione */}
                        {isExecutingFunction && selectedFunction && (
                            <div className="mt-4 p-4 border rounded">
                                <h3 className="font-semibold mb-2">Esegui Funzione: {selectedFunction.function_name}</h3>

                                {/* Debug dei parametri */}
                                {false && process.env.NODE_ENV === 'development' && (
                                    <div className="mb-2 p-2 bg-gray-100 text-xs">
                                        <p>Debug parametri:</p>
                                        <pre>{JSON.stringify(selectedFunction.parameters, null, 2)}</pre>
                                        <pre>{JSON.stringify(functionParams, null, 2)}</pre>
                                    </div>
                                )}

                                {/* Verifica che parameters esista e abbia elementi */}
                                {selectedFunction.parameters && selectedFunction.parameters.length > 0 ? (
                                    <div className="mb-4">
                                        <p className="font-medium mb-2">Parametri ({selectedFunction.parameters.length}):</p>

                                        {Object.entries(functionParams).map(([paramName, paramInfo]) => (
                                            <div key={paramName} className="mb-2">
                                                <label className="block mb-1 text-sm font-medium">
                                                    {paramName}: <span className="text-xs text-gray-500">({paramInfo.type})</span>
                                                </label>
                                                <div className="flex gap-2">
                                                    <input
                                                        type="text"
                                                        value={paramInfo.value}
                                                        onChange={(e) => handleParamChange(paramName, e.target.value)}
                                                        className="w-full p-2 border rounded text-sm"
                                                        placeholder={`Valore per ${paramName}`}
                                                    />
                                                    {/* Pulsanti per valori predefiniti */}
                                                    {paramName.includes('schema') && (
                                                        <button
                                                            onClick={() => handleParamChange(paramName, selectedSchema)}
                                                            className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200"
                                                            title="Usa lo schema selezionato"
                                                        >
                                                            Schema
                                                        </button>
                                                    )}
                                                    {paramName.includes('table') && (
                                                        <button
                                                            onClick={() => handleParamChange(paramName, selectedTable)}
                                                            className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs hover:bg-green-200"
                                                            title="Usa la tabella selezionata"
                                                        >
                                                            Tabella
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="mb-4 text-gray-500">
                                        Questa funzione non ha parametri o non è stato possibile analizzarli.
                                        <br />
                                        Argomenti: <code>{selectedFunction.function_arguments || 'nessuno'}</code>
                                    </p>
                                )}

                                <div className="flex gap-2">
                                    <button
                                        onClick={executeFunction}
                                        disabled={updateFunctionLoading}
                                        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
                                    >
                                        {updateFunctionLoading ? 'Esecuzione...' : 'Esegui Funzione'}
                                    </button>

                                    <button
                                        onClick={() => setIsExecutingFunction(false)}
                                        className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                                    >
                                        Annulla
                                    </button>
                                </div>

                                {functionExecutionError && (
                                    <div className="mt-4 p-3 bg-red-100 text-red-700 rounded">
                                        <strong>Errore:</strong> {functionExecutionError}
                                    </div>
                                )}

                                {functionExecutionSuccess && (
                                    <div className="mt-4 p-3 bg-green-100 text-green-700 rounded">
                                        <strong>Successo:</strong> {functionExecutionSuccess}
                                    </div>
                                )}

                                {functionResult !== null && (
                                    <div className="mt-4">
                                        <h4 className="font-medium mb-2">Risultato:</h4>
                                        <pre className="p-3 bg-gray-100 rounded overflow-x-auto">
                                            {typeof functionResult === 'object'
                                                ? JSON.stringify(functionResult, null, 2)
                                                : String(functionResult)}
                                        </pre>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    };

    // Aggiungi questa funzione al componente SupabaseAdvancedDebug
    const grantPermissions = async () => {
        if (!selectedTable || !selectedSchema) {
            setError('Seleziona uno schema e una tabella prima di concedere i permessi');
            return;
        }

        try {
            setLoading(true);
            setError('');
            setResult('');

            // Ottieni il client in base al tipo di chiave selezionato
            const client = getClient();

            // Esegui la funzione per concedere i permessi
            const { data, error } = await client.rpc('grant_standard_permissions', {
                schema_name: selectedSchema,
                table_name: selectedTable
            });

            if (error) throw error;

            setResult(`Risultato: ${data}`);

            // Aggiorna lo stato dei permessi per la tabella
            const hasPermissions = await updateTablePermission(selectedTable);

            // Forza un aggiornamento delle tabelle
            setTables([...tables]);
        } catch (error) {
            console.error(`Errore nella concessione dei permessi per ${selectedSchema}.${selectedTable}:`, error);
            setError(`Errore nella concessione dei permessi: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    // Funzione per revocare i permessi
    const revokePermissions = async () => {
        if (!selectedTable || !selectedSchema) {
            setError('Seleziona uno schema e una tabella prima di revocare i permessi');
            return;
        }

        try {
            setLoading(true);
            setError('');
            setResult('');

            // Ottieni il client in base al tipo di chiave selezionato
            const client = getClient();

            // Esegui la funzione per revocare i permessi
            const { data, error } = await client.rpc('revoke_standard_permissions', {
                schema_name: selectedSchema,
                table_name: selectedTable
            });

            if (error) throw error;

            setResult(`Risultato: ${data}`);

            // Aggiorna lo stato dei permessi per la tabella
            const hasPermissions = await updateTablePermission(selectedTable);

            // Forza un aggiornamento delle tabelle
            setTables([...tables]);
        } catch (error) {
            console.error(`Errore nella revoca dei permessi per ${selectedSchema}.${selectedTable}:`, error);
            setError(`Errore nella revoca dei permessi: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    // Aggiungi una funzione per aggiornare i permessi di una singola tabella
    const updateTablePermission = async (tableName) => {
        try {
            // Utilizza la funzione checkTablePermissions che abbiamo già implementato
            const hasPermissions = await checkTablePermissions(selectedSchema, tableName);
            console.log(`Risultato verifica permessi per ${tableName}: ${hasPermissions} (tipo: ${typeof hasPermissions})`);

            // Aggiorna lo stato dei permessi con un nuovo oggetto per forzare il re-render
            const newPermissions = { ...tablePermissions };
            newPermissions[tableName] = hasPermissions;
            setTablePermissions(newPermissions);

            // Incrementa il contatore per forzare il re-render
            setUpdateCounter(prev => prev + 1);

            console.log(`Aggiornato permesso per ${tableName}: ${hasPermissions}`);
            console.log('Nuovo stato tablePermissions:', newPermissions);

            return hasPermissions;
        } catch (error) {
            console.error(`Errore nella verifica dei permessi per ${selectedSchema}.${tableName}:`, error);
            return false;
        }
    };

    // Modifica la funzione che gestisce il cambio di schema
    const handleSchemaChange = (e) => {
        const newSchema = e.target.value;
        setSelectedSchema(newSchema);
        setSelectedTable('');
        setTableColumns([]);
        setFormData({});
        setItems([]);  // Pulisci gli elementi quando cambia lo schema
        setError('');
        setResult('');
    };

    return (
        <div className="container mx-auto p-4">
            {/* Stile CSS personalizzato */}
            <style>{customStyles}</style>

            <h1 className="text-2xl font-bold mb-4">Debug Avanzato Supabase</h1>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Colonna sinistra: Funzionalità esistenti */}
                <div>
                    {/* Selezione del tipo di chiave */}
                    <div className="bg-white p-4 rounded shadow mb-6">
                        <h2 className="text-xl font-semibold mb-3">Tipo di Chiave</h2>

                        <div className="flex flex-wrap gap-4 mb-4">
                            <label className="flex items-center">
                                <input
                                    type="radio"
                                    name="keyType"
                                    checked={keyType === 'anon'}
                                    onChange={() => setKeyType('anon')}
                                    className="mr-2"
                                />
                                ANON Key
                            </label>

                            <label className="flex items-center">
                                <input
                                    type="radio"
                                    name="keyType"
                                    checked={keyType === 'service_role'}
                                    onChange={() => setKeyType('service_role')}
                                    className="mr-2"
                                />
                                SERVICE_ROLE Key
                            </label>

                            <label className="flex items-center">
                                <input
                                    type="radio"
                                    name="keyType"
                                    checked={keyType === 'custom'}
                                    onChange={() => setKeyType('custom')}
                                    className="mr-2"
                                />
                                Chiave Personalizzata
                            </label>
                        </div>

                        {keyType === 'custom' && (
                            <div className="mb-4">
                                <div className="flex flex-col space-y-2">
                                    <label className="font-medium">Inserisci la tua chiave:</label>
                                    <textarea
                                        value={customKey}
                                        onChange={(e) => setCustomKey(e.target.value)}
                                        className="w-full p-2 border rounded font-mono text-sm"
                                        rows="3"
                                        placeholder="Incolla qui la tua chiave JWT..."
                                    />

                                    <div className="flex flex-wrap gap-2 mt-2">
                                        <button
                                            onClick={() => setPresetKey('anon')}
                                            className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200"
                                        >
                                            Usa ANON Key
                                        </button>
                                        <button
                                            onClick={() => setPresetKey('service_role')}
                                            className="px-3 py-1 bg-purple-100 text-purple-700 rounded text-sm hover:bg-purple-200"
                                        >
                                            Usa SERVICE_ROLE Key
                                        </button>
                                        <button
                                            onClick={() => setCustomKey('')}
                                            className="px-3 py-1 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200"
                                        >
                                            Cancella
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="text-sm text-gray-600 p-2 bg-gray-50 rounded">
                            <p><strong>Chiave attuale:</strong> {keyType === 'custom' ? 'Personalizzata' : (keyType === 'anon' ? 'ANON' : 'SERVICE_ROLE')}</p>
                            <p><strong>Valore:</strong> <span className="font-mono text-xs break-all">
                                {keyType === 'anon' ? anonKey : (keyType === 'service_role' ? serviceRoleKey : customKey)}
                            </span></p>
                        </div>
                    </div>

                    {/* Selezione dello schema */}
                    <div className="bg-white p-4 rounded shadow mb-6">
                        <h2 className="text-xl font-semibold mb-3">Schema Database</h2>

                        {loading && schemas.length === 0 && <p>Caricamento schemi...</p>}

                        {!loading && schemas.length === 0 && (
                            <p className="text-red-500">Nessuno schema trovato</p>
                        )}

                        {schemas.length > 0 && (
                            <div className="mb-4">
                                <label className="block mb-2 font-medium">Seleziona Schema:</label>
                                <div className="flex items-center">
                                    <select
                                        value={selectedSchema}
                                        onChange={(e) => setSelectedSchema(e.target.value)}
                                        className="p-2 border rounded w-full md:w-64"
                                    >
                                        {schemas.map(schema => (
                                            <option key={schema} value={schema}>
                                                {schema}
                                            </option>
                                        ))}
                                    </select>

                                    <button
                                        onClick={fetchSchemas}
                                        disabled={loading}
                                        className="ml-2 bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 disabled:opacity-50"
                                    >
                                        {loading ? '...' : '↻'}
                                    </button>
                                </div>

                                <p className="mt-2 text-sm text-gray-600">
                                    Schema attuale: <span className="font-semibold">{selectedSchema}</span>
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Elenco delle tabelle */}
                    <div className="bg-white p-4 rounded shadow mb-6">
                        <h2 className="text-xl font-semibold mb-3">Tabelle in {selectedSchema}</h2>

                        {loading && tables.length === 0 && <p>Caricamento tabelle...</p>}

                        {!loading && tables.length === 0 && (
                            <p className="text-yellow-500">Nessuna tabella trovata nello schema {selectedSchema}</p>
                        )}

                        {tables.length > 0 && (
                            <>
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 mb-4">
                                    {tables.map(table => {
                                        // Determina il colore in base ai permessi
                                        const hasPermissions = tablePermissions[table] === true;

                                        // Usa classi di colore hardcoded
                                        let bgColor, textColor, borderColor;
                                        if (hasPermissions) {
                                            bgColor = "lightgreen";
                                            textColor = "darkgreen";
                                            borderColor = "green";
                                        } else {
                                            bgColor = "lightcoral";
                                            textColor = "darkred";
                                            borderColor = "red";
                                        }

                                        // Stile per la selezione
                                        if (selectedTable === table) {
                                            borderColor = "blue";
                                        }

                                        // Calcola la dimensione del font in base alla lunghezza del testo
                                        // Più lungo è il testo, più piccolo sarà il font
                                        const calculateFontSize = (text) => {
                                            const length = text.length;
                                            if (length <= 10) return '1rem';      // Testo corto: font normale
                                            if (length <= 15) return '0.9rem';    // Testo medio: font leggermente ridotto
                                            if (length <= 20) return '0.8rem';    // Testo lungo: font ridotto
                                            if (length <= 25) return '0.7rem';    // Testo molto lungo: font molto ridotto
                                            return '0.6rem';                      // Testo estremamente lungo: font minimo
                                        };

                                        const fontSize = calculateFontSize(table);

                                        return (
                                            <div
                                                key={table}
                                                style={{
                                                    padding: '8px',
                                                    backgroundColor: bgColor,
                                                    color: textColor,
                                                    border: `2px solid ${borderColor}`,
                                                    borderRadius: '4px',
                                                    cursor: 'pointer',
                                                    margin: '2px',
                                                    fontWeight: selectedTable === table ? 'bold' : 'normal',
                                                    display: 'flex',
                                                    justifyContent: 'center',
                                                    alignItems: 'center',
                                                    textAlign: 'center',
                                                    height: '40px',
                                                    width: '100%',
                                                    overflow: 'hidden'
                                                }}
                                                onClick={() => handleTableSelection(table)}
                                                title={table + (hasPermissions ? " (ha tutti i permessi standard)" : " (non ha tutti i permessi standard)")}
                                            >
                                                <div style={{
                                                    width: '100%',
                                                    fontSize: fontSize,
                                                    lineHeight: '1.2',
                                                    padding: '0 4px'
                                                }}>
                                                    {table}
                                                    {hasPermissions ? " ✓" : " ✗"}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                <div className="flex gap-2 mb-4">
                                    <button
                                        onClick={fetchTables}
                                        disabled={loading}
                                        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
                                    >
                                        {loading ? 'Caricamento...' : 'Aggiorna Tabelle'}
                                    </button>

                                    {/* Pulsante per concedere i permessi */}
                                    <button
                                        onClick={grantPermissions}
                                        disabled={loading || !selectedTable}
                                        className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600 disabled:opacity-50"
                                        title="Concedi i permessi standard (SELECT per anon, CRUD per authenticated) alla tabella selezionata"
                                    >
                                        {loading ? 'Concessione...' : 'Concedi Permessi'}
                                    </button>

                                    {/* Nuovo pulsante per revocare i permessi */}
                                    <button
                                        onClick={revokePermissions}
                                        disabled={loading || !selectedTable}
                                        className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 disabled:opacity-50"
                                        title="Revoca i permessi standard (SELECT per anon, CRUD per authenticated) dalla tabella selezionata"
                                    >
                                        {loading ? 'Revoca...' : 'Revoca Permessi'}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Operazioni sulla tabella selezionata */}
                    {selectedTable && (
                        <div className="bg-white p-4 rounded shadow mb-6">
                            <h2 className="text-xl font-semibold mb-3">Operazioni su {selectedSchema}.{selectedTable}</h2>

                            <div className="flex flex-wrap gap-2 mb-4">
                                <button
                                    onClick={fetchItems}
                                    disabled={loading}
                                    className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
                                >
                                    {loading ? 'Caricamento...' : 'Carica Elementi'}
                                </button>

                                <button
                                    onClick={checkRLS}
                                    disabled={loading}
                                    className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600 disabled:opacity-50"
                                >
                                    {loading ? 'Verifica...' : 'Verifica RLS'}
                                </button>
                            </div>

                            {/* Form di inserimento dinamico */}
                            <div className="mt-4">
                                <h3 className="text-lg font-semibold mb-2">Modifica Record</h3>

                                {loading && tableColumns.length === 0 && <p>Caricamento campi...</p>}

                                {!loading && tableColumns.length === 0 && (
                                    <p className="text-yellow-500">Nessun campo disponibile per l'inserimento</p>
                                )}

                                {tableColumns.length > 0 && (
                                    <>
                                        <div className="grid grid-cols-1 gap-3">
                                            {tableColumns.map(column => {
                                                // Adatta i nomi delle proprietà alla struttura effettiva
                                                const columnName = column.column_name;
                                                const columnType = column.data_type;

                                                return (
                                                    <div key={columnName} className="flex items-center">
                                                        <label
                                                            className="text-sm font-medium text-gray-700 w-1/3 pr-2 truncate"
                                                            title={`${columnName} (${columnType || 'unknown type'})`}
                                                        >
                                                            {columnName}:
                                                        </label>

                                                        <div className="w-2/3">
                                                            {renderFormField(column)}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        <div className="mt-4 flex justify-end">
                                            <button
                                                onClick={insertItem}
                                                disabled={loading}
                                                className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:opacity-50"
                                            >
                                                {loading ? 'Salvataggio...' : 'Salva'}
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Risultati e errori */}
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

                            {/* Lista elementi */}
                            <div className="mt-6">
                                <h3 className="text-lg font-semibold mb-2">Elementi in {selectedSchema}.{selectedTable}</h3>

                                {loading && items.length === 0 && <p>Caricamento elementi...</p>}

                                {!loading && items.length === 0 && (
                                    <p className="text-gray-500">Nessun elemento trovato</p>
                                )}

                                {items.length > 0 && (
                                    <div className="overflow-x-auto">
                                        <table className="w-full border-collapse">
                                            <thead>
                                                <tr className="bg-gray-100">
                                                    {Object.keys(items[0]).map(key => (
                                                        <th key={key} className="border p-2 text-left text-sm">
                                                            {key}
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {items.map((item, index) => (
                                                    <tr key={index} className="hover:bg-gray-50">
                                                        {Object.values(item).map((value, i) => (
                                                            <td key={i} className="border p-2 text-sm">
                                                                {typeof value === 'object' ? JSON.stringify(value) : String(value || '-')}
                                                            </td>
                                                        ))}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Colonna destra: Nuova funzionalità di ricerca funzioni */}
                <div>
                    {renderFunctionSearchSection()}
                </div>
            </div>
        </div>
    );
};

export default SupabaseAdvancedDebug; 