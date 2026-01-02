import Modal from '@/components/shared/Modal';
import { Loan } from '@/services/loanService';
import { useQuery } from '@tanstack/react-query';
import { getLoanSchedule } from '@/services/loanService';
import { formatCurrency } from '@/lib/utils';

type Props = {
  loan: Loan;
  isOpen: boolean;
  onClose: () => void;
};

export default function LoanScheduleModal({ loan, isOpen, onClose }: Props) {
  const { data = [] } = useQuery({
    queryKey: ['loanSchedule', loan.id],
    queryFn: () => getLoanSchedule(loan.id),
  });

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Loan Schedule">
      <div className="max-h-[60vh] overflow-auto space-y-2">
        {data.map(row => (
          <div
            key={row.id}
            className="grid grid-cols-4 gap-2 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-sm"
          >
            <span>{row.month}</span>
            <span>{formatCurrency(row.principal_component)}</span>
            <span>{formatCurrency(row.interest_component)}</span>
            <span className="font-bold">{formatCurrency(row.emi_amount)}</span>
          </div>
        ))}
      </div>
    </Modal>
  );
}
