'use client';

import { useState, useEffect } from 'react';
import { X, Calendar, User, Users, Info, IndianRupee } from 'lucide-react';
import { createExpenseGroupItem } from '@/services/expenseGroupService';
import { formatCurrency } from '@/lib/utils';
import { useUserStore } from '@/store/userStore';

type Member = {
    id: string;
    name: string;
    profile_id: string;
};

type ExpenseGroup = {
    id: string;
    name: string;
};

export default function CreateExpenseGroupItemModal({
    isOpen,
    onClose,
    onSuccess,
    expenseGroup,
    members,
}: {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    expenseGroup: ExpenseGroup;
    members: Member[];
}) {
    const { profile } = useUserStore();
    const [loading, setLoading] = useState(false);

    // Form State
    const [title, setTitle] = useState('');
    const [amount, setAmount] = useState('');
    const [paidByProfileId, setPaidByProfileId] = useState('');
    const [splitMemberIds, setSplitMemberIds] = useState<string[]>([]);
    const [expenseDate, setExpenseDate] = useState(
        new Date().toISOString().split('T')[0]
    );

    // Initial state setup
    useEffect(() => {
        if (isOpen) {
            // Default "Paid By" to current user if they are a member
            const currentUserAsMember = members.find(m => m.profile_id === profile?.id);
            if (currentUserAsMember) {
                setPaidByProfileId(currentUserAsMember.profile_id);
            } else if (members.length > 0) {
                setPaidByProfileId(members[0].profile_id);
            }

            // Default split to everyone
            setSplitMemberIds(members.map(m => m.profile_id));
        }
    }, [isOpen, members, profile?.id]);

    if (!isOpen) return null;

    const numAmount = parseFloat(amount) || 0;
    const splitAmount = splitMemberIds.length > 0 ? numAmount / splitMemberIds.length : 0;

    function toggleSplitMember(profileId: string) {
        setSplitMemberIds(prev =>
            prev.includes(profileId)
                ? prev.filter(id => id !== profileId)
                : [...prev, profileId]
        );
    }

    async function handleCreate() {
        if (!title.trim() || numAmount <= 0 || !paidByProfileId || splitMemberIds.length === 0) {
            return;
        }

        setLoading(true);

        try {
            const payload = {
                expense_group_id: expenseGroup.id,
                amount: numAmount,
                description: title.trim(),
                paid_by_profile_id: paidByProfileId,
                expense_date: expenseDate,
                splits: splitMemberIds.map(profileId => ({
                    profile_id: profileId,
                    amount: splitAmount
                }))
            };

            await createExpenseGroupItem(payload);

            // Reset form
            setTitle('');
            setAmount('');
            setPaidByProfileId(profile?.id || '');
            setSplitMemberIds(members.map(m => m.profile_id));
            setExpenseDate(new Date().toISOString().split('T')[0]);

            onSuccess();
            onClose();
        } catch (error) {
            console.error('Error creating expense item:', error);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center px-4 overflow-y-auto py-10">
            <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col">
                {/* Header */}
                <div className="p-8 border-b border-slate-100 dark:border-slate-800 relative bg-slate-50/50 dark:bg-slate-800/20">
                    <div className="flex justify-between items-start">
                        <div>
                            <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
                                Add Expense
                            </h3>
                            <div className="flex items-center gap-1.5 mt-1">
                                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">
                                    In {expenseGroup.name}
                                </span>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white dark:hover:bg-slate-800 rounded-xl transition-all shadow-sm border border-transparent hover:border-slate-100 dark:hover:border-slate-700"
                        >
                            <X className="w-5 h-5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-8 space-y-6 overflow-y-auto max-h-[60vh]">
                    {/* Basic Info Row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="col-span-1 md:col-span-2">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                                Description
                            </label>
                            <div className="relative">
                                <Info className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                                <input
                                    className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all font-medium"
                                    placeholder="Dinner, Flight tickets, etc."
                                    value={title}
                                    onChange={e => setTitle(e.target.value)}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                                Amount
                            </label>
                            <div className="relative">
                                <IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                                <input
                                    type="number"
                                    step="0.01"
                                    className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all font-black text-lg"
                                    placeholder="0.00"
                                    value={amount}
                                    onChange={e => setAmount(e.target.value)}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                                Date
                            </label>
                            <div className="relative">
                                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                                <input
                                    type="date"
                                    className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all font-bold"
                                    value={expenseDate}
                                    onChange={e => setExpenseDate(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Payer selection */}
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                            Paid By
                        </label>
                        <div className="relative">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                            <select
                                className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all font-bold appearance-none cursor-pointer"
                                value={paidByProfileId}
                                onChange={e => setPaidByProfileId(e.target.value)}
                            >
                                {members.map(m => (
                                    <option key={m.id} value={m.profile_id}>
                                        {m.name} {m.profile_id === profile?.id ? '(You)' : ''}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Multi-Split Selection */}
                    <div>
                        <div className="flex justify-between items-center mb-3 ml-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                Split Between
                            </label>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setSplitMemberIds(members.map(m => m.profile_id))}
                                    className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 transition-colors uppercase tracking-wider"
                                >
                                    Select All
                                </button>
                                <span className="text-[10px] text-slate-300">|</span>
                                <button
                                    onClick={() => setSplitMemberIds([])}
                                    className="text-[10px] font-bold text-slate-400 hover:text-slate-600 transition-colors uppercase tracking-wider"
                                >
                                    Clear
                                </button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            {members.map(m => (
                                <label
                                    key={m.id}
                                    className={`flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer group ${splitMemberIds.includes(m.profile_id)
                                            ? 'bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800 shadow-sm'
                                            : 'bg-slate-50/50 dark:bg-slate-800/30 border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700'
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black uppercase tracking-tighter transition-all ${splitMemberIds.includes(m.profile_id)
                                                ? 'bg-emerald-600 text-white'
                                                : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                                            }`}>
                                            {m.name.substring(0, 2)}
                                        </div>
                                        <div>
                                            <p className={`font-bold text-sm transition-colors ${splitMemberIds.includes(m.profile_id)
                                                    ? 'text-emerald-900 dark:text-emerald-100'
                                                    : 'text-slate-600 dark:text-slate-400'
                                                }`}>
                                                {m.name}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        {splitMemberIds.includes(m.profile_id) && splitAmount > 0 && (
                                            <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                                                {formatCurrency(splitAmount)}
                                            </span>
                                        )}
                                        <input
                                            type="checkbox"
                                            checked={splitMemberIds.includes(m.profile_id)}
                                            onChange={() => toggleSplitMember(m.profile_id)}
                                            className="w-5 h-5 rounded-lg border-2 border-slate-200 dark:border-slate-700 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                        />
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-8 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 flex flex-col md:flex-row gap-4">
                    <div className="flex-1 flex flex-col justify-center">
                        {splitMemberIds.length > 0 && numAmount > 0 && (
                            <div className="flex items-center gap-2">
                                <Users className="w-4 h-4 text-slate-400" />
                                <p className="text-xs font-bold text-slate-500">
                                    Split <span className="text-emerald-600 dark:text-emerald-400">{splitMemberIds.length} ways</span>
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="px-6 py-3 rounded-2xl font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-all active:scale-95"
                        >
                            Cancel
                        </button>
                        <button
                            disabled={!title.trim() || numAmount <= 0 || !paidByProfileId || splitMemberIds.length === 0 || loading}
                            onClick={handleCreate}
                            className="px-8 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xl shadow-emerald-200 dark:shadow-none flex items-center gap-2 active:scale-95"
                        >
                            {loading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    <span>Adding...</span>
                                </>
                            ) : (
                                <>
                                    <Plus className="w-5 h-5" />
                                    <span>Add Expense</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function Plus({ className }: { className?: string }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
        >
            <path d="M5 12h14"></path>
            <path d="M12 5v14"></path>
        </svg>
    );
}