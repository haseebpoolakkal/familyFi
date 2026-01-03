import { InvestmentPlan } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { TrendingUp, Calendar, Pause, Play, MoreVertical, Trash2, Edit2, Target } from 'lucide-react';
import { useState } from 'react';

type Props = {
    plan: InvestmentPlan;
    onPause?: (plan: InvestmentPlan) => void;
    onResume?: (plan: InvestmentPlan) => void;
    onDelete?: (plan: InvestmentPlan) => void;
    onEdit?: (plan: InvestmentPlan) => void;
    onAddTransaction?: (plan: InvestmentPlan) => void;
    onViewTransactions?: (plan: InvestmentPlan) => void;
};

export default function InvestmentPlanCard({
    plan,
    onPause,
    onResume,
    onDelete,
    onEdit,
    onAddTransaction,
    onViewTransactions,
}: Props) {
    const [showMenu, setShowMenu] = useState(false);

    const instrument = plan.instrument;
    const isActive = plan.status === 'active';
    const isPaused = plan.status === 'paused';

    return (
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 shadow-sm hover:shadow-md transition mb-4 relative">
            <div className="flex justify-between items-start mb-6">
                <div className="flex-1">
                    <h3 className="text-xl font-black text-slate-900 dark:text-slate-100">
                        {instrument?.name || 'Unknown Instrument'}
                    </h3>
                    <div className="flex items-center gap-3 mt-2">
                        <span className="text-xs uppercase tracking-widest text-slate-400 dark:text-slate-500 font-bold">
                            {instrument?.type?.replace('_', ' ').toUpperCase() || 'INVESTMENT'}
                        </span>
                        {plan.goal_id && (
                            <span className="text-xs uppercase tracking-widest text-blue-600 dark:text-blue-400 font-bold flex items-center gap-1">
                                <Target className="w-3 h-3" />
                                Linked to Goal
                            </span>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <span
                        className={`px-3 py-1 rounded-full text-xs font-bold ${
                            isActive
                                ? 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                                : isPaused
                                ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                                : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                        }`}
                    >
                        {plan.status.toUpperCase()}
                    </span>

                    <div className="relative">
                        <button
                            onClick={() => setShowMenu(!showMenu)}
                            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition"
                        >
                            <MoreVertical className="w-5 h-5 text-slate-400" />
                        </button>

                        {showMenu && (
                            <>
                                <div
                                    className="fixed inset-0 z-10"
                                    onClick={() => setShowMenu(false)}
                                />
                                <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-xl z-20 overflow-hidden text-sm font-medium">
                                    {onEdit && (
                                        <button
                                            onClick={() => {
                                                onEdit(plan);
                                                setShowMenu(false);
                                            }}
                                            className="w-full flex items-center gap-3 px-4 py-3 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                            Edit Plan
                                        </button>
                                    )}
                                    {isActive && onPause && (
                                        <button
                                            onClick={() => {
                                                onPause(plan);
                                                setShowMenu(false);
                                            }}
                                            className="w-full flex items-center gap-3 px-4 py-3 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                                        >
                                            <Pause className="w-4 h-4" />
                                            Pause
                                        </button>
                                    )}
                                    {isPaused && onResume && (
                                        <button
                                            onClick={() => {
                                                onResume(plan);
                                                setShowMenu(false);
                                            }}
                                            className="w-full flex items-center gap-3 px-4 py-3 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                                        >
                                            <Play className="w-4 h-4" />
                                            Resume
                                        </button>
                                    )}
                                    {onDelete && (
                                        <button
                                            onClick={() => {
                                                if (confirm('Are you sure you want to delete this investment plan?')) {
                                                    onDelete(plan);
                                                }
                                                setShowMenu(false);
                                            }}
                                            className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                            Delete
                                        </button>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Stat
                    icon={<TrendingUp />}
                    label="SIP Amount"
                    value={formatCurrency(plan.amount)}
                />
                <Stat
                    icon={<Calendar />}
                    label="Frequency"
                    value={plan.frequency.charAt(0).toUpperCase() + plan.frequency.slice(1)}
                />
                <Stat
                    icon={<Calendar />}
                    label="Start Date"
                    value={new Date(plan.start_date).toLocaleDateString('en-IN', {
                        month: 'short',
                        year: 'numeric',
                    })}
                />
            </div>

            <div className="flex gap-3">
                {onAddTransaction && (
                    <button
                        onClick={() => onAddTransaction(plan)}
                        className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition"
                    >
                        Add Transaction
                    </button>
                )}
                {onViewTransactions && (
                    <button
                        onClick={() => onViewTransactions(plan)}
                        className="flex-1 border border-slate-200 dark:border-slate-700 py-3 rounded-xl font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                    >
                        View History
                    </button>
                )}
            </div>
        </div>
    );
}

function Stat({
    icon,
    label,
    value,
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
}) {
    return (
        <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-4">
            <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500 mb-1">
                {icon}
                <span className="text-xs font-bold uppercase">{label}</span>
            </div>
            <div className="text-lg font-black text-slate-900 dark:text-slate-100">{value}</div>
        </div>
    );
}

