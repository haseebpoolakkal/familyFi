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
        <p className="text-sm text-slate-400">
          EMI due: ₹{loan.emi_amount}
        </p>

        <input
          type="number"
          value={amount}
          onChange={e => setAmount(Number(e.target.value))}
          className="w-full p-4 rounded-xl border text-lg font-bold"
        />

        <button
          onClick={submit}
          className="w-full bg-green-600 text-white py-3 rounded-xl font-bold"
        >
          Pay Now
        </button>
      </div>
    </Modal>
  );
}
