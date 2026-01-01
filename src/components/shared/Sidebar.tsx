'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Wallet, Receipt, Target, Settings, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClientComponentClient } from '@/lib/supabase';
import ThemeToggle from './ThemeToggle';

const navItems = [
    { label: 'Dashboard', href: '/', icon: LayoutDashboard },
    { label: 'Income', href: '/income', icon: Wallet },
    { label: 'Expenses', href: '/expenses', icon: Receipt },
    { label: 'Goals', href: '/goals', icon: Target },
    { label: 'Settings', href: '/settings', icon: Settings },
];

export default function Sidebar() {
    const pathname = usePathname();
    const supabase = createClientComponentClient();

    const handleSignOut = async () => {
        await supabase.auth.signOut();
    };

    return (
        <aside className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 h-screen sticky top-0 flex flex-col shrink-0 transition-colors duration-300">
            <div className="p-8">
                <Link href="/" className="flex items-center gap-4 group">
                    <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-2xl shadow-xl flex items-center justify-center overflow-hidden border border-slate-100 dark:border-slate-700 group-hover:rotate-12 transition-all duration-500">
                        <img src="/logo.png" alt="FamilyFy" className="w-full h-full object-cover scale-110" />
                    </div>
                    <span className="text-2xl font-black text-slate-900 dark:text-slate-50 tracking-tighter group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300">
                        FamilyFy
                    </span>
                </Link>
            </div>

            <nav className="flex-1 px-4 space-y-2 overflow-y-auto custom-scrollbar">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition",
                                isActive
                                    ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-bold"
                                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200"
                            )}
                        >
                            <Icon className="w-5 h-5" />
                            {item.label}
                        </Link>
                    );
                })}
            </nav>

            <div className="p-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
                <ThemeToggle />
                <button
                    onClick={handleSignOut}
                    className="flex items-center gap-3 w-full px-4 py-3 text-slate-600 dark:text-slate-400 font-medium hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 rounded-xl transition"
                >
                    <LogOut className="w-5 h-5" />
                    Sign Out
                </button>
            </div>
        </aside>
    );
}
