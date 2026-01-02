import { useState } from 'react';
import Modal from '@/components/shared/Modal';
import { createLoan } from '@/services/loanService';

type Props = {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
};

export default function AddLoanModal({ isOpen, onClose, onSuccess }: Props) {
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);

        setLoading(true);
        await createLoan({
            lenderName: data.get('lender') as string,
            principalAmount: Number(data.get('principal')),
            interestRate: Number(data.get('rate')),
            tenureMonths: Number(data.get('tenure')),
            startDate: data.get('start') as string,
        });
        setLoading(false);
        onSuccess();
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Add New Loan">
            <form onSubmit={handleSubmit} className="space-y-4">
                <Input name="lender" label="Lender Name" required />
                <Input name="principal" label="Principal Amount" type="number" step="0.01" required />
                <Input name="rate" label="Interest Rate (%)" type="number" step="0.01" required />
                <Input name="tenure" label="Tenure (months)" type="number" required />
                <Input name="start" label="Start Date" type="date" required />

                <button
                    disabled={loading}
                    className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold"
                >
                    {loading ? 'Creating...' : 'Create Loan'}
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
