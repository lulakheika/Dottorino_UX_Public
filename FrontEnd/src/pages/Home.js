import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

function Home() {
    const { user } = useAuth();

    // Controlla se l'utente non ha confermato l'email
    const needsEmailConfirmation = user && !user.email_confirmed_at;

    return (
        <div>
            {needsEmailConfirmation && (
                <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-4" role="alert">
                    <p className="font-bold">Conferma la tua email</p>
                    <p>
                        Per accedere a tutte le funzionalità, conferma la tua email.
                        <br />
                        <Link to="/verify" className="underline">
                            Hai il codice di verifica? Confermalo qui
                        </Link>
                    </p>
                </div>
            )}

            {/* Resto del contenuto della home */}
        </div>
    );
}

export default Home; 