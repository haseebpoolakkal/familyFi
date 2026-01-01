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
        <div className="flex items-center gap-2 md:gap-4 bg-white dark:bg-slate-900 p-1.5 md:p-2 px-3 md:px-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm transition-colors duration-300 w-full md:w-auto justify-between md:justify-start">
            <div className="flex items-center gap-1">
                <button
                    onClick={handlePrev}
                    className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg transition"
                >
                    <ChevronLeft className="w-5 h-5" />
                </button>

                <div className="flex flex-col items-center min-w-[100px] md:min-w-[140px]">
                    <span className="text-[9px] md:text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] leading-none mb-1">Select Period</span>
                    <span className="text-xs md:text-sm font-black text-slate-800 dark:text-slate-100 tracking-tight">
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
                className={`flex items-center gap-2 px-3 md:px-4 py-1.5 md:py-2 rounded-xl text-[10px] md:text-xs font-black transition-all ${isCurrentPeriod()
                    ? 'bg-slate-50 dark:bg-slate-800 text-slate-300 dark:text-slate-600'
                    : 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 shadow-sm shadow-blue-50 dark:shadow-none'
                    }`}
            >
                <Calendar className="w-3.5 h-3.5 md:w-4 md:h-4" />
                <span className="hidden sm:inline">Current</span>
                <span className="sm:hidden">Now</span>
            </button>
        </div>
    );
}
