export const dynamic = "force-dynamic";
import "./globals.css";

import { AuthProvider } from "./components/AuthProvider";
import AuthNav from "./components/AuthNav";
import Sidebar from "./components/Sidebar";
import { getServerSession } from "next-auth/next";
import { authOptions } from "./api/auth/[...nextauth]/route";

export const metadata = {
  title: "AI Code Reviewer",
  description: "Professional AI-powered code analysis and suggestions.",
};

export default async function RootLayout({ children }) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="en">
      <body className="antialiased min-h-screen">
        <AuthProvider>
          {session?.user ? (
            <div className="flex h-screen overflow-hidden bg-background">
              <Sidebar />
              <div className="flex-1 overflow-y-auto relative">
                <main className="max-w-6xl mx-auto w-full p-6 md:p-10 min-h-screen">
                  {children}
                </main>
              </div>
            </div>
          ) : (
            <div className="flex flex-col min-h-screen">
              <header className="border-b border-border py-4 px-8 sticky top-0 bg-background/80 backdrop-blur-md z-10 flex-shrink-0">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                  <h1 className="text-xl font-bold bg-gradient-to-r from-blue-500 to-cyan-400 bg-clip-text text-transparent">
                    AI Code Review
                  </h1>
                  <div className="flex items-center gap-8">
                    <nav className="hidden md:flex gap-6 text-sm text-foreground/60">
                      <span className="hover:text-foreground cursor-pointer transition-colors">Documentation</span>
                      <span className="hover:text-foreground cursor-pointer transition-colors">API References</span>
                    </nav>
                    <AuthNav />
                  </div>
                </div>
              </header>

              <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-8">
                {children}
              </main>

              <footer className="border-t border-border py-6 px-8 text-center text-sm text-foreground/40 flex-shrink-0">
                <p>© 2026 AI Code Reviewer. Powered by Google Gemini.</p>
              </footer>
            </div>
          )}
        </AuthProvider>
      </body>
    </html>
  );
}
