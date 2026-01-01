'use client';

import { useState } from 'react';
import { createClientComponentClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';

export default function AuthForm({ mode }: { mode: 'login' | 'signup' }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();
    const supabase = createClientComponentClient();

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (mode === 'signup') {
                const { error: signUpError } = await supabase.auth.signUp({
                    email,
                    password,
                });
                if (signUpError) throw signUpError;

                const successMsg = 'Account created! Please check your email to confirm your account before logging in.';


                router.push(`/login?message=${encodeURIComponent(successMsg)}`);
            } else {
                const { error: signInError } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (signInError) throw signInError;

                router.push('/');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleAuth} className="space-y-4 w-full max-w-md bg-white p-8 rounded-xl shadow-lg">
            <h2 className="text-2xl font-bold text-center text-slate-800">
                {mode === 'login' ? 'Welcome Back' : 'Create Account'}
            </h2>
            {error && (
                <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg border border-red-100">
                    {error}
                </div>
            )}
            <div>
                <label className="block text-sm font-medium text-slate-700">Email</label>
                <input
                    type="email"
                    required
                    className="text-slate-800 w-full mt-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-700">Password</label>
                <div className="relative mt-1">
                    <input
                        type={showPassword ? "text" : "password"}
                        required
                        className="text-slate-800 w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none pr-10"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                        {showPassword ? <Eye size={20} /> : <EyeOff size={20} />}
                    </button>
                </div>
            </div>
            <button
                disabled={loading}
                className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50"
            >
                {loading ? 'Processing...' : mode === 'login' ? 'Sign In' : 'Sign Up'}
            </button>
            <div className="text-center text-sm text-slate-600">
                {mode === 'login' ? (
                    <p>Don&apos;t have an account? <a href="/signup" className="text-blue-600 hover:underline">Sign Up</a></p>
                ) : (
                    <p>Already have an account? <a href="/login" className="text-blue-600 hover:underline">Sign In</a></p>
                )}
            </div>
        </form>
    );
}
