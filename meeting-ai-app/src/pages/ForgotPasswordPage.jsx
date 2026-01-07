import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const ForgotPasswordPage = () => {
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState({ type: '', message: '' });
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setStatus({ type: '', message: '' });

        try {
            const result = await window.electronAPI.forgotPassword(email);
            if (result.success) {
                setStatus({ type: 'success', message: result.message });
            } else {
                setStatus({ type: 'error', message: result.error });
            }
        } catch (error) {
            setStatus({ type: 'error', message: 'An unexpected error occurred.' });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center font-sans">
            <div className="w-full max-w-md p-8 space-y-8 bg-[#1a1a1a] rounded-xl shadow-2xl border border-gray-800">
                <div className="text-center">
                    <h2 className="mt-6 text-3xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-600">
                        Forgot Password
                    </h2>
                    <p className="mt-2 text-sm text-gray-400">
                        Enter your email address and we'll send you a link to reset your password.
                    </p>
                </div>

                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div className="rounded-md shadow-sm -space-y-px">
                        <div>
                            <label htmlFor="email-address" className="sr-only">Email address</label>
                            <input
                                id="email-address"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="relative block w-full appearance-none rounded-md border border-gray-700 px-3 py-3 bg-[#2a2a2a] text-gray-200 placeholder-gray-500 focus:z-10 focus:border-green-500 focus:outline-none focus:ring-green-500 sm:text-sm transition-colors"
                                placeholder="Email address"
                            />
                        </div>
                    </div>

                    {status.message && (
                        <div className={`text-sm text-center p-2 rounded ${status.type === 'error' ? 'text-red-400 bg-red-900/20' : 'text-green-400 bg-green-900/20'}`}>
                            {status.message}
                        </div>
                    )}

                    <div>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="group relative flex w-full justify-center rounded-md border border-transparent bg-gradient-to-r from-green-600 to-emerald-600 py-3 px-4 text-sm font-medium text-white hover:from-green-700 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                        >
                            {isLoading ? 'Sending...' : 'Send Reset Link'}
                        </button>
                    </div>
                </form>

                <div className="text-center">
                    <Link to="/login" className="font-medium text-green-500 hover:text-green-400 transition-colors">
                        Back to Login
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default ForgotPasswordPage;
