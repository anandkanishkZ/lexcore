import Sidebar from "./_components/Sidebar";
import Topbar from "./_components/Topbar";

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex h-full">
            <div className="print:hidden contents">
                <Sidebar />
            </div>

            <div className="flex-1 flex flex-col min-w-0 bg-slate-50 print:bg-white">
                <div className="print:hidden contents">
                    <Topbar />
                </div>
                <main className="flex-1 overflow-y-auto p-8 print:p-0">{children}</main>
            </div>
        </div>
    );
}
