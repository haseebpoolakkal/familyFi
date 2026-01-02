'use client';

import DashboardLayout from '@/components/shared/DashboardLayout';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useUserStore } from '@/store/userStore';
import { useState } from 'react';
import { Plus, Banknote, CheckCircle2, Loader2, Calendar } from 'lucide-react';
import MonthFilter from '@/components/shared/MonthFilter';
import { formatCurrency } from '@/lib/utils';
import { useDateFilterStore } from '@/store/dateFilterStore';

import { getLoans, getLoanInstallments, Loan } from '@/services/loanService';
import LoanCard from '@/features/loans/LoanCard';
import LoanInstallmentSection from '@/features/loans/LoanInstallmentSection';
import AddLoanModal from '@/features/loans/AddLoanModal';
import AddLoanPaymentModal from '@/features/loans/AddLoanPaymentModal';
import LoanScheduleModal from '@/features/loans/LoanScheduleModal';

import EditLoanModal from '@/features/loans/EditLoanModal';

export default function LoansPage() {
    const { profile } = useUserStore();
    const queryClient = useQueryClient();
    const { getDateRange } = useDateFilterStore();
    const { startDate, endDate } = getDateRange();

    const [activeTab, setActiveTab] = useState<'loans' | 'payments'>('loans');
    const [isAddLoanOpen, setIsAddLoanOpen] = useState(false);
    const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
    const [modalMode, setModalMode] = useState<'payment' | 'schedule' | 'edit' | null>(null);

    const { data: loans = [], isLoading: loadingLoans } = useQuery({
        queryKey: ['loans', profile?.household_id],
        queryFn: () => getLoans(),
        enabled: !!profile?.household_id,
    });

    const { data: installments = [], isLoading: loadingInstallments } = useQuery({
        queryKey: ['loanInstallments', profile?.household_id, startDate, endDate],
        queryFn: () =>
            getLoanInstallments(profile!.household_id, startDate, endDate),
        enabled: !!profile?.household_id,
    });

    const activeLoans = loans.filter(l => l.status === 'active');
    const isLoading = loadingLoans || loadingInstallments;

    // Summary calculations
    const totalMonthlyEMI = activeLoans.reduce(
        (sum, loan) => sum + loan.emi_amount,
        0
    );

    const totalPaidThisMonth = installments
        .filter(i => i.paid)
        .reduce((sum, i) => sum + i.emi_amount, 0);

    const handleAddPayment = (loan: Loan) => {
        setSelectedLoan(loan);
        setModalMode('payment');
    };

    const handleViewSchedule = (loan: Loan) => {
        setSelectedLoan(loan);
        setModalMode('schedule');
    };

    const handleEditLoan = (loan: Loan) => {
        setSelectedLoan(loan);
        setModalMode('edit');
    };

    const handleCloseModal = () => {
        setSelectedLoan(null);
        setModalMode(null);
    };

    const refresh = () => {
        queryClient.invalidateQueries({ queryKey: ['loans'] });
        queryClient.invalidateQueries({ queryKey: ['loanInstallments'] });
    };

    if (isLoading) {
        return (
            <DashboardLayout>
                <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-400">
                    <Loader2 className="w-12 h-12 animate-spin mb-4" />
                    <p className="text-lg font-medium">Calculating repayments…</p>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="max-w-6xl mx-auto px-0 md:px-4">
                {/* Header */}
                <div className="mb-8 p-6 bg-white dark:bg-slate-900/50 rounded-3xl border shadow-sm flex flex-col md:flex-row justify-between gap-6">
                    <div>
                        <h2 className="text-3xl font-black">My Loans</h2>
                        <div className="flex gap-8 mt-4">
                            <div>
                                <p className="text-xs uppercase text-slate-400">Monthly EMI</p>
                                <p className="text-2xl font-black">
                                    {formatCurrency(totalMonthlyEMI)}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs uppercase text-slate-400">Paid This Month</p>
                                <p className="text-2xl font-black text-blue-600">
                                    {formatCurrency(totalPaidThisMonth)}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col items-end gap-4">
                        <MonthFilter />
                        <button
                            onClick={() => setIsAddLoanOpen(true)}
                            className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2"
                        >
                            <Plus className="w-5 h-5" />
                            Add Loan
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex justify-center mb-6 md:mb-10">
                    <div className="bg-slate-100/80 dark:bg-slate-900/80 p-1 md:p-1.5 rounded-xl md:rounded-2xl flex items-center gap-1 shadow-inner backdrop-blur-sm w-full md:w-auto">
                        <button
                            onClick={() => setActiveTab('loans')}
                            className={`flex-1 md:flex-none px-4 md:px-10 py-2.5 md:py-3.5 rounded-lg md:rounded-xl font-bold transition-all duration-300 flex items-center justify-center gap-2 md:gap-3 text-xs md:text-base ${activeTab === 'loans'
                                ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm'
                                : 'text-slate-500 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-white/50 dark:hover:bg-slate-800/50'}`}
                        >
                            <Calendar className={`w-4 h-4 md:w-5 md:h-5 ${activeTab === 'loans' ? 'text-blue-500' : 'text-slate-400 dark:text-slate-600'}`} />
                            <span className="whitespace-nowrap">Loans</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('payments')}
                            className={`flex-1 md:flex-none px-4 md:px-10 py-2.5 md:py-3.5 rounded-lg md:rounded-xl font-bold transition-all duration-300 flex items-center justify-center gap-2 md:gap-3 text-xs md:text-base ${activeTab === 'payments'
                                ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm'
                                : 'text-slate-500 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-white/50 dark:hover:bg-slate-800/50'}`}
                        >
                            <Banknote className={`w-4 h-4 md:w-5 md:h-5 ${activeTab === 'payments' ? 'text-blue-500' : 'text-slate-400 dark:text-slate-600'}`} />
                            <span className="whitespace-nowrap">Payments</span>
                        </button>
                    </div>
                </div>

                {/* Content */}
                {activeTab === 'loans' ? (
                    activeLoans.length ? (
                        activeLoans.map(loan => (
                            <LoanCard
                                key={loan.id}
                                loan={loan}
                                onAddPayment={handleAddPayment}
                                onViewSchedule={handleViewSchedule}
                                onEdit={handleEditLoan}
                            />
                        ))
                    ) : (
                        <div className="p-20 text-center border-2 border-dashed rounded-3xl">
                            <CheckCircle2 className="w-12 h-12 mx-auto text-slate-300" />
                            <p className="mt-4 font-bold">No active loans</p>
                        </div>
                    )
                ) : (
                    <LoanInstallmentSection installments={installments} />
                )}
            </div>

            {/* Modals */}
            <AddLoanModal
                isOpen={isAddLoanOpen}
                onClose={() => setIsAddLoanOpen(false)}
                onSuccess={refresh}
            />

            {selectedLoan && modalMode === 'payment' && (
                <AddLoanPaymentModal
                    loan={selectedLoan}
                    isOpen
                    onClose={handleCloseModal}
                    onSuccess={refresh}
                />
            )}

            {selectedLoan && modalMode === 'schedule' && (
                <LoanScheduleModal
                    loan={selectedLoan}
                    isOpen
                    onClose={handleCloseModal}
                />
            )}

            {selectedLoan && modalMode === 'edit' && (
                <EditLoanModal
                    loan={selectedLoan}
                    isOpen
                    onClose={handleCloseModal}
                    onSuccess={refresh}
                />
            )}
        </DashboardLayout>
    );
}
