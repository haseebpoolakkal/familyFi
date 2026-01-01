import { formatCurrency } from '@/lib/utils';

interface StatsProps {
    totalIncome: number;
    totalExpenses: number;
    totalSavings: number;
}

export default function DashboardStats({ totalIncome, totalExpenses, totalSavings }: StatsProps) {
    const stats = [
        { label: 'Total Income', value: totalIncome, color: 'text-green-600', bg: 'bg-green-50' },
        { label: 'Total Expenses', value: totalExpenses, color: 'text-red-600', bg: 'bg-red-50' },
        { label: 'Total Savings', value: totalSavings, color: 'text-blue-600', bg: 'bg-blue-50' },
    ];

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {stats.map((stat) => (
                <div key={stat.label} className={`${stat.bg} dark:bg-slate-900/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm transition-colors duration-300`}>
                    <p className="text-xs md:text-sm font-medium text-slate-500 dark:text-slate-400">{stat.label}</p>
                    <p className={`text-2xl md:text-3xl font-black mt-1 md:mt-2 tracking-tight ${stat.color}`}>
                        {formatCurrency(stat.value)}
                    </p>
                </div>
            ))}
        </div>
    );
}
