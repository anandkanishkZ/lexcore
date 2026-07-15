import ResetPasswordForm from "@/app/(auth)/_components/ResetPasswordForm";

interface PageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function ResetPasswordPage({ searchParams }: PageProps) {
  const params = await searchParams;

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8 text-center">
        <div className="inline-flex items-center gap-2.5 mb-3">
          <div className="w-8 h-8 bg-brand rounded-lg flex items-center justify-center">
            <span className="text-white text-sm font-bold tracking-tighter">L</span>
          </div>
          <span className="text-xl font-semibold tracking-tight text-slate-900">
            Lexcore
          </span>
        </div>
        <p className="text-sm text-slate-500">Choose a new password</p>
      </div>

      <ResetPasswordForm token={params.token} />
    </div>
  );
}
