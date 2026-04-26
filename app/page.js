"use client";

import React, { useState } from "react";
import { 
  Code2, 
  Send, 
  Bug, 
  Lightbulb, 
  FileText, 
  Star, 
  Loader2, 
  AlertCircle,
  Link,
  Github,
  CheckCircle2,
  Download
} from "lucide-react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const detectLanguage = (code, filename) => {
  if (filename) {
    const ext = filename.split('.').pop().toLowerCase();
    const map = {
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'py': 'python',
      'rb': 'ruby',
      'java': 'java',
      'go': 'go',
      'rs': 'rust',
      'cpp': 'cpp',
      'c': 'c',
      'cs': 'csharp',
      'php': 'php',
      'html': 'html',
      'css': 'css',
      'json': 'json',
      'md': 'markdown'
    };
    if (map[ext]) return map[ext];
  }
  
  // Simple content-based detection if filename is missing
  if (code.includes('import React') || code.includes('export default')) return 'javascript';
  if (code.includes('def ') || code.includes('import ')) return 'python';
  if (code.includes('class ') && code.includes('public static void main')) return 'java';
  
  return 'javascript'; // Default
};

export default function Home() {
  const [code, setCode] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [mode, setMode] = useState("manual"); // 'manual' | 'github'
  const [detectedLang, setDetectedLang] = useState("javascript");

  const handleRepoReview = async () => {
    if (!githubUrl.trim()) return;
    
    setLoading(true);
    setResults(null);
    setError(null);
    
    try {
      const response = await fetch("/api/repo-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoUrl: githubUrl }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to analyze repository.");
      }
      
      setResults(data);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async () => {
    if (!code.trim()) return;
    
    setLoading(true);
    setResults(null);
    setError(null);
    
    try {
      const response = await fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to analyze code.");
      }
      
      setResults(data);
    } catch (err) {
      console.error(err);
      const isConnectionError = err.message.toLowerCase().includes("connection error") || 
                               err.message.toLowerCase().includes("fetch");
      setError(isConnectionError 
        ? "Network connection error. Please check your internet connection or ensure you can reach api.openai.com." 
        : err.message
      );
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setCode("");
    setGithubUrl("");
    setResults(null);
    setError(null);
    setMode("manual");
  };

  const handleCopy = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    // Optional: add a toast or temporary state for "Copied!"
  };

  const exportToPDF = async () => {
    if (!results) return;
    
    setLoading(true);
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const margin = 20;
      let y = 20;

      // Header
      pdf.setFontSize(22);
      pdf.setTextColor(33, 150, 243); // Blue
      pdf.text("AI Code Review Report", margin, y);
      y += 10;
      
      pdf.setFontSize(10);
      pdf.setTextColor(100, 100, 100);
      pdf.text(`Generated on: ${new Date().toLocaleString()}`, margin, y);
      y += 15;

      // Score
      pdf.setFontSize(14);
      pdf.setTextColor(0, 0, 0);
      pdf.text(`Code Quality Score: ${results.score}/100`, margin, y);
      y += 10;

      // Documentation
      if (results.documentation || results.summary) {
        pdf.setFontSize(16);
        pdf.text("Project Overview", margin, y);
        y += 7;
        pdf.setFontSize(11);
        const docs = pdf.splitTextToSize(results.documentation || results.summary, 170);
        pdf.text(docs, margin, y);
        y += (docs.length * 6) + 10;
      }

      // Issues
      if (results.issues && results.issues.length > 0) {
        pdf.setFontSize(16);
        pdf.setTextColor(244, 67, 54); // Red
        pdf.text("Issues Found", margin, y);
        y += 7;
        pdf.setFontSize(11);
        pdf.setTextColor(0, 0, 0);
        results.issues.forEach((issue, i) => {
          const text = `[${issue.type}] ${issue.description}`;
          const issueText = pdf.splitTextToSize(`${i+1}. ${text}`, 170);
          if (y + (issueText.length * 6) > 280) { pdf.addPage(); y = 20; }
          pdf.text(issueText, margin, y);
          y += (issueText.length * 6) + 2;
        });
        y += 10;
      }

      // Suggestions
      if (results.suggestions && results.suggestions.length > 0) {
        if (y > 250) { pdf.addPage(); y = 20; }
        pdf.setFontSize(16);
        pdf.setTextColor(33, 150, 243); // Blue
        pdf.text("Improvement Suggestions", margin, y);
        y += 7;
        pdf.setFontSize(11);
        pdf.setTextColor(0, 0, 0);
        results.suggestions.forEach((sug, i) => {
          const sugText = pdf.splitTextToSize(`• ${sug}`, 170);
          if (y + (sugText.length * 6) > 280) { pdf.addPage(); y = 20; }
          pdf.text(sugText, margin, y);
          y += (sugText.length * 6) + 2;
        });
      }

      pdf.save('ai-code-review-report.pdf');
    } catch (err) {
      console.error("PDF Export failed:", err);
      setError("Failed to export PDF.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      {/* Hero Section */}
      <section className="text-center space-y-4">
        <h2 className="text-4xl md:text-5xl font-black">
          Fix bugs before they <br /> <span className="text-blue-500 italic">hit production.</span>
        </h2>
        <p className="text-foreground/60 max-w-2xl mx-auto">
          Paste your code snippet or a GitHub repository below and get instant, detailed feedback on bugs, 
          performance suggestions, and clear documentation generated by AI.
        </p>
      </section>

      {/* Input Section */}
      <section className="glass rounded-2xl overflow-hidden p-6 space-y-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setMode("manual")}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-all",
              mode === "manual" ? "bg-white/10 text-white" : "text-foreground/40 hover:text-foreground/80"
            )}
          >
            Manual Snippet
          </button>
          <button
            onClick={() => setMode("github")}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-all",
              mode === "github" ? "bg-white/10 text-white" : "text-foreground/40 hover:text-foreground/80"
            )}
          >
            GitHub Repository
          </button>
        </div>

        {mode === "github" ? (
          <div className="space-y-4">
            <div className="relative">
              <Github className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/40" size={18} />
              <input
                type="text"
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
                placeholder="https://github.com/facebook/react"
                className="w-full bg-black/40 border border-border rounded-xl p-4 pl-12 font-mono text-sm focus:ring-2 focus:ring-blue-500/50 outline-none transition-all placeholder:text-foreground/20"
              />
            </div>
            
            <div className="flex justify-between items-center mt-6">
              <button
                onClick={handleReset}
                className="text-foreground/40 hover:text-red-400 text-sm font-medium transition-all flex items-center gap-2"
              >
                <Star size={14} className="rotate-45" />
                Reset
              </button>
              
              <button
                onClick={handleRepoReview}
                disabled={loading || !githubUrl.trim()}
                className={cn(
                  "flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-bold transition-all",
                  loading || !githubUrl.trim()
                    ? "bg-muted text-foreground/20 cursor-not-allowed" 
                    : "bg-blue-600 hover:bg-blue-500 hover:shadow-lg hover:shadow-blue-500/20 active:scale-95 text-white"
                )}
              >
                {loading ? <Loader2 className="animate-spin" size={18} /> : <Github size={18} />}
                {loading ? "Analyzing Entire Repository..." : "Review Active Repository"}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-foreground/60">
                <Code2 size={20} />
                <span className="text-sm font-medium">Source Code</span>
              </div>
            </div>
            <textarea
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                setDetectedLang(detectLanguage(e.target.value));
              }}
              placeholder="Paste your Javascript, Python, or React code here..."
              className="w-full h-80 bg-black/40 border border-border rounded-xl p-4 font-mono text-sm focus:ring-2 focus:ring-blue-500/50 outline-none transition-all placeholder:text-foreground/20 resize-none"
            />
          </div>
        )}

        <div className="flex justify-between items-center">
          <button
            onClick={handleReset}
            className="text-foreground/40 hover:text-red-400 text-sm font-medium transition-all flex items-center gap-2"
          >
            <Star size={14} className="rotate-45" />
            Reset
          </button>
          <div className="flex gap-4">
            <button
              onClick={() => handleCopy(code)}
              className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-bold transition-all"
            >
              Copy Code
            </button>
            <button
              onClick={handleReview}
              disabled={loading || !code.trim()}
              className={cn(
                "flex items-center gap-2 px-8 py-4 rounded-xl font-bold transition-all",
                loading || !code.trim() 
                  ? "bg-muted text-foreground/20 cursor-not-allowed" 
                  : "bg-blue-600 hover:bg-blue-500 hover:shadow-lg hover:shadow-blue-500/20 active:scale-95 text-white"
              )}
            >
              {loading ? <Loader2 className="animate-spin" /> : <Send size={18} />}
              {loading ? "Analyzing..." : "Review Code"}
            </button>
          </div>
        </div>
      </section>

      {/* Error State */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-500">
          <AlertCircle size={20} />
          <p className="font-medium">{error}</p>
        </div>
      )}

      {/* Results Section */}
      {results && (
        <section className="glass rounded-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-500">
          <div className="p-8" id="review-results">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
                  <Star size={24} fill={results.score ? "currentColor" : "none"} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-2xl font-bold">Analysis Results</h3>
                    {results.isMock && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 text-[10px] font-bold uppercase tracking-wider border border-amber-500/20">
                        Demo Mode
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-foreground/40">
                    {results.isMock ? "Simulated review (API Error)" : "Powered by AI"}
                  </p>
                </div>
              </div>
              <button
                onClick={exportToPDF}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-bold transition-all"
              >
                <Download size={16} />
                Export PDF Report
              </button>
            </div>

            <div className="space-y-12">
              {/* Score & Overview Section */}
              <div className="flex flex-col items-center justify-center py-10 px-4 space-y-6 bg-black/20 rounded-2xl border border-white/5">
                <p className="text-foreground/60 font-bold tracking-[0.2em] uppercase text-xs">Code Quality Score</p>
                <div className="relative flex items-center justify-center">
                  <div className="absolute inset-0 bg-blue-500 blur-3xl opacity-20 animate-pulse"></div>
                  <div className="text-8xl font-black text-blue-500 relative">
                    {results.score}
                    <span className="text-3xl text-foreground/40 font-normal">/100</span>
                  </div>
                </div>
                {results.documentation && (
                  <p className="text-center text-foreground/80 max-w-3xl text-sm leading-relaxed mt-4">
                    {results.documentation}
                  </p>
                )}
              </div>

              {/* Issues Section */}
              <div className="space-y-6">
                <div className="flex items-center gap-3 text-red-500 pb-2 border-b border-white/5">
                  <Bug size={24} />
                  <h4 className="text-xl font-bold text-foreground">Issues Found</h4>
                </div>
                <div className="grid gap-4">
                  {results.issues && results.issues.length > 0 ? (
                    results.issues.map((issue, i) => (
                      <div key={i} className="flex flex-col sm:flex-row gap-4 p-5 rounded-xl bg-red-500/5 border border-red-500/10 text-foreground/80">
                        <div className="flex-shrink-0">
                          <span className="px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-red-500/20 text-red-400 border border-red-500/20">
                            {issue.type || "Issue"}
                          </span>
                        </div>
                        <p className="flex-1 text-sm leading-relaxed">{issue.description}</p>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12 text-foreground/40 bg-white/5 rounded-xl border border-white/5">No critical issues found! Excellent work.</div>
                  )}
                </div>
              </div>

              {/* Suggestions Section */}
              <div className="space-y-6">
                <div className="flex items-center gap-3 text-yellow-500 pb-2 border-b border-white/5">
                  <Lightbulb size={24} />
                  <h4 className="text-xl font-bold text-foreground">Suggestions</h4>
                </div>
                <div className="grid gap-4">
                  {results.suggestions && results.suggestions.length > 0 ? (
                    results.suggestions.map((sug, i) => (
                      <div key={i} className="flex gap-4 p-5 rounded-xl bg-yellow-500/5 border border-yellow-500/10 text-foreground/80">
                        <div className="mt-0.5 flex-shrink-0 text-yellow-500">
                          <CheckCircle2 size={18} />
                        </div>
                        <p className="flex-1 text-sm leading-relaxed">{sug}</p>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12 text-foreground/40 bg-white/5 rounded-xl border border-white/5">No major suggestions.</div>
                  )}
                </div>
              </div>

              {/* Improved Code Section */}
              {results.improvedCode && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/5">
                    <div className="flex items-center gap-3 text-green-500">
                      <Code2 size={24} />
                      <h4 className="text-xl font-bold text-foreground">Improved Code</h4>
                    </div>
                    <button
                      onClick={() => handleCopy(results.improvedCode)}
                      className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold transition-all"
                    >
                      Copy Code
                    </button>
                  </div>
                  <div className="bg-[#1E1E1E] rounded-xl overflow-hidden border border-white/10 shadow-2xl">
                    <div className="flex items-center px-4 py-3 bg-black/40 border-b border-white/5">
                      <div className="flex gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                        <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
                        <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
                      </div>
                      <span className="ml-4 text-xs font-mono text-foreground/40">{detectedLang}</span>
                    </div>
                    <SyntaxHighlighter
                      language={detectedLang}
                      style={vscDarkPlus}
                      customStyle={{
                        background: 'transparent',
                        padding: '1.5rem',
                        fontSize: '0.9rem',
                        lineHeight: '1.6',
                        margin: 0
                      }}
                    >
                      {results.improvedCode}
                    </SyntaxHighlighter>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
