import { ExpensePayment, ExpenseTemplate, updatePayment, deletePayment } from '@/services/expenses';
import { formatCurrency, formatDate } from '@/lib/utils';
import { ShoppingBag, Utensils, Car, Plane, Receipt, Edit2, Trash2, Fuel, Check, X, CreditCard, Heart, Home, Zap, Coffee } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

interface VariableExpenseSectionProps {
    expenses: Array<ExpensePayment & { template: ExpenseTemplate }>;
    onAddExpense: () => void;
}

export default function VariableExpenseSection({ expenses, onAddExpense }: VariableExpenseSectionProps) {
    const queryClient = useQueryClient();
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editAmount, setEditAmount] = useState('');

    const totalSpent = expenses.reduce((sum, exp) => sum + exp.amount, 0);

    const deleteMutation = useMutation({
        mutationFn: (id: string) => deletePayment(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['variableExpenses'] });
            queryClient.invalidateQueries({ queryKey: ['expenses'] });
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, amount }: { id: string; amount: number }) => updatePayment(id, { amount }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['variableExpenses'] });
            queryClient.invalidateQueries({ queryKey: ['expenses'] });
            setEditingId(null);
        },
    });

    const handleDelete = (id: string) => {
        if (confirm('Are you sure you want to delete this expense record?')) {
            deleteMutation.mutate(id);
        }
    };

    const handleEdit = (expense: ExpensePayment) => {
        setEditingId(expense.id);
        setEditAmount(expense.amount.toString());
    };

    const handleUpdate = (id: string) => {
        updateMutation.mutate({ id, amount: parseFloat(editAmount) });
    };

    const getIcon = (categoryName: string = '', templateName: string = '') => {
        const name = (categoryName || templateName).toLowerCase();
        if (name.includes('grocery')) return <ShoppingBag className="w-5 h-5 text-emerald-500" />;
        if (name.includes('food') || name.includes('restaurant') || name.includes('eat')) return <Utensils className="w-5 h-5 text-orange-500" />;
        if (name.includes('coffee') || name.includes('cafe') || name.includes('starbucks')) return <Coffee className="w-5 h-5 text-amber-600" />;
        if (name.includes('car') || name.includes('transport') || name.includes('uber')) return <Car className="w-5 h-5 text-blue-500" />;
        if (name.includes('travel') || name.includes('flight') || name.includes('hotel')) return <Plane className="w-5 h-5 text-indigo-500" />;
        if (name.includes('fuel') || name.includes('gas') || name.includes('petrol')) return <Fuel className="w-5 h-5 text-purple-500" />;
        if (name.includes('shopping') || name.includes('amazon') || name.includes('cloth')) return <CreditCard className="w-5 h-5 text-pink-500" />;
        if (name.includes('health') || name.includes('doctor') || name.includes('pharmacy')) return <Heart className="w-5 h-5 text-red-500" />;
        if (name.includes('home') || name.includes('rent') || name.includes('furniture')) return <Home className="w-5 h-5 text-slate-800" />;
        if (name.includes('electric') || name.includes('bill') || name.includes('utility')) return <Zap className="w-5 h-5 text-yellow-500" />;
        return <Receipt className="w-5 h-5 text-slate-400" />;
    };

    return (
        <div className="max-w-4xl mx-auto px-0 md:px-4">
            <div className="bg-white dark:bg-slate-900/50 rounded-2xl md:rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden mb-12 transition-colors duration-300">
                <div className="p-4 md:p-8 border-b border-slate-50 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50/30 dark:bg-slate-800/20">
                    <div>
                        <h3 className="text-xl md:text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">Recent Spending</h3>
                        <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap overflow-hidden text-ellipsis">Current period transactions</p>
                    </div>
                    <div className="px-4 md:px-5 py-2 md:py-2.5 bg-white dark:bg-slate-800 rounded-xl md:rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm w-full sm:w-auto flex justify-between sm:block">
                        <span className="text-[9px] md:text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block sm:mb-1 self-center">Total Spent</span>
                        <span className="text-lg md:text-xl font-black text-slate-900 dark:text-slate-100">{formatCurrency(totalSpent)}</span>
                    </div>
                </div>

                <div className="divide-y divide-slate-50 dark:divide-slate-800">
                    {expenses.length > 0 ? (
                        expenses.map((expense) => (
                            <div key={expense.id} className="p-4 md:p-6 group hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-all duration-300">
                                <div className="flex items-center justify-between gap-3 md:gap-6">
                                    <div className="flex items-center gap-3 md:gap-5 flex-1 min-w-0">
                                        <div className="w-10 h-10 md:w-14 md:h-14 bg-white dark:bg-slate-800 rounded-lg md:rounded-2xl flex items-center justify-center shadow-sm border border-slate-100 dark:border-slate-700 group-hover:scale-105 md:group-hover:scale-110 transition-transform duration-300 shrink-0">
                                            {getIcon(expense.template.category?.name, expense.template.name)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm md:text-lg group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">{expense.template.name}</h4>
                                            <div className="flex items-center gap-2 mt-0.5 md:mt-1">
                                                <p className="text-[10px] md:text-xs text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">{formatDate(expense.due_date)}</p>
                                                <span className="w-1 h-1 bg-slate-200 dark:bg-slate-700 rounded-full" />
                                                <span className={`text-[9px] md:text-[10px] font-black px-1.5 md:px-2 py-0.5 rounded-full ${expense.is_paid ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400' : 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400'}`}>
                                                    {expense.is_paid ? 'SETTLED' : 'PENDING'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 md:gap-6 shrink-0">
                                        {editingId === expense.id ? (
                                            <div className="flex items-center gap-1 md:gap-2 animate-in fade-in zoom-in duration-200">
                                                <div className="relative">
                                                    <span className="absolute left-2 md:left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 font-bold text-xs md:text-sm">$</span>
                                                    <input
                                                        type="number"
                                                        className="w-20 md:w-32 pl-5 md:pl-7 pr-2 md:pr-4 py-1.5 md:py-2 text-xs md:text-sm border-2 border-blue-100 dark:border-blue-900/50 rounded-lg md:rounded-xl focus:ring-4 focus:ring-blue-50/50 dark:focus:ring-blue-900/30 focus:border-blue-500 dark:focus:border-blue-400 outline-none font-black text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 shadow-sm"
                                                        value={editAmount}
                                                        onChange={(e) => setEditAmount(e.target.value)}
                                                        autoFocus
                                                    />
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        onClick={() => handleUpdate(expense.id)}
                                                        className="p-1.5 md:p-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-lg md:rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition shadow-sm"
                                                        title="Save Changes"
                                                    >
                                                        <Check className="w-4 h-4 md:w-5 md:h-5" />
                                                    </button>
                                                    <button
                                                        onClick={() => setEditingId(null)}
                                                        className="p-1.5 md:p-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg md:rounded-xl hover:bg-red-100 dark:hover:bg-red-900/40 transition shadow-sm"
                                                        title="Discard Changes"
                                                    >
                                                        <X className="w-4 h-4 md:w-5 md:h-5" />
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="text-right">
                                                    <p className="text-base md:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">{formatCurrency(expense.amount)}</p>
                                                </div>
                                                <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all duration-300 md:translate-x-2 md:group-hover:translate-x-0">
                                                    <button
                                                        onClick={() => handleEdit(expense)}
                                                        className="p-1.5 md:p-2.5 text-slate-400 dark:text-slate-500 hover:bg-white dark:hover:bg-slate-700 hover:text-blue-500 dark:hover:text-blue-400 rounded-lg md:rounded-xl shadow-sm border border-transparent hover:border-slate-100 dark:hover:border-slate-600 transition"
                                                        title="Edit Transaction"
                                                    >
                                                        <Edit2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(expense.id)}
                                                        className="p-1.5 md:p-2.5 text-slate-400 dark:text-slate-500 hover:bg-white dark:hover:bg-slate-700 hover:text-red-500 dark:hover:text-red-400 rounded-lg md:rounded-xl shadow-sm border border-transparent hover:border-slate-100 dark:hover:border-slate-600 transition"
                                                        title="Delete Transaction"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                                                    </button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="p-10 md:p-20 text-center bg-white dark:bg-slate-900/50">
                            <div className="w-16 h-16 md:w-20 md:h-20 bg-slate-50 dark:bg-slate-800 rounded-2xl md:rounded-3xl flex items-center justify-center mx-auto mb-4 md:mb-6 text-slate-200 dark:text-slate-700">
                                <Receipt className="w-8 h-8 md:w-10 md:h-10" />
                            </div>
                            <h4 className="text-lg md:text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">No spending logged</h4>
                            <p className="text-xs md:text-sm text-slate-400 dark:text-slate-500 max-w-xs mx-auto mb-6 md:mb-8 font-medium">Keep track of your daily expenses here.</p>
                            <button
                                onClick={onAddExpense}
                                className="bg-blue-600 text-white px-6 md:px-8 py-2.5 md:py-3 rounded-xl md:rounded-2xl font-bold hover:bg-blue-700 active:scale-95 transition shadow-xl shadow-blue-100 dark:shadow-none text-sm md:text-base"
                            >
                                Log first expense
                            </button>
                        </div>
                    )}
                </div>

                {expenses.length > 10 && (
                    <div className="p-6 bg-slate-50/50 dark:bg-slate-800/20 text-center border-t border-slate-50 dark:border-slate-800">
                        <button className="text-sm font-black text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 tracking-wide uppercase">Load More Transactions</button>
                    </div>
                )}
            </div>
        </div>
    );
}
