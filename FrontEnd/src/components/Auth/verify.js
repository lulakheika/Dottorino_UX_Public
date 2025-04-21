import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabase/client';

const VerifyCode = () => {
    const [email, setEmail] = useState('');
    const [token, setToken] = useState('');
    const [loading, setLoading] = useState(false);
    const [resendLoading, setResendLoading] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const navigate = useNavigate();

    const handleVerify = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            // Chiama l'API verifyOtp di Supabase
            const { error } = await supabase.auth.verifyOtp({
                email,
                token,
                type: 'signup' // Questo deve essere 'signup' per verifiche email di registrazione
            });

            if (error) {
                throw error;
            }

            // Successo: reindirizza alla home o alla dashboard
            navigate('/');
        } catch (error) {
            console.error('Errore nella verifica:', error);
            setError(error.message || 'Errore durante la verifica del codice');
        } finally {
            setLoading(false);
        }
    };

    const handleResendCode = async (e) => {
        e.preventDefault();

        if (!email) {
            setError('Inserisci l\'indirizzo email per ricevere un nuovo codice');
            return;
        }

        setResendLoading(true);
        setError('');
        setMessage('');

        try {
            // Chiama l'API resend di Supabase
            const { error } = await supabase.auth.resend({
                type: 'signup',
                email: email,
            });

            if (error) {
                throw error;
            }

            // Mostra messaggio di successo
            setMessage('Un nuovo codice di verifica è stato inviato alla tua email');
        } catch (error) {
            console.error('Errore nell\'invio del codice:', error);
            setError(error.message || 'Errore nell\'invio del nuovo codice');
        } finally {
            setResendLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">
                <div>
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                        Verifica il tuo indirizzo email
                    </h2>
                    <p className="mt-2 text-center text-sm text-gray-600">
                        Inserisci l'email e il codice di verifica che hai ricevuto
                    </p>
                </div>

                <form className="mt-8 space-y-6" onSubmit={handleVerify}>
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

                    <div className="rounded-md shadow-sm -space-y-px">
                        <div>
                            <label htmlFor="email-address" className="sr-only">
                                Indirizzo Email
                            </label>
                            <input
                                id="email-address"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                                placeholder="Indirizzo Email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <div>
                            <label htmlFor="verification-code" className="sr-only">
                                Codice di verifica
                            </label>
                            <input
                                id="verification-code"
                                name="token"
                                type="text"
                                required
                                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                                placeholder="Codice di verifica"
                                value={token}
                                onChange={(e) => setToken(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex flex-col space-y-4">
                        <button
                            type="submit"
                            disabled={loading}
                            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                            {loading ? 'Verifica in corso...' : 'Verifica Email'}
                        </button>

                        <button
                            type="button"
                            onClick={handleResendCode}
                            disabled={resendLoading || !email}
                            className="group relative w-full flex justify-center py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                            {resendLoading ? 'Invio in corso...' : 'Non hai ricevuto il codice? Invia di nuovo'}
                        </button>
                    </div>

                    <div className="text-sm text-center mt-4">
                        <a href="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
                            Torna alla pagina di login
                        </a>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default VerifyCode;
