import { create } from 'zustand';

interface UserProfile {
    id: string;
    household_id: string;
    full_name: string;
    role: string;
}

interface UserState {
    profile: UserProfile | null;
    setProfile: (profile: UserProfile | null) => void;
}

export const useUserStore = create<UserState>((set) => ({
    profile: null,
    setProfile: (profile) => set({ profile }),
}));
