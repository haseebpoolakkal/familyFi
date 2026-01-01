'use client';

import DashboardLayout from '@/components/shared/DashboardLayout';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getExpenseTemplates, ExpenseTemplate } from '@/services/expenses';
import { useUserStore } from '@/store/userStore';
import { useState } from 'react';
import { Plus, Receipt, CheckCircle2, Loader2, Calendar } from 'lucide-react';
import ExpenseCard from '@/features/expenses/ExpenseCard';
import VariableExpenseSection from '@/features/expenses/VariableExpenseSection';
import AddFixedPaymentModal from '@/features/expenses/AddFixedPaymentModal';
import AddVariableExpenseModal from '@/features/expenses/AddVariableExpenseModal';
import AddFixedTemplateModal from '@/features/expenses/AddFixedTemplateModal';
import PaymentHistoryModal from '@/features/expenses/PaymentHistoryModal';
import { getVariableExpenses } from '@/services/expenses';
import { formatCurrency } from '@/lib/utils';
import { useDateFilterStore } from '@/store/dateFilterStore';
import MonthFilter from '@/components/shared/MonthFilter';

export default function ExpensesPage() {
    const { profile } = useUserStore();
    const queryClient = useQueryClient();
    const { getDateRange } = useDateFilterStore();
    const { startDate, endDate } = getDateRange();

    // State for tabs
    const [activeTab, setActiveTab] = useState<'fixed' | 'variable'>('fixed');

    // State for modals
    const [isAddVariableOpen, setIsAddVariableOpen] = useState(false);
    const [isAddFixedOpen, setIsAddFixedOpen] = useState(false);
    const [selectedExpense, setSelectedExpense] = useState<ExpenseTemplate | null>(null);
    const [modalMode, setModalMode] = useState<'payment' | 'history' | null>(null);

    const { data: templates = [], isLoading: loadingTemplates } = useQuery({
        queryKey: ['expenses', profile?.household_id, startDate, endDate],
        queryFn: () => getExpenseTemplates(profile!.household_id, startDate, endDate),
        enabled: !!profile?.household_id,
    });

    const { data: variablePayments = [], isLoading: loadingVariable } = useQuery({
        queryKey: ['variableExpenses', profile?.household_id, startDate, endDate],
        queryFn: () => getVariableExpenses(profile!.household_id, startDate, endDate),
        enabled: !!profile?.household_id,
    });

    const fixedExpenses = templates.filter(e => e.is_fixed);
    const isLoading = loadingTemplates || loadingVariable;

    // Calculate summaries
    const totalFixedEstimate = fixedExpenses.reduce((sum, exp) => sum + exp.default_amount, 0);
    const totalVariableThisMonth = variablePayments.reduce((sum, exp) => sum + exp.amount, 0);

    const handleAddPayment = (expense: ExpenseTemplate) => {
        setSelectedExpense(expense);
        setModalMode('payment');
    };

    const handleViewHistory = (expense: ExpenseTemplate) => {
        setSelectedExpense(expense);
        setModalMode('history');
    };

    const handleModalClose = () => {
        setSelectedExpense(null);
        setModalMode(null);
    };

    const handleRefresh = () => {
        queryClient.invalidateQueries({ queryKey: ['expenses'] });
        queryClient.invalidateQueries({ queryKey: ['variableExpenses'] });
    };

    if (isLoading) {
        return (
            <DashboardLayout>
                <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-400">
                    <Loader2 className="w-12 h-12 animate-spin mb-4" />
                    <p className="text-lg font-medium">Crunching the numbers...</p>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="max-w-6xl mx-auto px-4">
                {/* Visual Header / Summary Card */}
                <div className="mb-8 p-8 bg-white dark:bg-slate-900/50 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-8 relative overflow-hidden transition-colors duration-300">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50/50 dark:bg-blue-900/10 rounded-full -mr-32 -mt-32 blur-3xl -z-10" />

                    <div>
                        <h2 className="text-4xl font-black text-slate-900 dark:text-slate-100 tracking-tight mb-2">My Expenses</h2>
                        <div className="flex items-center gap-8">
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Estimated Monthly Fixed</span>
                                <span className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">{formatCurrency(totalFixedEstimate)}</span>
                            </div>
                            <div className="w-px h-10 bg-slate-100 dark:bg-slate-800" />
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Spent This Month (Variable)</span>
                                <span className="text-2xl font-black text-blue-600 dark:text-blue-400 tracking-tight">{formatCurrency(totalVariableThisMonth)}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col items-end gap-3 text-nowrap">
                        <MonthFilter />
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setIsAddFixedOpen(true)}
                                className="bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 text-slate-700 dark:text-slate-200 px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:border-blue-100 dark:hover:border-blue-900/50 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400 transition shadow-sm active:scale-95"
                            >
                                <Plus className="w-5 h-5" />
                                New Bill
                            </button>
                            <button
                                onClick={() => setIsAddVariableOpen(true)}
                                className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-blue-700 active:scale-95 transition shadow-xl shadow-blue-200 dark:shadow-none"
                            >
                                <Receipt className="w-5 h-5" />
                                Log Spending
                            </button>
                        </div>
                    </div>
                </div>

                {/* Modern Tab Bar */}
                <div className="flex justify-center mb-10">
                    <div className="bg-slate-100/80 dark:bg-slate-900/80 p-1.5 rounded-2xl flex items-center gap-1 shadow-inner backdrop-blur-sm">
                        <button
                            onClick={() => setActiveTab('fixed')}
                            className={`px-10 py-3.5 rounded-xl font-bold transition-all duration-300 flex items-center gap-3 ${activeTab === 'fixed'
                                ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm'
                                : 'text-slate-500 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-white/50 dark:hover:bg-slate-800/50'}`}
                        >
                            <Calendar className={`w-5 h-5 ${activeTab === 'fixed' ? 'text-blue-500' : 'text-slate-400 dark:text-slate-600'}`} />
                            Recurring Bills
                        </button>
                        <button
                            onClick={() => setActiveTab('variable')}
                            className={`px-10 py-3.5 rounded-xl font-bold transition-all duration-300 flex items-center gap-3 ${activeTab === 'variable'
                                ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm'
                                : 'text-slate-500 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-white/50 dark:hover:bg-slate-800/50'}`}
                        >
                            <Receipt className={`w-5 h-5 ${activeTab === 'variable' ? 'text-blue-500' : 'text-slate-400 dark:text-slate-600'}`} />
                            Daily Spending
                        </button>
                    </div>
                </div>

                {/* Tab Content with full-width layout */}
                <div className="w-full">
                    {activeTab === 'fixed' ? (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="flex flex-col gap-4">
                                {fixedExpenses.length > 0 ? (
                                    fixedExpenses.map((expense) => (
                                        <ExpenseCard
                                            key={expense.id}
                                            expense={expense}
                                            onAddPayment={handleAddPayment}
                                            onViewHistory={handleViewHistory}
                                        />
                                    ))
                                ) : (
                                    <div className="col-span-full p-20 text-center bg-slate-50/50 dark:bg-slate-900/40 rounded-[2.5rem] border-2 border-dashed border-slate-200 dark:border-slate-800 transition-colors">
                                        <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-100 dark:border-slate-700 shadow-sm">
                                            <CheckCircle2 className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                                        </div>
                                        <h4 className="text-xl font-black text-slate-800 dark:text-slate-100 mb-1 tracking-tight">No monthly bills set up</h4>
                                        <p className="text-slate-400 dark:text-slate-500 max-w-sm mx-auto mb-8 font-medium italic">Add recurring expenses like rent, utilities, and subscriptions to track them effortlessly.</p>
                                        <button
                                            onClick={() => setIsAddFixedOpen(true)}
                                            className="text-blue-600 dark:text-blue-400 font-bold hover:underline underline-offset-4 active:scale-95 transition"
                                        >
                                            Get started by adding a bill
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <VariableExpenseSection
                                expenses={variablePayments}
                                onAddExpense={() => setIsAddVariableOpen(true)}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Modals remain the same */}
            <AddFixedTemplateModal
                isOpen={isAddFixedOpen}
                onClose={() => setIsAddFixedOpen(false)}
                onSuccess={handleRefresh}
            />

            <AddVariableExpenseModal
                isOpen={isAddVariableOpen}
                onClose={() => setIsAddVariableOpen(false)}
                onSuccess={handleRefresh}
            />

            {selectedExpense && modalMode === 'payment' && (
                <AddFixedPaymentModal
                    expense={selectedExpense}
                    isOpen={true}
                    onClose={handleModalClose}
                    onSuccess={handleRefresh}
                />
            )}

            {selectedExpense && modalMode === 'history' && (
                <PaymentHistoryModal
                    expense={selectedExpense}
                    isOpen={true}
                    onClose={handleModalClose}
                />
            )}
        </DashboardLayout>
    );
}
