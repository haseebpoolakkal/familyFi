'use client';

import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Legend
} from 'recharts';
import { Income } from '@/services/income';
import { Goal } from '@/services/goals';

interface DashboardChartsProps {
    income: Income[];
    expenses: Array<{
        amount: number;
        description: string;
        [key: string]: unknown;
    }>;
    goals: Goal[];
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function DashboardCharts({ income, expenses, goals }: DashboardChartsProps) {
    const totalIncome = income.reduce((acc, curr) => acc + (curr.amount || 0), 0);
    const totalExpenses = expenses.reduce((acc, curr) => acc + (curr.amount || 0), 0);

    const barData = [
        { name: 'Financial Overview', Income: totalIncome, Expenses: totalExpenses }
    ];

    const pieData = goals.map(goal => ({
        name: goal.name,
        value: goal.saved_amount || 0
    })).filter(g => g.value > 0);

    const hasData = totalIncome > 0 || totalExpenses > 0;
    const hasGoals = pieData.length > 0;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-10">
            <div className="bg-white dark:bg-slate-900/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm transition-colors duration-300">
                <h3 className="text-lg font-black text-slate-800 dark:text-slate-200 mb-6 tracking-tight">Income vs Expenses</h3>
                <div className="h-64 w-full flex items-center justify-center">
                    {hasData ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={barData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" opacity={0.1} />
                                <XAxis dataKey="name" hide />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 700 }} />
                                <Tooltip
                                    contentStyle={{
                                        borderRadius: '16px',
                                        border: '1px solid #1e293b',
                                        backgroundColor: 'rgba(15, 23, 42, 0.9)',
                                        backdropFilter: 'blur(8px)',
                                        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                                        color: '#f8fafc'
                                    }}
                                    itemStyle={{ fontWeight: 800 }}
                                />
                                <Bar dataKey="Income" fill="#10b981" radius={[6, 6, 0, 0]} barSize={40} />
                                <Bar dataKey="Expenses" fill="#ef4444" radius={[6, 6, 0, 0]} barSize={40} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="text-center">
                            <p className="text-slate-400 dark:text-slate-500 text-sm font-bold">No data for this period</p>
                            <p className="text-slate-300 dark:text-slate-600 text-xs mt-1">Add income or expenses to see charts</p>
                        </div>
                    )}
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm transition-colors duration-300">
                <h3 className="text-lg font-black text-slate-800 dark:text-slate-200 mb-6 tracking-tight">Savings Distribution</h3>
                <div className="h-64 w-full flex items-center justify-center">
                    {hasGoals ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{
                                        borderRadius: '16px',
                                        border: '1px solid #1e293b',
                                        backgroundColor: 'rgba(15, 23, 42, 0.9)',
                                        backdropFilter: 'blur(8px)',
                                        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                                        color: '#f8fafc'
                                    }}
                                    itemStyle={{ fontWeight: 800 }}
                                />
                                <Legend
                                    verticalAlign="bottom"
                                    height={36}
                                    iconType="circle"
                                    wrapperStyle={{ fontSize: '12px', fontWeight: 'bold', paddingTop: '10px' }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="text-center">
                            <p className="text-slate-400 dark:text-slate-500 text-sm font-bold">No savings distributed yet</p>
                            <p className="text-slate-300 dark:text-slate-600 text-xs mt-1">Configure goal percentages and allocate funds</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
