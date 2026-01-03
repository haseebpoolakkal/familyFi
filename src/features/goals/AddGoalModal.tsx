'use client';

import { useState } from 'react';
import { useUserStore } from '@/store/userStore';
import { createGoal } from '@/services/goals';
import { X, Target, Percent, TrendingUp } from 'lucide-react';
import { VisibilitySelector } from '@/components/shared/VisibilitySelector';
import { Visibility } from '@/types';

interface AddGoalModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function AddGoalModal({ isOpen, onClose, onSuccess }: AddGoalModalProps) {
    const { profile } = useUserStore();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        target_amount: '',
        allocation_percentage: '0',
        priority: '0',
        deadline: '',
    });
    const [visibility, setVisibility] = useState<Visibility>('household');
    const [sharedWith, setSharedWith] = useState<string[]>([]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!profile?.household_id) return;

        setLoading(true);
        try {
            await createGoal({
                household_id: profile.household_id,
                name: formData.name,
                target_amount: parseFloat(formData.target_amount),
                allocation_percentage: parseInt(formData.allocation_percentage),
                priority: parseInt(formData.priority),
                deadline: formData.deadline || undefined,
                visibility,
                sharedWith
            });
            onSuccess();
            resetForm();
            onClose();
        } catch (error) {
            console.error('Failed to create goal:', error);
            alert('Failed to create goal. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            target_amount: '',
            allocation_percentage: '0',
            priority: '0',
            deadline: '',
        });
        setVisibility('household');
        setSharedWith([]);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 transition-all duration-300">
            <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl overflow-hidden border border-transparent dark:border-slate-800 animate-in fade-in zoom-in duration-300">
                <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div>
                        <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">New Goal</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium italic">Set a target and start saving.</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition group">
                        <X className="w-6 h-6 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Goal Name</label>
                        <div className="relative">
                            <TrendingUp className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                            <input
                                required
                                type="text"
                                placeholder="e.g., Vacation Fund, New Laptop"
                                className="w-full pl-11 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-4 focus:ring-blue-500/10 text-slate-800 dark:text-slate-100 font-bold transition"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Target Amount</label>
                            <div className="relative">
                                <Target className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                                <input
                                    required
                                    type="number"
                                    placeholder="0"
                                    className="w-full pl-11 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-4 focus:ring-blue-500/10 text-slate-800 dark:text-slate-100 font-black transition"
                                    value={formData.target_amount}
                                    onChange={(e) => setFormData({ ...formData, target_amount: e.target.value })}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Allocation %</label>
                            <div className="relative">
                                <Percent className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                                <input
                                    required
                                    type="number"
                                    min="0"
                                    max="100"
                                    className="w-full pl-11 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-4 focus:ring-blue-500/10 text-slate-800 dark:text-slate-100 font-black transition"
                                    value={formData.allocation_percentage}
                                    onChange={(e) => setFormData({ ...formData, allocation_percentage: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Target Date (Optional)</label>
                        <input
                            type="date"
                            className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-4 focus:ring-blue-500/10 text-slate-800 dark:text-slate-100 font-bold transition"
                            value={formData.deadline}
                            onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                        />
                    </div>

                    <VisibilitySelector
                        value={visibility}
                        onChange={(v, s) => {
                            setVisibility(v);
                            setSharedWith(s);
                        }}
                        householdId={profile!.household_id}
                    />

                    <div className="pt-6">
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-blue-700 active:scale-95 transition shadow-xl shadow-blue-200 dark:shadow-none disabled:opacity-50"
                        >
                            {loading ? 'Creating...' : 'Create Goal'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
