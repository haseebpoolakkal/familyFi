'use client';

import { useState } from 'react';
import Modal from '@/components/shared/Modal';
import { recordInvestmentTransaction } from '@/services/investments';
import { InvestmentPlan, InvestmentTransactionType } from '@/types';
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react';

type Props = {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    plan: InvestmentPlan;
};

export default function AddInvestmentTransactionModal({
    isOpen,
    onClose,
    onSuccess,
    plan,
}: Props) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        transaction_date: new Date().toISOString().split('T')[0],
        amount: '',
        transaction_type: 'buy' as InvestmentTransactionType,
        units: '',
        nav: '',
    });

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        try {
            await recordInvestmentTransaction({
                plan_id: plan.id,
                transaction_date: formData.transaction_date,
                amount: parseFloat(formData.amount),
                transaction_type: formData.transaction_type,
                units: formData.units ? parseFloat(formData.units) : undefined,
                nav: formData.nav ? parseFloat(formData.nav) : undefined,
            });
            onSuccess();
            resetForm();
            onClose();
        } catch (error) {
            console.error('Failed to record transaction:', error);
            alert('Failed to record transaction. Please check your inputs and try again.');
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({
            transaction_date: new Date().toISOString().split('T')[0],
            amount: '',
            transaction_type: 'buy',
            units: '',
            nav: '',
        });
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Add Investment Transaction">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-900/30">
                    <p className="text-sm font-bold text-blue-800 dark:text-blue-300">
                        Plan: {plan.instrument?.name || 'Unknown'}
                    </p>
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                        SIP Amount: ₹{plan.amount.toLocaleString('en-IN')} / {plan.frequency}
                    </p>
                </div>

                <div>
                    <label className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-2 block">
                        Transaction Type
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                        <button
                            type="button"
                            onClick={() => setFormData({ ...formData, transaction_type: 'buy' })}
                            className={`p-3 rounded-xl font-bold transition flex items-center justify-center gap-2 ${
                                formData.transaction_type === 'buy'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                            }`}
                        >
                            <TrendingUp className="w-4 h-4" />
                            Buy
                        </button>
                        <button
                            type="button"
                            onClick={() => setFormData({ ...formData, transaction_type: 'sell' })}
                            className={`p-3 rounded-xl font-bold transition flex items-center justify-center gap-2 ${
                                formData.transaction_type === 'sell'
                                    ? 'bg-red-600 text-white'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                            }`}
                        >
                            <TrendingDown className="w-4 h-4" />
                            Sell
                        </button>
                        <button
                            type="button"
                            onClick={() => setFormData({ ...formData, transaction_type: 'dividend' })}
                            className={`p-3 rounded-xl font-bold transition flex items-center justify-center gap-2 ${
                                formData.transaction_type === 'dividend'
                                    ? 'bg-green-600 text-white'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                            }`}
                        >
                            <DollarSign className="w-4 h-4" />
                            Dividend
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-2 block">
                            Transaction Date
                        </label>
                        <input
                            required
                            type="date"
                            value={formData.transaction_date}
                            onChange={(e) => setFormData({ ...formData, transaction_date: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-2 block">
                            Amount
                        </label>
                        <input
                            required
                            type="number"
                            step="0.01"
                            min="0.01"
                            value={formData.amount}
                            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>

                {(formData.transaction_type === 'buy' || formData.transaction_type === 'sell') && (
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-2 block">
                                Units (Optional)
                            </label>
                            <input
                                type="number"
                                step="0.0001"
                                min="0"
                                value={formData.units}
                                onChange={(e) => setFormData({ ...formData, units: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-2 block">
                                NAV (Optional)
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={formData.nav}
                                onChange={(e) => setFormData({ ...formData, nav: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>
                )}

                <button
                    disabled={loading}
                    className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition disabled:opacity-50"
                >
                    {loading ? 'Recording...' : 'Record Transaction'}
                </button>
            </form>
        </Modal>
    );
}

