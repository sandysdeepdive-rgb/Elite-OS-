"use client";

import { useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import AdminSidebar from "@/components/layout/AdminSidebar";
import TopAppBar from "@/components/layout/TopAppBar";
import BottomNavBar, { ADMIN_NAV_ITEMS } from "@/components/layout/BottomNavBar";
import GlassCard from "@/components/ui/GlassCard";
import EliteButton from "@/components/ui/EliteButton";
import MetricCard from "@/components/ui/MetricCard";
import DataTable from "@/components/ui/DataTable";
import Badge from "@/components/ui/Badge";
import CollectionErrorBanner from "@/components/ui/CollectionErrorBanner";
import { exportToExcel } from "@/lib/utils/importExport";
import { useSchoolData, useCollection } from "@/lib/hooks/useSchoolData";
import { generateReportCardPDF } from "@/lib/utils/generateReportCard";

const REPORT_TABS = [
  { label: "Overview", icon: "dashboard" },
  { label: "Attendance", icon: "fact_check" },
  { label: "Performance", icon: "grade" },
  { label: "Graphical", icon: "bar_chart" },
];

export default function AdminReportsPage() {
  const [activeTab, setActiveTab] = useState(0);
  const [generating, setGenerating] = useState(false);
  const { schoolId, schoolName, adminName } = useSchoolData();
  
  const { data: students, error: studentsError } = useCollection<any>(schoolId, "students");
  const { data: teachers, error: teachersError } = useCollection<any>(schoolId, "teachers");
  const { data: classes, error: classesError }  = useCollection<any>(schoolId, "classes");
  const { data: fees, error: feesError }     = useCollection<any>(schoolId, "fees");
  const { data: reports, error: reportsError } = useCollection<any>(schoolId, "reports");
  const { data: attendance, error: attendanceError } = useCollection<any>(schoolId, "attendance");

  const anyError = studentsError || teachersError || classesError || feesError || reportsError || attendanceError;

  const avgAttendance = students.length > 0
    ? Math.round(students.reduce((s, st) =>
        s + parseInt(st.attendance || "0"), 0
      ) / students.length) : 0;

  const feesPaid = fees.filter(f => f.status === "paid").length;
  const feeRate  = fees.length > 0
    ? Math.round((feesPaid / fees.length) * 100) : 0;

  const partialFees = fees.filter(f => f.status === "partial").length;
  const unpaidFees = fees.filter(f => f.status === "unpaid").length;
  const partialRate = fees.length > 0 ? Math.round((partialFees / fees.length) * 100) : 0;
  const unpaidRate = fees.length > 0 ? Math.round((unpaidFees / fees.length) * 100) : 0;

  const presentToday = students.length > 0 ? Math.round(students.length * (avgAttendance / 100)) : 0;
  const absentToday = students.length - presentToday;

  const handleExportExcel = () => {
    const reportData = [
      { Metric: "Total Students", Value: students.length },
      { Metric: "Total Teachers", Value: teachers.length },
      { Metric: "Total Classes", Value: classes.length },
      { Metric: "Average Attendance", Value: `${avgAttendance}%` },
      { Metric: "Fees Collection Rate", Value: `${feeRate}%` },
    ];
    exportToExcel(reportData, "EliteSchoolOS_Overview_Report");
  };

  const handleGenerateReportCards = async () => {
    if (!schoolId) return;
    setGenerating(true);
  
    // Get school settings
    const schoolDoc = await getDoc(doc(db, "schools", schoolId));
    const schoolData = schoolDoc.data();
  
    // Get all students
    const today = new Date().toLocaleDateString("en-UG", {
      day:"2-digit", month:"short", year:"numeric"
    });
  
    for (const student of students) {
      // Get this student's grades
      const studentReports = reports.filter((r: any) =>
        r.studentId === student.id
      );
  
      // Get attendance
      const studentAttendance = attendance
        .filter((a: any) => a.studentId === student.id);
      const presentCount = studentAttendance
        .filter((a: any) => a.status === "present").length;
      const absentCount  = studentAttendance
        .filter((a: any) => a.status === "absent").length;
      const lateCount    = studentAttendance
        .filter((a: any) => a.status === "late").length;
      const total = studentAttendance.length;
      const pct = total > 0
        ? Math.round((presentCount / total) * 100) : 0;
  
      generateReportCardPDF({
        studentName:   student.name || student.firstName + " " + student.lastName,
        studentId:     student.id,
        class:         student.class || student.classId,
        term:          schoolData?.currentTerm || "Term 2",
        year:          schoolData?.academicYear || "2025",
        schoolName:    schoolData?.name || "EliteSchool's",
        schoolMotto:   schoolData?.motto,
        grades:        studentReports.map((r: any) => ({
          subject:     r.subject,
          score:       r.score,
          letterGrade: r.letterGrade,
          remarks:     r.remarks,
          teacherName: r.teacherName,
        })),
        attendance: {
          present:    presentCount,
          absent:     absentCount,
          late:       lateCount,
          percentage: pct,
        },
        classTeacher:  student.classTeacher,
        generatedAt:   today,
      });
  
      // Small delay between PDFs
      await new Promise(r => setTimeout(r, 300));
    }
  
    setGenerating(false);
  };

  return (
    <div className="flex min-h-screen mesh-gradient-bg">
      <AdminSidebar
        activeHref="/admin/reports"
      />
      <div className="flex-1 flex flex-col min-w-0 pb-32 lg:pb-8">
        <TopAppBar title="Reports" subtitle="Academic Intelligence" />
        <main className="flex-1 px-6 py-8 max-w-5xl mx-auto w-full space-y-6">
          <CollectionErrorBanner error={anyError} />
          {/* Section 1 — Page header with actions */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h2 className="font-headline text-3xl font-light italic text-primary">
                Academic Intelligence
              </h2>
              <p className="font-label text-[10px] uppercase tracking-[0.15em] text-outline mt-1">
                Term 2, 2025 — Performance Overview
              </p>
            </div>
            <div className="flex gap-3">
              <EliteButton variant="outlined" size="sm" onClick={handleExportExcel}>
                <span className="material-symbols-outlined text-[16px] mr-1.5">
                  download
                </span>
                Export Excel
              </EliteButton>
              <EliteButton
                variant="primary" size="sm"
                loading={generating}
                onClick={handleGenerateReportCards}>
                <span className="material-symbols-outlined
                                 text-[16px] mr-1.5">
                  picture_as_pdf
                </span>
                {generating ? "Generating..." : "Generate Report Cards"}
              </EliteButton>
            </div>
          </div>

          {/* Section 2 — Report type tab selector */}
          <GlassCard padding="p-2">
            <div className="flex gap-1 overflow-x-auto no-scrollbar">
              {REPORT_TABS.map((tab, i) => (
                <button
                  key={tab.label}
                  onClick={() => setActiveTab(i)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-label text-[11px] uppercase tracking-[0.08em] transition-all duration-200 whitespace-nowrap flex-shrink-0 ${
                    activeTab === i
                      ? "bg-primary-container text-white shadow-sm"
                      : "text-outline hover:bg-surface-container"
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {tab.icon}
                  </span>
                  {tab.label}
                </button>
              ))}
            </div>
          </GlassCard>

          {/* TAB 0 — Overview Report */}
          {activeTab === 0 && (
            <div className="space-y-6">
              {/* Summary metric cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard
                  label="Avg Attendance"
                  value={avgAttendance}
                  suffix="%"
                  percent={avgAttendance}
                  subtitle="Across all classes"
                />
                <MetricCard
                  label="Avg Grade"
                  value={0}
                  suffix="%"
                  percent={0}
                  subtitle="School-wide average"
                />
                <MetricCard
                  label="Pass Rate"
                  value={0}
                  suffix="%"
                  percent={0}
                  subtitle="Above 50% threshold"
                />
                <MetricCard
                  label="At-Risk Students"
                  value={0}
                  suffix=""
                  percent={0}
                  subtitle="Require intervention"
                />
              </div>

              {/* Class performance table */}
              <GlassCard>
                <h3 className="font-headline text-xl font-light italic text-primary mb-5">
                  Class Performance Summary
                </h3>
                <DataTable
                  columns={[
                    {
                      key: "name",
                      label: "Class",
                      render: (v) => (
                        <span className="font-headline text-lg font-light text-primary">
                          {String(v)}
                        </span>
                      ),
                    },
                    { key: "studentCount", label: "Students", width: "90px", align: "right" },
                    {
                      key: "avgScore",
                      label: "Avg Score",
                      width: "100px",
                      align: "right",
                      render: () => (
                        <span className="font-label text-[11px] font-medium text-outline">
                          —
                        </span>
                      ),
                    },
                    {
                      key: "passRate",
                      label: "Pass Rate",
                      width: "100px",
                      align: "right",
                      render: () => (
                        <span className="font-label text-[11px] font-medium text-outline">
                          —
                        </span>
                      ),
                    },
                    {
                      key: "attendance",
                      label: "Attendance",
                      width: "100px",
                      align: "right",
                      render: () => (
                        <span className="font-label text-[11px] font-medium text-outline">
                          —
                        </span>
                      ),
                    },
                    { key: "classTeacher", label: "Class Teacher" },
                  ]}
                  data={classes}
                  loading={false}
                  keyExtractor={(r) => r.id}
                  emptyMessage="No classes available"
                />
              </GlassCard>
            </div>
          )}

          {/* TAB 1 — Attendance Report */}
          {activeTab === 1 && (
            <div className="space-y-6">
              {/* Weekly attendance summary */}
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: "Present Today", value: String(presentToday), sub: `of ${students.length} students`, icon: "how_to_reg" },
                  { label: "Absent Today", value: String(absentToday), sub: `${students.length > 0 ? Math.round((absentToday/students.length)*100) : 0}% absence rate`, icon: "person_off" },
                  { label: "Late Today", value: "0", sub: "0% late rate", icon: "schedule" },
                ].map((s) => (
                  <GlassCard key={s.label} padding="p-5" showOrb>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-9 h-9 rounded-xl bg-primary-container/10 flex items-center justify-center">
                        <span className="material-symbols-outlined text-[18px] text-primary-container">
                          {s.icon}
                        </span>
                      </div>
                    </div>
                    <p className="font-headline text-3xl font-light text-primary leading-none">
                      {s.value}
                    </p>
                    <p className="font-label text-[10px] uppercase tracking-[0.1em] text-outline mt-1">
                      {s.label}
                    </p>
                    <p className="font-body text-xs text-on-surface-variant font-light mt-1">
                      {s.sub}
                    </p>
                  </GlassCard>
                ))}
              </div>

              {/* Per-class attendance table */}
              <GlassCard>
                <div className="flex items-center justify-between mb-5">
                  <h3 className="font-headline text-xl font-light italic text-primary">
                    Attendance by Student
                  </h3>
                  {/* Class filter */}
                  <select className="h-9 bg-surface-container-low rounded-full px-4 font-body text-xs font-light border-none focus:ring-2 focus:ring-primary-container focus:outline-none">
                    <option>This Week</option>
                    <option>This Month</option>
                    <option>This Term</option>
                  </select>
                </div>
                <DataTable
                  columns={[
                    {
                      key: "firstName",
                      label: "Student",
                      render: (v, row) => (
                        <span className="font-headline text-lg font-light text-primary">
                          {String(v)} {row.lastName}
                        </span>
                      ),
                    },
                    { key: "classId", label: "Class", width: "90px", align: "right" },
                    {
                      key: "attendance",
                      label: "Rate",
                      width: "120px",
                      align: "right",
                      render: (v) => (
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 h-1.5 bg-surface-container rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary-container rounded-full"
                              style={{ width: `${v || 0}%` }}
                            />
                          </div>
                          <span className="font-label text-[11px] text-on-surface w-8 text-right">
                            {String(v || 0)}%
                          </span>
                        </div>
                      ),
                    },
                  ]}
                  data={students}
                  loading={false}
                  keyExtractor={(r) => r.id}
                  emptyMessage="No attendance data"
                />
              </GlassCard>
            </div>
          )}

          {/* TAB 2 — Performance Report */}
          {activeTab === 2 && (
            <div className="space-y-6">
              {/* Top performers */}
              <GlassCard>
                <h3 className="font-headline text-xl font-light italic text-primary mb-5">
                  Top Performers — Term 2
                </h3>
                <DataTable
                  columns={[
                    { key: "name", label: "Student" },
                    { key: "class", label: "Class" },
                    { key: "avg", label: "Average" },
                  ]}
                  data={[]}
                  loading={false}
                  keyExtractor={(r: any) => r.id}
                  emptyMessage="No grade data yet — enter grades to see performance"
                />
              </GlassCard>

              {/* At-risk students */}
              <GlassCard>
                <div className="flex items-center justify-between mb-5">
                  <h3 className="font-headline text-xl font-light italic text-primary">
                    At-Risk Students
                  </h3>
                  <Badge variant="unpaid" dot>
                    Requires Intervention
                  </Badge>
                </div>
                <DataTable
                  columns={[
                    { key: "name", label: "Student" },
                    { key: "class", label: "Class" },
                    { key: "avgScore", label: "Avg Score" },
                    { key: "attendance", label: "Attendance" },
                    { key: "risk", label: "Risk Level" },
                  ]}
                  data={[]}
                  loading={false}
                  keyExtractor={(r: any) => r.id}
                  emptyMessage="No at-risk data — grades required"
                  emptyIcon="check_circle"
                />
              </GlassCard>
            </div>
          )}

          {/* TAB 3 — Graphical Report */}
          {activeTab === 3 && (
            <div className="space-y-6">
              {/* Bar chart — class averages */}
              <GlassCard showOrb>
                <h3 className="font-headline text-xl font-light italic text-primary mb-6">
                  Class Average Scores
                </h3>
                {classes.length === 0 ? (
                  <p className="font-body text-sm text-outline font-light text-center py-8">
                    No classes available
                  </p>
                ) : (
                  <div className="flex items-end gap-2 h-48 px-2">
                    {classes.map((cls: any, i: number) => (
                      <div
                        key={cls.id}
                        className="flex-1 flex flex-col items-center gap-2 group"
                      >
                        {/* Score label */}
                        <span className="font-label text-[10px] text-outline opacity-0 group-hover:opacity-100 transition-opacity">
                          0%
                        </span>
                        {/* Bar */}
                        <div
                          className="w-full rounded-t-lg bg-primary-container/20 hover:bg-primary-container/40 transition-colors relative overflow-hidden cursor-pointer"
                          style={{ height: `0px` }}
                        >
                          <div
                            className="absolute bottom-0 left-0 right-0 bg-primary-container rounded-t-lg transition-all duration-700"
                            style={{
                              height: `0%`,
                              animationDelay: `${i * 0.08}s`,
                            }}
                          />
                        </div>
                        {/* Class label */}
                        <span className="font-label text-[9px] text-outline uppercase">
                          {cls.name}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                {/* Legend */}
                <div className="flex gap-4 mt-4 pt-4 border-t border-outline-variant/20">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm bg-primary-container" />
                    <span className="font-label text-[10px] text-outline uppercase tracking-[0.06em]">
                      Pass Rate
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm bg-primary-container/20" />
                    <span className="font-label text-[10px] text-outline uppercase tracking-[0.06em]">
                      Avg Score
                    </span>
                  </div>
                </div>
              </GlassCard>

              {/* Donut chart — fee collection */}
              <GlassCard>
                <h3 className="font-headline text-xl font-light italic text-primary mb-6">
                  Fee Collection Breakdown
                </h3>
                <div className="flex items-center justify-center gap-12">
                  {/* SVG Donut */}
                  <div className="relative flex-shrink-0">
                    <svg width={160} height={160} viewBox="0 0 160 160">
                      {/* Track */}
                      <circle
                        cx={80}
                        cy={80}
                        r={60}
                        fill="none"
                        stroke="var(--tw-surface-container, #f0eee9)"
                        strokeWidth={20}
                        className="stroke-surface-container"
                      />
                      {/* Paid */}
                      <circle
                        cx={80}
                        cy={80}
                        r={60}
                        fill="none"
                        strokeWidth={20}
                        strokeLinecap="butt"
                        className="stroke-primary-container"
                        strokeDasharray={`${377 * (feeRate / 100)} 377`}
                        transform="rotate(-90 80 80)"
                        style={{ transition: "stroke-dasharray 1s ease" }}
                      />
                      {/* Partial */}
                      <circle
                        cx={80}
                        cy={80}
                        r={60}
                        fill="none"
                        strokeWidth={20}
                        strokeLinecap="butt"
                        className="stroke-on-tertiary-container"
                        strokeDasharray={`${377 * (partialRate / 100)} 377`}
                        strokeDashoffset={`-${377 * (feeRate / 100)}`}
                        transform="rotate(-90 80 80)"
                      />
                    </svg>
                    {/* Center label */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="font-headline text-3xl font-light text-primary">
                        {feeRate}%
                      </span>
                      <span className="font-label text-[9px] text-outline uppercase tracking-[0.1em]">
                        Collected
                      </span>
                    </div>
                  </div>
                  {/* Legend */}
                  <div className="space-y-3">
                    {[
                      { label: "Fully Paid", pct: `${feeRate}%`, color: "bg-primary-container" },
                      { label: "Partial", pct: `${partialRate}%`, color: "bg-on-tertiary-container" },
                      { label: "Unpaid", pct: `${unpaidRate}%`, color: "bg-surface-container-highest" },
                    ].map((l) => (
                      <div key={l.label} className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${l.color}`} />
                        <div>
                          <p className="font-label text-[11px] text-on-surface">
                            {l.label}
                          </p>
                          <p className="font-headline text-lg font-light text-primary">
                            {l.pct}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </GlassCard>
            </div>
          )}
        </main>
      </div>
      <BottomNavBar items={ADMIN_NAV_ITEMS} activeHref="/admin/reports" />
    </div>
  );
}
