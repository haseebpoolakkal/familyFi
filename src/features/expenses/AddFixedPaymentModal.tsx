'use client';

import { useState } from 'react';
import { ExpenseTemplate, createPayment, calculateNextDueDate, checkPaymentExists } from '@/services/expenses';
import { formatCurrency, formatDate } from '@/lib/utils';
import { X, AlertTriangle, Check } from 'lucide-react';

interface AddFixedPaymentModalProps {
    expense: ExpenseTemplate;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function AddFixedPaymentModal({
    expense,
    isOpen,
    onClose,
    onSuccess,
}: AddFixedPaymentModalProps) {
    const defaultDueDate = expense.recurrence && expense.due_day
        ? calculateNextDueDate(expense.recurrence, expense.due_day)
        : new Date().toISOString().split('T')[0];

    const [amount, setAmount] = useState(expense.default_amount.toString());
    const [dueDate, setDueDate] = useState(defaultDueDate);
    const [isPaid, setIsPaid] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showConfirmNext, setShowConfirmNext] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            // Check if payment already exists for this period
            const exists = await checkPaymentExists(expense.id, dueDate);

            if (exists && !showConfirmNext) {
                setShowConfirmNext(true);
                setLoading(false);
                return;
            }

            let finalDueDate = dueDate;
            if (showConfirmNext) {
                // Advance to next recurring period
                const date = new Date(dueDate);
                if (expense.recurrence === 'monthly') {
                    date.setMonth(date.getMonth() + 1);
                } else if (expense.recurrence === 'quarterly') {
                    date.setMonth(date.getMonth() + 3);
                } else if (expense.recurrence === 'yearly') {
                    date.setFullYear(date.getFullYear() + 1);
                }
                finalDueDate = date.toISOString().split('T')[0];
            }

            await createPayment(expense.id, parseFloat(amount), finalDueDate, isPaid);
            onSuccess();
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create payment');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full">
                <div className="flex justify-between items-center p-6 border-b border-slate-100">
                    <h3 className="text-xl font-bold text-slate-800">Add Payment</h3>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 transition"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Expense
                        </label>
                        <p className="text-lg font-semibold text-slate-800">{expense.name}</p>
                        {expense.category && (
                            <p className="text-sm text-slate-500">{expense.category.name}</p>
                        )}
                    </div>

                    {error && (
                        <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-600">
                            {error}
                        </div>
                    )}

                    {showConfirmNext && (
                        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                            <AlertTriangle className="w-6 h-6 text-amber-500 shrink-0" />
                            <div>
                                <p className="text-sm font-bold text-amber-800">Duplicate Payment Detected</p>
                                <p className="text-xs text-amber-700 mt-1">
                                    A payment for {formatDate(dueDate)} has already been recorded.
                                    Do you want to record this for the <strong>next cycle</strong> instead?
                                </p>
                                <div className="flex gap-2 mt-3">
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmNext(false)}
                                        className="text-xs font-bold text-slate-500 hover:text-slate-700"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="text-xs font-bold text-amber-600 hover:text-amber-700"
                                    >
                                        Yes, Record Next Cycle
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Amount
                        </label>
                        <input
                            type="number"
                            step="0.01"
                            required
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-900"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                        />
                        <p className="text-xs text-slate-500 mt-1">
                            Default: {formatCurrency(expense.default_amount)}
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Due Date
                        </label>
                        <input
                            type="date"
                            required
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-900"
                            value={dueDate}
                            onChange={(e) => setDueDate(e.target.value)}
                        />
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                        <button
                            type="button"
                            onClick={() => setIsPaid(!isPaid)}
                            className={`w-5 h-5 rounded border transition flex items-center justify-center ${isPaid ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-300'
                                }`}
                        >
                            {isPaid && <Check className="w-3.5 h-3.5" />}
                        </button>
                        <span
                            className="text-sm text-slate-600 cursor-pointer select-none"
                            onClick={() => setIsPaid(!isPaid)}
                        >
                            Mark as paid now
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
                            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50"
                        >
                            {loading ? 'Adding...' : 'Add Payment'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
