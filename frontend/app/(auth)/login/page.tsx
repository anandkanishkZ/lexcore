import LoginForm from "@/app/(auth)/_components/LoginForm";

export default function LoginPage() {
    return (
        <div className="h-screen overflow-hidden grid lg:grid-cols-2">
            {/* Left — info panel */}
            <div className="hidden lg:flex flex-col justify-between bg-brand h-full px-10 py-8 text-white">
                {/* Logo */}
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center border border-white/20">
                        <span className="text-white text-sm font-bold tracking-tighter">L</span>
                    </div>
                    <span className="text-base font-semibold tracking-tight">Lexcore</span>
                </div>

                {/* Main content */}
                <div className="space-y-6">
                    <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-widest text-white/40">
                            Legal Intelligence Platform
                        </p>
                        <h1 className="text-3xl font-bold leading-tight">
                            Welcome back<br />to Lexcore.
                        </h1>
                        <p className="text-sm text-white/60 leading-relaxed max-w-sm">
                            Sign in to access your documents, drafts, and AI-powered legal tools — all in one place.
                        </p>
                    </div>

                    <ul className="space-y-3">
                        {[
                            { title: "Document Analysis", desc: "Extract key clauses and risks in seconds" },
                            { title: "Secure & Compliant", desc: "End-to-end encrypted, built for legal standards" },
                            { title: "AI-Powered Drafting", desc: "Generate contracts and summaries with one click" },
                            { title: "Team Collaboration", desc: "Review, comment, and approve in real time" },
                        ].map((feature) => (
                            <li key={feature.title} className="flex items-start gap-3">
                                <div className="mt-0.5 w-4 h-4 rounded-full bg-white/10 border border-white/20 flex items-center justify-center shrink-0">
                                    <svg className="w-2 h-2 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-white">{feature.title}</p>
                                    <p className="text-xs text-white/50">{feature.desc}</p>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Footer */}
                <p className="text-xs text-white/30">
                    © {new Date().getFullYear()} Lexcore. All rights reserved.
                </p>
            </div>

            {/* Right — login form */}
            <div className="h-full flex items-center justify-center bg-slate-50 px-6">
                <LoginForm />
            </div>
        </div>
    );
}
