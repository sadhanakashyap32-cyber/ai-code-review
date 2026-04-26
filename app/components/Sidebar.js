"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { LayoutDashboard, PlusCircle, LogOut, Code2, User, CreditCard } from "lucide-react";
import { cn } from "../../lib/utils";

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const links = [
    { href: "/dashboard", label: "Dashboard History", icon: LayoutDashboard },
    { href: "/", label: "New Review", icon: PlusCircle },
    { href: "/billing", label: "Billing & Plan", icon: CreditCard },
  ];

  return (
    <div className="w-64 border-r border-white/5 bg-[#0a0a0a] min-h-screen flex flex-col hidden md:flex sticky top-0 h-screen">
      <div className="p-6">
        <Link href="/" className="flex items-center gap-2 text-xl font-bold bg-gradient-to-r from-blue-500 to-cyan-400 bg-clip-text text-transparent">
          <Code2 className="text-blue-500" />
          AI Reviewer
        </Link>
      </div>

      <nav className="flex-1 px-4 space-y-2 mt-4">
        {links.map((link) => {
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-medium ${
                isActive 
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20" 
                  : "text-foreground/60 hover:text-foreground hover:bg-white/5"
              }`}
            >
              <link.icon size={18} />
              {link.label}
            </Link>
          );
        })}
      </nav>

      {session?.user && (
        <div className="p-4 border-t border-white/5">
          <div className="flex items-center gap-3 px-4 py-3 mb-2">
            {session.user.image ? (
              <img src={session.user.image} alt="User" className="w-8 h-8 rounded-full border border-white/10" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-500">
                <User size={16} />
              </div>
            )}
            <div className="flex flex-col">
              <span className="text-sm font-medium truncate max-w-[120px]">{session.user.name?.split(' ')[0]}</span>
              <span className="text-xs text-foreground/40 truncate max-w-[120px]">{session.user.email}</span>
            </div>
          </div>
          
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
          >
            <LogOut size={18} />
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}
