import { InvestmentTransaction } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { TrendingUp, TrendingDown, DollarSign, Calendar } from 'lucide-react';

type Props = {
    transactions: InvestmentTransaction[];
    onDelete?: (transaction: InvestmentTransaction) => void;
};

export default function InvestmentTransactionList({ transactions, onDelete }: Props) {
    if (transactions.length === 0) {
        return (
            <div className="text-center py-12 bg-slate-50 dark:bg-slate-900/40 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                <p className="text-slate-500 dark:text-slate-400 font-medium">No transactions yet</p>
        </div>
        );
    }

    return (
        <div className="space-y-3">
            {transactions.map((transaction) => (
                <TransactionRow key={transaction.id} transaction={transaction} onDelete={onDelete} />
            ))}
        </div>
    );
}

function TransactionRow({
    transaction,
    onDelete,
}: {
    transaction: InvestmentTransaction;
    onDelete?: (transaction: InvestmentTransaction) => void;
}) {
    const getIcon = () => {
        switch (transaction.transaction_type) {
            case 'buy':
                return <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />;
            case 'sell':
                return <TrendingDown className="w-5 h-5 text-red-600 dark:text-red-400" />;
            case 'dividend':
                return <DollarSign className="w-5 h-5 text-blue-600 dark:text-blue-400" />;
        }
    };

    const getTypeLabel = () => {
        switch (transaction.transaction_type) {
            case 'buy':
                return 'Buy';
            case 'sell':
                return 'Sell';
            case 'dividend':
                return 'Dividend';
        }
    };

    const getTypeColor = () => {
        switch (transaction.transaction_type) {
            case 'buy':
                return 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800';
            case 'sell':
                return 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800';
            case 'dividend':
                return 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800';
        }
    };

    return (
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 hover:shadow-md transition">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1">
                    <div className={`p-2 rounded-xl ${getTypeColor()}`}>
                        {getIcon()}
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center gap-3">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${getTypeColor()}`}>
                                {getTypeLabel()}
                            </span>
                            <span className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {new Date(transaction.transaction_date).toLocaleDateString('en-IN', {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric',
                                })}
                            </span>
                        </div>
                        <div className="mt-2 flex items-center gap-4 text-xs text-slate-600 dark:text-slate-400">
                            {transaction.units && (
                                <span>Units: {transaction.units.toLocaleString('en-IN', { maximumFractionDigits: 4 })}</span>
                            )}
                            {transaction.nav && (
                                <span>NAV: ₹{transaction.nav.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                            )}
                        </div>
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-lg font-black text-slate-900 dark:text-slate-100">
                        {formatCurrency(transaction.amount)}
                    </div>
                    {onDelete && (
                        <button
                            onClick={() => {
                                if (confirm('Are you sure you want to delete this transaction?')) {
                                    onDelete(transaction);
                                }
                            }}
                            className="mt-2 text-xs text-red-600 dark:text-red-400 hover:underline"
                        >
                            Delete
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

