import React from 'react';

const EnvTest = () => {
    // Stampa la variabile d'ambiente direttamente
    const key = process.env.REACT_APP_SUPABASE_ANON_KEY;

    return (
        <div>
            <h1>Test Variabile d'Ambiente</h1>
            <p>Valore: {key}</p>
            <p>Lunghezza: {key ? key.length : 0}</p>
            <p>È uguale alla chiave hardcoded? {
                key === 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlLWRlbW8iLCJpYXQiOjE2NDE3NjkyMDAsImV4cCI6MTc5OTUzNTYwMH0.K3i4ppC1sxZR48hjkfLBwsu8g4_aJYMGenXHqRI-iiU'
                    ? 'Sì' : 'No'
            }</p>
        </div>
    );
};

export default EnvTest; 