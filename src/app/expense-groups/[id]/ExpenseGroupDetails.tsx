"use client"

import { notFound, useParams } from 'next/navigation';
import { Layers, Calendar, ArrowLeft, Loader2, Plus } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { getExpenseGroupById, getExpenseGroupExpenses, getExpenseGroupMembers } from '@/services/expenseGroupService';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import CreateExpenseGroupItemModal from '@/features/expense-groups/CreateExpenseGroupItemModal';

export default function ExpenseGroupDetails() {
  const params = useParams<{ id: string }>();
  const groupId = params?.id;

  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const { data: group, isLoading: isGroupLoading } = useQuery({
    queryKey: ['expenseGroup', groupId],
    queryFn: () => getExpenseGroupById(groupId!),
    enabled: !!groupId,
  });
  const { data: members, isLoading: isMembersLoading } = useQuery({
    queryKey: ['expenseGroupMembers', groupId],
    queryFn: () => getExpenseGroupMembers(groupId!),
    enabled: !!groupId,
  });

  const { data: expenses = [], isLoading: isExpensesLoading } = useQuery({
    queryKey: ['expenseGroupExpenses', groupId],
    queryFn: () => getExpenseGroupExpenses(groupId!),
    enabled: !!groupId,
  });

  const totalAmount = expenses.reduce((sum, item) => sum + (item.amount || 0), 0);

  const queryClient = useQueryClient();

  const handleSuccess = () => {
    setIsCreateOpen(false);
    queryClient.invalidateQueries({ queryKey: ['expenseGroupExpenses', groupId] });
    queryClient.invalidateQueries({ queryKey: ['expenseGroup', groupId] });
  };

  const mapGroupMembers = () => {
    if (!members) return [];
    return members!.map((member: any) => ({
      id: member.id,
      name: member.name || member.role || 'Unknown Member',
      profile_id: member.profile_id
    }));
  };

  if (isGroupLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-400">
        <Loader2 className="w-12 h-12 animate-spin mb-4" />
        <p className="text-lg font-medium">Loading group details...</p>
      </div>
    );
  }

  if (!group) {
    notFound();
  }

  return (
    <>
      <div className="max-w-6xl mx-auto px-0 md:px-4 space-y-6">
        {/* Navigation & Breadcrumb */}
        <div className="flex items-center gap-2 mb-2">
          <Link
            href="/expense-groups"
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-slate-500"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">
            Back to Groups
          </span>
        </div>

        {/* Header Card */}
        <div className="p-6 md:p-10 bg-white dark:bg-slate-900/50 rounded-2xl md:rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-50/50 dark:bg-emerald-900/10 rounded-full -mr-32 -mt-32 blur-3xl -z-10" />

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="flex items-start gap-5">
              <div className="w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0 border border-emerald-200/50 dark:border-emerald-800/50">
                <Layers className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
              </div>

              <div className='flex flex-col gap-1 lg:gap-2'>
                <h1 className="text-2xl md:text-4xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                  {group.name}
                </h1>
                <div className="flex flex-col-reverse lg:flex-col gap-1 text-slate-500 dark:text-slate-400">
                  {group.description && (
                    <p className="text-sm font-medium">
                      {group.description}
                    </p>
                  )}
                  <div className="flex items-center gap-1.5 text-xs text-nowrap font-bold uppercase tracking-wider text-slate-400">
                    <Calendar className="w-3.5 h-3.5" />
                    Started {new Date(group.start_date).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-row lg:flex-col justify-between gap-2 lg:gap-4 w-full">
              <div className="flex flex-col md:items-end">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                  Total Group Spending
                </span>
                <p className="text-3xl md:text-4xl font-black text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(totalAmount)}
                </p>

              </div>
              <div className='flex flex-col lg:flex-row items-center justify-end'>
                <button
                  onClick={() => setIsCreateOpen(true)}
                  className="max-w-fit bg-emerald-600 text-white px-4 md:px-6 py-2.5 md:py-3 rounded-xl md:rounded-2xl font-bold flex gap-2 hover:bg-emerald-700 active:scale-95 transition shadow-xl shadow-emerald-200 dark:shadow-none text-xs md:text-base justify-center"
                >
                  <Plus className="w-4 h-4 md:w-5 md:h-5" />
                  Add Expense
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Expenses Section */}
        <div className="bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
            <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
              Transaction History
            </h2>
            <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-bold text-slate-500 dark:text-slate-400">
              {expenses?.length || 0} Transactions
            </span>
          </div>

          <div className="divide-y divide-slate-50 dark:divide-slate-800">
            {isExpensesLoading ? (
              <div className="p-12 flex flex-col items-center justify-center text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin mb-2" />
                <p className="font-medium">Loading transactions...</p>
              </div>
            ) : expenses.length > 0 ? (
              expenses.map(item => (
                <div
                  key={item.id}
                  className="p-5 md:p-6 flex justify-between items-center hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:scale-110 transition-transform">
                      <Layers className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 dark:text-slate-200">
                        {item.description}
                      </p>
                      <p className="text-xs font-medium text-slate-400">
                        {new Date(item.expense_date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="font-black text-slate-900 dark:text-slate-100">
                      {formatCurrency(item.amount)}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-16 text-center">
                <p className="text-slate-400 dark:text-slate-500 font-medium italic">
                  No expenses recorded for this group yet.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
      <CreateExpenseGroupItemModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        expenseGroup={group}
        members={mapGroupMembers()}
        onSuccess={handleSuccess}
      />
    </>
  );
}
