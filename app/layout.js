import "./globals.css";

export const metadata = {
  title: "AI Code Reviewer",
  description: "Professional AI-powered code analysis and suggestions.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen flex flex-col">
        <header className="border-b border-border py-4 px-8 sticky top-0 bg-background/80 backdrop-blur-md z-10">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-500 to-cyan-400 bg-clip-text text-transparent">
              AI Code Review
            </h1>
            <nav className="hidden md:flex gap-6 text-sm text-foreground/60">
              <span className="hover:text-foreground cursor-pointer transition-colors">Documentation</span>
              <span className="hover:text-foreground cursor-pointer transition-colors">API References</span>
              <span className="hover:text-foreground cursor-pointer transition-colors">Help</span>
            </nav>
          </div>
        </header>

        <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-8">
          {children}
        </main>

        <footer className="border-t border-border py-6 px-8 text-center text-sm text-foreground/40">
          <p>© 2026 AI Code Reviewer. Powered by OpenAI.</p>
        </footer>
      </body>
    </html>
  );
}
