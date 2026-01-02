import { useState } from 'react';
import Modal from '@/components/shared/Modal';
import { Loan, updateLoan } from '@/services/loanService';
import { AlertCircle } from 'lucide-react';

type Props = {
    loan: Loan;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
};

export default function EditLoanModal({ loan, isOpen, onClose, onSuccess }: Props) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Heuristic to check if payments exist:
    // If outstanding principal is less than original principal, some principal has been paid.
    // Note: This is a UI-side check. The backend performs a definitive check.
    const hasPayments = loan.outstanding_principal < loan.principal_amount;

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError('');
        const data = new FormData(e.currentTarget);

        setLoading(true);
        try {
            await updateLoan(loan.id, {
                lenderName: data.get('lender') as string,
                loanType: data.get('type') as string,
                principalAmount: Number(data.get('principal')),
                interestRate: Number(data.get('rate')),
                tenureMonths: Number(data.get('tenure')),
                startDate: data.get('start') as string,
            });
            onSuccess();
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update loan');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Edit Loan">
            <form onSubmit={handleSubmit} className="space-y-4">
                {hasPayments && (
                    <div className="bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 p-3 rounded-xl text-sm flex gap-2 items-start">
                        <AlertCircle className="w-5 h-5 shrink-0" />
                        <p>Financial details cannot be edited because payments have already been made. You can only rename the loan.</p>
                    </div>
                )}

                {error && (
                    <div className="bg-red-50 dark:bg-red-900/20 text-red-600 p-3 rounded-xl text-sm">
                        {error}
                    </div>
                )}

                <Input
                    name="lender"
                    label="Lender Name"
                    defaultValue={loan.lender_name}
                    required
                />
                <Input
                    name="type"
                    label="Loan Type"
                    defaultValue={loan.loan_type || ''}
                    placeholder="e.g. Personal, Home"
                />

                <div className="grid grid-cols-2 gap-4">
                    <Input
                        name="principal"
                        label="Principal"
                        type="number"
                        step="0.01"
                        defaultValue={loan.principal_amount}
                        required
                        disabled={hasPayments}
                        className={hasPayments ? 'opacity-50 cursor-not-allowed bg-slate-100 dark:bg-slate-800' : ''}
                    />
                    <Input
                        name="rate"
                        label="Interest Rate"
                        type="number"
                        step="0.01"
                        defaultValue={loan.interest_rate}
                        required
                        disabled={hasPayments}
                        className={hasPayments ? 'opacity-50 cursor-not-allowed bg-slate-100 dark:bg-slate-800' : ''}
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <Input
                        name="tenure"
                        label="Tenure (months)"
                        type="number"
                        defaultValue={loan.tenure_months}
                        required
                        disabled={hasPayments}
                        className={hasPayments ? 'opacity-50 cursor-not-allowed bg-slate-100 dark:bg-slate-800' : ''}
                    />
                    <Input
                        name="start"
                        label="Start Date"
                        type="date"
                        defaultValue={loan.start_date}
                        required
                        disabled={hasPayments}
                        className={hasPayments ? 'opacity-50 cursor-not-allowed bg-slate-100 dark:bg-slate-800' : ''}
                    />
                </div>

                <button
                    disabled={loading}
                    className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition disabled:opacity-50"
                >
                    {loading ? 'Saving...' : 'Save Changes'}
                </button>
            </form>
        </Modal>
    );
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label: string;
}

function Input({ label, className, ...props }: InputProps) {
    return (
        <div>
            <label className="text-sm font-bold text-slate-500">{label}</label>
            <input
                {...props}
                className={`w-full mt-1 p-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 ${className ?? ''}`}
            />
        </div>
    );
}
