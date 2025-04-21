import React, { useEffect, useState } from 'react';

const EnvDebug = () => {
    const [showValues, setShowValues] = useState(false);

    // Variabili d'ambiente React
    const reactEnv = {
        REACT_APP_SUPABASE_URL: process.env.REACT_APP_SUPABASE_URL,
        REACT_APP_SUPABASE_ANON_KEY: process.env.REACT_APP_SUPABASE_ANON_KEY
    };

    useEffect(() => {
        // Log delle variabili nella console
        console.log('=== VARIABILI D\'AMBIENTE REACT ===');
        console.log('REACT_APP_SUPABASE_URL:', reactEnv.REACT_APP_SUPABASE_URL);
        console.log('REACT_APP_SUPABASE_ANON_KEY:', reactEnv.REACT_APP_SUPABASE_ANON_KEY);
        console.log('Lunghezza ANON_KEY:', reactEnv.REACT_APP_SUPABASE_ANON_KEY ? reactEnv.REACT_APP_SUPABASE_ANON_KEY.length : 'N/A');
    }, []);

    return (
        <div style={{ padding: '20px', fontFamily: 'monospace' }}>
            <h1>Debug Variabili d'Ambiente React</h1>

            <div style={{ marginBottom: '20px' }}>
                <button
                    onClick={() => setShowValues(!showValues)}
                    style={{
                        padding: '8px 15px',
                        backgroundColor: showValues ? '#f44336' : '#4CAF50',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                    }}
                >
                    {showValues ? 'Nascondi valori' : 'Mostra valori'}
                </button>
            </div>

            <div style={{
                backgroundColor: '#f5f5f5',
                padding: '15px',
                borderRadius: '5px',
                border: '1px solid #ddd'
            }}>
                <h2>REACT_APP_SUPABASE_URL</h2>
                <p>Disponibile: <strong>{reactEnv.REACT_APP_SUPABASE_URL ? 'Sì' : 'No'}</strong></p>
                {showValues && (
                    <>
                        <p>Valore: <code>{reactEnv.REACT_APP_SUPABASE_URL || 'Non definito'}</code></p>
                        <p>Lunghezza: {reactEnv.REACT_APP_SUPABASE_URL ? reactEnv.REACT_APP_SUPABASE_URL.length : 0}</p>
                    </>
                )}

                <h2>REACT_APP_SUPABASE_ANON_KEY</h2>
                <p>Disponibile: <strong>{reactEnv.REACT_APP_SUPABASE_ANON_KEY ? 'Sì' : 'No'}</strong></p>
                {showValues && (
                    <>
                        <p>Valore: <code>{reactEnv.REACT_APP_SUPABASE_ANON_KEY || 'Non definito'}</code></p>
                        <p>Lunghezza: {reactEnv.REACT_APP_SUPABASE_ANON_KEY ? reactEnv.REACT_APP_SUPABASE_ANON_KEY.length : 0}</p>

                        <div style={{ marginTop: '20px' }}>
                            <h3>Analisi caratteri</h3>
                            <div style={{
                                display: 'flex',
                                flexWrap: 'wrap',
                                gap: '5px',
                                fontFamily: 'monospace',
                                fontSize: '14px'
                            }}>
                                {reactEnv.REACT_APP_SUPABASE_ANON_KEY && Array.from(reactEnv.REACT_APP_SUPABASE_ANON_KEY).map((char, index) => (
                                    <div key={index} style={{
                                        width: '30px',
                                        height: '30px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        border: '1px solid #ddd',
                                        position: 'relative'
                                    }}>
                                        {char}
                                        <small style={{
                                            position: 'absolute',
                                            bottom: '-18px',
                                            fontSize: '10px'
                                        }}>
                                            {index}
                                        </small>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div style={{ marginTop: '30px' }}>
                            <h3>Versione pulita</h3>
                            <p>
                                <code>
                                    {reactEnv.REACT_APP_SUPABASE_ANON_KEY
                                        ? reactEnv.REACT_APP_SUPABASE_ANON_KEY.trim().replace(/^["']|["']$/g, '').replace(/[\r\n]+/g, '')
                                        : 'Non definito'}
                                </code>
                            </p>
                            <p>Lunghezza dopo pulizia: {
                                reactEnv.REACT_APP_SUPABASE_ANON_KEY
                                    ? reactEnv.REACT_APP_SUPABASE_ANON_KEY.trim().replace(/^["']|["']$/g, '').replace(/[\r\n]+/g, '').length
                                    : 0
                            }</p>
                        </div>
                    </>
                )}
            </div>

            <div style={{ marginTop: '20px' }}>
                <p><strong>Nota:</strong> Queste variabili sono accessibili solo nel codice React compilato, non in file HTML statici.</p>
            </div>
        </div>
    );
};

export default EnvDebug; 