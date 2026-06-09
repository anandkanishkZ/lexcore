import LoginForm from "@/app/(auth)/_components/LoginForm";

export default function LoginPage() {
    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
            <div className="w-full max-w-sm">
                <LoginForm />
            </div>
        </div>
    );
}
