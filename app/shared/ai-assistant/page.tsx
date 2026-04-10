"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import BottomNavBar, { TEACHER_NAV_ITEMS } from "@/components/layout/BottomNavBar";

// ─── Types & Mock Data ────────────────────────────────────────────────────────

const SCHOOL_CONTEXT = {
  name: "EliteSchool",
  term: "Term 2, 2025",
  role: "Teacher", // will come from auth in Phase 2
};

type MessageRole = "user" | "assistant";

type ChatMessage = {
  id: string;
  role: MessageRole;
  text: string;
  time: string;
  loading?: boolean;
};

const SUGGESTED_PROMPTS = [
  { label: "Summarise class performance",   icon: "bar_chart",    text: "Summarise the overall class performance for Physics this term." },
  { label: "Draft parent message",          icon: "edit_note",    text: "Draft a professional message to a parent about their child's improvement in Mathematics." },
  { label: "Flag at-risk students",         icon: "warning",      text: "Which students are at risk based on recent attendance and grade trends?" },
  { label: "Generate lesson plan",          icon: "menu_book",    text: "Generate a 45-minute lesson plan for introducing Newton's Laws of Motion to Senior 4." },
  { label: "Write term report comment",     icon: "history_edu",  text: "Write a positive but constructive end-of-term report comment for a student who scored 74% average." },
  { label: "Explain a concept simply",      icon: "lightbulb",    text: "Explain the concept of osmosis in simple terms suitable for a Senior 2 student." },
];

const MOCK_RESPONSES: Record<string, string> = {
  default: "I'm your EliteSchool AI Assistant. I can help you summarise student performance, draft communications, generate lesson plans, and more. What would you like help with today?",
  "class performance": "Based on Term 2 data for Physics & Applied Sciences: the class average is 78%, with 3 students achieving distinction (above 85%). 4 students are currently below the pass mark and may need additional support. Brian Nakato shows the strongest improvement at +7 points from Term 1.",
  "parent message": "Dear Mr./Mrs. [Parent Name],\n\nI hope this message finds you well. I am pleased to share that [Student Name] has shown commendable improvement in Mathematics this term. Their dedication and hard work are clearly reflected in their recent assessment results.\n\nPlease do not hesitate to reach out if you would like to discuss their progress further.\n\nWarm regards,\nProf. Namukasa",
  "at-risk": "Based on current records, 3 students warrant attention:\n\n• David Mukasa — 4 absences this month, grade dropped from B to D\n• Irene Atim — 2 consecutive failed assessments in Biology\n• Grace Nambi — marked late 6 times; engagement declining\n\nI recommend scheduling brief one-on-one check-ins with each student.",
  "lesson plan": "**Lesson Plan: Newton's Laws of Motion**\nClass: Senior 4 | Duration: 45 minutes\n\n**Objective:** Students will identify and apply Newton's three laws.\n\n**Minutes 0–8:** Starter activity — push/pull demonstration with everyday objects.\n**Minutes 8–20:** Direct instruction — introduce each law with visual examples.\n**Minutes 20–32:** Guided practice — class solves three scenario-based problems.\n**Minutes 32–42:** Group discussion — students relate laws to sports or daily life.\n**Minutes 42–45:** Exit ticket — one sentence per law in students' own words.",
};

function getMockResponse(input: string): string {
  const lower = input.toLowerCase();
  if (lower.includes("performance") || lower.includes("summar")) return MOCK_RESPONSES["class performance"];
  if (lower.includes("parent") || lower.includes("message") || lower.includes("draft")) return MOCK_RESPONSES["parent message"];
  if (lower.includes("risk") || lower.includes("flag")) return MOCK_RESPONSES["at-risk"];
  if (lower.includes("lesson") || lower.includes("plan")) return MOCK_RESPONSES["lesson plan"];
  return MOCK_RESPONSES["default"];
}

// ─── Subcomponents ────────────────────────────────────────────────────────────

