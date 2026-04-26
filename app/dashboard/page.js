"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Code2, Clock, Trash2, ChevronRight, Loader2, Search, Zap, BarChart2, Hash, Layers, Github } from "lucide-react";
import { useSession } from "next-auth/react";
import { UsageTrendChart, LanguagesChart } from "../components/AnalyticsCharts";

export default function DashboardPage() {
  const { data: session } = useSession();
  const [reviews, setReviews] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [revRes, analyticsRes] = await Promise.all([
        fetch("/api/review"),
        fetch("/api/analytics")
      ]);
      
      if (revRes.ok) {
        const revData = await revRes.json();
        setReviews(revData.reviews || []);
      }
      if (analyticsRes.ok) {
        const data = await analyticsRes.json();
        setAnalytics(data);
      }
    } catch (error) {
      console.error("Failed to fetch data", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this review?")) return;

    try {
      const res = await fetch(`/api/review/${id}`, { method: "DELETE" });
      if (res.ok) {
        setReviews(reviews.filter(r => r.id !== id));
        fetchData(); // Refresh analytics after deletion
      }
    } catch (error) {
      console.error("Failed to delete", error);
    }
  };

  const filteredReviews = reviews.filter(r => 
    r.language?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    r.code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-foreground/60 text-sm mt-1">Analytics and code review history</p>
        </div>
        <Link 
          href="/" 
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-500/20"
        >
          New Review
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="animate-spin text-blue-500" size={32} /></div>
      ) : (
        <>
          {/* Analytics Stats Cards */}
          {analytics && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-5 rounded-2xl bg-black/40 border border-white/5 flex flex-col justify-between">
                <div className="text-foreground/40 text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-2"><Zap size={14} /> Current Plan</div>
                <div className={`text-2xl font-black ${analytics.plan === 'PRO' ? 'text-blue-500' : 'text-white'}`}>{analytics.plan}</div>
              </div>
              <div className="p-5 rounded-2xl bg-black/40 border border-white/5 flex flex-col justify-between">
                <div className="text-foreground/40 text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-2"><Hash size={14} /> Total Reviews</div>
                <div className="text-2xl font-black">{analytics.totalReviews}</div>
              </div>
              <div className="p-5 rounded-2xl bg-black/40 border border-white/5 flex flex-col justify-between">
                <div className="text-foreground/40 text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-2"><Clock size={14} /> Reviews Today</div>
                <div className="text-2xl font-black">{analytics.reviewsToday}</div>
              </div>
              <div className="p-5 rounded-2xl bg-black/40 border border-white/5 flex flex-col justify-between">
                <div className="text-foreground/40 text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-2"><BarChart2 size={14} /> Avg. Per Day</div>
                <div className="text-2xl font-black">{analytics.avgPerDay}</div>
              </div>
            </div>
          )}

          {/* Usage Limit Banner for Free Tier */}
          {analytics?.plan === "FREE" && (
            <div className="p-5 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex-1 w-full max-w-sm">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-bold flex items-center gap-1.5 text-blue-400">
                    <Zap size={16} /> Daily Usage
                  </span>
                  <span className="text-xs font-bold text-foreground/60">
                    {analytics.reviewsToday} / 5
                  </span>
                </div>
                <div className="h-2 w-full bg-black/40 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 transition-all duration-1000 ease-out" 
                    style={{ width: \`\${Math.min((analytics.reviewsToday / 5) * 100, 100)}%\` }}
                  ></div>
                </div>
              </div>
              
              <Link href="/billing" className="px-5 py-2 bg-white text-black font-bold text-sm rounded-lg hover:bg-gray-200 transition-colors shadow-lg whitespace-nowrap">
                Upgrade to Pro
              </Link>
            </div>
          )}

          {/* Charts Section */}
          {analytics && (
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-5 rounded-2xl bg-black/40 border border-white/5">
                <h3 className="text-sm font-bold text-foreground/80 mb-6 flex items-center gap-2"><Layers size={16} /> Activity (Last 7 Days)</h3>
                <UsageTrendChart data={analytics.trendData} />
              </div>
              <div className="p-5 rounded-2xl bg-black/40 border border-white/5">
                <h3 className="text-sm font-bold text-foreground/80 mb-6 flex items-center gap-2"><Code2 size={16} /> Top Languages Used</h3>
                <LanguagesChart data={analytics.topLanguages} />
              </div>
            </div>
          )}

          {/* Review History */}
          <div className="mt-12">
            <h2 className="text-xl font-bold mb-6">Recent Code Reviews</h2>
            <div className="relative mb-6">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/40" size={18} />
              <input 
                type="text" 
                placeholder="Search history by language or code snippet..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl py-4 pl-12 pr-4 outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-medium text-sm"
              />
            </div>
            
            {filteredReviews.length > 0 ? (
              <div className="grid gap-4">
                {filteredReviews.map((review) => (
                  <Link 
                    key={review.id} 
                    href={`/review/${review.id}`}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-5 rounded-xl bg-white/5 border border-white/5 hover:border-blue-500/50 hover:bg-white/10 transition-all group"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500 flex-shrink-0 mt-1 sm:mt-0">
                        {review.type === "repo" ? <Github size={20} /> : <Code2 size={20} />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold px-2 py-1 bg-white/10 rounded-md uppercase tracking-wider text-foreground/80">
                            {review.type === "repo" ? "github repo" : (review.language || "Unknown")}
                          </span>
                          {review.type === "repo" && review.filesAnalyzed && (
                            <span className="text-xs font-medium px-2 py-1 bg-blue-500/20 text-blue-400 rounded-md">
                              {review.filesAnalyzed} files
                            </span>
                          )}
                          <span className="flex items-center gap-1 text-xs text-foreground/40">
                            <Clock size={12} />
                            {new Date(review.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm font-mono text-foreground/80 line-clamp-1 max-w-md">
                          {review.type === "repo" ? review.repoUrl : review.code.substring(0, 80) + "..."}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 mt-4 sm:mt-0 pt-4 sm:pt-0 border-t border-white/5 sm:border-0 pl-0 sm:pl-4">
                      <div className="flex flex-col items-end">
                        <span className="text-xs text-foreground/40 font-medium">Quality Score</span>
                        <span className={`font-black ${review.review?.score >= 80 ? 'text-green-500' : review.review?.score >= 60 ? 'text-yellow-500' : 'text-red-500'}`}>
                          {review.review?.score || '--'}/100
                        </span>
                      </div>
                      <button 
                        onClick={(e) => handleDelete(review.id, e)}
                        className="p-2 text-foreground/40 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                      >
                        <Trash2 size={18} />
                      </button>
                      <ChevronRight className="text-foreground/20 group-hover:text-blue-500 transition-colors" />
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-20 px-4 bg-white/5 border border-white/5 rounded-2xl">
                <Code2 size={48} className="mx-auto text-foreground/20 mb-4" />
                <h3 className="text-xl font-bold mb-2">No reviews found</h3>
                <p className="text-foreground/60 text-sm max-w-sm mx-auto mb-6">
                  You haven't generated any code reviews yet, or your search didn't match any results.
                </p>
                <Link 
                  href="/" 
                  className="inline-flex px-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl font-bold transition-all text-sm"
                >
                  Start your first review
                </Link>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

