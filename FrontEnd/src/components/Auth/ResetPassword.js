import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabase/client';

const ResetPassword = () => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [userSession, setUserSession] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const checkSession = async () => {
            const { data, error } = await supabase.auth.getSession();
            if (error) {
                console.error('Errore nel recupero della sessione:', error);
                setError('Si è verificato un errore. Riprova più tardi.');
                return;
            }

            if (!data.session) {
                setError('Sessione non valida. Il link di reset è scaduto o è già stato utilizzato.');
                return;
            }

            setUserSession(data.session);
        };

        checkSession();
    }, []);

    const handleResetPassword = async (e) => {
        e.preventDefault();

        if (!userSession) {
            setError('Nessuna sessione attiva. Richiedi un nuovo link di reset.');
            return;
        }

        if (password !== confirmPassword) {
            setError('Le password non corrispondono');
            return;
        }

        if (password.length < 6) {
            setError('La password deve contenere almeno 6 caratteri');
            return;
        }

        setLoading(true);
        setError('');
        setMessage('');

        try {
            // Aggiorna la password dell'utente
            const { error } = await supabase.auth.updateUser({ password });

            if (error) {
                throw error;
            }

            setMessage('Password aggiornata con successo! Verrai reindirizzato al login.');

            // Dopo aver aggiornato la password, esegui il logout e reindirizza al login
            await supabase.auth.signOut();

            // Reindirizza alla pagina di login dopo 2 secondi
            setTimeout(() => {
                navigate('/login');
            }, 2000);

        } catch (error) {
            console.error('Errore nel reset della password:', error);
            setError(error.message || 'Errore nel reset della password');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">
                <div>
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                        Reimposta la tua password
                    </h2>
                    <p className="mt-2 text-center text-sm text-gray-600">
                        Inserisci la nuova password per il tuo account
                    </p>
                </div>

                {error && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
                        <span className="block sm:inline">{error}</span>
                    </div>
                )}

                {message && (
                    <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative" role="alert">
                        <span className="block sm:inline">{message}</span>
                    </div>
                )}

                {!error && (
                    <form className="mt-8 space-y-6" onSubmit={handleResetPassword}>
                        <div className="rounded-md shadow-sm -space-y-px">
                            <div>
                                <label htmlFor="password" className="sr-only">
                                    Nuova Password
                                </label>
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    required
                                    className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                                    placeholder="Nuova Password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>
                            <div>
                                <label htmlFor="confirm-password" className="sr-only">
                                    Conferma Password
                                </label>
                                <input
                                    id="confirm-password"
                                    name="confirm-password"
                                    type="password"
                                    required
                                    className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                                    placeholder="Conferma Password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                />
                            </div>
                        </div>

                        <div>
                            <button
                                type="submit"
                                disabled={loading || !userSession}
                                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            >
                                {loading ? 'Aggiornamento in corso...' : 'Aggiorna Password'}
                            </button>
                        </div>
                    </form>
                )}

                {error && (
                    <div className="mt-4 text-center">
                        <a href="/forgot-password" className="text-sm font-medium text-indigo-600 hover:text-indigo-500">
                            Richiedi un nuovo link di reset
                        </a>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ResetPassword; 