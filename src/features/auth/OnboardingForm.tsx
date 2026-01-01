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
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-auto max-w-lg overflow-hidden animate-in fade-in zoom-in duration-300">
                <div className="bg-blue-600 p-8 text-white relative overflow-hidden">
                    <div className="relative z-10">
                        <h2 className="text-3xl font-bold mb-2">Finish Setup</h2>
                        <p className="text-blue-100 italic">Let&apos;s get your household ready.</p>
                    </div>
                    <Layout className="absolute -right-8 -bottom-8 w-40 h-40 text-blue-500/30 rotate-12" />
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    {error && (
                        <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-medium border border-red-100">
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Full Name</label>
                        <input
                            type="text"
                            required
                            className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-800"
                            placeholder="John Doe"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <button
                            type="button"
                            onClick={() => setOption('create')}
                            className={`p-4 rounded-xl border-2 transition text-left ${option === 'create' ? 'border-blue-600 bg-blue-50' : 'border-slate-100 hover:border-slate-200'
                                }`}
                        >
                            <Plus className={`w-6 h-6 mb-2 ${option === 'create' ? 'text-blue-600' : 'text-slate-400'}`} />
                            <p className="font-bold text-slate-800">New Household</p>
                            <p className="text-xs text-slate-500 mt-1">Start fresh with your own space.</p>
                        </button>
                        <button
                            type="button"
                            onClick={() => setOption('join')}
                            className={`p-4 rounded-xl border-2 transition text-left ${option === 'join' ? 'border-blue-600 bg-blue-50' : 'border-slate-100 hover:border-slate-200'
                                }`}
                        >
                            <Users className={`w-6 h-6 mb-2 ${option === 'join' ? 'text-blue-600' : 'text-slate-400'}`} />
                            <p className="font-bold text-slate-800">Join Existing</p>
                            <p className="text-xs text-slate-500 mt-1">Join a partner&apos;s household.</p>
                        </button>
                    </div>

                    {option === 'create' ? (
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Household Name</label>
                            <input
                                type="text"
                                className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-800"
                                placeholder="e.g. Smith Family"
                                value={householdName}
                                onChange={(e) => setHouseholdName(e.target.value)}
                            />
                        </div>
                    ) : (
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Household ID</label>
                            <input
                                type="text"
                                required
                                className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-800"
                                placeholder="Paste ID from your partner"
                                value={householdId}
                                onChange={(e) => setHouseholdId(e.target.value)}
                            />
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-200 flex items-center justify-center gap-2 group disabled:opacity-50"
                    >
                        {loading ? 'Setting up...' : 'Get Started'}
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition" />
                    </button>
                </form>
            </div>
        </div>
    );
}
