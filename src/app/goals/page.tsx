'use client';

import DashboardLayout from '@/components/shared/DashboardLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getGoals, updateGoal, deleteGoal, Goal } from '@/services/goals';
import { useUserStore } from '@/store/userStore';
import { useState } from 'react';
import { Save, Edit2, Plus, Trash2, LayoutGrid, List } from 'lucide-react';
import GoalCard from '@/features/goals/GoalCard';
import AddGoalModal from '@/features/goals/AddGoalModal';

export default function GoalsPage() {
    const { profile } = useUserStore();
    const queryClient = useQueryClient();
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingGoal, setEditingGoal] = useState<string | null>(null);
    const [editValues, setEditValues] = useState({ target: 0, percentage: 0 });
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    const { data: goals = [], isLoading } = useQuery({
        queryKey: ['goals', profile?.household_id],
        queryFn: () => getGoals(profile!.household_id),
        enabled: !!profile?.household_id,
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, updates }: { id: string; updates: Partial<Goal> }) => updateGoal(id, updates),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['goals'] });
            setEditingGoal(null);
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => deleteGoal(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['goals'] });
        },
    });

    const startEdit = (goal: Goal) => {
        setEditingGoal(goal.id);
        setEditValues({ target: goal.target_amount, percentage: goal.allocation_percentage });
    };

    const handleUpdate = (id: string) => {
        updateMutation.mutate({
            id,
            updates: {
                target_amount: editValues.target,
                allocation_percentage: editValues.percentage,
            },
        });
    };

    const handleDelete = (id: string) => {
        if (confirm('Are you sure you want to delete this goal?')) {
            deleteMutation.mutate(id);
        }
    };

    const totalPercentage = goals.reduce((acc, g) => acc + (g.allocation_percentage || 0), 0);

    return (
        <DashboardLayout>
            <div className="max-w-6xl mx-auto px-0 md:px-4">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 md:gap-4 mb-8">
                    <div>
                        <h2 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Financial Goals</h2>
                        <p className="text-sm md:text-base text-slate-500 dark:text-slate-400 font-medium italic">Plan and track your savings progress.</p>
                    </div>
                    <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 md:p-1.5 rounded-xl md:rounded-2xl shadow-inner w-full sm:w-auto justify-center sm:justify-start">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`flex-1 sm:flex-none p-2 md:p-2.5 rounded-lg md:rounded-xl transition-all duration-300 flex justify-center ${viewMode === 'grid' ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                            >
                                <LayoutGrid className="w-5 h-5" />
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={`flex-1 sm:flex-none p-2 md:p-2.5 rounded-lg md:rounded-xl transition-all duration-300 flex justify-center ${viewMode === 'list' ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                            >
                                <List className="w-5 h-5" />
                            </button>
                        </div>
                        <button
                            onClick={() => setIsAddModalOpen(true)}
                            className="bg-blue-600 text-white w-full sm:w-auto px-6 md:px-8 py-2.5 md:py-3 rounded-xl md:rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-blue-700 active:scale-95 transition shadow-xl shadow-blue-200 dark:shadow-none text-sm md:text-base"
                        >
                            <Plus className="w-4 h-4 md:w-5 md:h-5" />
                            New Goal
                        </button>
                    </div>
                </div>

                <div className={`mb-8 p-4 md:p-8 rounded-2xl md:rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6 transition-colors duration-300 ${totalPercentage === 100
                    ? 'bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-900/30 text-green-800 dark:text-green-300'
                    : 'bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900/30 text-amber-800 dark:text-amber-300'}`}>
                    <div className="flex-1">
                        <p className="text-lg md:text-xl font-black flex items-center gap-2 tracking-tight">
                            Total Priority Allocation: {totalPercentage}%
                        </p>
                        {totalPercentage !== 100 && (
                            <p className="text-[10px] md:text-sm font-medium opacity-80 italic">Allocations should sum to 100%.</p>
                        )}
                    </div>
                    <div className="h-3 md:h-4 w-full md:max-w-md bg-white/50 dark:bg-slate-900/40 rounded-full overflow-hidden border border-black/5 dark:border-white/5">
                        <div
                            className={`h-full transition-all duration-1000 cubic-bezier(0.4, 0, 0.2, 1) ${totalPercentage === 100 ? 'bg-green-500' : 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]'}`}
                            style={{ width: `${Math.min(totalPercentage, 100)}%` }}
                        />
                    </div>
                </div>

                {isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-44 bg-slate-50 dark:bg-slate-900/50 rounded-[2.5rem] animate-pulse border border-slate-100 dark:border-slate-800" />
                        ))}
                    </div>
                ) : goals.length === 0 ? (
                    <div className="text-center py-20 bg-slate-50 dark:bg-slate-900/40 rounded-[3rem] border-2 border-dashed border-slate-200 dark:border-slate-800 transition-colors">
                        <div className="w-20 h-20 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border border-slate-100 dark:border-slate-700">
                            <Plus className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                        </div>
                        <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight mb-2">No goals yet</h3>
                        <p className="text-slate-500 dark:text-slate-400 mb-8 font-medium italic">Create your first goal to start tracking your savings.</p>
                        <button
                            onClick={() => setIsAddModalOpen(true)}
                            className="bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 px-8 py-3 rounded-2xl font-black hover:bg-slate-50 dark:hover:bg-slate-700 transition text-slate-800 dark:text-slate-200 shadow-sm active:scale-95"
                        >
                            Add Your First Goal
                        </button>
                    </div>
                ) : (
                    <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-4 max-w-4xl"}>
                        {goals.map((goal) => (
                            <div key={goal.id} className="group relative">
                                <GoalCard goal={goal} />

                                <div className="absolute bottom-2 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-1 group-hover:translate-y-0">
                                    <button
                                        onClick={() => startEdit(goal)}
                                        className="p-2.5 bg-white/95 dark:bg-slate-800/95 backdrop-blur shadow-lg border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/40 hover:text-blue-600 dark:hover:text-blue-400 transition active:scale-90"
                                        title="Edit Goal"
                                    >
                                        <Edit2 className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(goal.id)}
                                        className="p-2.5 bg-white/95 dark:bg-slate-800/95 backdrop-blur shadow-lg border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/40 hover:text-red-600 dark:hover:text-red-400 transition active:scale-90"
                                        title="Delete Goal"
                                    >
                                        <Trash2 className="w-4 h-4 text-red-500 dark:text-red-400" />
                                    </button>
                                </div>

                                {editingGoal === goal.id && (
                                    <div className="mt-4 p-6 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-blue-100 dark:border-blue-900/30 shadow-2xl animate-in slide-in-from-top-2 duration-300 relative z-10">
                                        <div className="grid grid-cols-2 gap-6">
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Target Amount</label>
                                                <input
                                                    type="number"
                                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-4 focus:ring-blue-500/10 font-black text-slate-800 dark:text-slate-100 transition"
                                                    value={editValues.target}
                                                    onChange={(e) => setEditValues({ ...editValues, target: parseFloat(e.target.value) })}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Allocation %</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max="100"
                                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-4 focus:ring-blue-500/10 font-black text-slate-800 dark:text-slate-100 transition"
                                                    value={editValues.percentage}
                                                    onChange={(e) => setEditValues({ ...editValues, percentage: parseFloat(e.target.value) })}
                                                />
                                            </div>
                                        </div>
                                        <div className="flex gap-3 mt-6">
                                            <button
                                                onClick={() => handleUpdate(goal.id)}
                                                className="flex-1 bg-blue-600 text-white py-3.5 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-blue-700 transition shadow-lg shadow-blue-200 dark:shadow-none active:scale-95"
                                            >
                                                <Save className="w-5 h-5" />
                                                Save Changes
                                            </button>
                                            <button
                                                onClick={() => setEditingGoal(null)}
                                                className="px-6 py-3.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl font-black hover:bg-slate-200 dark:hover:bg-slate-700 transition active:scale-95"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <AddGoalModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onSuccess={() => queryClient.invalidateQueries({ queryKey: ['goals'] })}
            />
        </DashboardLayout>
    );
}
