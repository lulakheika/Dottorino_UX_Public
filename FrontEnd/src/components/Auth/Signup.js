import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const Signup = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [projectName, setProjectName] = useState(process.env.REACT_APP_BRAND_NAME || '');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [registrationSuccess, setRegistrationSuccess] = useState(false);
    const navigate = useNavigate();
    const { signup } = useAuth();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // Validazione base
        if (password !== confirmPassword) {
            return setError('Le password non corrispondono');
        }

        setLoading(true);
        try {
            const result = await signup(email, password);
            if (result.success) {
                setRegistrationSuccess(true);
            } else {
                setError(result.error || 'Errore durante la registrazione');
            }
        } catch (error) {
            setError('Errore durante la registrazione: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    // Se la registrazione è riuscita, mostra il messaggio di conferma
    if (registrationSuccess) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-md w-full space-y-8">
                    <div>
                        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                            Registrazione completata!
                        </h2>
                    </div>

                    <div className="bg-green-50 border-l-4 border-green-500 text-green-700 p-4 my-6" role="alert">
                        <p className="font-bold">Controlla la tua email</p>
                        <p className="mt-2">
                            Abbiamo inviato un'email all'indirizzo <span className="font-semibold">{email}</span> con un link di conferma.
                        </p>
                        <p className="mt-2">
                            Clicca sul link nell'email per attivare il tuo account. Se non trovi l'email, controlla anche nella cartella spam.
                        </p>
                    </div>

                    <div className="mt-6 bg-white shadow-md rounded-lg p-6">
                        <h3 className="text-lg font-medium text-gray-900 mb-2">Hai ricevuto un codice di verifica?</h3>
                        <p className="text-gray-600 mb-4">
                            Se preferisci, puoi anche inserire manualmente il codice di verifica che hai ricevuto via email.
                        </p>
                        <Link
                            to="/verify"
                            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                            Inserisci il codice di verifica
                        </Link>
                    </div>

                    <div className="text-center mt-4">
                        <Link to="/login" className="text-sm font-medium text-indigo-600 hover:text-indigo-500">
                            Torna alla pagina di login
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    // Mostra il form di registrazione normale se non c'è stato successo
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">
                <div>
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                        Crea un nuovo account
                    </h2>
                </div>
                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    {error && (
                        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
                            <span className="block sm:inline">{error}</span>
                        </div>
                    )}
                    <div>
                        <label htmlFor="project-name" className="block text-sm font-medium text-gray-700 mb-1">
                            Nome Progetto (precompilato)
                        </label>
                        <input
                            id="project-name"
                            name="project-name"
                            type="text"
                            className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm bg-gray-50"
                            placeholder="Nome del progetto"
                            value={projectName}
                            onChange={(e) => setProjectName(e.target.value)}
                            disabled
                        />
                    </div>
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
                                autoComplete="new-password"
                                required
                                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                                placeholder="Password"
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
                                autoComplete="new-password"
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
                            disabled={loading}
                            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                            {loading ? 'Caricamento...' : 'Registrati'}
                        </button>
                    </div>

                    <div className="text-sm text-center">
                        <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
                            Hai già un account? Accedi
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Signup; 