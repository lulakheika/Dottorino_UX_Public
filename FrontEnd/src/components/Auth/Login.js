import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faUserSecret } from '@fortawesome/free-solid-svg-icons';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { login, continueAsGuest, loginAsGuest, authMode } = useAuth();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const result = await login(email, password);

            if (result.success) {
                navigate('/');
            } else {
                setError(result.error);
            }
        } catch (error) {
            console.error('Eccezione durante login:', error);
            setError('Si è verificato un errore durante il login.');
        } finally {
            setLoading(false);
        }
    };

    const handleGuestLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        console.log('👋 Clic su pulsante ospite');

        try {
            console.log('🔄 Chiamata a loginAsGuest...');
            const success = await loginAsGuest();
            console.log('✅ Risultato loginAsGuest:', success);

            if (success) {
                console.log('🚀 Reindirizzamento a /');
                navigate('/');
            } else {
                console.error('❌ Login ospite fallito');
                setError('Impossibile accedere come ospite. Riprova più tardi.');
            }
        } catch (error) {
            console.error('❌ Errore durante l\'accesso come ospite:', error);
            setError('Errore: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleNonAuthGuestLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        console.log('👋 Clic su pulsante ospite non autenticato');

        try {
            const result = await continueAsGuest();
            if (result.success) {
                navigate('/');
            } else {
                setError(result.error || 'Errore durante l\'accesso come ospite');
            }
        } catch (error) {
            console.error('❌ Errore durante l\'accesso come ospite non autenticato:', error);
            setError('Errore: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">
                <div>
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                        Accedi al tuo account
                    </h2>
                </div>
                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    {error && (
                        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
                            <span className="block sm:inline">{error}</span>
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
                            <label htmlFor="password" className="sr-only">
                                Password
                            </label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete="current-password"
                                required
                                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                                placeholder="Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    <div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                            {loading ? 'Caricamento...' : 'Accedi'}
                        </button>
                    </div>

                    <div className="text-center">
                        <span className="text-gray-500">oppure</span>
                    </div>

                    <div className="flex space-x-2">
                        <button
                            type="button"
                            onClick={handleGuestLogin}
                            disabled={loading}
                            className="flex-grow group relative flex justify-center py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                            <span className="flex items-center">
                                <FontAwesomeIcon icon={faUserSecret} className="mr-2" />
                                Continua come ospite
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={handleNonAuthGuestLogin}
                            disabled={loading}
                            title="Ospite non autenticato"
                            className="aspect-square h-10 flex items-center justify-center border border-orange-300 text-sm font-medium rounded-md text-orange-700 bg-orange-50 hover:bg-orange-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                        >
                            <FontAwesomeIcon icon={faUser} />
                        </button>
                    </div>

                    <div className="text-sm text-center mt-4">
                        <Link to="/verify" className="font-medium text-indigo-600 hover:text-indigo-500">
                            Hai un codice di verifica? Verificalo qui
                        </Link>
                    </div>

                    <div className="text-sm text-center">
                        <Link to="/signup" className="font-medium text-indigo-600 hover:text-indigo-500">
                            Non hai un account? Registrati
                        </Link>
                    </div>

                    <div className="text-sm text-center mt-4">
                        <Link to="/forgot-password" className="font-medium text-indigo-600 hover:text-indigo-500">
                            Password dimenticata?
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Login; 