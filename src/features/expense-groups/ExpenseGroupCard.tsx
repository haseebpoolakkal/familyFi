import { Layers, ArrowRight } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import Link from 'next/link';
import { ExpenseGroup } from '@/services/expenseGroupService';

export default function ExpenseGroupCard({ group }: { group: ExpenseGroup }) {
    return (
        <Link
            href={`/expense-groups/${group.id}`}
            className="group p-4 md:p-6 bg-white dark:bg-slate-900/60 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition flex justify-between items-center"
        >
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                    <Layers className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                </div>

                <div>
                    <h3 className="font-bold text-slate-800 dark:text-slate-100">
                        {group.name}
                    </h3>
                    {group.description && (
                        <p className="text-sm text-slate-400 dark:text-slate-500 line-clamp-1">
                            {group.description}
                        </p>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-3">
                <span className="font-black text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(group.total_amount)}
                </span>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-500 transition" />
            </div>
        </Link>
    );
}
