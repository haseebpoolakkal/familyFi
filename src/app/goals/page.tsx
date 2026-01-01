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
            <div className="max-w-6xl mx-auto">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
                    <div>
                        <h2 className="text-4xl font-black text-slate-800 tracking-tight">Financial Goals</h2>
                        <p className="text-slate-500 font-medium">Plan and track your savings progress.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex bg-slate-100 p-1 rounded-xl mr-2">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`p-2 rounded-lg transition ${viewMode === 'grid' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}
                            >
                                <LayoutGrid className="w-5 h-5" />
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={`p-2 rounded-lg transition ${viewMode === 'list' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}
                            >
                                <List className="w-5 h-5" />
                            </button>
                        </div>
                        <button
                            onClick={() => setIsAddModalOpen(true)}
                            className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-700 active:scale-95 transition shadow-lg shadow-blue-200"
                        >
                            <Plus className="w-5 h-5" />
                            New Goal
                        </button>
                    </div>
                </div>

                <div className={`mb-8 p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 ${totalPercentage === 100 ? 'bg-green-50 border border-green-100 text-green-800' : 'bg-amber-50 border border-amber-100 text-amber-800'}`}>
                    <div>
                        <p className="text-lg font-black flex items-center gap-2">
                            Total Priority Allocation: {totalPercentage}%
                        </p>
                        {totalPercentage !== 100 && (
                            <p className="text-sm font-medium opacity-80">Your allocations should ideally sum to 100% for full distribution.</p>
                        )}
                    </div>
                    <div className="h-3 flex-1 max-w-md bg-white/50 rounded-full overflow-hidden border border-black/5">
                        <div
                            className={`h-full transition-all duration-700 ${totalPercentage === 100 ? 'bg-green-500' : 'bg-amber-500'}`}
                            style={{ width: `${Math.min(totalPercentage, 100)}%` }}
                        />
                    </div>
                </div>

                {isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-44 bg-slate-50 rounded-2xl animate-pulse border border-slate-100" />
                        ))}
                    </div>
                ) : goals.length === 0 ? (
                    <div className="text-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                        <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                            <Plus className="w-8 h-8 text-slate-300" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-800">No goals yet</h3>
                        <p className="text-slate-500 mb-6">Create your first goal to start tracking your savings.</p>
                        <button
                            onClick={() => setIsAddModalOpen(true)}
                            className="bg-white border border-slate-200 px-6 py-2 rounded-xl font-bold hover:bg-slate-50 transition text-slate-800"
                        >
                            Add Goal
                        </button>
                    </div>
                ) : (
                    <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-4 max-w-4xl"}>
                        {goals.map((goal) => (
                            <div key={goal.id} className="group relative">
                                <GoalCard goal={goal} />

                                <div className="absolute bottom-2 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => startEdit(goal)}
                                        className="p-2 bg-white/90 backdrop-blur shadow-sm border border-slate-200 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition"
                                        title="Edit Goal"
                                    >
                                        <Edit2 className="w-4 h-4 text-amber-500" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(goal.id)}
                                        className="p-2 bg-white/90 backdrop-blur shadow-sm border border-slate-200 rounded-lg hover:bg-red-50 hover:text-red-600 transition"
                                        title="Delete Goal"
                                    >
                                        <Trash2 className="w-4 h-4 text-red-500" />
                                    </button>
                                </div>

                                {editingGoal === goal.id && (
                                    <div className="mt-4 p-5 bg-white rounded-2xl border-2 border-blue-100 shadow-xl animate-in slide-in-from-top-2 duration-200 relative z-10">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Target Amount</label>
                                                <input
                                                    type="number"
                                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-700"
                                                    value={editValues.target}
                                                    onChange={(e) => setEditValues({ ...editValues, target: parseFloat(e.target.value) })}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Allocation %</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max="100"
                                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-700"
                                                    value={editValues.percentage}
                                                    onChange={(e) => setEditValues({ ...editValues, percentage: parseFloat(e.target.value) })}
                                                />
                                            </div>
                                        </div>
                                        <div className="flex gap-2 mt-4">
                                            <button
                                                onClick={() => handleUpdate(goal.id)}
                                                className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition shadow-lg shadow-blue-100"
                                            >
                                                <Save className="w-4 h-4" />
                                                Save Updates
                                            </button>
                                            <button
                                                onClick={() => setEditingGoal(null)}
                                                className="px-4 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition"
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
