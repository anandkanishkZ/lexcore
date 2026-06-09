import Link from "next/link";

const navItems = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Cases", href: "#" },
  { label: "Documents", href: "#" },
  { label: "Clients", href: "#" },
  { label: "Settings", href: "#" },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-full">
      <aside className="w-56 shrink-0 bg-brand flex flex-col">
        <div className="h-14 flex items-center px-5 border-b border-[#1a2540]">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-white rounded-md flex items-center justify-center">
              <span className="text-slate-900 text-xs font-bold">L</span>
            </div>
            <span className="text-white text-sm font-semibold tracking-tight">
              Lexcore
            </span>
          </div>
        </div>

        <nav className="flex-1 py-4 px-3 space-y-0.5">
          {navItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="flex items-center px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-[#1a2540] transition text-sm"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="p-3 border-t border-[#1a2540]">
          <div className="flex items-center gap-2.5 px-3 py-2">
            <div className="w-7 h-7 bg-[#1a2540] rounded-full flex items-center justify-center shrink-0">
              <span className="text-white text-xs font-medium">A</span>
            </div>
            <div className="min-w-0">
              <p className="text-white text-xs font-medium truncate">Admin</p>
              <p className="text-slate-500 text-xs truncate">admin@lexcore.com</p>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 bg-slate-50">
        <header className="h-14 bg-white border-b border-slate-200 flex items-center px-6 shrink-0">
          <span className="text-sm font-medium text-slate-900">Dashboard</span>
        </header>
        <main className="flex-1 overflow-y-auto p-8">{children}</main>
      </div>
    </div>
  );
}
