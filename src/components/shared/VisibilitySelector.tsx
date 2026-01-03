'use client';

import { useState, useEffect } from 'react';
import { Visibility, Profile } from '@/types';
import { getHouseholdMembers } from '@/services/household';
import { createClient } from '@/lib/supabase/client';

interface VisibilitySelectorProps {
    value: Visibility;
    onChange: (visibility: Visibility, sharedWith: string[]) => void;
    householdId: string;
    initialSharedWith?: string[];
}

export function VisibilitySelector({ value, onChange, householdId, initialSharedWith = [] }: VisibilitySelectorProps) {
    const [members, setMembers] = useState<Profile[]>([]);
    const [selectedMembers, setSelectedMembers] = useState<string[]>(initialSharedWith);
    const [loading, setLoading] = useState(false);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    useEffect(() => {
        const fetchUser = async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            setCurrentUserId(user?.id || null);
        };
        fetchUser();
    }, []);

    useEffect(() => {
        if (value === 'custom' && members.length === 0) {
            setLoading(true);
            getHouseholdMembers(householdId)
                .then(data => {
                    // Filter out self
                    setMembers(data.filter(m => m.id !== currentUserId));
                })
                .finally(() => setLoading(false));
        }
    }, [value, householdId, members.length, currentUserId]);

    const handleVisibilityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newVisibility = e.target.value as Visibility;
        onChange(newVisibility, newVisibility === 'custom' ? selectedMembers : []);
    };

    const toggleMember = (memberId: string) => {
        const newSelection = selectedMembers.includes(memberId)
            ? selectedMembers.filter(id => id !== memberId)
            : [...selectedMembers, memberId];

        setSelectedMembers(newSelection);
        onChange('custom', newSelection);
    };

    return (
        <div className="space-y-3">
            <div>
                <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">
                    Visibility
                </label>
                <div className="relative">
                    <select
                        value={value}
                        onChange={handleVisibilityChange}
                        className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-4 focus:ring-blue-500/10 text-slate-900 dark:text-slate-100 font-bold transition appearance-none"
                    >
                        <option value="private">🔒 Private (Only Me)</option>
                        <option value="household">👨‍👩‍👧 Household (All Members)</option>
                        <option value="custom">👥 Custom (Specific Members)</option>
                    </select>
                    <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </div>
                </div>
            </div>

            {value === 'custom' && (
                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 animate-in fade-in slide-in-from-top-2 duration-200">
                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">
                        Share with
                    </label>

                    {loading ? (
                        <div className="text-sm text-slate-400 dark:text-slate-500 italic font-medium flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full border-2 border-slate-400 border-t-transparent animate-spin"></div>
                            Loading members...
                        </div>
                    ) : members.length === 0 ? (
                        <div className="text-sm text-slate-400 dark:text-slate-500 italic font-medium">No other members in household.</div>
                    ) : (
                        <div className="space-y-3">
                            {members.map(member => (
                                <label key={member.id} className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 cursor-pointer hover:border-blue-200 dark:hover:border-blue-800/50 transition duration-200">
                                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${selectedMembers.includes(member.id)
                                            ? 'bg-blue-600 border-blue-600'
                                            : 'border-slate-300 dark:border-slate-600'
                                        }`}>
                                        {selectedMembers.includes(member.id) && (
                                            <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                        )}
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={selectedMembers.includes(member.id)}
                                        onChange={() => toggleMember(member.id)}
                                        className="hidden"
                                    />
                                    <div>
                                        <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                                            {member.full_name || 'Unnamed Member'}
                                        </p>
                                        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">
                                            {member.role}
                                        </p>
                                    </div>
                                </label>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
