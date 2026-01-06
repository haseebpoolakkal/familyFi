'use client';

import DashboardLayout from '@/components/shared/DashboardLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Settings, Calendar, Loader2, Plus, RefreshCw } from 'lucide-react';
import ZakatSummaryCard from '@/features/zakat/ZakatSummaryCard';
import ZakatBreakdown from '@/features/zakat/ZakatBreakdown';
import ZakatSettingsModal from '@/features/zakat/ZakatSettingsModal';
import Modal from '@/components/shared/Modal';
import { useUserStore } from '@/store/userStore';
import { createZakatSnapshot, getZakatSettings, getZakatSnapshot, getZakatSnapshots, updateZakatItemInclusion } from '@/services/zakat';

export default function ZakatPage() {
    const { profile } = useUserStore();
    const queryClient = useQueryClient();
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isCreateSnapshotOpen, setIsCreateSnapshotOpen] = useState(false);
    const [snapshotDate, setSnapshotDate] = useState(new Date().toISOString().split('T')[0]);

    const { data: settings, isLoading: loadingSettings } = useQuery({
        queryKey: ['zakatSettings'],
        queryFn: () => getZakatSettings(profile!.id),
    });

    const { data: snapshots = [], isLoading: loadingSnapshots } = useQuery({
        queryKey: ['zakatSnapshots'],
        queryFn: () => getZakatSnapshots(profile!.id),
    });

    const latestSnapshot = snapshots.length > 0 ? snapshots[0] : null;

    // Fetch full snapshot with items if we have one
    const { data: fullSnapshot, refetch: refetchSnapshot } = useQuery({
        queryKey: ['zakatSnapshot', latestSnapshot?.id],
        queryFn: async () => getZakatSnapshot(latestSnapshot!.id),
        enabled: !!latestSnapshot,
    });

    const createSnapshotMutation = useMutation({
        mutationFn: async () => createZakatSnapshot(profile!.id, snapshotDate),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['zakatSnapshots'] });
            setIsCreateSnapshotOpen(false);
        },
    });

    const toggleItemMutation = useMutation({
        mutationFn: async ({ itemId, itemType, isIncluded }: {
            itemId: string;
            itemType: 'asset' | 'liability';
            isIncluded: boolean;
        }) => updateZakatItemInclusion(itemId, itemType, isIncluded),
        onSuccess: () => {
            refetchSnapshot();
            queryClient.invalidateQueries({ queryKey: ['zakatSnapshots'] });
        },
    });

    const handleToggleItem = async (
        itemId: string,
        itemType: 'asset' | 'liability',
        isIncluded: boolean
    ) => {
        await toggleItemMutation.mutateAsync({ itemId, itemType, isIncluded });
    };

    if (loadingSettings || loadingSnapshots) {
        return (
            <DashboardLayout>
                <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-400">
                    <Loader2 className="w-12 h-12 animate-spin mb-4" />
                    <p className="text-lg font-medium">Loading Zakat data…</p>
                </div>
            </DashboardLayout>
        );
    }

    if (!settings) {
        return (
            <DashboardLayout>
                <div className="max-w-2xl mx-auto px-4">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 text-center">
                        <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100 mb-4">
                            Configure Zakat Settings
                        </h2>
                        <p className="text-slate-600 dark:text-slate-400 mb-6">
                            Before calculating Zakat, please configure your Zakat anniversary date and Nisab preferences.
                        </p>
                        <button
                            onClick={() => setIsSettingsOpen(true)}
                            className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition"
                        >
                            Configure Settings
                        </button>
                    </div>
                </div>

                <ZakatSettingsModal
                    isOpen={isSettingsOpen}
                    onClose={() => setIsSettingsOpen(false)}
                    onSuccess={() => {
                        queryClient.invalidateQueries({ queryKey: ['zakatSettings'] });
                    }}
                />
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="max-w-6xl mx-auto px-0 md:px-4">
                {/* Header */}
                <div className="mb-8 p-6 bg-white dark:bg-slate-900/50 rounded-3xl border shadow-sm flex flex-col md:flex-row justify-between gap-6">
                    <div>
                        <h2 className="text-3xl font-black">Zakat Calculator</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                            Annual Zakat calculation based on your financial snapshot
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setIsSettingsOpen(true)}
                            className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition flex items-center gap-2"
                        >
                            <Settings className="w-4 h-4" />
                            Settings
                        </button>
                        <button
                            onClick={() => setIsCreateSnapshotOpen(true)}
                            className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-700 transition"
                        >
                            <Plus className="w-5 h-5" />
                            Create Snapshot
                        </button>
                    </div>
                </div>

                {/* Content */}
                {!fullSnapshot ? (
                    <div className="p-20 text-center border-2 border-dashed rounded-3xl">
                        <Calendar className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                        <p className="mt-4 font-bold text-slate-600 dark:text-slate-400">
                            No Zakat snapshot found
                        </p>
                        <p className="text-sm text-slate-500 dark:text-slate-500 mt-2 mb-6">
                            Create a snapshot to calculate your Zakat for a specific date.
                        </p>
                        <button
                            onClick={() => setIsCreateSnapshotOpen(true)}
                            className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition"
                        >
                            Create Your First Snapshot
                        </button>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <ZakatSummaryCard snapshot={fullSnapshot} />

                        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
                            <ZakatBreakdown
                                snapshot={fullSnapshot}
                                onToggleItem={handleToggleItem}
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Modals */}
            <ZakatSettingsModal
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                onSuccess={() => {
                    queryClient.invalidateQueries({ queryKey: ['zakatSettings'] });
                }}
                initialSettings={settings}
            />

            <Modal
                isOpen={isCreateSnapshotOpen}
                onClose={() => setIsCreateSnapshotOpen(false)}
                title="Create Zakat Snapshot"
            >
                <form
                    onSubmit={async (e) => {
                        e.preventDefault();
                        await createSnapshotMutation.mutateAsync();
                    }}
                    className="space-y-4"
                >
                    <div>
                        <label className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-2 block">
                            Snapshot Date
                        </label>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                            The date on which to calculate your Zakat (typically your Zakat anniversary date)
                        </p>
                        <input
                            required
                            type="date"
                            value={snapshotDate}
                            onChange={(e) => setSnapshotDate(e.target.value)}
                            max={new Date().toISOString().split('T')[0]}
                            className="w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={createSnapshotMutation.isPending}
                        className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {createSnapshotMutation.isPending ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Calculating...
                            </>
                        ) : (
                            <>
                                <RefreshCw className="w-4 h-4" />
                                Calculate Zakat
                            </>
                        )}
                    </button>
                </form>
            </Modal>
        </DashboardLayout>
    );
}

