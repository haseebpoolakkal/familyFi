'use client';

import { useState, useEffect } from 'react';
import Modal from '@/components/shared/Modal';
import { createInvestmentPlan, getInvestmentInstruments, createInvestmentInstrument } from '@/services/investments';
import { VisibilitySelector } from '@/components/shared/VisibilitySelector';
import { Visibility, InvestmentInstrument, InvestmentFrequency } from '@/types';
import { useUserStore } from '@/store/userStore';
import { useQuery } from '@tanstack/react-query';
import { getGoals, Goal } from '@/services/goals';
import { TrendingUp, Target } from 'lucide-react';

type Props = {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
};

export default function AddInvestmentPlanModal({ isOpen, onClose, onSuccess }: Props) {
    const { profile } = useUserStore();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        instrument_id: '',
        goal_id: '',
        amount: '',
        frequency: 'monthly' as InvestmentFrequency,
        start_date: new Date().toISOString().split('T')[0],
        end_date: '',
    });
    const [visibility, setVisibility] = useState<Visibility>('private');
    const [sharedWith, setSharedWith] = useState<string[]>([]);
    const [creatingInstrument, setCreatingInstrument] = useState(false);
    const [newInstrument, setNewInstrument] = useState({
        name: '',
        type: 'mutual_fund' as const,
        isin_or_symbol: '',
        risk_level: 'medium' as const,
    });

    const { data: instruments = [], refetch: refetchInstruments } = useQuery({
        queryKey: ['investmentInstruments'],
        queryFn: getInvestmentInstruments,
    });

    const { data: goals = [] } = useQuery({
        queryKey: ['goals', profile?.household_id],
        queryFn: () => getGoals(profile!.household_id),
        enabled: !!profile?.household_id && isOpen,
    });

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!profile?.household_id || !formData.instrument_id) return;

        setLoading(true);
        try {
            await createInvestmentPlan({
                household_id: profile.household_id,
                instrument_id: formData.instrument_id,
                goal_id: formData.goal_id || undefined,
                amount: parseFloat(formData.amount),
                frequency: formData.frequency,
                start_date: formData.start_date,
                visibility,
                sharedWith,
            });
            onSuccess();
            resetForm();
            onClose();
        } catch (error) {
            console.error('Failed to create investment plan:', error);
            alert('Failed to create investment plan. Please check your inputs and try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateInstrument = async () => {
        if (!newInstrument.name) return;
        setLoading(true);
        try {
            const created = await createInvestmentInstrument(newInstrument);
            await refetchInstruments();
            setFormData({ ...formData, instrument_id: created.id });
            setCreatingInstrument(false);
            setNewInstrument({ name: '', type: 'mutual_fund', isin_or_symbol: '', risk_level: 'medium' });
        } catch (error) {
            console.error('Failed to create instrument:', error);
            alert('Failed to create instrument. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({
            instrument_id: '',
            goal_id: '',
            amount: '',
            frequency: 'monthly',
            start_date: new Date().toISOString().split('T')[0],
            end_date: '',
        });
        setVisibility('private');
        setSharedWith([]);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Add Investment Plan">
            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Instrument Selection */}
                <div>
                    <label className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-2 block">
                        Investment Instrument
                    </label>
                    {!creatingInstrument ? (
                        <div className="space-y-2">
                            <div className="relative">
                                <TrendingUp className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                                <select
                                    required
                                    value={formData.instrument_id}
                                    onChange={(e) => setFormData({ ...formData, instrument_id: e.target.value })}
                                    className="w-full pl-11 pr-4 py-3 rounded-xl border bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                                >
                                    <option value="">Select Instrument</option>
                                    {instruments.map((inst) => (
                                        <option key={inst.id} value={inst.id}>
                                            {inst.name} ({inst.type.replace('_', ' ')})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <button
                                type="button"
                                onClick={() => setCreatingInstrument(true)}
                                className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                            >
                                + Create New Instrument
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border">
                            <input
                                type="text"
                                placeholder="Instrument Name"
                                value={newInstrument.name}
                                onChange={(e) => setNewInstrument({ ...newInstrument, name: e.target.value })}
                                className="w-full px-4 py-2 rounded-lg border bg-white dark:bg-slate-900"
                            />
                            <select
                                value={newInstrument.type}
                                onChange={(e) => setNewInstrument({ ...newInstrument, type: e.target.value as any })}
                                className="w-full px-4 py-2 rounded-lg border bg-white dark:bg-slate-900"
                            >
                                <option value="mutual_fund">Mutual Fund</option>
                                <option value="stock">Stock</option>
                                <option value="bond">Bond</option>
                                <option value="other">Other</option>
                            </select>
                            <input
                                type="text"
                                placeholder="ISIN / Symbol (Optional)"
                                value={newInstrument.isin_or_symbol}
                                onChange={(e) => setNewInstrument({ ...newInstrument, isin_or_symbol: e.target.value })}
                                className="w-full px-4 py-2 rounded-lg border bg-white dark:bg-slate-900"
                            />
                            <select
                                value={newInstrument.risk_level}
                                onChange={(e) => setNewInstrument({ ...newInstrument, risk_level: e.target.value as any })}
                                className="w-full px-4 py-2 rounded-lg border bg-white dark:bg-slate-900"
                            >
                                <option value="low">Low Risk</option>
                                <option value="medium">Medium Risk</option>
                                <option value="high">High Risk</option>
                            </select>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={handleCreateInstrument}
                                    disabled={loading || !newInstrument.name}
                                    className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50"
                                >
                                    Create
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setCreatingInstrument(false);
                                        setNewInstrument({ name: '', type: 'mutual_fund', isin_or_symbol: '', risk_level: 'medium' });
                                    }}
                                    className="px-4 py-2 bg-slate-200 dark:bg-slate-700 rounded-lg font-bold"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Goal Selection (Optional) */}
                {goals.length > 0 && (
                    <div>
                        <label className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-2 block">
                            Link to Goal (Optional)
                        </label>
                        <div className="relative">
                            <Target className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                            <select
                                value={formData.goal_id}
                                onChange={(e) => setFormData({ ...formData, goal_id: e.target.value })}
                                className="w-full pl-11 pr-4 py-3 rounded-xl border bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                            >
                                <option value="">No Goal Link</option>
                                {goals.map((goal) => (
                                    <option key={goal.id} value={goal.id}>
                                        {goal.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-2 block">
                            SIP Amount
                        </label>
                        <input
                            required
                            type="number"
                            step="0.01"
                            min="1"
                            value={formData.amount}
                            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-2 block">
                            Frequency
                        </label>
                        <select
                            required
                            value={formData.frequency}
                            onChange={(e) => setFormData({ ...formData, frequency: e.target.value as InvestmentFrequency })}
                            className="w-full px-4 py-3 rounded-xl border bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                        >
                            <option value="monthly">Monthly</option>
                            <option value="quarterly">Quarterly</option>
                            <option value="yearly">Yearly</option>
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-2 block">
                            Start Date
                        </label>
                        <input
                            required
                            type="date"
                            value={formData.start_date}
                            onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-2 block">
                            End Date (Optional)
                        </label>
                        <input
                            type="date"
                            value={formData.end_date}
                            onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>

                {profile && (
                    <VisibilitySelector
                        value={visibility}
                        onChange={(v: Visibility, s: string[]) => {
                            setVisibility(v);
                            setSharedWith(s);
                        }}
                        householdId={profile.household_id}
                    />
                )}

                <button
                    disabled={loading || creatingInstrument}
                    className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition disabled:opacity-50"
                >
                    {loading ? 'Creating...' : 'Create Investment Plan'}
                </button>
            </form>
        </Modal>
    );
}

