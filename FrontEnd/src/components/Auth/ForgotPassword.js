import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../supabase/client';

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [resetCode, setResetCode] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [showCodeInput, setShowCodeInput] = useState(false);
    const navigate = useNavigate();

    const handleSendResetEmail = async (e) => {
        e.preventDefault();

        if (!email) {
            setError('Inserisci l\'indirizzo email per ricevere il link di reset');
            return;
        }

        setLoading(true);
        setError('');
        setMessage('');

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password`,
            });

            if (error) {
                throw error;
            }

            setMessage('Ti abbiamo inviato un\'email con un link per reimpostare la password. Puoi anche usare il codice ricevuto nell\'email.');
            setShowCodeInput(true);
        } catch (error) {
            console.error('Errore nell\'invio dell\'email di reset:', error);
            setError(error.message || 'Errore nell\'invio dell\'email di reset');
        } finally {
            setLoading(false);
        }
    };

    const handleResetWithCode = async (e) => {
        e.preventDefault();

        if (!email || !resetCode) {
            setError('Inserisci sia l\'email che il codice ricevuto');
            return;
        }

        if (password !== confirmPassword) {
            setError('Le password non corrispondono');
            return;
        }

        if (password.length < 6) {
            setError('La password deve essere di almeno 6 caratteri');
            return;
        }

        setLoading(true);
        setError('');
        setMessage('');

        try {
            const { error: verifyError } = await supabase.auth.verifyOtp({
                email,
                token: resetCode,
                type: 'recovery'
            });

            if (verifyError) {
                throw verifyError;
            }

            const { error: updateError } = await supabase.auth.updateUser({
                password: password
            });

            if (updateError) {
                throw updateError;
            }

            setMessage('Password aggiornata con successo! Verrai reindirizzato alla pagina di login.');
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
                        Recupera la tua password
                    </h2>
                    <p className="mt-2 text-center text-sm text-gray-600">
                        Inserisci la tua email e ti invieremo un link per reimpostare la password
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

                {!showCodeInput ? (
                    <form className="mt-8 space-y-6" onSubmit={handleSendResetEmail}>
                        <div>
                            <label htmlFor="email-address" className="block text-sm font-medium text-gray-700">
                                Indirizzo Email
                            </label>
                            <input
                                id="email-address"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                className="appearance-none rounded relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm mt-1"
                                placeholder="Inserisci la tua email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>

                        <div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            >
                                {loading ? 'Invio in corso...' : 'Invia link di reset'}
                            </button>
                        </div>
                    </form>
                ) : (
                    <form className="mt-8 space-y-6" onSubmit={handleResetWithCode}>
                        <div>
                            <label htmlFor="reset-code" className="block text-sm font-medium text-gray-700">
                                Codice di Reset
                            </label>
                            <input
                                id="reset-code"
                                name="reset-code"
                                type="text"
                                required
                                className="appearance-none rounded relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm mt-1"
                                placeholder="Inserisci il codice ricevuto via email"
                                value={resetCode}
                                onChange={(e) => setResetCode(e.target.value)}
                            />
                        </div>

                        <div>
                            <label htmlFor="new-password" className="block text-sm font-medium text-gray-700">
                                Nuova Password
                            </label>
                            <input
                                id="new-password"
                                name="new-password"
                                type="password"
                                required
                                className="appearance-none rounded relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm mt-1"
                                placeholder="Nuova password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>

                        <div>
                            <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700">
                                Conferma Password
                            </label>
                            <input
                                id="confirm-password"
                                name="confirm-password"
                                type="password"
                                required
                                className="appearance-none rounded relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm mt-1"
                                placeholder="Conferma password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                            />
                        </div>

                        <div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            >
                                {loading ? 'Aggiornamento in corso...' : 'Reimposta la password'}
                            </button>
                        </div>

                        <div>
                            <button
                                type="button"
                                onClick={() => setShowCodeInput(false)}
                                className="group relative w-full flex justify-center py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            >
                                Torna indietro
                            </button>
                        </div>
                    </form>
                )}

                <div className="flex items-center justify-between mt-4">
                    <Link to="/login" className="text-sm font-medium text-indigo-600 hover:text-indigo-500">
                        Torna al login
                    </Link>
                    <Link to="/verify" className="text-sm font-medium text-indigo-600 hover:text-indigo-500">
                        Verifica email
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword; 