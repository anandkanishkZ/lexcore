export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-full bg-slate-50 flex items-center justify-center p-6">
      {children}
    </div>
  );
}
