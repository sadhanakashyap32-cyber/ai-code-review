"use client";

import { useEffect, useState } from "react";
import { Loader2, CheckCircle2, Zap, ArrowRight, Star } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function BillingPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [usageData, setUsageData] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    fetchUsageData();
  }, []);

  const fetchUsageData = async () => {
    try {
      const res = await fetch("/api/usage");
      if (res.ok) {
        const data = await res.json();
        setUsageData(data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsInitializing(false);
    }
  };

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", { method: "POST" });
      const data = await res.json();
      
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert("Failed to initialize checkout.");
      }
    } catch (error) {
      console.error("Checkout error:", error);
    } finally {
      setLoading(false);
    }
  };

  if (isInitializing) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const isPro = usageData?.plan === "PRO";

  return (
    <div className="space-y-8 animate-in fade-in pb-10">
      <div>
        <h1 className="text-3xl font-bold">Billing & Plan</h1>
        <p className="text-foreground/60 text-sm mt-1">
          Manage your subscription and usage limits.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* FREE Tier Card */}
        <div className={`p-8 rounded-2xl border transition-all ${!isPro ? "bg-blue-500/5 border-blue-500/20 ring-1 ring-blue-500/20" : "bg-black/40 border-white/5"}`}>
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-2xl font-bold mb-1">Free Tier</h3>
              <p className="text-foreground/40 text-sm">Perfect to test things out.</p>
            </div>
            {!isPro && <span className="px-3 py-1 bg-blue-500/20 text-blue-400 text-xs font-bold rounded-lg uppercase tracking-wider">Current Plan</span>}
          </div>
          
          <div className="mb-8">
            <span className="text-4xl font-black">$0</span>
            <span className="text-foreground/40 font-medium">/month</span>
          </div>

          <ul className="space-y-4 mb-8">
            <li className="flex items-center gap-3 text-sm font-medium">
              <CheckCircle2 className="text-foreground/20" size={20} />
              <span className="text-foreground/80">Basic AI Code Review</span>
            </li>
            <li className="flex items-center gap-3 text-sm font-medium">
              <CheckCircle2 className="text-foreground/20" size={20} />
              <span className="text-foreground/80">Save history dashboard</span>
            </li>
            <li className="flex items-center gap-3 text-sm font-medium">
              <Zap className={!isPro ? "text-yellow-500" : "text-foreground/20"} size={20} />
              <span className="text-foreground/80 font-bold">5 Reviews per day</span>
            </li>
          </ul>

          {!isPro && (
            <div className="w-full py-4 text-center text-sm font-bold text-foreground/40 border border-white/5 rounded-xl bg-black/20">
              Active Plan
            </div>
          )}
        </div>

        {/* PRO Tier Card */}
        <div className={`relative overflow-hidden p-8 rounded-2xl border transition-all ${isPro ? "bg-gradient-to-b from-blue-900/40 to-black border-blue-500/30 ring-1 ring-blue-500/30 shadow-[0_0_50px_rgba(59,130,246,0.15)]" : "bg-black/40 border-white/5"}`}>
          {isPro && (
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-400 to-indigo-500"></div>
          )}
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-2xl font-bold flex items-center gap-2 mb-1">
                Pro Tier <Star className="text-blue-400 fill-blue-400/20" size={20} />
              </h3>
              <p className="text-foreground/40 text-sm">For serious developers.</p>
            </div>
            {isPro && <span className="px-3 py-1 bg-blue-500/20 text-blue-400 text-xs font-bold rounded-lg uppercase tracking-wider">Current Plan</span>}
          </div>
          
          <div className="mb-8">
            <span className="text-4xl font-black">$19</span>
            <span className="text-foreground/40 font-medium">/month</span>
          </div>

          <ul className="space-y-4 mb-8">
            <li className="flex items-center gap-3 text-sm font-medium">
              <CheckCircle2 className="text-blue-500" size={20} />
              <span className="text-foreground/90">Everything in Free</span>
            </li>
            <li className="flex items-center gap-3 text-sm font-medium">
              <CheckCircle2 className="text-blue-500" size={20} />
              <span className="text-foreground/90">Priority AI processing</span>
            </li>
            <li className="flex items-center gap-3 text-sm font-medium">
              <CheckCircle2 className="text-blue-500" size={20} />
              <span className="text-foreground/90 font-bold bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded ml-[-8px]">Unlimited Reviews</span>
            </li>
          </ul>

          <button
            onClick={handleSubscribe}
            disabled={loading}
            className={`w-full flex items-center justify-center gap-2 py-4 rounded-xl font-bold transition-all ${
              isPro 
                ? "bg-white hover:bg-gray-100 text-black shadow-lg" 
                : "bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_20px_rgba(59,130,246,0.2)] hover:shadow-[0_0_30px_rgba(59,130,246,0.3)]"
            }`}
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : null}
            {isPro ? "Manage Subscription" : "Upgrade to Pro"}
            {!isPro && !loading && <ArrowRight size={18} />}
          </button>
        </div>
      </div>
    </div>
  );
}
