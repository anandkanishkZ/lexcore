import Sidebar from "./_components/Sidebar";
import Topbar from "./_components/Topbar";

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex h-full">
            <Sidebar />

            <div className="flex-1 flex flex-col min-w-0 bg-slate-50">
                <Topbar />
                <main className="flex-1 overflow-y-auto p-8">{children}</main>
            </div>
        </div>
    );
}
