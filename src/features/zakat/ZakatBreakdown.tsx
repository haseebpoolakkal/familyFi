import { ZakatSnapshot, ZakatAssetItem, ZakatLiabilityItem } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { CheckCircle2, XCircle, TrendingUp, TrendingDown } from 'lucide-react';
import { useState } from 'react';

type Props = {
    snapshot: ZakatSnapshot;
    onToggleItem: (itemId: string, itemType: 'asset' | 'liability', isIncluded: boolean) => Promise<void>;
};

export default function ZakatBreakdown({ snapshot, onToggleItem }: Props) {
    const [updatingItems, setUpdatingItems] = useState<Set<string>>(new Set());

    const handleToggle = async (itemId: string, itemType: 'asset' | 'liability', currentValue: boolean) => {
        setUpdatingItems(prev => new Set(prev).add(itemId));
        try {
            await onToggleItem(itemId, itemType, !currentValue);
        } finally {
            setUpdatingItems(prev => {
                const next = new Set(prev);
                next.delete(itemId);
                return next;
            });
        }
    };

    const assets = snapshot.asset_items || [];
    const liabilities = snapshot.liability_items || [];

    return (
        <div className="space-y-6">
            {/* Assets Section */}
            <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    Zakatable Assets
                </h3>
                <div className="space-y-3">
                    {assets.length === 0 ? (
                        <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                            <p className="font-medium">No assets found</p>
                            <p className="text-sm mt-1">Assets will be automatically gathered from your income, goals, and investments</p>
                        </div>
                    ) : (
                        assets.map((asset) => (
                            <AssetItem
                                key={asset.id}
                                asset={asset}
                                onToggle={() => handleToggle(asset.id, 'asset', asset.is_included)}
                                isUpdating={updatingItems.has(asset.id)}
                            />
                        ))
                    )}
                </div>
            </div>

            {/* Liabilities Section */}
            <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                    <TrendingDown className="w-5 h-5 text-red-600 dark:text-red-400" />
                    Deductible Liabilities (Next 12 Months)
                </h3>
                <div className="space-y-3">
                    {liabilities.length === 0 ? (
                        <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                            <p className="font-medium">No liabilities found</p>
                            <p className="text-sm mt-1">Liabilities will be automatically gathered from your loans and debts</p>
                        </div>
                    ) : (
                        liabilities.map((liability) => (
                            <LiabilityItem
                                key={liability.id}
                                liability={liability}
                                onToggle={() => handleToggle(liability.id, 'liability', liability.is_included)}
                                isUpdating={updatingItems.has(liability.id)}
                            />
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}

function AssetItem({
    asset,
    onToggle,
    isUpdating,
}: {
    asset: ZakatAssetItem;
    onToggle: () => void;
    isUpdating: boolean;
}) {
    return (
        <div className={`bg-white dark:bg-slate-900 border rounded-2xl p-4 transition ${
            asset.is_included
                ? 'border-slate-200 dark:border-slate-700'
                : 'border-slate-300 dark:border-slate-600 opacity-60'
        }`}>
            <div className="flex items-center justify-between">
                <div className="flex-1">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onToggle}
                            disabled={isUpdating}
                            className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition ${
                                asset.is_included
                                    ? 'bg-blue-600 border-blue-600'
                                    : 'border-slate-300 dark:border-slate-600'
                            } ${isUpdating ? 'opacity-50' : ''}`}
                        >
                            {asset.is_included && (
                                <CheckCircle2 className="w-4 h-4 text-white" />
                            )}
                        </button>
                        <div>
                            <p className="font-bold text-slate-900 dark:text-slate-100">{asset.asset_name}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                {asset.asset_type.replace('_', ' ').toUpperCase()}
                                {asset.notes && ` • ${asset.notes}`}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-lg font-black text-slate-900 dark:text-slate-100">
                        {formatCurrency(asset.market_value)}
                    </p>
                    {!asset.is_included && (
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Excluded</p>
                    )}
                </div>
            </div>
        </div>
    );
}

function LiabilityItem({
    liability,
    onToggle,
    isUpdating,
}: {
    liability: ZakatLiabilityItem;
    onToggle: () => void;
    isUpdating: boolean;
}) {
    return (
        <div className={`bg-white dark:bg-slate-900 border rounded-2xl p-4 transition ${
            liability.is_included
                ? 'border-slate-200 dark:border-slate-700'
                : 'border-slate-300 dark:border-slate-600 opacity-60'
        }`}>
            <div className="flex items-center justify-between">
                <div className="flex-1">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onToggle}
                            disabled={isUpdating}
                            className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition ${
                                liability.is_included
                                    ? 'bg-red-600 border-red-600'
                                    : 'border-slate-300 dark:border-slate-600'
                            } ${isUpdating ? 'opacity-50' : ''}`}
                        >
                            {liability.is_included && (
                                <CheckCircle2 className="w-4 h-4 text-white" />
                            )}
                        </button>
                        <div>
                            <p className="font-bold text-slate-900 dark:text-slate-100">{liability.liability_name}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                {liability.liability_type.replace('_', ' ').toUpperCase()}
                                {liability.notes && ` • ${liability.notes}`}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-lg font-black text-red-600 dark:text-red-400">
                        -{formatCurrency(liability.amount_due_next_12_months)}
                    </p>
                    {!liability.is_included && (
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Excluded</p>
                    )}
                </div>
            </div>
        </div>
    );
}

