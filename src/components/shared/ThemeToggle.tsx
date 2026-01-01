'use client';

import { useThemeStore, ThemeMode } from '@/store/themeStore';
import { Sun, Moon, Monitor } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

export default function ThemeToggle() {
    const { theme, setTheme } = useThemeStore();
    const [mounted, setMounted] = useState(false);

    // Avoid hydration mismatch
    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return <div className="h-12 w-full bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse" />;
    }

    const options: { mode: ThemeMode; icon: React.ElementType; label: string }[] = [
        { mode: 'light', icon: Sun, label: 'Light' },
        { mode: 'system', icon: Monitor, label: 'Auto' },
        { mode: 'dark', icon: Moon, label: 'Dark' },
    ];

    return (
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl w-full shadow-inner">
            {options.map((option) => {
                const Icon = option.icon;
                const isActive = theme === option.mode;
                return (
                    <button
                        key={option.mode}
                        type="button"
                        onClick={(e) => {
                            e.preventDefault();
                            setTheme(option.mode);
                        }}
                        className={cn(
                            "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl transition-all duration-300 transform",
                            isActive
                                ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-md font-black scale-[1.02]"
                                : "text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 hover:bg-white/50 dark:hover:bg-slate-700/50"
                        )}
                        title={option.label}
                    >
                        <Icon className={cn("w-4 h-4 transition-transform duration-300", isActive && "scale-110")} />
                        <span className="text-[10px] uppercase font-black tracking-widest hidden lg:block opacity-90">{option.label}</span>
                    </button>
                );
            })}
        </div>
    );
}
