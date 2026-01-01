'use client';

import { useDateFilterStore } from '@/store/dateFilterStore';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

export default function MonthFilter() {
    const { year, month, setPeriod } = useDateFilterStore();

    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const handlePrev = () => {
        if (month === 0) {
            setPeriod(year - 1, 11);
        } else {
            setPeriod(year, month - 1);
        }
    };

    const handleNext = () => {
        if (month === 11) {
            setPeriod(year + 1, 0);
        } else {
            setPeriod(year, month + 1);
        }
    };

    const handleToday = () => {
        const now = new Date();
        setPeriod(now.getFullYear(), now.getMonth());
    };

    const isCurrentPeriod = () => {
        const now = new Date();
        return year === now.getFullYear() && month === now.getMonth();
    };

    return (
        <div className="flex items-center gap-4 bg-white dark:bg-slate-900 p-2 px-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm transition-colors duration-300">
            <div className="flex items-center gap-1">
                <button
                    onClick={handlePrev}
                    className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg transition"
                >
                    <ChevronLeft className="w-5 h-5" />
                </button>

                <div className="flex flex-col items-center min-w-[140px]">
                    <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] leading-none mb-1">Select Period</span>
                    <span className="text-sm font-black text-slate-800 dark:text-slate-100 tracking-tight">
                        {monthNames[month]} {year}
                    </span>
                </div>

                <button
                    onClick={handleNext}
                    className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg transition"
                >
                    <ChevronRight className="w-5 h-5" />
                </button>
            </div>

            <div className="w-px h-8 bg-slate-100 dark:bg-slate-800 mx-2" />

            <button
                onClick={handleToday}
                disabled={isCurrentPeriod()}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${isCurrentPeriod()
                    ? 'bg-slate-50 dark:bg-slate-800 text-slate-300 dark:text-slate-600'
                    : 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 shadow-sm shadow-blue-50 dark:shadow-none'
                    }`}
            >
                <Calendar className="w-4 h-4" />
                Current
            </button>
        </div>
    );
}
