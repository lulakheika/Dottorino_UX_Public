// Espone le variabili d'ambiente per il debug
window.REACT_APP_SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
window.REACT_APP_SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY;

console.log('Variabili d\'ambiente esposte per il debug:');
console.log('REACT_APP_SUPABASE_URL:', window.REACT_APP_SUPABASE_URL);
console.log('REACT_APP_SUPABASE_ANON_KEY:', window.REACT_APP_SUPABASE_ANON_KEY ? 'Disponibile' : 'Non disponibile'); 