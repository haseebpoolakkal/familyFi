'use client';

import { ExpenseTemplate, calculateNextDueDate, updateExpenseTemplate, deleteExpenseTemplate } from '@/services/expenses';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Calendar, Tag, Repeat, History, PlusCircle, Edit2, Trash2, Check, X } from 'lucide-react';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface ExpenseCardProps {
    expense: ExpenseTemplate;
    onAddPayment: (expense: ExpenseTemplate) => void;
    onViewHistory: (expense: ExpenseTemplate) => void;
}

export default function ExpenseCard({ expense, onAddPayment, onViewHistory }: ExpenseCardProps) {
    const queryClient = useQueryClient();
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState(expense.name);
    const [editAmount, setEditAmount] = useState(expense.default_amount.toString());

    const nextDueDate = expense.is_fixed && expense.recurrence && expense.due_day
        ? calculateNextDueDate(expense.recurrence, expense.due_day)
        : null;

    const updateMutation = useMutation({
        mutationFn: (updates: Partial<ExpenseTemplate>) => updateExpenseTemplate(expense.id, updates),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['expenses'] });
            setIsEditing(false);
        },
    });

    const deleteMutation = useMutation({
        mutationFn: () => deleteExpenseTemplate(expense.id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['expenses'] });
        },
    });

    const handleSave = () => {
        updateMutation.mutate({
            name: editName,
            default_amount: parseFloat(editAmount)
        });
    };

    const handleDelete = () => {
        if (confirm(`Are you sure you want to delete "${expense.name}" and all its history?`)) {
            deleteMutation.mutate();
        }
    };

    return (
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300 group">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                {/* Left Side: Info */}
                <div className="flex items-center gap-5 flex-1">
                    <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center shrink-0 group-hover:bg-blue-100 transition-colors">
                        <Repeat className="w-7 h-7 text-blue-600" />
                    </div>

                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                            {isEditing ? (
                                <input
                                    className="text-xl font-black text-slate-900 tracking-tight bg-slate-50 border-b-2 border-blue-500 outline-none px-1"
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    autoFocus
                                />
                            ) : (
                                <h4 className="text-xl font-black text-slate-900 tracking-tight">{expense.name}</h4>
                            )}
                            {expense.status && !isEditing && (
                                <span className={`px-2.5 py-0.5 text-[10px] font-black rounded-full uppercase tracking-widest border transition-colors ${expense.status === 'paid'
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                    : expense.status === 'overdue'
                                        ? 'bg-rose-50 text-rose-700 border-rose-100 animate-pulse'
                                        : 'bg-blue-50 text-blue-700 border-blue-100'
                                    }`}>
                                    {expense.status}
                                </span>
                            )}
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                            {expense.category && (
                                <div className="flex items-center gap-1.5 text-sm font-bold text-slate-400">
                                    <Tag className="w-3.5 h-3.5" />
                                    <span>{expense.category.name}</span>
                                </div>
                            )}
                            <div className="flex items-center gap-1.5 text-sm font-bold text-slate-400 capitalize">
                                <Repeat className="w-3.5 h-3.5" />
                                <span>{expense.recurrence}</span>
                            </div>
                            {nextDueDate && (
                                <div className="flex items-center gap-1.5 text-sm font-bold text-slate-400">
                                    <Calendar className="w-3.5 h-3.5" />
                                    <span>Next Due: {formatDate(nextDueDate)}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Side: Amount & Actions */}
                <div className="flex flex-col sm:flex-row items-center gap-6 lg:pl-6 lg:border-l border-slate-100">
                    <div className="text-center sm:text-right min-w-[120px]">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Monthly Bill</span>
                        {isEditing ? (
                            <div className="relative">
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                                <input
                                    type="number"
                                    className="text-2xl font-black text-slate-900 tracking-tight bg-slate-50 border-b-2 border-blue-500 outline-none pl-6 pr-1 w-28 text-right"
                                    value={editAmount}
                                    onChange={(e) => setEditAmount(e.target.value)}
                                />
                            </div>
                        ) : (
                            <p className="text-2xl font-black text-slate-900 tracking-tight">{formatCurrency(expense.default_amount)}</p>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        {isEditing ? (
                            <>
                                <button
                                    onClick={handleSave}
                                    className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 transition shadow-sm"
                                    title="Save"
                                >
                                    <Check className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={() => {
                                        setIsEditing(false);
                                        setEditName(expense.name);
                                        setEditAmount(expense.default_amount.toString());
                                    }}
                                    className="p-2.5 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition shadow-sm"
                                    title="Cancel"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </>
                        ) : (
                            <>
                                <button
                                    onClick={() => onAddPayment(expense)}
                                    className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-700 active:scale-95 transition shadow-lg shadow-blue-100"
                                >
                                    <PlusCircle className="w-4 h-4" />
                                    Pay
                                </button>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300">
                                    <button
                                        onClick={() => setIsEditing(true)}
                                        className="p-2.5 text-slate-400 hover:bg-slate-50 hover:text-blue-600 rounded-xl border border-transparent hover:border-slate-100 transition shadow-sm"
                                        title="Edit Template"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={handleDelete}
                                        className="p-2.5 text-slate-400 hover:bg-slate-50 hover:text-red-500 rounded-xl border border-transparent hover:border-slate-100 transition shadow-sm"
                                        title="Delete Template"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => onViewHistory(expense)}
                                        className="p-2.5 text-slate-400 hover:bg-slate-50 hover:text-slate-600 rounded-xl border border-transparent hover:border-slate-100 transition shadow-sm"
                                        title="View History"
                                    >
                                        <History className="w-5 h-5" />
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
