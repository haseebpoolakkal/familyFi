'use client';

import { useQuery } from '@tanstack/react-query';
import { getIncome } from '@/services/income';
import { getProfile } from '@/services/household';
import { getExpenses } from '@/services/expenses';
import { getGoals } from '@/services/goals';
import { ensureMonthlyExpenses } from '@/services/expenseAutomation';
import { useUserStore } from '@/store/userStore';
import DashboardStats from '@/features/dashboard/DashboardStats';
import GoalCard from '@/features/goals/GoalCard';
import SavingsAllocator from '@/features/goals/SavingsAllocator';
import Sidebar from '@/components/shared/Sidebar';
import { useAuth } from '@/components/shared/AuthProvider';
import DashboardCharts from '@/features/dashboard/DashboardCharts';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import OnboardingForm from '@/features/auth/OnboardingForm';

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const { profile, setProfile } = useUserStore();
  const [profileAttempted, setProfileAttempted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    async function fetchProfile() {
      if (user && !profileAttempted) {
        try {
          const profileData = await getProfile(user.id);
          if (profileData) {
            setProfile({
              id: profileData.id,
              household_id: profileData.household_id,
              full_name: profileData.full_name,
              role: profileData.role,
            });
            // Try to automate expenses
            if (profileData.household_id) {
              ensureMonthlyExpenses(profileData.household_id).then(didClone => {
                if (didClone) refetchExpenses();
              });
            }
          }
        } catch (err) {
          console.error('Error fetching profile:', err);
        } finally {
          setProfileAttempted(true);
        }
      }
    }
    fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);


  const { data: income = [] } = useQuery({
    queryKey: ['income', profile?.household_id],
    queryFn: () => getIncome(profile!.household_id),
    enabled: !!profile?.household_id,
  });

  const { data: expenses = [], refetch: refetchExpenses } = useQuery({
    queryKey: ['expenses', profile?.household_id],
    queryFn: () => getExpenses(profile!.household_id),
    enabled: !!profile?.household_id,
  });

  const { data: goals = [], refetch: refetchGoals } = useQuery({
    queryKey: ['goals', profile?.household_id],
    queryFn: () => getGoals(profile!.household_id),
    enabled: !!profile?.household_id,
  });

  const totalIncome = income.reduce((acc, curr) => acc + (curr.amount || 0), 0);
  const totalExpenses = expenses.reduce((acc, curr) => acc + (curr.amount || 0), 0);
  const totalSavings = goals.reduce((acc, curr) => acc + (curr.saved_amount || 0), 0);

  if (authLoading || !user || (!profile && !profileAttempted)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!profile || !profile.household_id) {
    return <OnboardingForm userId={user.id} onComplete={() => setProfileAttempted(false)} />;
  }

  return (
    <div className="flex bg-slate-50 min-h-screen">
      <Sidebar />
      <main className="flex-1 p-8">
        <header className="mb-8">
          <h2 className="text-2xl font-bold text-slate-800">Welcome, {profile.full_name}</h2>
          <p className="text-slate-500">Here&apos;s your family&apos;s financial overview for this month.</p>
        </header>

        <DashboardStats
          totalIncome={totalIncome}
          totalExpenses={totalExpenses}
          totalSavings={totalSavings}
        />

        <DashboardCharts
          income={income}
          expenses={expenses}
          goals={goals}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
          <section>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-slate-800">Financial Goals</h3>
            </div>
            <div className="space-y-4">
              {goals.length > 0 ? (
                goals.map((goal) => <GoalCard key={goal.id} goal={goal} />)
              ) : (
                <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-slate-300 text-slate-400">
                  No goals set yet.
                </div>
              )}
            </div>
          </section>

          <section className="space-y-8">
            <SavingsAllocator onAllocated={() => {
              refetchGoals();
            }} />

            <div>
              <h3 className="text-xl font-bold text-slate-800 mb-4">Recent Expenses</h3>
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                {expenses.slice(0, 5).length > 0 ? (
                  expenses.slice(0, 5).map((expense) => (
                    <div key={expense.id} className="p-4 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-semibold text-slate-800">{expense.description}</p>
                          <p className="text-xs text-slate-500">{expense.category?.name || 'Uncategorized'}</p>
                        </div>
                        <p className="font-bold text-slate-800">
                          {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(expense.amount)}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-12 text-center text-slate-400">No recent expenses.</div>
                )}
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
