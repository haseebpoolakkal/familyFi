import { create } from 'zustand';

interface DateFilterState {
    year: number;
    month: number; // 0-indexed (0 = Jan, 11 = Dec)
    setYear: (year: number) => void;
    setMonth: (month: number) => void;
    setPeriod: (year: number, month: number) => void;
    getDateRange: () => { startDate: string; endDate: string };
}

export const useDateFilterStore = create<DateFilterState>((set, get) => ({
    year: new Date().getFullYear(),
    month: new Date().getMonth(),

    setYear: (year) => set({ year }),
    setMonth: (month) => set({ month }),
    setPeriod: (year, month) => set({ year, month }),

    getDateRange: () => {
        const { year, month } = get();
        const startDate = new Date(year, month, 1).toISOString();
        const endDate = new Date(year, month + 1, 0, 23, 59, 59).toISOString();
        return { startDate, endDate };
    },
}));
