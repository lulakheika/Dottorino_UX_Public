import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = () => {
    const { user, loading } = useAuth();

    // Mostra un loader mentre verifichiamo l'autenticazione
    if (loading) {
        return <div>Caricamento...</div>;
    }

    // Reindirizza alla pagina di login se l'utente non è autenticato
    if (!user) {
        return <Navigate to="/login" replace />;
    }

    // Renderizza i componenti figli se l'utente è autenticato
    return <Outlet />;
};

export default ProtectedRoute; 