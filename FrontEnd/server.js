const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');
const fetch = require('node-fetch');

const app = express();
const port = process.env.PORT || 3000;

// Middleware per il parsing del JSON
app.use(express.json());

// All'inizio del file
const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || 'http://supabase-kong:8000';

// Gestione diretta dell'autenticazione
app.post('/auth/token', async (req, res) => {
    try {
        console.log('Richiesta di autenticazione ricevuta:', {
            email: req.body.email,
            passwordLength: req.body.password ? req.body.password.length : 0
        });

        const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': process.env.REACT_APP_SUPABASE_ANON_KEY
            },
            body: JSON.stringify({
                email: req.body.email,
                password: req.body.password
            })
        });

        const data = await response.json();
        console.log('Risposta da Supabase:', {
            status: response.status,
            statusText: response.statusText
        });

        // Invia la risposta al client con lo stesso status code
        res.status(response.status).json(data);
    } catch (error) {
        console.error('Errore durante l\'autenticazione:', error);
        res.status(500).json({ error: 'Errore interno del server' });
    }
});

// Proxy per le altre richieste a Supabase
app.use('/auth/v1', createProxyMiddleware({
    target: SUPABASE_URL,
    changeOrigin: true,
    pathRewrite: {
        '^/auth/v1': '/auth/v1'
    }
}));

// Servi i file statici
app.use(express.static(path.join(__dirname, 'build')));

// Tutte le altre richieste vanno all'app React
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

app.listen(port, () => {
    console.log(`Server in ascolto sulla porta ${port}`);
}); 