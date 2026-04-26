"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Calendar, Star, Bug, Lightbulb, CheckCircle2, Code2, Copy, Check } from "lucide-react";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

export default function ReviewDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copiedOriginal, setCopiedOriginal] = useState(false);
  const [copiedImproved, setCopiedImproved] = useState(false);

  useEffect(() => {
    fetchReview();
  }, [id]);

  const fetchReview = async () => {
    try {
      const res = await fetch(`/api/review/${id}`);
      if (!res.ok) throw new Error("Failed to load");
      const rev = await res.json();
      setData(rev);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text, type) => {
    navigator.clipboard.writeText(text);
    if (type === 'original') {
      setCopiedOriginal(true);
      setTimeout(() => setCopiedOriginal(false), 2000);
    } else {
      setCopiedImproved(true);
      setTimeout(() => setCopiedImproved(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold mb-4">Review not found</h2>
        <Link href="/dashboard" className="text-blue-500 hover:underline">Return to Dashboard</Link>
      </div>
    );
  }

  const result = data.review;

  return (
    <div className="space-y-8 animate-in fade-in pb-20">
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold">Review Details</h1>
          <span className="flex items-center gap-2 text-xs text-foreground/40 mt-1">
            <Calendar size={12} />
            {new Date(data.createdAt).toLocaleString()}
          </span>
        </div>
      </div>

      {/* Score Overview */}
      <div className="p-8 bg-black/40 border border-white/5 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-sm font-bold text-foreground/40 uppercase tracking-widest">
              {data.type === "repo" ? "Repository Summary" : "Documentation"}
            </h2>
            {result?.isTruncated && (
              <span className="px-2 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-500 border border-amber-500/20 font-bold uppercase tracking-wider">
                Truncated
              </span>
            )}
          </div>
          <p className="text-foreground/80 leading-relaxed max-w-2xl">
            {data.type === "repo" ? result?.summary : (result?.documentation || "No documentation generated.")}
          </p>
          {result?.truncationWarning && (
            <p className="text-amber-500 text-sm mt-3 font-medium bg-amber-500/10 inline-block px-3 py-1.5 rounded-lg border border-amber-500/20">
              ⚠️ {result.truncationWarning}
            </p>
          )}
        </div>
        <div className="flex-shrink-0 text-center">
          <div className="text-6xl font-black text-blue-500">{result?.score || 0}</div>
          <div className="text-xs font-medium text-foreground/40 uppercase tracking-wider mt-1">Score</div>
        </div>
      </div>

      {data.type !== "repo" && (
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Original Code */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Code2 className="text-foreground/60" size={18} />
                Original Code
              </h3>
              <button 
                onClick={() => copyToClipboard(data.code, 'original')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-md text-xs font-medium transition-all"
              >
                {copiedOriginal ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                {copiedOriginal ? "Copied" : "Copy"}
              </button>
            </div>
            <div className="bg-[#1e1e1e] rounded-xl overflow-hidden border border-white/10">
               <SyntaxHighlighter language={data.language || 'javascript'} style={vscDarkPlus} customStyle={{ margin: 0, padding: '1.5rem', fontSize: '0.85rem' }}>
                 {data.code}
               </SyntaxHighlighter>
            </div>
          </div>

          {/* Improved Code */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Star className="text-blue-500" size={18} />
                Improved Code
              </h3>
              <button 
                onClick={() => copyToClipboard(result?.improvedCode || '', 'improved')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-md text-xs font-medium transition-all"
              >
                {copiedImproved ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                {copiedImproved ? "Copied" : "Copy"}
              </button>
            </div>
            <div className="bg-[#1e1e1e] rounded-xl overflow-hidden border border-white/10 shadow-[0_0_30px_rgba(59,130,246,0.15)] ring-1 ring-blue-500/20">
               <SyntaxHighlighter language={data.language || 'javascript'} style={vscDarkPlus} customStyle={{ margin: 0, padding: '1.5rem', fontSize: '0.85rem' }}>
                 {result?.improvedCode || "No improved code provided."}
               </SyntaxHighlighter>
            </div>
          </div>
        </div>
      )}

      {/* File Breakdown for Repo */}
      {data.type === "repo" && result?.fileBreakdown?.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-blue-400 pb-2 border-b border-white/5">
            <Code2 size={24} />
            <h4 className="text-xl font-bold text-foreground">File Breakdown</h4>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {result.fileBreakdown.map((fb, i) => (
              <div key={i} className="p-5 bg-blue-500/5 border border-blue-500/10 rounded-xl space-y-3">
                <span className="font-mono text-xs font-bold text-blue-400 break-all bg-blue-500/10 px-2 py-1 rounded inline-block">
                  {fb.filename}
                </span>
                <p className="text-sm text-foreground/80 leading-relaxed">
                  {fb.issues}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-8">
        {/* Issues */}
        <div className="p-6 bg-red-500/5 border border-red-500/10 rounded-2xl space-y-4">
          <h3 className="text-xl font-bold text-red-500 flex items-center gap-2">
            <Bug size={20} /> Issues Found
          </h3>
          <ul className="space-y-3">
            {result?.issues?.map((issue, i) => (
              <li key={i} className="flex gap-3 text-sm text-foreground/80">
                <div className="mt-0.5 w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0"></div>
                <p>
                  <span className="font-bold text-red-400 mr-2">[{issue.type}]</span>
                  {issue.description}
                </p>
              </li>
            ))}
          </ul>
        </div>

        {/* Suggestions */}
        <div className="p-6 bg-yellow-500/5 border border-yellow-500/10 rounded-2xl space-y-4">
          <h3 className="text-xl font-bold text-yellow-500 flex items-center gap-2">
            <Lightbulb size={20} /> Suggestions
          </h3>
          <ul className="space-y-3">
            {result?.suggestions?.map((sug, i) => (
              <li key={i} className="flex gap-3 text-sm text-foreground/80">
                <CheckCircle2 size={16} className="text-yellow-500 flex-shrink-0 mt-0.5" />
                <p>{sug}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
