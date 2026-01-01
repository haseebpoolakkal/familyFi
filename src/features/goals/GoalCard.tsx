import { formatCurrency } from '@/lib/utils';
import { CheckCircle2 } from 'lucide-react';

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
        <div className={`p-6 rounded-2xl border transition hover:shadow-md ${isAchieved ? 'bg-green-50/50 border-green-100' : 'bg-white border-slate-100 shadow-sm'}`}>
            <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                    <div className="flex items-center gap-2">
                        <h3 className="font-bold text-slate-800 text-lg">{goal.name}</h3>
                        {isAchieved && <CheckCircle2 className="w-5 h-5 text-green-500 fill-green-50" />}
                    </div>
                    <div className="flex gap-2 mt-1">
                        <p className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full inline-block">
                            {goal.allocation_percentage}% Allocation
                        </p>
                        {isAchieved && (
                            <p className="text-xs font-semibold text-green-600 bg-green-100 px-2 py-0.5 rounded-full inline-block">
                                Goal Achieved
                            </p>
                        )}
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-sm font-bold text-slate-800">
                        {formatCurrency(goal.saved_amount)}
                    </p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        of {formatCurrency(goal.target_amount)}
                    </p>
                </div>
            </div>

            <div className="relative h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                    className={`absolute top-0 left-0 h-full transition-all duration-1000 ease-out ${isAchieved ? 'bg-green-500' : 'bg-blue-500'}`}
                    style={{ width: `${progress}%` }}
                />
            </div>
            <div className="flex justify-between items-center mt-2">
                <p className={`text-xs font-black ${isAchieved ? 'text-green-600' : 'text-slate-600'}`}>
                    {progress.toFixed(1)}%
                </p>
                {isAchieved && (
                    <span className="text-[10px] font-bold text-green-700 bg-green-100 px-1.5 py-0.5 rounded">
                        COMPLETED
                    </span>
                )}
            </div>
        </div>
    );
}
