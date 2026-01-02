import { LoanInstallment } from '@/services/loanService';
import { formatCurrency } from '@/lib/utils';
import { CheckCircle2, Clock } from 'lucide-react';

type Props = {
  installments: LoanInstallment[];
};

export default function LoanInstallmentSection({ installments }: Props) {
  if (!installments.length) {
    return (
      <div className="p-20 text-center text-slate-400">
        No payments recorded for this period
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {installments.map(i => (
        <div
          key={i.id}
          className="flex justify-between items-center bg-white dark:bg-slate-900 border rounded-2xl p-4"
        >
          <div>
            <p className="font-bold">
              {new Date(i.installment_month).toLocaleDateString('en-IN', {
                month: 'long',
                year: 'numeric',
              })}
            </p>
            <p className="text-sm text-slate-400">
              EMI: {formatCurrency(i.emi_amount)}
            </p>
          </div>
          {i.paid ? (
            <CheckCircle2 className="text-green-500" />
          ) : (
            <Clock className="text-amber-400" />
          )}
        </div>
      ))}
    </div>
  );
}
