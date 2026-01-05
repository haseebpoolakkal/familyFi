'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Wallet, Receipt, Target, Settings, LogOut, CreditCard, TrendingUp, Scale } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClientComponentClient } from '@/lib/supabase';
import ThemeToggle from './ThemeToggle';

const navItems = [
    { label: 'Dashboard', href: '/', icon: LayoutDashboard },
    { label: 'Income', href: '/income', icon: Wallet },
    { label: 'Expenses', href: '/expenses', icon: Receipt },
    { label: 'Goals', href: '/goals', icon: Target },
    { label: 'Loans', href: '/loans', icon: CreditCard },
    { label: 'Investments', href: '/investments', icon: TrendingUp },
    { label: 'Zakat', href: '/zakat', icon: Scale },
    { label: 'Settings', href: '/settings', icon: Settings },
];

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
    const pathname = usePathname();
    const supabase = createClientComponentClient();

    const handleSignOut = async () => {
        await supabase.auth.signOut();
    };

    return (
        <>
            {/* Mobile Overlay */}
            <div
                className={cn(
                    "fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300",
                    isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
                )}
                onClick={onClose}
            />

            <aside className={cn(
                "fixed lg:sticky top-0 left-0 z-50 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 h-screen flex flex-col shrink-0 transition-transform duration-300 ease-in-out",
                isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
            )}>
                <div className="p-8">
                    <Link href="/" className="flex items-center gap-4 group">
                        <div className="w-12 h-12 relative bg-white dark:bg-slate-800 rounded-2xl shadow-xl flex items-center justify-center overflow-hidden border border-slate-100 dark:border-slate-700 group-hover:rotate-12 transition-all duration-500">
                            <Image src="/logo.png" alt="FamilyFi" fill className="object-cover scale-110" />
                        </div>
                        <span className="text-2xl font-black text-slate-900 dark:text-slate-50 tracking-tighter group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300">
                            FamilyFi
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
                                onClick={onClose}
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
                        onClick={() => {
                            handleSignOut();
                            onClose();
                        }}
                        className="flex items-center gap-3 w-full px-4 py-3 text-slate-600 dark:text-slate-400 font-medium hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 rounded-xl transition"
                    >
                        <LogOut className="w-5 h-5" />
                        Sign Out
                    </button>
                </div>
            </aside>
        </>
    );
}
