import { ZakatSnapshot } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { CheckCircle2, XCircle, Calendar, TrendingUp, TrendingDown, Scale } from 'lucide-react';

type Props = {
    snapshot: ZakatSnapshot;
};

export default function ZakatSummaryCard({ snapshot }: Props) {
    const meetsNisab = snapshot.net_zakatable_wealth >= snapshot.nisab_threshold;
    const zakatYear = `${new Date(snapshot.zakat_year_start).toLocaleDateString('en-IN', {
        month: 'short',
        year: 'numeric',
    })} - ${new Date(snapshot.zakat_year_end).toLocaleDateString('en-IN', {
        month: 'short',
        year: 'numeric',
    })}`;

    return (
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100">Zakat Summary</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {zakatYear}
                    </p>
                </div>
                <div className={`px-4 py-2 rounded-full flex items-center gap-2 ${
                    meetsNisab
                        ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                        : 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                }`}>
                    {meetsNisab ? (
                        <CheckCircle2 className="w-5 h-5" />
                    ) : (
                        <XCircle className="w-5 h-5" />
                    )}
                    <span className="font-bold text-sm">
                        {meetsNisab ? 'Meets Nisab' : 'Below Nisab'}
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <StatCard
                    icon={<TrendingUp className="w-5 h-5" />}
                    label="Total Zakatable Assets"
                    value={formatCurrency(snapshot.total_zakatable_assets)}
                    color="text-blue-600 dark:text-blue-400"
                />
                <StatCard
                    icon={<TrendingDown className="w-5 h-5" />}
                    label="Deductible Liabilities (12 months)"
                    value={formatCurrency(snapshot.total_deductible_liabilities)}
                    color="text-red-600 dark:text-red-400"
                />
            </div>

            <div className="border-t border-slate-200 dark:border-slate-700 pt-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-bold text-slate-600 dark:text-slate-400">Net Zakatable Wealth</span>
                    <span className="text-2xl font-black text-slate-900 dark:text-slate-100">
                        {formatCurrency(snapshot.net_zakatable_wealth)}
                    </span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-600 dark:text-slate-400 flex items-center gap-2">
                        <Scale className="w-4 h-4" />
                        Nisab Threshold ({snapshot.nisab_type})
                    </span>
                    <span className="text-xl font-black text-slate-700 dark:text-slate-300">
                        {formatCurrency(snapshot.nisab_threshold)}
                    </span>
                </div>
            </div>

            <div className={`p-6 rounded-2xl ${
                snapshot.zakat_due > 0
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800'
                    : 'bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700'
            }`}>
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm font-bold text-slate-600 dark:text-slate-400 mb-1">
                            Zakat Due (2.5%)
                        </p>
                        {snapshot.zakat_due === 0 && (
                            <p className="text-xs text-slate-500 dark:text-slate-500">
                                Net wealth is below Nisab threshold
                            </p>
                        )}
                    </div>
                    <div className={`text-3xl font-black ${
                        snapshot.zakat_due > 0
                            ? 'text-blue-600 dark:text-blue-400'
                            : 'text-slate-400 dark:text-slate-600'
                    }`}>
                        {formatCurrency(snapshot.zakat_due)}
                    </div>
                </div>
            </div>

            <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
                <p className="text-xs text-amber-800 dark:text-amber-300 font-medium italic">
                    ⚠️ This tool assists in estimation only. Zakat obligation requires intention (niyyah) and scholarly consultation for complex cases. Please consult with a qualified Islamic scholar for final determination.
                </p>
            </div>
        </div>
    );
}

function StatCard({
    icon,
    label,
    value,
    color,
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
    color: string;
}) {
    return (
        <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-4">
            <div className={`flex items-center gap-2 mb-2 ${color}`}>
                {icon}
                <span className="text-xs font-bold uppercase">{label}</span>
            </div>
            <div className="text-xl font-black text-slate-900 dark:text-slate-100">{value}</div>
        </div>
    );
}

