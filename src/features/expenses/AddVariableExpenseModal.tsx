'use client';

import { useState } from 'react';
import { createVariableExpense } from '@/services/expenses';
import { getExpenseCategories, ExpenseCategory } from '@/services/settings';
import { useQuery } from '@tanstack/react-query';
import { useUserStore } from '@/store/userStore';
import { X, Loader2, Check } from 'lucide-react';

interface AddVariableExpenseModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function AddVariableExpenseModal({
    isOpen,
    onClose,
    onSuccess,
}: AddVariableExpenseModalProps) {
    const { profile } = useUserStore();
    const [name, setName] = useState('');
    const [amount, setAmount] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);
    const [isPaid, setIsPaid] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const { data: categories = [], isLoading: loadingCats } = useQuery({
        queryKey: ['categories', profile?.household_id],
        queryFn: () => getExpenseCategories(profile!.household_id),
        enabled: !!profile?.household_id && isOpen,
    });

    const resetForm = () => {
        setName('');
        setAmount('');
        setCategoryId('');
        setDueDate(new Date().toISOString().split('T')[0]);
        setIsPaid(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!profile?.household_id) return;

        setLoading(true);
        setError(null);

        try {
            await createVariableExpense(
                profile.household_id,
                name,
                parseFloat(amount),
                categoryId,
                dueDate,
                isPaid
            );
            onSuccess();
            resetForm();
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create variable expense');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all duration-300">
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl max-w-md w-full overflow-hidden border border-transparent dark:border-slate-800 animate-in fade-in zoom-in duration-300">
                <div className="flex justify-between items-center p-8 border-b border-slate-100 dark:border-slate-800">
                    <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">Log Spending</h3>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    {error && (
                        <div className="p-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-900/30 rounded-2xl text-sm font-bold text-rose-600 dark:text-rose-400 animate-shake">
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">
                            What did you buy?
                        </label>
                        <input
                            type="text"
                            required
                            placeholder="e.g. Grocery Shopping"
                            className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-4 focus:ring-blue-500/10 outline-none text-slate-900 dark:text-slate-100 font-bold transition"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">
                            Category
                        </label>
                        <select
                            required
                            className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-4 focus:ring-blue-500/10 outline-none text-slate-900 dark:text-slate-100 font-bold transition disabled:opacity-50"
                            value={categoryId}
                            onChange={(e) => setCategoryId(e.target.value)}
                            disabled={loadingCats}
                        >
                            <option value="">Select a category</option>
                            {categories.map((cat: ExpenseCategory) => (
                                <option key={cat.id} value={cat.id}>
                                    {cat.name}
                                </option>
                            ))}
                        </select>
                        {loadingCats && (
                            <div className="flex items-center gap-2 mt-2 text-xs text-slate-400 dark:text-slate-500 italic">
                                <Loader2 className="w-3 h-3 animate-spin" />
                                Loading categories...
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">
                                Amount
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                required
                                placeholder="0.00"
                                className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-4 focus:ring-blue-500/10 outline-none text-slate-900 dark:text-slate-100 font-black transition"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">
                                Date
                            </label>
                            <input
                                type="date"
                                required
                                className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-4 focus:ring-blue-500/10 outline-none text-slate-900 dark:text-slate-100 font-bold transition"
                                value={dueDate}
                                onChange={(e) => setDueDate(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-3 pt-2">
                        <button
                            type="button"
                            onClick={() => setIsPaid(!isPaid)}
                            className={`w-6 h-6 rounded-lg border-2 transition flex items-center justify-center ${isPaid ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                                }`}
                        >
                            {isPaid && <Check className="w-4 h-4" />}
                        </button>
                        <span
                            className="text-sm text-slate-600 dark:text-slate-400 font-bold cursor-pointer select-none"
                            onClick={() => setIsPaid(!isPaid)}
                        >
                            Mark this expense as paid immediately
                        </span>
                    </div>

                    <div className="flex gap-4 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-6 py-4 border-2 border-slate-100 dark:border-slate-800 rounded-2xl font-black text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition active:scale-95"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 px-6 py-4 bg-blue-600 text-white rounded-2xl font-black hover:bg-blue-700 transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-blue-200 dark:shadow-none"
                        >
                            {loading && <Loader2 className="w-5 h-5 animate-spin" />}
                            {loading ? 'Adding...' : 'Add Expense'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
