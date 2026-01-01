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
import { useAuth } from '@/components/shared/AuthProvider';
import DashboardCharts from '@/features/dashboard/DashboardCharts';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import OnboardingForm from '@/features/auth/OnboardingForm';
import { useDateFilterStore } from '@/store/dateFilterStore';
import MonthFilter from '@/components/shared/MonthFilter';
import DashboardLayout from '@/components/shared/DashboardLayout';

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const { profile, setProfile } = useUserStore();
  const [profileAttempted, setProfileAttempted] = useState(false);
  const { getDateRange } = useDateFilterStore();
  const { startDate, endDate } = getDateRange();
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
    queryKey: ['income', profile?.household_id, startDate, endDate],
    queryFn: () => getIncome(profile!.household_id, startDate, endDate),
    enabled: !!profile?.household_id,
  });

  const { data: expenses = [], refetch: refetchExpenses } = useQuery({
    queryKey: ['expenses', profile?.household_id, startDate, endDate],
    queryFn: () => getExpenses(profile!.household_id, startDate, endDate),
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
    <DashboardLayout>
      <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Welcome, {profile.full_name}</h2>
          <p className="text-sm md:text-base text-slate-500 dark:text-slate-400 font-medium">Tracking your family&apos;s global finances.</p>
        </div>
        <MonthFilter />
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
            <h3 className="text-xl font-black text-slate-800 dark:text-slate-200 tracking-tight">Financial Goals</h3>
          </div>
          <div className="space-y-4">
            {goals.length > 0 ? (
              goals.map((goal) => <GoalCard key={goal.id} goal={goal} />)
            ) : (
              <div className="p-12 text-center bg-white dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 text-slate-400 dark:text-slate-500 font-medium">
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
            <h3 className="text-xl font-black text-slate-800 dark:text-slate-200 mb-4 tracking-tight">Recent Expenses</h3>
            <div className="bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden transition-colors duration-300">
              {expenses.slice(0, 5).length > 0 ? (
                expenses.slice(0, 5).map((expense) => (
                  <div key={expense.id} className="p-4 border-b border-slate-50 dark:border-slate-800 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                    <div className="flex justify-between items-center">
                      <div className="min-w-0 flex-1 pr-4">
                        <p className="font-bold text-slate-800 dark:text-slate-200 truncate">{expense.description || 'Expense'}</p>
                        <p className="text-xs text-slate-500">{expense.category?.name || 'Uncategorized'}</p>
                      </div>
                      <p className="font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">
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
    </DashboardLayout>
  );
}
