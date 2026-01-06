'use client';

import { useEffect, useState } from 'react';
import { X, Plus, Trash2, Calendar, Users } from 'lucide-react';
import { createExpenseGroupWithDetails } from '@/services/expenseGroupService';
import { getHouseholdMembers } from '@/services/household';

type MemberInput = {
    id: string;
    name: string;
};

export default function CreateExpenseGroupModal({
    isOpen,
    onClose,
    onSuccess,
    householdId,
    currentUserId,
}: {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    householdId: string;
    currentUserId: string;
}) {
    const [loading, setLoading] = useState(false);
    const [fetchingMembers, setFetchingMembers] = useState(false);

    // Form fields
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);

    // Member selection
    const [members, setMembers] = useState<MemberInput[]>([]);
    const [allHouseholdMembers, setAllHouseholdMembers] = useState<MemberInput[]>([]);
    const [selectedMemberId, setSelectedMemberId] = useState<string>('');

    useEffect(() => {
        if (isOpen && householdId) {
            setFetchingMembers(true);
            getHouseholdMembers(householdId)
                .then(data => {
                    // Filter out current user and map to MemberInput
                    const mapped = data
                        .filter((m: any) => m.id !== currentUserId)
                        .map((m: any) => ({
                            id: m.id,
                            name: m.full_name || m.name || 'Unknown',
                        }));
                    setAllHouseholdMembers(mapped);
                })
                .catch(err => console.error('Error fetching members:', err))
                .finally(() => setFetchingMembers(false));
        }
    }, [isOpen, householdId, currentUserId]);

    if (!isOpen) return null;

    // Filter out members already added
    const availableMembers = allHouseholdMembers.filter(
        ahm => !members.some(m => m.id === ahm.id)
    );

    function addMember() {
        if (!selectedMemberId) return;

        const memberToAdd = allHouseholdMembers.find(m => m.id === selectedMemberId);
        if (memberToAdd) {
            setMembers(prev => [...prev, memberToAdd]);
            setSelectedMemberId('');
        }
    }

    function removeMember(id: string) {
        setMembers(prev => prev.filter(m => m.id !== id));
    }

    async function handleCreate() {
        if (!name.trim()) return;

        setLoading(true);

        try {
            await createExpenseGroupWithDetails({
                name: name.trim(),
                description: description.trim() || undefined,
                startDate,
                members: members.map(m => ({ profile_id: m.id })),
            });

            // Reset form
            setName('');
            setDescription('');
            setMembers([]);
            setStartDate(new Date().toISOString().split('T')[0]);

            onSuccess();
            onClose();
        } catch (error) {
            console.error('Error creating expense group:', error);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center px-4">
            <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                            <Plus className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <h3 className="text-xl font-black text-slate-800 dark:text-slate-100">
                            Create Expense Group
                        </h3>
                    </div>
                    <button onClick={onClose} aria-label="Close modal">
                        <X className="w-5 h-5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                    {/* Group Info */}
                    <section className="space-y-4">
                        <h4 className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                            <Users className="w-4 h-4" /> Group Details
                        </h4>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                                    Name
                                </label>
                                <input
                                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                                    placeholder="e.g., Summer Trip 2024"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                                    Description
                                </label>
                                <textarea
                                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 resize-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                                    placeholder="What is this group for?"
                                    rows={3}
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                                        Start Date
                                    </label>
                                    <div className="relative">
                                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <input
                                            type="date"
                                            className="w-full pl-11 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                                            value={startDate}
                                            onChange={e => setStartDate(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Members Selection */}
                    <section className="space-y-4 pt-2">
                        <h4 className="font-bold text-slate-700 dark:text-slate-200 flex items-center justify-between">
                            <span>Add Members</span>
                            <span className="text-xs font-medium text-slate-400 px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-full">
                                {members.length} added
                            </span>
                        </h4>

                        <div className="flex gap-2">
                            <div className="flex-1 relative">
                                <select
                                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 appearance-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all disabled:opacity-50"
                                    value={selectedMemberId}
                                    onChange={e => setSelectedMemberId(e.target.value)}
                                    disabled={fetchingMembers || availableMembers.length === 0}
                                >
                                    <option value="">
                                        {fetchingMembers
                                            ? 'Loading members...'
                                            : availableMembers.length === 0
                                                ? 'No more members available'
                                                : 'Select a member to add'}
                                    </option>
                                    {availableMembers.map(m => (
                                        <option key={m.id} value={m.id}>
                                            {m.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <button
                                onClick={addMember}
                                disabled={!selectedMemberId}
                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-all disabled:opacity-50 flex items-center gap-2"
                                aria-label="Add selected member"
                            >
                                <Plus className="w-5 h-5" />
                                <span className="hidden sm:inline">Add</span>
                            </button>
                        </div>

                        {/* Selected Members List */}
                        <div className="flex flex-wrap gap-2 pt-1">
                            {members.map(m => (
                                <div
                                    key={m.id}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/50 rounded-xl text-sm group animate-in fade-in zoom-in duration-200"
                                >
                                    <span className="font-bold text-emerald-700 dark:text-emerald-400">
                                        {m.name}
                                    </span>
                                    <button
                                        onClick={() => removeMember(m.id)}
                                        className="text-emerald-400 hover:text-red-500 transition-colors"
                                        aria-label={`Remove ${m.name}`}
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            ))}
                            {members.length === 0 && (
                                <p className="text-sm text-slate-400 italic ml-1">
                                    No additional members added yet.
                                </p>
                            )}
                        </div>
                    </section>
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-3 p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 rounded-xl font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        disabled={!name.trim() || loading}
                        onClick={handleCreate}
                        className="px-8 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-emerald-200 dark:shadow-none flex items-center justify-center min-w-[140px]"
                    >
                        {loading ? (
                            <span className="flex items-center gap-2">
                                <Plus className="w-4 h-4 animate-spin" />
                                Creating...
                            </span>
                        ) : 'Create Group'}
                    </button>
                </div>
            </div>
        </div>
    );
}