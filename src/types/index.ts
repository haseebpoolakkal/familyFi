export type Profile = {
    id: string;
    household_id: string;
    full_name: string;
    role: 'admin' | 'member';
};

export type Income = {
    id: string;
    household_id: string;
    profile_id: string;
    amount: number;
    type: 'fixed' | 'freelance';
    date: string;
    description: string;
};

export type Expense = {
    id: string;
    household_id: string;
    category_id?: string;
    amount: number;
    is_fixed: boolean;
    is_paid: boolean;
    due_date: string;
    paid_at?: string;
    description: string;
    status: 'active' | 'completed' | 'closed';
};

export type Goal = {
    id: string;
    household_id: string;
    name: string;
    target_amount: number;
    saved_amount: number;
    allocation_percentage: number;
    priority: number;
};
