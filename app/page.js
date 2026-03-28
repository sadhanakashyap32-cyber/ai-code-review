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

const TabButton = ({ active, onClick, icon: Icon, label }) => (
  <button
    onClick={onClick}
    className={cn(
      "flex items-center gap-2 px-6 py-3 border-b-2 transition-all duration-200",
      active 
        ? "border-blue-500 text-blue-500 bg-blue-500/5" 
        : "border-transparent text-foreground/40 hover:text-foreground/80 hover:bg-white/5"
    )}
  >
    <Icon size={18} />
    <span className="font-medium">{label}</span>
  </button>
);

export default function Home() {
  const [code, setCode] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("bugs");
  const [mode, setMode] = useState("manual"); // 'manual' | 'github'
  const [detectedLang, setDetectedLang] = useState("javascript");

  const handleFetchGithub = async () => {
    if (!githubUrl.trim()) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch("/api/github", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: githubUrl }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch GitHub content.");
      }
      
      setCode(data.content);
      setDetectedLang(detectLanguage(data.content, githubUrl));
      setMode("manual"); // Switch to manual after fetching
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

      // Rating
      pdf.setFontSize(14);
      pdf.setTextColor(0, 0, 0);
      pdf.text(`Overall Quality Rating: ${results.rating}/10`, margin, y);
      y += 10;

      // Documentation
      pdf.setFontSize(16);
      pdf.text("Project Overview", margin, y);
      y += 7;
      pdf.setFontSize(11);
      const docs = pdf.splitTextToSize(results.documentation, 170);
      pdf.text(docs, margin, y);
      y += (docs.length * 6) + 10;

      // Bugs
      if (results.bugs && results.bugs.length > 0) {
        pdf.setFontSize(16);
        pdf.setTextColor(244, 67, 54); // Red
        pdf.text("Critical Bugs", margin, y);
        y += 7;
        pdf.setFontSize(11);
        pdf.setTextColor(0, 0, 0);
        results.bugs.forEach((bug, i) => {
          const bugText = pdf.splitTextToSize(`${i+1}. ${bug}`, 170);
          pdf.text(bugText, margin, y);
          y += (bugText.length * 6);
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
          if (y > 270) { pdf.addPage(); y = 20; }
          pdf.text(sugText, margin, y);
          y += (sugText.length * 6);
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
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Hero Section */}
      <section className="text-center space-y-4">
        <h2 className="text-4xl md:text-5xl font-black">
          Fix bugs before they <br /> <span className="text-blue-500 italic">hit production.</span>
        </h2>
        <p className="text-foreground/60 max-w-2xl mx-auto">
          Paste your code snippet below and get instant, detailed feedback on bugs, 
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
            Manual Paste
          </button>
          <button
            onClick={() => setMode("github")}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-all",
              mode === "github" ? "bg-white/10 text-white" : "text-foreground/40 hover:text-foreground/80"
            )}
          >
            GitHub URL
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
                placeholder="https://github.com/user/repo/blob/main/index.js"
                className="w-full bg-black/40 border border-border rounded-xl p-4 pl-12 font-mono text-sm focus:ring-2 focus:ring-blue-500/50 outline-none transition-all placeholder:text-foreground/20"
              />
            </div>
            <button
              onClick={handleFetchGithub}
              disabled={loading || !githubUrl.trim()}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-bold bg-white/5 hover:bg-white/10 border border-white/10 transition-all text-white disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" /> : <Link size={18} />}
              Fetch Code Content
            </button>
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
          <div className="border-b border-border flex overflow-x-auto no-scrollbar">
            <TabButton 
              active={activeTab === "bugs"} 
              onClick={() => setActiveTab("bugs")} 
              icon={Bug} 
              label="Bugs" 
            />
            <TabButton 
              active={activeTab === "suggestions"} 
              onClick={() => setActiveTab("suggestions")} 
              icon={Lightbulb} 
              label="Suggestions" 
            />
            <TabButton 
              active={activeTab === "documentation"} 
              onClick={() => setActiveTab("documentation")} 
              icon={FileText} 
              label="Docs" 
            />
            <TabButton 
              active={activeTab === "rating"} 
              onClick={() => setActiveTab("rating")} 
              icon={Star} 
              label="Rating" 
            />
          </div>

          <div className="p-8" id="review-results">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
                  <Star size={20} fill={results.rating ? "currentColor" : "none"} />
                </div>
                <div>
                  <h3 className="font-bold">Analysis Results</h3>
                  <p className="text-xs text-foreground/40">Powered by OpenAI gpt-4o-mini</p>
                </div>
              </div>
              <button
                onClick={exportToPDF}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold transition-all"
              >
                <Download size={14} />
                Export PDF
              </button>
            </div>
            {activeTab === "bugs" && (
              <div className="space-y-4">
                {results.bugs && results.bugs.length > 0 ? (
                  results.bugs.map((bug, i) => (
                    <div key={i} className="flex gap-4 p-4 rounded-xl bg-red-500/5 border border-red-500/10 text-foreground/80">
                      <div className="mt-1 flex-shrink-0 text-red-500 font-bold">#{i+1}</div>
                      <p>{bug}</p>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 text-foreground/40">No critical bugs found! Good job.</div>
                )}
              </div>
            )}

            {activeTab === "suggestions" && (
              <div className="space-y-4">
                {results.suggestions && results.suggestions.length > 0 ? (
                  results.suggestions.map((sug, i) => (
                    <div key={i} className="flex gap-4 p-4 rounded-xl bg-blue-500/5 border border-blue-500/10 text-foreground/80 group">
                      <div className="mt-1 flex-shrink-0 text-blue-500">
                        <CheckCircle2 size={18} />
                      </div>
                      <p className="flex-1">{sug}</p>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 text-foreground/40">No major suggestions for improvement.</div>
                )}
              </div>
            )}

            {activeTab === "documentation" && (
              <div className="prose prose-invert max-w-none">
                <div className="p-6 rounded-xl bg-white/5 border border-border">
                  <div className="flex justify-between items-start mb-4">
                    <p className="text-foreground/80 leading-relaxed whitespace-pre-wrap flex-1">
                      {results.documentation}
                    </p>
                    <button
                      onClick={() => handleCopy(results.documentation)}
                      className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-foreground/40 hover:text-white transition-all ml-4"
                      title="Copy Docs"
                    >
                      <Download size={14} className="rotate-180" />
                    </button>
                  </div>
                  <div className="bg-black/40 rounded-lg overflow-hidden border border-border">
                    <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-border">
                      <span className="text-xs font-mono text-foreground/40">Analyzed Code</span>
                    </div>
                    <SyntaxHighlighter
                      language={detectedLang}
                      style={vscDarkPlus}
                      customStyle={{
                        background: 'transparent',
                        padding: '1.5rem',
                        fontSize: '0.85rem',
                        lineHeight: '1.6',
                      }}
                    >
                      {code}
                    </SyntaxHighlighter>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "rating" && (
              <div className="flex flex-col items-center justify-center py-12 space-y-6">
                <div className="relative flex items-center justify-center">
                  <div className="absolute inset-0 bg-blue-500 blur-3xl opacity-20 animate-pulse"></div>
                  <div className="text-8xl font-black text-blue-500 relative">
                    {results.rating}
                    <span className="text-2xl text-foreground/40 font-normal">/10</span>
                  </div>
                </div>
                <div className="flex gap-1">
                  {[...Array(10)].map((_, i) => (
                    <Star 
                      key={i} 
                      size={20} 
                      className={cn(
                        "transition-all",
                        i < results.rating ? "text-yellow-500 fill-yellow-500" : "text-foreground/10"
                      )} 
                    />
                  ))}
                </div>
                <p className="text-foreground/60 font-medium tracking-wide uppercase text-xs">Overall Code Quality</p>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
