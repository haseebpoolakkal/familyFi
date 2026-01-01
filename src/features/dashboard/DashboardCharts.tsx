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
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <h3 className="text-lg font-bold text-slate-800 mb-6">Income vs Expenses</h3>
                <div className="h-64 w-full flex items-center justify-center">
                    {hasData ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={barData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" hide />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Bar dataKey="Income" fill="#10b981" radius={[4, 4, 0, 0]} barSize={40} />
                                <Bar dataKey="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={40} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="text-center">
                            <p className="text-slate-400 text-sm">No data for this period</p>
                            <p className="text-slate-300 text-xs mt-1">Add income or expenses to see charts</p>
                        </div>
                    )}
                </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <h3 className="text-lg font-bold text-slate-800 mb-6">Savings Distribution</h3>
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
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Legend verticalAlign="bottom" height={36} iconType="circle" />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="text-center">
                            <p className="text-slate-400 text-sm">No savings distributed yet</p>
                            <p className="text-slate-300 text-xs mt-1">Configure goal percentages and allocate funds</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
