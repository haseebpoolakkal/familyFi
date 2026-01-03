'use client';

import DashboardLayout from '@/components/shared/DashboardLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    getInvestmentPlans,
    pauseInvestmentPlan,
    resumeInvestmentPlan,
    deleteInvestmentPlan,
    getInvestmentTransactions,
    deleteInvestmentTransaction,
} from '@/services/investments';
import { useUserStore } from '@/store/userStore';
import { useState } from 'react';
import { Plus, Loader2, TrendingUp } from 'lucide-react';
import { InvestmentPlan, InvestmentTransaction } from '@/types';
import InvestmentPlanCard from '@/features/investments/InvestmentPlanCard';
import AddInvestmentPlanModal from '@/features/investments/AddInvestmentPlanModal';
import AddInvestmentTransactionModal from '@/features/investments/AddInvestmentTransactionModal';
import InvestmentTransactionList from '@/features/investments/InvestmentTransactionList';
import Modal from '@/components/shared/Modal';
import { formatCurrency } from '@/lib/utils';

export default function InvestmentsPage() {
    const { profile } = useUserStore();
    const queryClient = useQueryClient();
    const [isAddPlanOpen, setIsAddPlanOpen] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState<InvestmentPlan | null>(null);
    const [modalMode, setModalMode] = useState<'transaction' | 'history' | null>(null);
    const [planTransactions, setPlanTransactions] = useState<InvestmentTransaction[]>([]);

    const { data: plans = [], isLoading } = useQuery({
        queryKey: ['investmentPlans', profile?.household_id],
        queryFn: () => getInvestmentPlans(profile!.household_id),
        enabled: !!profile?.household_id,
    });

    const pauseMutation = useMutation({
        mutationFn: pauseInvestmentPlan,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['investmentPlans'] });
        },
    });

    const resumeMutation = useMutation({
        mutationFn: resumeInvestmentPlan,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['investmentPlans'] });
        },
    });

    const deletePlanMutation = useMutation({
        mutationFn: deleteInvestmentPlan,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['investmentPlans'] });
        },
    });

    const deleteTransactionMutation = useMutation({
        mutationFn: deleteInvestmentTransaction,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['investmentTransactions'] });
            loadTransactions(selectedPlan!.id);
        },
    });

    const loadTransactions = async (planId: string) => {
        try {
            const transactions = await getInvestmentTransactions(planId);
            setPlanTransactions(transactions);
        } catch (error) {
            console.error('Failed to load transactions:', error);
        }
    };

    const handleAddTransaction = (plan: InvestmentPlan) => {
        setSelectedPlan(plan);
        setModalMode('transaction');
    };

    const handleViewTransactions = async (plan: InvestmentPlan) => {
        setSelectedPlan(plan);
        setModalMode('history');
        await loadTransactions(plan.id);
    };

    const handleCloseModal = () => {
        setSelectedPlan(null);
        setModalMode(null);
        setPlanTransactions([]);
    };

    const refresh = () => {
        queryClient.invalidateQueries({ queryKey: ['investmentPlans'] });
        queryClient.invalidateQueries({ queryKey: ['investmentTransactions'] });
    };

    const activePlans = plans.filter((p) => p.status === 'active');
    const totalMonthlySIP = activePlans
        .filter((p) => p.frequency === 'monthly')
        .reduce((sum, p) => sum + p.amount, 0);
    const totalQuarterlySIP = activePlans
        .filter((p) => p.frequency === 'quarterly')
        .reduce((sum, p) => sum + p.amount, 0);
    const totalYearlySIP = activePlans
        .filter((p) => p.frequency === 'yearly')
        .reduce((sum, p) => sum + p.amount, 0);

    if (isLoading) {
        return (
            <DashboardLayout>
                <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-400">
                    <Loader2 className="w-12 h-12 animate-spin mb-4" />
                    <p className="text-lg font-medium">Loading investments…</p>
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
                        <h2 className="text-3xl font-black">My Investments</h2>
                        <div className="flex gap-8 mt-4">
                            {totalMonthlySIP > 0 && (
                                <div>
                                    <p className="text-xs uppercase text-slate-400">Monthly SIP</p>
                                    <p className="text-2xl font-black">{formatCurrency(totalMonthlySIP)}</p>
                                </div>
                            )}
                            {totalQuarterlySIP > 0 && (
                                <div>
                                    <p className="text-xs uppercase text-slate-400">Quarterly SIP</p>
                                    <p className="text-2xl font-black">{formatCurrency(totalQuarterlySIP)}</p>
                                </div>
                            )}
                            {totalYearlySIP > 0 && (
                                <div>
                                    <p className="text-xs uppercase text-slate-400">Yearly SIP</p>
                                    <p className="text-2xl font-black">{formatCurrency(totalYearlySIP)}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setIsAddPlanOpen(true)}
                            className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-blue-700 transition"
                        >
                            <Plus className="w-5 h-5" />
                            Add Investment Plan
                        </button>
                    </div>
                </div>

                {/* Investment Plans */}
                {plans.length === 0 ? (
                    <div className="p-20 text-center border-2 border-dashed rounded-3xl">
                        <TrendingUp className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                        <p className="mt-4 font-bold text-slate-600 dark:text-slate-400">No investment plans yet</p>
                        <p className="text-sm text-slate-500 dark:text-slate-500 mt-2 mb-6">
                            Create your first investment plan to start tracking your SIPs and investments.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {plans.map((plan) => (
                            <InvestmentPlanCard
                                key={plan.id}
                                plan={plan}
                                onPause={(p) => pauseMutation.mutate(p.id)}
                                onResume={(p) => resumeMutation.mutate(p.id)}
                                onDelete={(p) => deletePlanMutation.mutate(p.id)}
                                onAddTransaction={handleAddTransaction}
                                onViewTransactions={handleViewTransactions}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Modals */}
            <AddInvestmentPlanModal
                isOpen={isAddPlanOpen}
                onClose={() => setIsAddPlanOpen(false)}
                onSuccess={refresh}
            />

            {selectedPlan && modalMode === 'transaction' && (
                <AddInvestmentTransactionModal
                    plan={selectedPlan}
                    isOpen
                    onClose={handleCloseModal}
                    onSuccess={() => {
                        refresh();
                        handleCloseModal();
                    }}
                />
            )}

            {selectedPlan && modalMode === 'history' && (
                <Modal isOpen onClose={handleCloseModal} title={`Transaction History - ${selectedPlan.instrument?.name}`}>
                    <InvestmentTransactionList
                        transactions={planTransactions}
                        onDelete={(t) => deleteTransactionMutation.mutate(t.id)}
                    />
                </Modal>
            )}
        </DashboardLayout>
    );
}

