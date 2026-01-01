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
                <h2 className="text-3xl font-bold text-slate-800 mb-8">Settings</h2>

                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 space-y-8">
                    <section>
                        <h3 className="text-lg font-bold text-slate-800 mb-4">Profile Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-slate-500 mb-1">Full Name</label>
                                <p className="text-lg text-slate-800 font-semibold">{profile?.full_name}</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-500 mb-1">Role</label>
                                <p className="text-lg text-slate-800 capitalize font-semibold">{profile?.role}</p>
                            </div>
                        </div>
                    </section>

                    <section className="border-t border-slate-50 pt-8">
                        <div className="flex items-center gap-2 mb-4">
                            <Users className="w-5 h-5 text-blue-600" />
                            <h3 className="text-lg font-bold text-slate-800">Household Management</h3>
                        </div>
                        <div className="bg-slate-50 p-6 rounded-xl border border-slate-100">
                            <label className="block text-sm font-medium text-slate-500 mb-2">Your Household ID</label>
                            <div className="flex gap-2">
                                <code className="flex-1 bg-white px-3 py-2 rounded-lg text-slate-600 font-mono text-sm border border-slate-200">
                                    {profile?.household_id}
                                </code>
                                <button
                                    onClick={copyToClipboard}
                                    className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition flex items-center gap-2"
                                >
                                    {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                                    {copied ? 'Copied' : 'Copy'}
                                </button>
                            </div>
                            <p className="mt-3 text-xs text-slate-400">
                                Share this ID with your partner during signup to link their account to the same family data.
                            </p>
                        </div>
                    </section>

                    <section className="border-t border-slate-50 pt-8">
                        <div className="flex items-center gap-2 mb-4">
                            <Target className="w-5 h-5 text-blue-600" />
                            <h3 className="text-lg font-bold text-slate-800">Goal Allocations</h3>
                        </div>
                        <div className="space-y-4">
                            {goals.map((goal: Goal) => (
                                <div key={goal.id} className="flex items-center gap-4 bg-white p-4 border border-slate-100 rounded-xl">
                                    <div className="flex-1">
                                        <p className="font-semibold text-slate-800">{goal.name}</p>
                                    </div>
                                    <div className="w-32">
                                        <div className="relative">
                                            <input
                                                type="number"
                                                className="w-full pl-3 pr-8 py-1.5 border rounded-lg text-sm"
                                                defaultValue={goal.allocation_percentage}
                                                onBlur={(e) => updateGoalMutation.mutate({ id: goal.id, updates: { allocation_percentage: parseFloat(e.target.value) } })}
                                            />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">%</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    <section className="border-t border-slate-50 pt-8">
                        <h3 className="text-lg font-bold text-slate-800 mb-4">Expense Categories</h3>
                        <div className="space-y-3">
                            <div className="flex gap-2 mb-4">
                                <input
                                    type="text"
                                    className="flex-1 px-4 py-2 border rounded-lg outline-none text-sm text-slate-900"
                                    placeholder="New Category Name"
                                    value={newCategoryName}
                                    onChange={(e) => setNewCategoryName(e.target.value)}
                                />
                                <button
                                    onClick={() => newCategoryName && addCategoryMutation.mutate(newCategoryName)}
                                    disabled={addCategoryMutation.isPending}
                                    className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold transition flex items-center gap-2"
                                >
                                    <Plus className="w-4 h-4" />
                                    Add
                                </button>
                            </div>
                            {categories.map((cat: ExpenseCategory) => (
                                <div key={cat.id} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-lg">
                                    <span className="font-medium text-slate-700">{cat.name}</span>
                                    <button
                                        onClick={() => deleteCategoryMutation.mutate(cat.id)}
                                        className="text-slate-400 hover:text-red-500 transition"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </section>

                    <section className="border-t border-slate-50 pt-8">
                        <h3 className="text-lg font-bold text-slate-800 mb-4">Regional & Currency</h3>
                        <div className="flex gap-4">
                            <div className="px-4 py-2 bg-slate-50 rounded-lg text-slate-700 font-medium border border-slate-100">
                                Currency: INR (₹)
                            </div>
                            <div className="px-4 py-2 bg-slate-50 rounded-lg text-slate-700 font-medium border border-slate-100">
                                Locale: en-IN
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </DashboardLayout>
    );
}
