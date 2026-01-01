'use client';

import { useState } from 'react';
import { createHousehold, joinHousehold } from '@/services/household';
import { useUserStore } from '@/store/userStore';
import { Layout, Users, Plus, ArrowRight } from 'lucide-react';

interface OnboardingFormProps {
    userId: string;
    onComplete: () => void;
}

export default function OnboardingForm({ userId, onComplete }: OnboardingFormProps) {
    const [fullName, setFullName] = useState('');
    const [option, setOption] = useState<'create' | 'join'>('create');
    const [householdName, setHouseholdName] = useState('');
    const [householdId, setHouseholdId] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const { setProfile } = useUserStore();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            if (option === 'create') {
                const name = householdName || `${fullName || 'My'}'s Family`;
                const household = await createHousehold(name, fullName);
                setProfile({
                    id: userId,
                    household_id: household.id,
                    full_name: fullName,
                    role: 'admin'
                });
            } else {
                if (!householdId) throw new Error('Please enter a Household ID');
                await joinHousehold(userId, householdId);
                setProfile({
                    id: userId,
                    household_id: householdId,
                    full_name: fullName,
                    role: 'member'
                });
            }

            onComplete();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to complete setup');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4 transition-all duration-500">
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-auto max-w-lg overflow-hidden animate-in fade-in zoom-in duration-500 border border-transparent dark:border-slate-800">
                <div className="bg-blue-600 p-10 text-white relative overflow-hidden">
                    <div className="relative z-10">
                        <h2 className="text-4xl font-black mb-2 tracking-tight">Finish Setup</h2>
                        <p className="text-blue-100 font-medium italic opacity-90">Let&apos;s get your household ready.</p>
                    </div>
                    <Layout className="absolute -right-12 -bottom-12 w-56 h-56 text-blue-500/20 rotate-12" />
                </div>

                <form onSubmit={handleSubmit} className="p-10 space-y-8">
                    {error && (
                        <div className="bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 p-5 rounded-2xl text-sm font-bold border border-rose-100 dark:border-rose-900/30 animate-shake">
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-2">Full Name</label>
                        <input
                            type="text"
                            required
                            className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-slate-800 dark:text-slate-100 font-bold transition-all"
                            placeholder="John Doe"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-5">
                        <button
                            type="button"
                            onClick={() => setOption('create')}
                            className={`p-6 rounded-4xl border-2 transition-all duration-300 text-left group ${option === 'create'
                                ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                                : 'border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700'
                                }`}
                        >
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-colors ${option === 'create' ? 'bg-blue-600 text-white' : 'bg-slate-50 dark:bg-slate-800 text-slate-400'}`}>
                                <Plus className="w-6 h-6" />
                            </div>
                            <p className={`font-black tracking-tight ${option === 'create' ? 'text-blue-700 dark:text-blue-400' : 'text-slate-800 dark:text-slate-200'}`}>New Household</p>
                            <p className="text-xs text-slate-500 dark:text-slate-500 mt-1 font-medium">Start fresh with your own space.</p>
                        </button>
                        <button
                            type="button"
                            onClick={() => setOption('join')}
                            className={`p-6 rounded-4xl border-2 transition-all duration-300 text-left group ${option === 'join'
                                ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                                : 'border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700'
                                }`}
                        >
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-colors ${option === 'join' ? 'bg-blue-600 text-white' : 'bg-slate-50 dark:bg-slate-800 text-slate-400'}`}>
                                <Users className="w-6 h-6" />
                            </div>
                            <p className={`font-black tracking-tight ${option === 'join' ? 'text-blue-700 dark:text-blue-400' : 'text-slate-800 dark:text-slate-200'}`}>Join Existing</p>
                            <p className="text-xs text-slate-500 dark:text-slate-500 mt-1 font-medium">Join a partner&apos;s household.</p>
                        </button>
                    </div>

                    {option === 'create' ? (
                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-2">Household Name</label>
                            <input
                                type="text"
                                className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-slate-800 dark:text-slate-100 font-bold transition-all"
                                placeholder="e.g. Smith Family"
                                value={householdName}
                                onChange={(e) => setHouseholdName(e.target.value)}
                            />
                        </div>
                    ) : (
                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-2">Household ID</label>
                            <input
                                type="text"
                                required
                                className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-slate-800 dark:text-slate-100 font-black transition-all"
                                placeholder="Paste ID from your partner"
                                value={householdId}
                                onChange={(e) => setHouseholdId(e.target.value)}
                            />
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 text-white py-5 rounded-3xl font-black text-lg hover:bg-blue-700 active:scale-95 transition-all shadow-xl shadow-blue-200 dark:shadow-none flex items-center justify-center gap-3 group disabled:opacity-50"
                    >
                        {loading ? 'Setting up...' : 'Get Started'}
                        <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
                    </button>
                </form>
            </div>
        </div>
    );
}
