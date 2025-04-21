import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css"; // Assicurati che qui importi i file CSS di Tailwind

// Inietta le variabili d'ambiente in window.env
window.env = {
  REACT_APP_SUPABASE_URL: process.env.REACT_APP_SUPABASE_URL,
  REACT_APP_SUPABASE_ANON_KEY: process.env.REACT_APP_SUPABASE_ANON_KEY,
  REACT_APP_API_BASE_URL: process.env.REACT_APP_API_BASE_URL,
  REACT_APP_SUPABASE_SCHEMA: process.env.REACT_APP_SUPABASE_SCHEMA || 'dottorino'
};

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  // Disabilita StrictMode durante lo sviluppo
  <React.StrictMode>
    <App />
  </React.StrictMode>
); 