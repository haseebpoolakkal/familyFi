'use client';

import DashboardLayout from '@/components/shared/DashboardLayout';
import { useUserStore } from '@/store/userStore';
import { useState } from 'react';
import { Copy, Check, Users, Plus, Trash2, Target } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getGoals, updateGoal, type Goal } from '@/services/goals';
import {
    getExpenseCategories,
    createExpenseCategory,
    deleteExpenseCategory,
    type ExpenseCategory,
} from '@/services/settings';

export default function SettingsPage() {
    const { profile } = useUserStore();
    const [copied, setCopied] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const queryClient = useQueryClient();

    const { data: categories = [] } = useQuery({
        queryKey: ['categories', profile?.household_id],
        queryFn: () => getExpenseCategories(profile!.household_id),
        enabled: !!profile?.household_id,
    });

    const { data: goals = [] } = useQuery({
        queryKey: ['goals', profile?.household_id],
        queryFn: () => getGoals(profile!.household_id),
        enabled: !!profile?.household_id,
    });

    const addCategoryMutation = useMutation({
        mutationFn: async (name: string) => {
            if (!profile?.household_id) throw new Error('No household ID');
            return createExpenseCategory(profile.household_id, name);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categories'] });
            setNewCategoryName('');
        },
        onError: (error) => {
            console.error('Failed to add category:', error);
        }
    });

    const deleteCategoryMutation = useMutation({
        mutationFn: (id: string) => deleteExpenseCategory(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categories'] });
        },
        onError: (error) => {
            console.error('Failed to delete category:', error);
        }
    });

    const updateGoalMutation = useMutation({
        mutationFn: ({ id, updates }: { id: string; updates: { allocation_percentage: number } }) =>
            updateGoal(id, updates),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['goals'] });
        },
        onError: (error) => {
            console.error('Failed to update goal:', error);
        }
    });

    const copyToClipboard = () => {
        if (!profile?.household_id) return;
        navigator.clipboard.writeText(profile.household_id);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <DashboardLayout>
            <div className="max-w-4xl mx-auto">
                <h2 className="text-3xl font-black text-slate-900 dark:text-slate-100 mb-8 tracking-tight">Settings</h2>

                <div className="bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-8 space-y-8 transition-colors duration-300">
                    <section>
                        <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 mb-6 tracking-tight">Profile Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Full Name</label>
                                <p className="text-lg text-slate-800 dark:text-slate-100 font-bold">{profile?.full_name}</p>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Role</label>
                                <p className="text-lg text-slate-800 dark:text-slate-100 capitalize font-bold">{profile?.role}</p>
                            </div>
                        </div>
                    </section>

                    <section className="border-t border-slate-50 dark:border-slate-800 pt-8">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="bg-blue-50 dark:bg-blue-900/20 p-2.5 rounded-xl">
                                <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight">Household Management</h3>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-700/50">
                            <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">Your Household ID</label>
                            <div className="flex gap-3">
                                <code className="flex-1 bg-white dark:bg-slate-800 px-4 py-3 rounded-xl text-slate-600 dark:text-slate-300 font-mono text-sm border border-slate-200 dark:border-slate-700 shadow-inner">
                                    {profile?.household_id}
                                </code>
                                <button
                                    onClick={copyToClipboard}
                                    className="px-6 py-3 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition flex items-center gap-2 active:scale-95 shadow-sm"
                                >
                                    {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                                    {copied ? 'Copied' : 'Copy'}
                                </button>
                            </div>
                            <p className="mt-4 text-xs text-slate-500 dark:text-slate-400 font-medium italic">
                                Share this ID with your partner during signup to link their account to the same family data.
                            </p>
                        </div>
                    </section>

                    <section className="border-t border-slate-50 dark:border-slate-800 pt-8">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="bg-blue-50 dark:bg-blue-900/20 p-2.5 rounded-xl">
                                <Target className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight">Goal Allocations</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {goals.map((goal: Goal) => (
                                <div key={goal.id} className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800/30 p-5 border border-slate-100 dark:border-slate-800 rounded-2xl transition-colors hover:bg-white dark:hover:bg-slate-800/50">
                                    <div className="flex-1">
                                        <p className="font-bold text-slate-800 dark:text-slate-100">{goal.name}</p>
                                    </div>
                                    <div className="w-24">
                                        <div className="relative">
                                            <input
                                                type="number"
                                                className="w-full pl-4 pr-8 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-100 font-black outline-none focus:ring-2 focus:ring-blue-500"
                                                defaultValue={goal.allocation_percentage}
                                                onBlur={(e) => updateGoalMutation.mutate({ id: goal.id, updates: { allocation_percentage: parseFloat(e.target.value) } })}
                                            />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 text-xs font-black">%</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    <section className="border-t border-slate-50 dark:border-slate-800 pt-8">
                        <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 mb-6 tracking-tight">Expense Categories</h3>
                        <div className="space-y-4">
                            <div className="flex gap-3 mb-6">
                                <input
                                    type="text"
                                    className="flex-1 px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-sm text-slate-900 dark:text-slate-100 font-bold focus:ring-2 focus:ring-blue-500 transition"
                                    placeholder="New Category Name"
                                    value={newCategoryName}
                                    onChange={(e) => setNewCategoryName(e.target.value)}
                                />
                                <button
                                    onClick={() => newCategoryName && addCategoryMutation.mutate(newCategoryName)}
                                    disabled={addCategoryMutation.isPending}
                                    className="bg-blue-600 text-white px-8 py-3.5 rounded-xl font-bold transition flex items-center gap-2 hover:bg-blue-700 active:scale-95 shadow-lg shadow-blue-100 dark:shadow-none"
                                >
                                    <Plus className="w-5 h-5" />
                                    Add
                                </button>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {categories.map((cat: ExpenseCategory) => (
                                    <div key={cat.id} className="flex items-center justify-between px-5 py-4 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl group hover:border-blue-200 dark:hover:border-blue-900/50 transition shadow-sm">
                                        <span className="font-bold text-slate-700 dark:text-slate-300">{cat.name}</span>
                                        <button
                                            onClick={() => deleteCategoryMutation.mutate(cat.id)}
                                            className="text-slate-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 transition transform hover:scale-110"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>

                    <section className="border-t border-slate-50 dark:border-slate-800 pt-8">
                        <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 mb-6 tracking-tight">Regional & Currency</h3>
                        <div className="flex flex-wrap gap-4">
                            <div className="px-6 py-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl text-slate-700 dark:text-slate-300 font-bold border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-blue-500" />
                                Currency: INR (₹)
                            </div>
                            <div className="px-6 py-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl text-slate-700 dark:text-slate-300 font-bold border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                Locale: en-IN
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </DashboardLayout>
    );
}
