"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { LogOut, User } from "lucide-react";

export default function AuthNav() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return <div className="h-8 w-24 bg-white/5 animate-pulse rounded-lg"></div>;
  }

  if (session && session.user) {
    return (
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          {session.user.image ? (
            <img 
              src={session.user.image} 
              alt={session.user.name || "User"} 
              className="w-8 h-8 rounded-full border border-white/10"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-500">
              <User size={16} />
            </div>
          )}
          <span className="text-sm font-medium hidden sm:block">
            {session.user.name?.split(' ')[0] || "User"}
          </span>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-2 text-sm text-foreground/60 hover:text-red-400 transition-colors"
          title="Sign out"
        >
          <LogOut size={16} />
          <span className="hidden sm:block">Sign out</span>
        </button>
      </div>
    );
  }

  return (
    <Link 
      href="/login"
      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-lg transition-all"
    >
      Log In
    </Link>
  );
}
