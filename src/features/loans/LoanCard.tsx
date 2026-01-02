import { Loan, deleteLoan } from '@/services/loanService';
import { formatCurrency } from '@/lib/utils';
import { Calendar, TrendingDown, IndianRupee, MoreVertical, Trash2, Pencil } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Props = {
    loan: Loan;
    onAddPayment: (loan: Loan) => void;
    onViewSchedule: (loan: Loan) => void;
    onEdit: (loan: Loan) => void;
};

export default function LoanCard({ loan, onAddPayment, onViewSchedule, onEdit }: Props) {
    const router = useRouter();
    const [showMenu, setShowMenu] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this loan? This action cannot be undone.')) return;

        setIsDeleting(true);
        try {
            await deleteLoan(loan.id);
            router.refresh();
            // Force page reload to ensure list is updated if router.refresh is insufficient
            window.location.reload();
        } catch {
            alert('Failed to delete loan');
            setIsDeleting(false);
        }
    };

    return (
        <div className={`bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 shadow-sm hover:shadow-md transition mb-2 relative ${isDeleting ? 'opacity-50 pointer-events-none' : ''}`}>
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h3 className="text-xl font-black">{loan.lender_name}</h3>
                    <p className="text-xs uppercase tracking-widest text-slate-400 mt-1">
                        {loan.loan_type} loan
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-400">
                        {loan.status.toUpperCase()}
                    </span>

                    <div className="relative">
                        <button
                            onClick={() => setShowMenu(!showMenu)}
                            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition"
                        >
                            <MoreVertical className="w-5 h-5 text-slate-400" />
                        </button>

                        {showMenu && (
                            <>
                                <div
                                    className="fixed inset-0 z-10"
                                    onClick={() => setShowMenu(false)}
                                />
                                <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-xl z-20 overflow-hidden text-sm font-medium">
                                    <button
                                        onClick={() => {
                                            onEdit(loan);
                                            setShowMenu(false);
                                        }}
                                        className="w-full flex items-center gap-3 px-4 py-3 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                                    >
                                        <Pencil className="w-4 h-4" />
                                        Edit Loan
                                    </button>
                                    <button
                                        onClick={handleDelete}
                                        className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        Delete Loan
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 lg:gap-4 mb-6">
                <Stat
                    icon={<IndianRupee />}
                    label="EMI"
                    value={formatCurrency(loan.emi_amount)}
                />
                <Stat
                    icon={<TrendingDown />}
                    label="Outstanding"
                    value={formatCurrency(loan.outstanding_principal)}
                />
                <Stat
                    icon={<Calendar />}
                    label="Interest Left"
                    value={formatCurrency(loan.total_interest)}
                />
            </div>

            <div className="flex gap-3">
                <button
                    onClick={() => onAddPayment(loan)}
                    className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition"
                >
                    Pay / Prepay
                </button>
                <button
                    onClick={() => onViewSchedule(loan)}
                    className="flex-1 border border-slate-200 py-3 rounded-xl font-bold hover:bg-slate-50 transition"
                >
                    Schedule
                </button>
            </div>
        </div>
    );
}

function Stat({
    icon,
    label,
    value,
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
}) {
    return (
        <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-4">
            <div className="flex items-center gap-2 text-slate-400 mb-1">
                {icon}
                <span className="text-xs font-bold uppercase">{label}</span>
            </div>
            <div className="text-lg font-black">{value}</div>
        </div>
    );
}
