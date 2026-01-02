import { useState } from 'react';
import Modal from '@/components/shared/Modal';
import { createLoan } from '@/services/loanService';

import { useUserStore } from '@/store/userStore';

type Props = {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
};

export default function AddLoanModal({ isOpen, onClose, onSuccess }: Props) {
    const { profile } = useUserStore();
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!profile?.household_id) return;

        const data = new FormData(e.currentTarget);

        setLoading(true);
        try {
            await createLoan({
                lenderName: data.get('lender') as string,
                principalAmount: Number(data.get('principal')),
                interestRate: Number(data.get('rate')),
                tenureMonths: Number(data.get('tenure')),
                startDate: data.get('start') as string,
                interestType: data.get('type') as 'reducing' | 'fixed',
                householdId: profile.household_id,
            });
            onSuccess();
            onClose();
        } catch (error) {
            console.error('Failed to create loan:', error);
            alert('Failed to create loan. Please check your inputs and try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Add New Loan">
            <form onSubmit={handleSubmit} className="space-y-4">
                <Input name="lender" label="Lender Name" required />
                <Select name="type" label="Interest Type">
                    <option value="reducing">Reducing Balance (Standard)</option>
                    <option value="fixed">Flat Rate / Fixed Interest</option>
                </Select>
                <div className="grid grid-cols-2 gap-4">
                    <Input name="principal" label="Principal Amount" type="number" step="0.01" required min="1" />
                    <Input name="rate" label="Interest Rate (%)" type="number" step="0.01" required min="0" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <Input name="tenure" label="Tenure (months)" type="number" required min="1" />
                    <Input name="start" label="Start Date" type="date" required />
                </div>

                <button
                    disabled={loading}
                    className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition"
                >
                    {loading ? 'Creating...' : 'Create Loan'}
                </button>
            </form>
        </Modal>
    );
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    label: string;
}

function Select({ label, className, children, ...props }: SelectProps) {
    return (
        <div>
            <label className="text-sm font-bold text-slate-500">{label}</label>
            <div className="relative">
                <select
                    {...props}
                    className={`w-full mt-1 p-3 rounded-xl border appearance-none bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 ${className ?? ''}`}
                >
                    {children}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </div>
            </div>
        </div>
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
