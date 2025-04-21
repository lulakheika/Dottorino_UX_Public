import React, { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './routes/ProtectedRoute';
import Login from './components/Auth/Login';
import Signup from './components/Auth/Signup';
import MainLayout from './components/MainLayout';
import EnvDebug from './pages/EnvDebug';
import SupabaseDebug from './pages/SupabaseDebug';
import SupabaseDebugAlt from './pages/SupabaseDebugAlt';
import SupabaseAdvancedDebug from './pages/SupabaseAdvancedDebug';
import loadingState from './utils/loadingState';
import VerifyCode from './components/Auth/verify';
import ForgotPassword from './components/Auth/ForgotPassword';
import ResetPassword from './components/Auth/ResetPassword';

// Componente wrapper che utilizza il contesto dopo che è stato inizializzato
const AppRoutes = () => {
  const { authMode } = useAuth();

  // Imposta il titolo della finestra
  useEffect(() => {
    document.title = process.env.REACT_APP_WINDOW_TITLE;
  }, []);

  // Se l'autenticazione è disabilitata o in modalità solo ospite, vai direttamente al MainLayout
  if (authMode === 'disabled' || authMode === 'guest-only') {
    return (
      <Routes>
        <Route path="/" element={<MainLayout />} />
        <Route path="/chat/:id" element={<MainLayout />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  // Altrimenti, usa il routing completo con autenticazione
  return (
    <Routes>
      {/* Rotte pubbliche */}
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      {/* Rotte protette */}
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<MainLayout />} />
        <Route path="/chat/:id" element={<MainLayout />} />
        {/* ... altre rotte protette ... */}
      </Route>

      {/* Reindirizza alla pagina di login per rotte non definite */}
      <Route path="*" element={<Navigate to="/login" replace />} />

      {/* Aggiungi la rotta per la pagina di debug */}
      <Route path="/env-debug" element={<EnvDebug />} />
      <Route path="/supabase-debug" element={<SupabaseDebug />} />
      <Route path="/supabase-debug-alt" element={<SupabaseDebugAlt />} />
      <Route path="/debug-advanced" element={<SupabaseAdvancedDebug />} />

      {/* Aggiungi la nuova rotta per la verifica del codice */}
      <Route path="/verify" element={<VerifyCode />} />

      {/* Nuove rotte per il recupero password */}
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
    </Routes>
  );
};

function App() {
  // Imposta il titolo della finestra
  useEffect(() => {
    document.title = process.env.REACT_APP_WINDOW_TITLE;

    // Imposta lo stato dell'app come montata
    loadingState.setAppMounted(true);

    // Reset delle operazioni in stallo al montaggio dell'app
    loadingState.resetStaleOperations();

    // Quando l'app si smonta (cosa che può succedere con StrictMode), 
    // resettiamo lo stato di caricamento
    return () => {
      // Clear delle collezioni
      loadingState.loadedConversations.clear();
      loadingState.initializedComponents.clear();
      loadingState.setAppMounted(false);
    };
  }, []);

  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;