function CustomTopAppBar() {
  return (
    <header
      className="fixed top-0 w-full z-40"
      style={{
        background: "rgba(244,242,237,0.88)",
        backdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(193,199,203,0.2)",
      }}
    >
      <div className="flex justify-between items-center px-6 py-4 max-w-5xl mx-auto">
        <div className="flex items-center gap-4">
          <button
            className="w-10 h-10 rounded-[10px] flex flex-col justify-center items-center gap-[3px] active:scale-95 transition-transform"
            style={{ background: "#2B4D5A" }}
          >
            <span className="w-5 h-[2px] bg-white rounded-full" />
            <span className="w-[14px] h-[2px] bg-white rounded-full self-start ml-[3px]" />
            <span className="w-5 h-[2px] bg-white rounded-full" />
          </button>
          <span
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontWeight: 500,
              fontSize: "1.2rem",
              color: "#141416",
              letterSpacing: "-0.01em",
            }}
          >
            EliteSchool OS
          </span>
        </div>
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-medium select-none border-2"
          style={{
            background: "#123643",
            borderColor: "rgba(43,77,90,0.3)",
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          PN
        </div>
      </div>
    </header>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AIAssistantPage() {
  const router = useRouter();
  
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "intro",
      role: "assistant",
      text: MOCK_RESPONSES["default"],
      time: new Date().toLocaleTimeString("en-GB", { hour:"2-digit", minute:"2-digit" }),
    }
  ]);
  const [draft, setDraft] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function typewriterAppend(id: string, fullText: string) {
    let i = 0;
    const interval = setInterval(() => {
      i += 3; // characters per tick — adjust speed
      setMessages(prev => prev.map(m =>
        m.id === id ? { ...m, text: fullText.slice(0, i), loading: i < fullText.length } : m
      ));
      if (i >= fullText.length) clearInterval(interval);
    }, 16);
  }

  async function handleSend(text?: string) {
    const input = (text ?? draft).trim();
    if (!input || isLoading) return;
    setDraft("");
    setIsLoading(true);

    const userMsg: ChatMessage = {
      id: `u${new Date().getTime()}`,
      role: "user",
      text: input,
      time: new Date().toLocaleTimeString("en-GB", { hour:"2-digit", minute:"2-digit" }),
    };

    const assistantId = `a${new Date().getTime() + 1}`;
    const assistantMsg: ChatMessage = {
      id: assistantId,
      role: "assistant",
      text: "",
      time: new Date().toLocaleTimeString("en-GB", { hour:"2-digit", minute:"2-digit" }),
      loading: true,
    };

    setMessages(prev => [...prev, userMsg, assistantMsg]);

    // Simulate network delay then typewriter
    await new Promise(r => setTimeout(r, 700));
    setIsLoading(false);

    const response = getMockResponse(input);
    typewriterAppend(assistantId, response);
  }

  return (
    <div className="flex min-h-screen mesh-gradient-bg">
      <CustomTopAppBar />
      
      <div className="pt-20 flex flex-col w-full" style={{ height:"100dvh" }}>
        
        {/* Section 1 — Page hero (shown above chat when no messages yet, collapses after first message) */}
        {messages.length <= 1 && (
          <section className="px-6 pt-4 pb-2 max-w-3xl mx-auto w-full">
            <h1 className="text-4xl md:text-5xl font-light italic text-[#2B4D5A]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
              AI Assistant
            </h1>
            <p className="text-sm font-light text-[#5f5e60] mt-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              {SCHOOL_CONTEXT.name} · {SCHOOL_CONTEXT.term} · {SCHOOL_CONTEXT.role}
            </p>
          </section>
        )}

        {/* Section 2 — Suggested prompts (shown when messages.length <= 1) */}
        {messages.length <= 1 && (
          <section className="px-6 pb-4 max-w-3xl mx-auto w-full">
            <p className="text-[9px] text-[#72787b] uppercase tracking-widest mb-3" style={{ fontFamily: "'DM Mono', monospace" }}>
              Suggested
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {SUGGESTED_PROMPTS.map((p, i) => (
                <button key={i}
                  onClick={() => handleSend(p.text)}
                  className="flex items-start gap-2 p-4 rounded-2xl text-left transition-all hover:scale-[1.02] active:scale-[0.98]"
                  style={{
                    background: "rgba(255,255,255,0.65)",
                    border: "1px solid rgba(193,199,203,0.15)",
                    boxShadow: "0 2px 12px rgba(20,20,22,0.04)",
                  }}>
                  <span className="material-symbols-outlined text-[18px] flex-shrink-0 mt-0.5"
                    style={{ color:"#2B4D5A" }}>{p.icon}</span>
                  <span className="text-xs text-[#1b1c19] leading-snug" style={{ fontFamily: "'DM Sans', sans-serif" }}>{p.label}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Section 3 — Messages scroll area */}
        <div className="flex-1 overflow-y-auto px-6 py-4 max-w-3xl mx-auto w-full space-y-4 no-scrollbar">
          {messages.map((msg, i) => {
            const isUser = msg.role === "user";
            return (
              <motion.div key={msg.id}
                initial={{ opacity:0, y:10 }}
                animate={{ opacity:1, y:0 }}
                transition={{ duration:0.3, ease:[0.22,1,0.36,1] }}
                className={`flex ${isUser ? "justify-end" : "justify-start"} items-end gap-2`}>

                {/* Assistant avatar — only for assistant messages */}
                {!isUser && (
                  <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center mb-1"
                    style={{ background:"#123643" }}>
                    <span className="material-symbols-outlined text-[16px]"
                      style={{ color:"#9abdcc" }}>auto_awesome</span>
                  </div>
                )}

                <div className={`max-w-[80%] ${isUser ? "items-end" : "items-start"} flex flex-col gap-1`}>
                  <div className="px-4 py-3 rounded-2xl"
                    style={{
                      background: isUser ? "#2B4D5A" : "rgba(255,255,255,0.75)",
                      border: isUser ? "none" : "1px solid rgba(193,199,203,0.15)",
                      borderRadius: isUser
                        ? "1.5rem 1.5rem 0.25rem 1.5rem"
                        : "1.5rem 1.5rem 1.5rem 0.25rem",
                      boxShadow: "0 2px 12px rgba(20,20,22,0.06)",
                    }}>
                    {/* Render newlines as <br> — split on \n */}
                    <p className="text-sm leading-relaxed"
                      style={{ color: isUser ? "#ffffff" : "#1b1c19",
                               whiteSpace:"pre-wrap",
                               fontFamily:"'DM Sans', sans-serif" }}>
                      {msg.text}
                      {/* Blinking cursor while loading */}
                      {msg.loading && (
                        <span className="inline-block w-0.5 h-4 ml-0.5 align-middle animate-pulse"
                          style={{ background: "#2B4D5A" }} />
                      )}
                    </p>
                  </div>
                  <span className="text-[9px] text-[#72787b]"
                    style={{ fontFamily:"'DM Mono', monospace", alignSelf: isUser ? "flex-end" : "flex-start" }}>
                    {msg.time}
                  </span>
                </div>

              </motion.div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Section 4 — Compose bar (fixed above bottom nav) */}
        <div className="pb-[88px] px-6 max-w-3xl mx-auto w-full">
          <div className="flex items-center gap-3 p-2 rounded-2xl"
            style={{
              background: "rgba(255,255,255,0.8)",
              backdropFilter: "blur(16px)",
              border: "1px solid rgba(193,199,203,0.2)",
              boxShadow: "0 4px 24px rgba(20,20,22,0.06)",
            }}>
            <input
              ref={inputRef}
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()}
              placeholder="Ask anything about your school data…"
              disabled={isLoading}
              className="flex-1 h-11 bg-transparent px-3 text-sm outline-none"
              style={{ fontFamily:"'DM Sans', sans-serif", color:"#1b1c19" }}
            />
            <button
              onClick={() => handleSend()}
              disabled={!draft.trim() || isLoading}
              className="w-11 h-11 rounded-xl flex items-center justify-center transition-all active:scale-90 disabled:opacity-40"
              style={{ background: draft.trim() && !isLoading ? "#2B4D5A" : "#e4e2dd" }}>
              <span className="material-symbols-outlined text-[20px]"
                style={{ color: draft.trim() && !isLoading ? "#ffffff" : "#72787b" }}>
                {isLoading ? "hourglass_empty" : "send"}
              </span>
            </button>
          </div>

          {/* Disclaimer */}
          <p className="text-center mt-2 text-[10px]"
            style={{ fontFamily:"'DM Mono', monospace", color:"#B5A898" }}>
            AI responses are illustrative. Verify before acting on school data.
          </p>
        </div>

      </div>

      <BottomNavBar items={TEACHER_NAV_ITEMS} activeHref="" onNavigate={(href) => router.push(href)} />
    </div>
  );
}
