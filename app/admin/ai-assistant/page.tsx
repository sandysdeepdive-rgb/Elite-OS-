'use client';
import { useState } from "react";
import AuthGate from "@/components/layout/AuthGate";
import AdminSidebar from "@/components/layout/AdminSidebar";
import TopAppBar from "@/components/layout/TopAppBar";
import BottomNavBar, { ADMIN_NAV_ITEMS } from "@/components/layout/BottomNavBar";
import GlassCard from "@/components/ui/GlassCard";
import EliteButton from "@/components/ui/EliteButton";
import { useSchoolData, useCollection } from "@/lib/hooks/useSchoolData";

export default function AdminAIAssistant() {
  return (
    <AuthGate requiredRole="admin">
      <AIAssistantContent />
    </AuthGate>
  );
}

function AIAssistantContent() {
  const { schoolId } = useSchoolData();
  const { data: students } = useCollection(schoolId, "students");
  const { data: teachers } = useCollection(schoolId, "teachers");
  const { data: fees }     = useCollection(schoolId, "fees");
  const { data: reports }  = useCollection(schoolId, "reports");

  const [query, setQuery]       = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading]   = useState(false);
  const [history, setHistory]   = useState<
    { role:"user"|"assistant"; content:string }[]
  >([]);

  const buildContext = () => {
    const feesPaid = (fees as {status:string}[])
      .filter(f => f.status === "paid").length;
    const feeRate = fees.length > 0
      ? Math.round((feesPaid / fees.length) * 100) : 0;
    const avgAttendance = students.length > 0
      ? Math.round(
          (students as {attendance?:string}[])
            .reduce((s,st) =>
              s + parseInt(st.attendance || "0"), 0
            ) / students.length
        ) : 0;
    return `
      School data summary:
      - Total students: ${students.length}
      - Total teachers: ${teachers.length}
      - Fee collection rate: ${feeRate}%
      - Average attendance: ${avgAttendance}%
      - Total grade records: ${reports.length}
    `;
  };

  const handleAsk = async () => {
    if (!query.trim()) return;
    setLoading(true);
    const userMessage = query.trim();
    setQuery("");
    const newHistory = [
      ...history,
      { role:"user" as const, content: userMessage }
    ];
    setHistory(newHistory);

    try {
      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY });
      const responseStream = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          { role: 'user', parts: [{ text: buildContext() }] },
          ...history.map(h => ({ role: h.role, parts: [{ text: h.content }] })),
          { role: 'user', parts: [{ text: userMessage }] }
        ],
        config: {
          systemInstruction: `You are an intelligent school management
      assistant for EliteSchool's OS, a premium school management
      system used in Uganda. You help school administrators understand
      their school's performance data and make informed decisions.
      Be concise, professional, and helpful. Use Ugandan context
      where relevant (UGX currency, Uganda curriculum S.1-S.6,
      Uganda grading system D1-F9).`,
          temperature: 0.7,
        }
      });
      if (!responseStream) {
        setResponse("I could not generate a response. Please try again.");
        return;
      }

      const aiResponse = typeof responseStream.text === 'function'
        ? responseStream.text()
        : "I could not generate a response. Please try again.";
      setResponse(aiResponse);
      setHistory([
        ...newHistory,
        { role:"assistant", content: aiResponse }
      ]);
    } catch {
      setResponse("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const QUICK_PROMPTS = [
    "Summarize this term's performance",
    "Which students are at risk of failing?",
    "What is the fee collection status?",
    "How is teacher utilization this term?",
    "Give me an overview of attendance trends",
  ];

  return (
    <div className="flex min-h-screen mesh-gradient-bg">
      <AdminSidebar activeHref="/admin/ai-assistant" />
      <div className="flex-1 flex flex-col min-w-0 pb-32 lg:pb-8">
        <TopAppBar title="AI Assistant"
          subtitle="Academic Intelligence" />
        <main className="flex-1 px-6 py-8
                         max-w-3xl mx-auto w-full space-y-6">

          {/* Header card */}
          <GlassCard showOrb>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl
                              bg-primary-container
                              flex items-center justify-center
                              flex-shrink-0">
                <span className="material-symbols-outlined
                                 text-[24px] text-white">
                  auto_awesome
                </span>
              </div>
              <div>
                <h2 className="font-headline text-2xl font-light
                               italic text-primary">
                  School Intelligence
                </h2>
                <p className="font-body text-sm
                              text-on-surface-variant font-light">
                  Ask anything about your school&apos;s performance,
                  fees, attendance, or students.
                </p>
              </div>
            </div>
          </GlassCard>

          {/* Quick prompts */}
          <div>
            <p className="font-label text-[10px] uppercase
                          tracking-[0.15em] text-outline mb-3">
              Quick Questions
            </p>
            <div className="flex gap-2 flex-wrap">
              {QUICK_PROMPTS.map(p => (
                <button key={p}
                  onClick={() => { setQuery(p); }}
                  className="px-4 py-2 rounded-full
                             bg-surface-container-low
                             border border-outline-variant/30
                             font-body text-xs text-on-surface-variant
                             hover:bg-primary-container/10
                             hover:border-primary-container/30
                             hover:text-primary-container
                             transition-all">
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Conversation history */}
          {history.length > 0 && (
            <GlassCard padding="p-4">
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {history.map((msg, i) => (
                  <div key={i}
                    className={`flex gap-3
                      ${msg.role === "user"
                        ? "flex-row-reverse" : ""}`}>
                    <div className={`w-8 h-8 rounded-full
                                     flex-shrink-0
                                     flex items-center justify-center
                      ${msg.role === "user"
                        ? "bg-primary-container"
                        : "bg-surface-container-highest"}`}>
                      <span className={`material-symbols-outlined
                                       text-[16px]
                        ${msg.role === "user"
                          ? "text-white" : "text-primary-container"}`}>
                        {msg.role === "user" ? "person" : "auto_awesome"}
                      </span>
                    </div>
                    <div className={`flex-1 p-3 rounded-xl
                      ${msg.role === "user"
                        ? "bg-primary-container/10 text-right"
                        : "bg-surface-container-low"}`}>
                      <p className="font-body text-sm
                                    text-on-surface font-light
                                    leading-relaxed whitespace-pre-wrap">
                        {msg.content}
                      </p>
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full
                                    bg-surface-container-highest
                                    flex items-center justify-center">
                      <span className="material-symbols-outlined
                                       text-[16px] text-primary-container
                                       animate-spin">
                        sync
                      </span>
                    </div>
                    <div className="flex-1 p-3 rounded-xl
                                    bg-surface-container-low">
                      <p className="font-body text-sm text-outline
                                    font-light">
                        Thinking...
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </GlassCard>
          )}

          {/* Input area */}
          <GlassCard padding="p-4">
            <div className="flex gap-3">
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleAsk();
                  }
                }}
                placeholder="Ask about students, fees, attendance..."
                className="flex-1 bg-surface-container-low
                           rounded-full px-5 py-3
                           font-body text-sm text-on-surface
                           font-light placeholder:text-outline
                           border-none focus:ring-2
                           focus:ring-primary-container
                           focus:outline-none"
              />
              <button
                onClick={handleAsk}
                disabled={loading || !query.trim()}
                className="w-12 h-12 rounded-full
                           bg-primary-container text-white
                           flex items-center justify-center
                           hover:opacity-90 active:scale-95
                           transition-all disabled:opacity-40
                           flex-shrink-0">
                <span className="material-symbols-outlined text-[20px]">
                  send
                </span>
              </button>
            </div>
          </GlassCard>

        </main>
      </div>
      <BottomNavBar items={ADMIN_NAV_ITEMS}
        activeHref="/admin/ai-assistant" />
    </div>
  );
}
