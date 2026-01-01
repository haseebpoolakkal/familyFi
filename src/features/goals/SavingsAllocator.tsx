'use client';

import { useState } from 'react';
import { distributeSavings, getGoals, Goal } from '@/services/goals';
import { useUserStore } from '@/store/userStore';
import { useQuery } from '@tanstack/react-query';

export default function SavingsAllocator({ onAllocated }: { onAllocated: () => void }) {
    const [amount, setAmount] = useState('');
    const [loading, setLoading] = useState(false);
    const { profile } = useUserStore();

    const { data: goals = [] } = useQuery({
        queryKey: ['goals', profile?.household_id],
        queryFn: () => getGoals(profile!.household_id),
        enabled: !!profile?.household_id,
    });

    const totalPercentage = goals.reduce((acc: number, goal: Goal) => acc + (goal.allocation_percentage || 0), 0);

    const handleAllocate = async () => {
        if (!profile?.household_id || !amount) return;

        if (totalPercentage === 0) {
            alert('Please configure your goal allocation percentages in Settings first.');
            return;
        }

        setLoading(true);
        try {
            await distributeSavings(profile.household_id, parseFloat(amount));
            setAmount('');
            onAllocated();
        } catch (err) {
            console.error(err);
            alert('Failed to distribute savings');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white dark:bg-slate-900/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm transition-colors duration-300">
            <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 mb-4 tracking-tight">Allocate Savings</h3>
            <div className="flex gap-4">
                <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 font-bold">$</span>
                    <input
                        type="number"
                        className="w-full pl-7 pr-4 py-2 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-slate-100 font-bold transition"
                        placeholder="0.00"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                    />
                </div>
                <button
                    onClick={handleAllocate}
                    disabled={loading || !amount}
                    className="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-blue-700 active:scale-95 transition shadow-lg shadow-blue-100 dark:shadow-none disabled:opacity-50"
                >
                    {loading ? 'Distributing...' : 'Distribute'}
                </button>
            </div>
            {totalPercentage === 0 ? (
                <p className="mt-3 text-xs text-red-500 font-medium">
                    ⚠️ Total allocation is 0%. Set percentages in Settings to allocate funds.
                </p>
            ) : (
                <p className="mt-3 text-xs text-slate-500 dark:text-slate-400 italic font-medium">
                    Funds will be distributed according to your {totalPercentage}% total configuration.
                </p>
            )}
        </div>
    );
}
