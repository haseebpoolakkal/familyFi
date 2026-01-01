import { formatCurrency } from '@/lib/utils';
import { CheckCircle2, TrendingUp } from 'lucide-react';

interface Goal {
    id: string;
    name: string;
    target_amount: number;
    saved_amount: number;
    allocation_percentage: number;
}

export default function GoalCard({ goal }: { goal: Goal }) {
    const isAchieved = goal.saved_amount >= goal.target_amount;
    const progress = Math.min((goal.saved_amount / goal.target_amount) * 100, 100);

    return (
        <div className={`p-8 rounded-[2.5rem] border transition-all duration-500 hover:shadow-2xl hover:-translate-y-1 ${isAchieved
            ? 'bg-green-50/30 dark:bg-green-900/10 border-green-100/50 dark:border-green-900/20'
            : 'bg-white dark:bg-slate-900/40 border-slate-100 dark:border-slate-800/50 shadow-sm'}`}>
            <div className="flex justify-between items-start mb-6">
                <div className="flex-1">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${isAchieved ? 'bg-green-100 dark:bg-green-900/30' : 'bg-blue-50 dark:bg-blue-900/20'}`}>
                            <TrendingUp className={`w-5 h-5 ${isAchieved ? 'text-green-600 dark:text-green-400' : 'text-blue-600 dark:text-blue-400'}`} />
                        </div>
                        <h3 className="font-black text-slate-900 dark:text-slate-100 text-xl tracking-tight">{goal.name}</h3>
                        {isAchieved && <CheckCircle2 className="w-5 h-5 text-green-500 animate-pulse" />}
                    </div>
                    <div className="flex gap-3 mt-3">
                        <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-900/20 px-3 py-1 rounded-full uppercase tracking-widest border border-blue-100/20">
                            {goal.allocation_percentage}% Allocation
                        </span>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                        {formatCurrency(goal.saved_amount)}
                    </p>
                    <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">
                        of {formatCurrency(goal.target_amount)}
                    </p>
                </div>
            </div>

            <div className="relative h-3 w-full bg-slate-100 dark:bg-slate-800/50 rounded-full overflow-hidden shadow-inner">
                <div
                    className={`absolute top-0 left-0 h-full transition-all duration-1000 cubic-bezier(0.4, 0, 0.2, 1) ${isAchieved ? 'bg-green-500' : 'bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.4)]'}`}
                    style={{ width: `${progress}%` }}
                />
            </div>
            <div className="flex justify-between items-center mt-3">
                <p className={`text-xs font-black tracking-tighter ${isAchieved ? 'text-green-600 dark:text-green-400' : 'text-slate-600 dark:text-slate-400'}`}>
                    {progress.toFixed(1)}% <span className="opacity-50 ml-1 font-medium italic">Complete</span>
                </p>
                {isAchieved && (
                    <span className="text-[10px] font-black text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900/40 px-2 py-0.5 rounded-lg uppercase tracking-tighter">
                        Goal Reached
                    </span>
                )}
            </div>
        </div>
    );
}
