"use client";

import { useState, useMemo, useEffect } from "react";
import { toast } from "sonner";
import AdminSidebar from "@/components/layout/AdminSidebar";
import TopAppBar from "@/components/layout/TopAppBar";
import BottomNavBar, { ADMIN_NAV_ITEMS } from "@/components/layout/BottomNavBar";
import GlassCard from "@/components/ui/GlassCard";
import EliteButton from "@/components/ui/EliteButton";
import Badge from "@/components/ui/Badge";
import DataTable from "@/components/ui/DataTable";
import { useSchoolData, useCollection } from "@/lib/hooks/useSchoolData";
import { collection, query, where, getDocs, doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { getTermFee, DEFAULT_FEE_STRUCTURE, FeeStructure } from "@/lib/fees";
import Link from "next/link";
import { useAuthGuard } from "@/lib/hooks/useAuthGuard";

interface Student {
  id: string;
  name: string;
  class: string;
}

interface FeeRecord {
  id: string;
  studentId: string;
  term: string;
  academicYear: string;
}

export default function FeeInitializationPage() {
  useAuthGuard("admin");
  const { schoolId } = useSchoolData();
  const [term, setTerm] = useState("Term 1");
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [feeStructure, setFeeStructure] = useState<FeeStructure>(DEFAULT_FEE_STRUCTURE);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);

  const { data: students, loading: studentsLoading } = useCollection<Student>(schoolId, "students");
  // We need to fetch fees for the specific term/year. useCollection with schoolId, "fees" fetches all.
  // We might want to filter it manually or use a custom query.
  const { data: allFees, loading: feesLoading } = useCollection<FeeRecord>(schoolId, "fees");

  useEffect(() => {
    if (!schoolId) return;
    const fetchFeeStructure = async () => {
      try {
        const feeDoc = await getDoc(doc(db, "schools", schoolId, "settings", "feeStructure"));
        const generalDoc = await getDoc(doc(db, "schools", schoolId, "settings", "general"));

        if (feeDoc.exists()) {
          const data = feeDoc.data();
          setFeeStructure({
            senior1_2: data.senior1_2 || DEFAULT_FEE_STRUCTURE.senior1_2,
            senior3_4: data.senior3_4 || DEFAULT_FEE_STRUCTURE.senior3_4,
            senior5_6: data.senior5_6 || DEFAULT_FEE_STRUCTURE.senior5_6,
          });
        } else if (generalDoc.exists()) {
          const data = generalDoc.data();
          if (data.feeStructure && Array.isArray(data.feeStructure)) {
            setFeeStructure({
              senior1_2: data.feeStructure.find((t: { level: string; amount: number }) => t.level.includes("1 & 2"))?.amount || DEFAULT_FEE_STRUCTURE.senior1_2,
              senior3_4: data.feeStructure.find((t: { level: string; amount: number }) => t.level.includes("3 & 4"))?.amount || DEFAULT_FEE_STRUCTURE.senior3_4,
              senior5_6: data.feeStructure.find((t: { level: string; amount: number }) => t.level.includes("5 & 6"))?.amount || DEFAULT_FEE_STRUCTURE.senior5_6,
            });
          }
        }

        if (generalDoc.exists()) {
          const data = generalDoc.data();
          if (data.termSettings) {
             setTerm(data.termSettings.currentTerm || "Term 1");
             setYear(data.termSettings.academicYear || new Date().getFullYear().toString());
          }
        }
      } catch {
        toast.error("Could not load fee structure. Using default values.");
      }
    };
    fetchFeeStructure();
  }, [schoolId]);

  const previewData = useMemo(() => {
    if (!students.length) return [];
    
    return students.map(student => {
      const existing = allFees.find(f => f.studentId === student.id && f.term === term && f.academicYear === year);
      const expectedFee = getTermFee(student.class, feeStructure);
      
      return {
        ...student,
        expectedFee,
        status: existing ? "Exists" : "To Create",
        feeExists: !!existing
      };
    });
  }, [students, allFees, term, year, feeStructure]);

  const toCreate = useMemo(() => previewData.filter(d => !d.feeExists), [previewData]);
  const totalExpected = useMemo(() => toCreate.reduce((sum, d) => sum + d.expectedFee, 0), [toCreate]);

  const handleGenerate = async () => {
    if (!schoolId || !toCreate.length) return;
    
    setIsGenerating(true);
    setProgress(0);
    let createdCount = 0;
    
    const chunks = [];
    for (let i = 0; i < toCreate.length; i += 10) {
      chunks.push(toCreate.slice(i, i + 10));
    }

    try {
      for (const chunk of chunks) {
        await Promise.all(chunk.map(async (student) => {
          // Use deterministic ID to prevent duplicates for same term/year/student
          const feeId = `${student.id}__${term.replace(/\s+/g, "")}__${year}`;
          await setDoc(doc(db, "schools", schoolId, "fees", feeId), {
            studentId: student.id,
            studentName: student.name,
            class: student.class,
            termFee: student.expectedFee,
            amountPaid: 0,
            balance: student.expectedFee,
            status: "unpaid",
            term: term,
            academicYear: year,
            createdAt: serverTimestamp()
          });
          createdCount++;
        }));
        setProgress(Math.round((createdCount / toCreate.length) * 100));
      }
      
      toast.success(`${createdCount} fee records created for ${term}, ${year}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error("Batch creation error:", message);
      toast.error(
        createdCount > 0
          ? `${createdCount} of ${toCreate.length} records created. Some failed — please try again.`
          : "Fee record generation failed. Please try again."
      );
    } finally {
      setIsGenerating(false);
      // Small delay so user sees 100% before it resets
      setTimeout(() => setProgress(0), 1500);
    }
  };

  return (
    <div className="flex min-h-screen mesh-gradient-bg font-body">
      <AdminSidebar activeHref="/admin/fees" />
      <div className="flex-1 flex flex-col min-w-0 pb-32 lg:pb-8">
        <TopAppBar title="Fee Initialisation" subtitle="Bulk Fee Record Generation" />
        
        <main className="flex-1 px-6 py-8 max-w-5xl mx-auto w-full space-y-6">
          {/* Section 1: Navigation & Header */}
          <div className="flex items-center gap-4">
            <Link href="/admin/fees" className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center hover:bg-surface-container-high transition-colors">
              <span className="material-symbols-outlined text-[20px] text-primary">arrow_back</span>
            </Link>
            <div>
              <h1 className="font-headline text-3xl font-light italic text-primary">
                Bulk Initialisation
              </h1>
              <p className="font-label text-[10px] uppercase tracking-[0.15em] text-outline mt-1">
                Generate fee records for a new term
              </p>
            </div>
          </div>

          {/* Section 2: Configuration Panel */}
          <GlassCard padding="p-6" showOrb>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div>
                <label className="font-label text-[10px] uppercase tracking-[0.15em] text-outline block mb-2">Term</label>
                <select 
                  value={term} 
                  onChange={(e) => setTerm(e.target.value)}
                  className="w-full h-12 bg-surface-container-low rounded-xl px-4 font-body text-sm font-light border-none focus:ring-2 focus:ring-primary-container focus:outline-none"
                >
                  <option>Term 1</option>
                  <option>Term 2</option>
                  <option>Term 3</option>
                </select>
              </div>
              <div>
                <label className="font-label text-[10px] uppercase tracking-[0.15em] text-outline block mb-2">Academic Year</label>
                <select 
                  value={year} 
                  onChange={(e) => setYear(e.target.value)}
                  className="w-full h-12 bg-surface-container-low rounded-xl px-4 font-body text-sm font-light border-none focus:ring-2 focus:ring-primary-container focus:outline-none"
                >
                  <option>{new Date().getFullYear()}</option>
                  <option>{new Date().getFullYear() + 1}</option>
                </select>
              </div>
              <div className="p-4 bg-primary-container/5 rounded-2xl border border-primary-container/10">
                <p className="font-label text-[10px] uppercase tracking-[0.1em] text-primary-container mb-2">Expected Fees (UGX)</p>
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-outline">S.1 - S.2:</span>
                    <span className="font-medium text-primary">{feeStructure.senior1_2.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-outline">S.3 - S.4:</span>
                    <span className="font-medium text-primary">{feeStructure.senior3_4.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-outline">S.5 - S.6:</span>
                    <span className="font-medium text-primary">{feeStructure.senior5_6.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          </GlassCard>

          {!studentsLoading && students.length === 0 && (
            <GlassCard padding="p-12">
              <div className="flex flex-col items-center text-center gap-4">
                <span className="material-symbols-outlined text-[48px] text-outline">group_off</span>
                <h3 className="font-headline text-xl font-light text-on-surface">No students registered yet</h3>
                <p className="font-body text-sm text-on-surface-variant max-w-sm">
                  Add students to the registry before initialising fee records.
                </p>
                <Link href="/admin/students">
                  <EliteButton variant="outlined">Go to Student Registry</EliteButton>
                </Link>
              </div>
            </GlassCard>
          )}

          {/* Section 3: Preview Table */}
          <GlassCard padding="p-0 overflow-hidden">
            <div className="p-4 border-b border-outline-variant/20 flex items-center justify-between bg-surface-container-low/50">
              <h3 className="font-headline text-lg font-light italic text-primary">Preview: {term}, {year}</h3>
              <Badge variant="default">{previewData.length} Students found</Badge>
            </div>
            
            <DataTable
              columns={[
                { key: "name", label: "Student Name", render: (v) => <span className="font-body text-sm font-light text-on-surface">{String(v)}</span> },
                { key: "class", label: "Class", width: "100px", render: (v) => <Badge variant="default">{String(v)}</Badge> },
                { key: "expectedFee", label: "Expected Fee", align: "right", render: (v) => <span className="font-headline text-lg font-light text-primary">UGX {Number(v).toLocaleString()}</span> },
                { key: "status", label: "Record Status", width: "140px", render: (v) => (
                  <Badge variant={v === "Exists" ? "paid" : "partial"}>
                    {v === "Exists" ? "Already exists" : "Will be created"}
                  </Badge>
                )},
              ]}
              data={previewData}
              loading={studentsLoading || feesLoading}
              keyExtractor={(item) => item.id}
            />

            {/* Summary Bar */}
            <div className="p-6 bg-surface-container flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                <div className="flex flex-col">
                  <span className="font-label text-[9px] uppercase tracking-widest text-outline">Records to Generate</span>
                  <span className="font-headline text-2xl font-light text-primary">{toCreate.length}</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-label text-[9px] uppercase tracking-widest text-outline">Total Expected Revenue</span>
                  <span className="font-headline text-2xl font-light text-primary">UGX {totalExpected.toLocaleString()}</span>
                </div>
              </div>

              <div className="flex items-center gap-3 w-full md:w-auto">
                <Link href="/admin/fees">
                  <EliteButton variant="outlined">Cancel</EliteButton>
                </Link>
                <EliteButton 
                  variant="primary" 
                  className="min-w-[200px]"
                  disabled={!toCreate.length || isGenerating}
                  onClick={handleGenerate}
                  loading={isGenerating}
                >
                  {isGenerating ? `Creating... ${progress}%` : `Generate ${toCreate.length} Fee Records`}
                </EliteButton>
              </div>
            </div>
          </GlassCard>

          {isGenerating && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-inverse-surface/40 backdrop-blur-sm">
              <GlassCard className="w-full max-w-sm" padding="p-8">
                <div className="flex flex-col items-center text-center">
                  <div className="w-20 h-20 mb-6 relative">
                     <svg className="w-full h-full transform -rotate-90">
                        <circle cx="40" cy="40" r="36" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-surface-container" />
                        <circle cx="40" cy="40" r="36" stroke="currentColor" strokeWidth="4" fill="transparent" strokeDasharray={226.2} strokeDashoffset={226.2 * (1 - progress / 100)} className="text-primary-container transition-all duration-300" />
                     </svg>
                     <div className="absolute inset-0 flex items-center justify-center font-headline text-xl text-primary">{progress}%</div>
                  </div>
                  <h3 className="font-headline text-xl font-light text-on-surface mb-2">Generating Records</h3>
                  <p className="font-body text-sm text-on-surface-variant">Please wait, this may take a moment. Do not close this window.</p>
                </div>
              </GlassCard>
            </div>
          )}
        </main>
      </div>
      <BottomNavBar items={ADMIN_NAV_ITEMS} activeHref="/admin/fees" />
    </div>
  );
}
