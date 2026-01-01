import AuthForm from '@/features/auth/AuthForm';

export default function LoginPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 px-4">
            <AuthForm mode="login" />
        </div>
    );
}
