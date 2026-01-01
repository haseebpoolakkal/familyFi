'use client';

import Sidebar from './Sidebar';
import { useAuth } from './AuthProvider';
import { useUserStore } from '@/store/userStore';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const { user, loading: authLoading } = useAuth();
    const { profile, setProfile } = useUserStore();
    const router = useRouter();

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
        }
    }, [user, authLoading, router]);

    useEffect(() => {
        if (user && !profile) {
            console.log("Profile details", user);
            setProfile({
                id: user.id,
                household_id: 'default-household',
                full_name: user.user_metadata.full_name || 'User',
                role: 'admin',
            });
        }
    }, [user, profile, setProfile]);

    if (authLoading || !user || !profile) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="flex bg-slate-50 dark:bg-slate-950 h-screen overflow-hidden transition-colors duration-300">
            <Sidebar />
            <main className="flex-1 p-8 overflow-y-auto">
                {children}
            </main>
        </div>
    );
}
