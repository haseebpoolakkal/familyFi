'use client';

import DashboardLayout from '@/components/shared/DashboardLayout';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Plus, Wallet, Loader2 } from 'lucide-react';
import { useDateFilterStore } from '@/store/dateFilterStore';
import MonthFilter from '@/components/shared/MonthFilter';
import { formatCurrency } from '@/lib/utils';


import ExpenseGroupCard from '@/features/expense-groups/ExpenseGroupCard';
import { getExpenseGroups } from '@/services/expenseGroupService';
import CreateExpenseGroupModal from '@/features/expense-groups/CreateExpenseGroupModal';
import { useUserStore } from '@/store/userStore';

export default function ExpenseGroupsPage() {
    const { profile } = useUserStore();
    const queryClient = useQueryClient();
    const { getDateRange } = useDateFilterStore();
    const { startDate, endDate } = getDateRange();

    const [isCreateOpen, setIsCreateOpen] = useState(false);

    const { data: groups = [], isLoading } = useQuery({
        queryKey: ['expenseGroups', startDate, endDate],
        queryFn: () => getExpenseGroups(),
    });

    const totalSpent = groups.reduce(
        (sum, g) => sum + (g.total_amount ?? 0),
        0
    );

    const handleRefresh = () => {
        queryClient.invalidateQueries({ queryKey: ['expenseGroups'] });
    };

    if (isLoading) {
        return (
            <DashboardLayout>
                <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-400">
                    <Loader2 className="w-12 h-12 animate-spin mb-4" />
                    <p className="text-lg font-medium">Loading expense groups…</p>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="max-w-6xl mx-auto px-0 md:px-4">
                {/* Summary Header */}
                <div className="mb-6 md:mb-8 p-4 md:p-8 bg-white dark:bg-slate-900/50 rounded-2xl md:rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-50/50 dark:bg-emerald-900/10 rounded-full -mr-32 -mt-32 blur-3xl -z-10" />

                    <div>
                        <h2 className="text-2xl md:text-4xl font-black text-slate-900 dark:text-slate-100 tracking-tight mb-3">
                            Expense Groups
                        </h2>

                        <div className="flex items-center gap-6">
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    Total Spent
                                </span>
                                <span className="text-xl md:text-2xl font-black text-emerald-600 dark:text-emerald-400">
                                    {formatCurrency(totalSpent)}
                                </span>
                            </div>

                            <div className="w-px h-10 bg-slate-100 dark:bg-slate-800" />

                            <div className="flex flex-col">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    Groups
                                </span>
                                <span className="text-xl md:text-2xl font-black text-slate-800 dark:text-slate-100">
                                    {groups.length}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col items-center md:items-end gap-4 w-full md:w-auto">
                        <MonthFilter />
                        <button
                            onClick={() => setIsCreateOpen(true)}
                            className="bg-emerald-600 text-white px-4 md:px-6 py-2.5 md:py-3 rounded-xl md:rounded-2xl font-bold flex items-center gap-2 hover:bg-emerald-700 active:scale-95 transition shadow-xl shadow-emerald-200 dark:shadow-none text-xs md:text-base w-full md:w-auto justify-center"
                        >
                            <Plus className="w-4 h-4 md:w-5 md:h-5" />
                            Create Group
                        </button>
                    </div>
                </div>

                {/* Groups List */}
                <div className="flex flex-col gap-4">
                    {groups.length > 0 ? (
                        groups.map(group => (
                            <ExpenseGroupCard key={group.id} group={group} />
                        ))
                    ) : (
                        <div className="p-16 text-center bg-slate-50/50 dark:bg-slate-900/40 rounded-[2.5rem] border-2 border-dashed border-slate-200 dark:border-slate-800">
                            <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-100 dark:border-slate-700 shadow-sm">
                                <Wallet className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                            </div>
                            <h4 className="text-xl font-black text-slate-800 dark:text-slate-100 mb-2">
                                No expense groups yet
                            </h4>
                            <p className="text-slate-400 dark:text-slate-500 max-w-sm mx-auto mb-6 font-medium italic">
                                Track shared expenses like trips, hospital visits, or family events in one place.
                            </p>
                            <button
                                onClick={() => setIsCreateOpen(true)}
                                className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline underline-offset-4"
                            >
                                Create your first group
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <CreateExpenseGroupModal
                isOpen={isCreateOpen}
                onClose={() => setIsCreateOpen(false)}
                onSuccess={handleRefresh}
                householdId={profile?.household_id || ''}
                currentUserId={profile?.id || ''}
            />
        </DashboardLayout>
    );
}
