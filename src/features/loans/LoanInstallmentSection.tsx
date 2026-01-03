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
                        <div className="flex flex-col items-end">
                            <div className="flex items-center gap-1 text-green-600">
                                <span className="text-xs font-bold">PAID</span>
                                <CheckCircle2 className="w-5 h-5" />
                            </div>
                            {i.paid_on && (
                                <p className="text-[10px] text-slate-400 font-medium">
                                    on {new Date(i.paid_on).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                </p>
                            )}
                        </div>
                    ) : (
                        <Clock className="text-amber-400" />
                    )}
                </div>
            ))}
        </div>
    );
}
