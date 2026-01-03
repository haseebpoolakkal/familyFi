'use client';

import Sidebar from './Sidebar';
import { useAuth } from './AuthProvider';
import { useUserStore } from '@/store/userStore';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';
import Image from 'next/image';
import { getProfile } from '@/services/household';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const { user, loading: authLoading } = useAuth();
    const { profile, setProfile } = useUserStore();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const router = useRouter();

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
        }
    }, [user, authLoading, router]);

    useEffect(() => {
        async function loadProfile() {
            if (user && !profile) {
                const data = await getProfile(user.id);
                if (data) {
                    setProfile({
                        id: data.id,
                        household_id: data.household_id,
                        full_name: data.full_name,
                        role: data.role,
                    });

                    if (!data.household_id) {
                        router.push('/onboarding');
                    }
                }
            }
        }
        loadProfile();
    }, [user, profile, setProfile, router]);

    if (authLoading || !user || !profile) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="flex bg-slate-50 dark:bg-slate-950 h-screen overflow-hidden transition-colors duration-300">
            <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

            <div className="flex-1 flex flex-col min-w-0">
                {/* Mobile Header */}
                <header className="lg:hidden flex items-center justify-between p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 z-30">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 relative bg-white dark:bg-slate-800 rounded-xl shadow-md flex items-center justify-center overflow-hidden border border-slate-100 dark:border-slate-700">
                            <Image src="/logo.png" alt="FamilyFy" fill className="object-cover scale-110" />
                        </div>
                        <span className="text-xl font-black text-slate-900 dark:text-slate-50 tracking-tighter">
                            FamilyFi
                        </span>
                    </div>
                    <button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition"
                    >
                        {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                    </button>
                </header>

                <main className="flex-1 p-4 md:p-8 overflow-y-auto">
                    {children}
                </main>
            </div>
        </div>
    );
}
