import { ExpenseTemplate, ExpensePayment, getExpensePayments, updatePaymentStatus, updatePayment, deletePayment } from '@/services/expenses';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatCurrency, formatDate } from '@/lib/utils';
import { X, CheckCircle2, Circle, Clock, Loader2, Edit2, Trash2 } from 'lucide-react';
import { useState } from 'react';

interface PaymentHistoryModalProps {
    expense: ExpenseTemplate;
    isOpen: boolean;
    onClose: () => void;
}

export default function PaymentHistoryModal({
    expense,
    isOpen,
    onClose,
}: PaymentHistoryModalProps) {
    const queryClient = useQueryClient();
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editAmount, setEditAmount] = useState('');

    const { data: payments = [], isLoading, error } = useQuery({
        queryKey: ['expense-payments', expense.id],
        queryFn: () => getExpensePayments(expense.id),
        enabled: isOpen,
    });

    const togglePaymentMutation = useMutation({
        mutationFn: ({ id, isPaid }: { id: string; isPaid: boolean }) =>
            updatePaymentStatus(id, isPaid),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['expense-payments', expense.id] });
            queryClient.invalidateQueries({ queryKey: ['expenses'] });
        },
    });

    const updateAmountMutation = useMutation({
        mutationFn: ({ id, amount }: { id: string; amount: number }) => updatePayment(id, { amount }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['expense-payments', expense.id] });
            queryClient.invalidateQueries({ queryKey: ['expenses'] });
            setEditingId(null);
        },
    });

    const deletePaymentMutation = useMutation({
        mutationFn: (id: string) => deletePayment(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['expense-payments', expense.id] });
            queryClient.invalidateQueries({ queryKey: ['expenses'] });
        },
    });

    const startEdit = (payment: ExpensePayment) => {
        setEditingId(payment.id);
        setEditAmount(payment.amount.toString());
    };

    const handleUpdate = (id: string) => {
        updateAmountMutation.mutate({ id, amount: parseFloat(editAmount) });
    };

    const handleDelete = (id: string) => {
        if (confirm('Are you sure you want to delete this payment record?')) {
            deletePaymentMutation.mutate(id);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
                <div className="flex justify-between items-center p-6 border-b border-slate-100">
                    <div>
                        <h3 className="text-xl font-bold text-slate-800">Payment History</h3>
                        <p className="text-sm text-slate-500">{expense.name}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 transition"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                            <Loader2 className="w-8 h-8 animate-spin mb-2" />
                            <p>Loading history...</p>
                        </div>
                    ) : error ? (
                        <div className="p-4 bg-red-50 border border-red-100 rounded-lg text-sm text-red-600">
                            Failed to load payment history.
                        </div>
                    ) : payments.length === 0 ? (
                        <div className="text-center py-12 text-slate-400">
                            <Clock className="w-12 h-12 mx-auto mb-3 opacity-20" />
                            <p>No payments recorded yet.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {payments.map((payment: ExpensePayment) => (
                                <div
                                    key={payment.id}
                                    className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100 group"
                                >
                                    <div className="flex items-center gap-4 flex-1">
                                        <button
                                            onClick={() => togglePaymentMutation.mutate({
                                                id: payment.id,
                                                isPaid: !payment.is_paid
                                            })}
                                            disabled={togglePaymentMutation.isPending}
                                            className={`transition ${payment.is_paid ? 'text-green-500' : 'text-slate-300'}`}
                                        >
                                            {payment.is_paid ? (
                                                <CheckCircle2 className="w-6 h-6" />
                                            ) : (
                                                <Circle className="w-6 h-6" />
                                            )}
                                        </button>
                                        <div className="flex-1">
                                            {editingId === payment.id ? (
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="number"
                                                        className="w-24 px-2 py-1 text-sm border rounded outline-none focus:ring-1 focus:ring-blue-500 font-bold text-slate-800"
                                                        value={editAmount}
                                                        onChange={(e) => setEditAmount(e.target.value)}
                                                        autoFocus
                                                    />
                                                    <button onClick={() => handleUpdate(payment.id)} className="p-1 px-2 bg-blue-600 text-white rounded text-xs font-bold">Save</button>
                                                    <button onClick={() => setEditingId(null)} className="p-1 px-2 bg-slate-200 text-slate-600 rounded text-xs font-bold">Cancel</button>
                                                </div>
                                            ) : (
                                                <>
                                                    <p className="font-bold text-slate-800">
                                                        {formatCurrency(payment.amount)}
                                                    </p>
                                                    <p className="text-xs text-slate-500">
                                                        Due: {formatDate(payment.due_date)}
                                                        {payment.is_paid && payment.paid_at && (
                                                            <span className="ml-2">
                                                                • Paid: {formatDate(payment.paid_at)}
                                                            </span>
                                                        )}
                                                    </p>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className={`text-xs font-bold px-2 py-1 rounded-full ${payment.is_paid
                                            ? 'bg-green-100 text-green-700'
                                            : 'bg-amber-100 text-amber-700'
                                            }`}>
                                            {payment.is_paid ? 'PAID' : 'UNPAID'}
                                        </div>
                                        {editingId !== payment.id && (
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => startEdit(payment)}
                                                    className="p-1.5 text-slate-400 hover:bg-white hover:text-blue-500 rounded-lg shadow-sm border border-transparent hover:border-slate-100 transition"
                                                >
                                                    <Edit2 className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(payment.id)}
                                                    className="p-1.5 text-slate-400 hover:bg-white hover:text-red-500 rounded-lg shadow-sm border border-transparent hover:border-slate-100 transition"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="p-6 border-t border-slate-50">
                    <button
                        onClick={onClose}
                        className="w-full px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-semibold hover:bg-slate-200 transition"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
