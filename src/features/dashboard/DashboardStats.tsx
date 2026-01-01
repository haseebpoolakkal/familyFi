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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {stats.map((stat) => (
                <div key={stat.label} className={`${stat.bg} p-6 rounded-2xl border border-slate-100 shadow-sm`}>
                    <p className="text-sm font-medium text-slate-500">{stat.label}</p>
                    <p className={`text-3xl font-bold mt-2 ${stat.color}`}>
                        {formatCurrency(stat.value)}
                    </p>
                </div>
            ))}
        </div>
    );
}
