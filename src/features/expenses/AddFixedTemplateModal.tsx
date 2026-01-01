'use client';

import { useState } from 'react';
import { createFixedExpenseTemplate, createPayment } from '@/services/expenses';
import { getExpenseCategories, ExpenseCategory } from '@/services/settings';
import { useQuery } from '@tanstack/react-query';
import { useUserStore } from '@/store/userStore';
import { X, Loader2, Check } from 'lucide-react';

interface AddFixedTemplateModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function AddFixedTemplateModal({
    isOpen,
    onClose,
    onSuccess,
}: AddFixedTemplateModalProps) {
    const { profile } = useUserStore();
    const [name, setName] = useState('');
    const [amount, setAmount] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [recurrence, setRecurrence] = useState<'monthly' | 'quarterly' | 'yearly'>('monthly');
    const [dueDay, setDueDay] = useState('1');
    const [recordInitialPayment, setRecordInitialPayment] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const { data: categories = [], isLoading: loadingCats } = useQuery({
        queryKey: ['categories', profile?.household_id],
        queryFn: () => getExpenseCategories(profile!.household_id),
        enabled: !!profile?.household_id && isOpen,
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!profile?.household_id) return;

        setLoading(true);
        setError(null);

        try {
            const template = await createFixedExpenseTemplate(
                profile.household_id,
                name,
                parseFloat(amount),
                categoryId,
                recurrence,
                parseInt(dueDay)
            );

            if (recordInitialPayment) {
                const today = new Date();
                const dueDate = new Date(today.getFullYear(), today.getMonth(), parseInt(dueDay)).toISOString().split('T')[0];
                await createPayment(template.id, parseFloat(amount), dueDate);
            }

            onSuccess();
            onClose();
            // Reset form
            setName('');
            setAmount('');
            setCategoryId('');
            setRecurrence('monthly');
            setDueDay('1');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create fixed expense');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full">
                <div className="flex justify-between items-center p-6 border-b border-slate-100">
                    <h3 className="text-xl font-bold text-slate-800">Add Recurring Expense</h3>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 transition"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-600">
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Name
                        </label>
                        <input
                            type="text"
                            required
                            placeholder="e.g. Rent, Internet, Netflix"
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-900"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Category
                        </label>
                        <select
                            required
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-900"
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
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Default Amount
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                required
                                placeholder="0.00"
                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-900"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Due Day (1-31)
                            </label>
                            <input
                                type="number"
                                min="1"
                                max="31"
                                required
                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-900"
                                value={dueDay}
                                onChange={(e) => setDueDay(e.target.value)}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Recurrence
                        </label>
                        <div className="flex gap-2">
                            {(['monthly', 'quarterly', 'yearly'] as const).map((r) => (
                                <button
                                    key={r}
                                    type="button"
                                    onClick={() => setRecurrence(r)}
                                    className={`flex-1 py-2 px-3 rounded-lg border text-sm font-semibold transition ${recurrence === r
                                        ? 'bg-blue-50 border-blue-600 text-blue-600'
                                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                        }`}
                                >
                                    {r.charAt(0).toUpperCase() + r.slice(1)}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2 pb-2">
                        <button
                            type="button"
                            onClick={() => setRecordInitialPayment(!recordInitialPayment)}
                            className={`w-5 h-5 rounded border transition flex items-center justify-center ${recordInitialPayment ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-300'
                                }`}
                        >
                            {recordInitialPayment && <Check className="w-3.5 h-3.5" />}
                        </button>
                        <span
                            className="text-sm text-slate-600 cursor-pointer select-none"
                            onClick={() => setRecordInitialPayment(!recordInitialPayment)}
                        >
                            Record payment for this month immediately
                        </span>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 border border-slate-200 rounded-lg font-semibold text-slate-700 hover:bg-slate-50 transition"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                            {loading ? 'Creating...' : 'Create Template'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
