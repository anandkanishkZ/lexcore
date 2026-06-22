import Sidebar from "./_components/Sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-full">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 bg-slate-50">
        <header className="h-14 bg-white border-b border-slate-200 flex items-center px-6 shrink-0">
          <span className="text-sm font-medium text-slate-900">Dashboard</span>
        </header>
        <main className="flex-1 overflow-y-auto p-8">{children}</main>
      </div>
    </div>
  );
}
