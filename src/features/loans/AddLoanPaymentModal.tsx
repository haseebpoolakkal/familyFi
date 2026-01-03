import Modal from '@/components/shared/Modal';
import { useState } from 'react';
import { Loan } from '@/services/loanService';
import { recordLoanPayment } from '@/services/loanService';

type Props = {
    loan: Loan;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
};

export default function AddLoanPaymentModal({
    loan,
    isOpen,
    onClose,
    onSuccess,
}: Props) {
    const [amount, setAmount] = useState(loan.emi_amount);

    const submit = async () => {
        await recordLoanPayment(loan.id, amount);
        onSuccess();
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Pay Loan">
            <div className="space-y-4">
                <div>
                    <p className="text-sm text-slate-400 font-medium">EMI Amount</p>
                    <p className="text-2xl font-black">₹{loan.emi_amount}</p>
                </div>

                <div>
                    <label className="text-sm font-bold text-slate-500">Payment Amount</label>
                    <input
                        type="number"
                        value={amount}
                        onChange={e => setAmount(Number(e.target.value))}
                        className="w-full p-4 rounded-xl border text-lg font-bold mt-1"
                        min={loan.emi_amount}
                    />
                </div>

                {amount < loan.emi_amount && (
                    <p className="text-red-500 text-sm font-bold">
                        Payment cannot be less than EMI amount
                    </p>
                )}

                {amount > loan.emi_amount && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg flex items-start gap-3">
                        <div className="bg-blue-100 dark:bg-blue-800 p-1 rounded">
                            <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                        </div>
                        <div>
                            <p className="text-sm font-bold text-blue-700 dark:text-blue-300">Prepayment Detected</p>
                            <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
                                Extra amount of <span className="font-bold">₹{amount - loan.emi_amount}</span> will be adjusted against principal, reducing your loan tenure.
                            </p>
                        </div>
                    </div>
                )}

                <button
                    onClick={submit}
                    disabled={amount < loan.emi_amount}
                    className="w-full bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                    Pay Now
                </button>
            </div>
        </Modal>
    );
}
