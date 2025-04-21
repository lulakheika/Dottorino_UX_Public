// Endpoint per recuperare le variabili d'ambiente in modo sicuro
const express = require('express');
const router = express.Router();

router.get('/api/env-debug', (req, res) => {
    // Restituisci solo le variabili d'ambiente specifiche per il debug
    res.json({
        REACT_APP_SUPABASE_URL: process.env.REACT_APP_SUPABASE_URL || 'non disponibile',
        REACT_APP_SUPABASE_ANON_KEY: process.env.REACT_APP_SUPABASE_ANON_KEY || 'non disponibile'
    });
});

module.exports = router; 