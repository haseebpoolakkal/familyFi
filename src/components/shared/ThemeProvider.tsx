'use client';

import { useEffect, ReactNode, useState, useCallback } from 'react';
import { useThemeStore } from '@/store/themeStore';

export default function ThemeProvider({ children }: { children: ReactNode }) {
    const theme = useThemeStore((state) => state.theme);
    const [mounted, setMounted] = useState(false);

    // Only apply theme after mounting to ensure hydration is complete
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setMounted(true);
    }, []);

    const applyTheme = useCallback(() => {
        if (typeof window === 'undefined') return;

        const root = window.document.documentElement;
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        const activeTheme = theme === 'system' ? systemTheme : theme;

        if (activeTheme === 'dark') {
            root.classList.add('dark');
            root.style.colorScheme = 'dark';
        } else {
            root.classList.remove('dark');
            root.style.colorScheme = 'light';
        }
    }, [theme]);

    useEffect(() => {
        if (!mounted) return;

        applyTheme();

        if (theme === 'system') {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            const handleChange = () => applyTheme();
            mediaQuery.addEventListener('change', handleChange);
            return () => mediaQuery.removeEventListener('change', handleChange);
        }
    }, [theme, mounted, applyTheme]);

    return <>{children}</>;
}
