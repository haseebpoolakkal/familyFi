'use client';

import { useState, useEffect } from 'react';
import Modal from '@/components/shared/Modal';
import { ZakatSettings, NisabType, SchoolOfThought } from '@/types';
import { upsertZakatSettings } from '@/services/zakat';
import { useUserStore } from '@/store/userStore';

type Props = {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    initialSettings?: ZakatSettings | null;
};

export default function ZakatSettingsModal({
    isOpen,
    onClose,
    onSuccess,
    initialSettings,
}: Props) {
    const { profile } = useUserStore();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        anniversary_date: initialSettings?.anniversary_date || new Date().toISOString().split('T')[0],
        nisab_type: (initialSettings?.nisab_type || 'silver') as NisabType,
        school_of_thought: (initialSettings?.school_of_thought || 'hanafi') as SchoolOfThought,
    });

    useEffect(() => {
        if (initialSettings) {
            setFormData({
                anniversary_date: initialSettings.anniversary_date,
                nisab_type: initialSettings.nisab_type,
                school_of_thought: initialSettings.school_of_thought,
            });
        }
    }, [initialSettings]);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        try {
            await upsertZakatSettings(formData);

            onSuccess();
            onClose();
        } catch (error: unknown) {
            console.error('Failed to save settings:', error);
            const errorMessage = error instanceof Error ? error.message : 'Failed to save settings. Please try again.';
            alert(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Zakat Settings">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-2 block">
                        Zakat Anniversary Date
                    </label>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                        The date when your Zakat year begins (e.g., first day of Ramadan)
                    </p>
                    <input
                        required
                        type="date"
                        value={formData.anniversary_date}
                        onChange={(e) => setFormData({ ...formData, anniversary_date: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                <div>
                    <label className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-2 block">
                        Nisab Type
                    </label>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                        Select the basis for Nisab calculation. This setting will be locked and cannot be changed automatically.
                    </p>
                    <select
                        required
                        value={formData.nisab_type}
                        onChange={(e) => setFormData({ ...formData, nisab_type: e.target.value as NisabType })}
                        className="w-full px-4 py-3 rounded-xl border bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                    >
                        <option value="silver">Silver (Default - 612.36 grams)</option>
                        <option value="gold">Gold (87.48 grams)</option>
                    </select>
                </div>

                <div>
                    <label className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-2 block">
                        School of Thought
                    </label>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                        This selection affects explanatory text only and does not change calculation logic.
                    </p>
                    <select
                        required
                        value={formData.school_of_thought}
                        onChange={(e) => setFormData({ ...formData, school_of_thought: e.target.value as SchoolOfThought })}
                        className="w-full px-4 py-3 rounded-xl border bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                    >
                        <option value="hanafi">Hanafi (Default)</option>
                        <option value="shafi">Shafi</option>
                        <option value="maliki">Maliki</option>
                        <option value="hanbali">Hanbali</option>
                    </select>
                </div>

                <button
                    disabled={loading}
                    className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition disabled:opacity-50"
                >
                    {loading ? 'Saving...' : 'Save Settings'}
                </button>
            </form>
        </Modal>
    );
}

