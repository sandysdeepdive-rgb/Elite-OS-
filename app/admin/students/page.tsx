'use client';

import { useState, useMemo } from "react";
import AdminSidebar from "@/components/layout/AdminSidebar";
import TopAppBar from "@/components/layout/TopAppBar";
import BottomNavBar, { ADMIN_NAV_ITEMS } from "@/components/layout/BottomNavBar";
import GlassCard from "@/components/ui/GlassCard";
import EliteButton from "@/components/ui/EliteButton";
import EliteInput from "@/components/ui/EliteInput";
import DataTable from "@/components/ui/DataTable";
import Badge from "@/components/ui/Badge";
import CollectionErrorBanner from "@/components/ui/CollectionErrorBanner";
import ImportModal from "@/components/ui/ImportModal";
import { downloadStudentTemplate } from "@/lib/utils/importExport";
import { useSchoolData, useCollection } from "@/lib/hooks/useSchoolData";
import { collection, addDoc, serverTimestamp, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { sanitizeText, sanitizePhone } from "@/lib/utils/sanitize";

interface Student {
  id: string;
  name: string;
  class: string;
  parentContact: string;
  feesStatus: "paid" | "partial" | "unpaid";
  attendance: string;
}

export default function AdminStudents() {
  const { schoolId, schoolName, adminName } = useSchoolData();
  const { data: students, loading, error: studentsError } = useCollection<Student>(schoolId, "students");

  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [feesFilter, setFeesFilter] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editStudent, setEditStudent] = useState<Student | null>(null);
  const [deleteStudent, setDeleteStudent] = useState<Student | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    class: "",
    parentContact: "",
    feesStatus: "unpaid" as "paid" | "partial" | "unpaid",
    attendance: "0%",
  });

  const handleImportStudents = async (rows: Record<string, unknown>[]) => {
    if (!schoolId) return;
    for (const row of rows) {
      if (!row.name) continue; // skip empty rows
      await addDoc(
        collection(db, "schools", schoolId, "students"),
        {
          name: sanitizeText(String(row.name || "")),
          class: sanitizeText(String(row.class || "")),
          parentContact: sanitizePhone(String(row.parentPhone || "")),
          parentName: sanitizeText(String(row.parentName || "")),
          dateOfBirth: sanitizeText(String(row.dateOfBirth || "")),
          gender: sanitizeText(String(row.gender || "")),
          feesStatus: sanitizeText(String(row.feesStatus || "unpaid")),
          attendance: "0%",
          id: `ST-${Date.now().toString().slice(-4)}-${Math.random()
            .toString(36).substr(2,3).toUpperCase()}`,
          createdAt: serverTimestamp(),
        }
      );
    }
  };

  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      const matchesSearch =
        student.name?.toLowerCase().includes(search.toLowerCase()) ||
        student.id?.toLowerCase().includes(search.toLowerCase()) ||
        student.class?.toLowerCase().includes(search.toLowerCase());
      const matchesClass = classFilter ? student.class === classFilter : true;
      const matchesFees = feesFilter ? student.feesStatus === feesFilter : true;
      return matchesSearch && matchesClass && matchesFees;
    });
  }, [students, search, classFilter, feesFilter]);

  const getInitials = (name: string) => {
    if (!name) return "ST";
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const handleAddStudent = async () => {
    if (!schoolId) return;
    await addDoc(
      collection(db, "schools", schoolId, "students"),
      {
        name: sanitizeText(formData.name),
        class: sanitizeText(formData.class),
        parentContact: sanitizePhone(formData.parentContact),
        feesStatus: formData.feesStatus,
        attendance: formData.attendance,
        id: `ST-${Date.now().toString().slice(-4)}`,
        createdAt: serverTimestamp(),
      }
    );
    setShowAddModal(false);
    setFormData({ name: "", class: "", parentContact: "", feesStatus: "unpaid", attendance: "0%" });
  };

  const handleEditStudent = async () => {
    if (!schoolId || !editStudent) return;
    await updateDoc(
      doc(db, "schools", schoolId, "students", editStudent.id),
      { ...formData }
    );
    setEditStudent(null);
    setFormData({ name: "", class: "", parentContact: "", feesStatus: "unpaid", attendance: "0%" });
  };

  const handleDeleteStudent = async () => {
    if (!schoolId || !deleteStudent) return;
    await deleteDoc(
      doc(db, "schools", schoolId, "students", deleteStudent.id)
    );
    setDeleteStudent(null);
  };

  const openEditModal = (student: Student) => {
    setFormData({
      name: student.name || "",
      class: student.class || "",
      parentContact: student.parentContact || "",
      feesStatus: student.feesStatus || "unpaid",
      attendance: student.attendance || "0%",
    });
    setEditStudent(student);
  };

  return (
    <div className="flex min-h-screen mesh-gradient-bg">
      <AdminSidebar
        activeHref="/admin/students"
      />
      <div className="flex-1 flex flex-col min-w-0 pb-32 lg:pb-8">
        <TopAppBar title="Students" subtitle="Student Registry" />
        <main className="flex-1 px-6 py-8 max-w-5xl mx-auto w-full space-y-6">
          <CollectionErrorBanner error={studentsError} />
          {/* Section 1: Page header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h1 className="font-headline text-3xl font-light italic text-primary">
                Student Registry
              </h1>
              <p className="font-body text-sm text-on-surface-variant mt-1">
                {students.length} enrolled students
              </p>
            </div>
            <div className="flex items-center gap-3">
              <EliteButton variant="outlined" onClick={() => setShowImport(true)}>
                <span className="material-symbols-outlined text-[18px] mr-2">upload</span>
                Import
              </EliteButton>
              <EliteButton variant="primary" onClick={() => {
                setFormData({ name: "", class: "", parentContact: "", feesStatus: "unpaid", attendance: "0%" });
                setShowAddModal(true);
              }}>
                <span className="material-symbols-outlined text-[18px] mr-2">person_add</span>
                Add Student
              </EliteButton>
            </div>
          </div>

          {/* Section 2: Search + filter bar */}
          <GlassCard padding="p-4">
            <div className="flex gap-3 flex-wrap">
              <div className="flex-1 min-w-[200px] relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[18px] text-outline">
                  search
                </span>
                <input
                  placeholder="Search by name, ID, or class..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full h-11 bg-surface-container-low rounded-full pl-11 pr-4 font-body text-sm font-light placeholder:text-outline border-none focus:ring-2 focus:ring-primary-container focus:outline-none"
                />
              </div>
              <select
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
                className="h-11 bg-surface-container-low rounded-full px-4 font-body text-sm font-light border-none focus:ring-2 focus:ring-primary-container focus:outline-none"
              >
                <option value="">All Classes</option>
                {["S.1A", "S.1B", "S.2A", "S.2B", "S.3A", "S.3B", "S.4A", "S.4B", "S.5A", "S.5B", "S.6A", "S.6B"].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <select
                value={feesFilter}
                onChange={(e) => setFeesFilter(e.target.value)}
                className="h-11 bg-surface-container-low rounded-full px-4 font-body text-sm font-light border-none focus:ring-2 focus:ring-primary-container focus:outline-none"
              >
                <option value="">All Fees Status</option>
                <option value="paid">Paid</option>
                <option value="partial">Partial</option>
                <option value="unpaid">Unpaid</option>
              </select>
            </div>
          </GlassCard>

          {/* Section 3: DataTable */}
          <DataTable
            columns={[
              {
                key: "id",
                label: "ID",
                width: "90px",
                render: (v) => <span className="font-label text-[11px] text-outline">{String(v)}</span>,
              },
              {
                key: "name",
                label: "Student",
                render: (v, row) => (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary-container/10 text-primary-container flex items-center justify-center font-label text-[10px] font-bold">
                      {getInitials(String(v))}
                    </div>
                    <div>
                      <p className="font-body text-sm text-on-surface font-light">{String(v)}</p>
                      <p className="font-label text-[10px] text-outline">Parent: {(row as Student).parentContact}</p>
                    </div>
                  </div>
                ),
              },
              {
                key: "class",
                label: "Class",
                width: "100px",
                render: (v) => <Badge variant="default">{String(v)}</Badge>,
              },
              {
                key: "feesStatus",
                label: "Fees",
                width: "110px",
                render: (v) => (
                  <Badge variant={v as "paid" | "partial" | "unpaid"} dot>
                    {String(v).charAt(0).toUpperCase() + String(v).slice(1)}
                  </Badge>
                ),
              },
              {
                key: "attendance",
                label: "Attendance",
                width: "110px",
                align: "right",
                render: (v) => <span className="font-label text-[11px] text-on-surface">{String(v)}</span>,
              },
              {
                key: "actions",
                label: "",
                width: "100px",
                align: "right",
                render: (_, row) => (
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); openEditModal(row as Student); }}
                      className="w-8 h-8 rounded-full hover:bg-surface-container flex items-center justify-center transition-colors text-on-surface-variant"
                    >
                      <span className="material-symbols-outlined text-[18px]">edit</span>
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteStudent(row as Student); }}
                      className="w-8 h-8 rounded-full hover:bg-error/10 flex items-center justify-center transition-colors text-error"
                    >
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  </div>
                ),
              },
            ]}
            data={filteredStudents}
            loading={loading}
            keyExtractor={(s) => s.id}
            emptyMessage="No records found — Add your first entry to get started"
            emptyIcon="person_off"
          />
        </main>
      </div>
      <BottomNavBar items={ADMIN_NAV_ITEMS} activeHref="/admin/students" />

      {/* Add/Edit Modal */}
      {(showAddModal || editStudent) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-inverse-surface/40 backdrop-blur-sm">
          <GlassCard className="w-full max-w-md max-h-[90vh] overflow-y-auto" padding="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-headline text-2xl font-light italic text-primary">
                {editStudent ? "Edit Student" : "Add Student"}
              </h3>
              <button
                onClick={() => { setShowAddModal(false); setEditStudent(null); }}
                className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
            <div className="space-y-4">
              <EliteInput 
                label="Full Name" 
                placeholder="e.g. Kato Paul" 
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
              />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-label text-[10px] uppercase tracking-[0.15em] text-outline block mb-2">Class</label>
                  <select 
                    className="w-full h-12 bg-surface-container-low rounded-xl px-4 font-body text-sm font-light border-none focus:ring-2 focus:ring-primary-container focus:outline-none" 
                    value={formData.class}
                    onChange={(e) => setFormData({...formData, class: e.target.value})}
                  >
                    <option value="" disabled>Select Class</option>
                    {["S.1A", "S.1B", "S.2A", "S.2B", "S.3A", "S.3B", "S.4A", "S.4B", "S.5A", "S.5B", "S.6A", "S.6B"].map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <EliteInput label="Student ID" placeholder="Auto-generated" disabled value={editStudent?.id || "ST-NEW"} />
              </div>
              <EliteInput 
                label="Parent Contact" 
                placeholder="e.g. 0772111222" 
                value={formData.parentContact}
                onChange={(e) => setFormData({...formData, parentContact: e.target.value})}
              />
              <div className="flex gap-3 pt-4">
                <EliteButton variant="outlined" fullWidth onClick={() => { setShowAddModal(false); setEditStudent(null); }}>
                  Cancel
                </EliteButton>
                <EliteButton variant="primary" fullWidth onClick={editStudent ? handleEditStudent : handleAddStudent}>
                  {editStudent ? "Save Changes" : "Create Student"}
                </EliteButton>
              </div>
            </div>
          </GlassCard>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-inverse-surface/40 backdrop-blur-sm">
          <GlassCard className="w-full max-w-sm" padding="p-6">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-error/10 text-error flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-[32px]">warning</span>
              </div>
              <h3 className="font-headline text-xl font-light text-on-surface mb-2">
                Delete Student?
              </h3>
              <p className="font-body text-sm text-on-surface-variant mb-6">
                Are you sure you want to delete <strong>{deleteStudent.name}</strong>? This action cannot be undone and will remove all associated records.
              </p>
              <div className="flex gap-3 w-full">
                <EliteButton variant="outlined" fullWidth onClick={() => setDeleteStudent(null)}>
                  Cancel
                </EliteButton>
                <button
                  className="flex-1 bg-error text-white rounded-full py-3 font-label text-[11px] uppercase tracking-[0.1em] hover:bg-error/90 transition-colors"
                  onClick={handleDeleteStudent}
                >
                  Delete
                </button>
              </div>
            </div>
          </GlassCard>
        </div>
      )}

      {/* Import Modal */}
      {showImport && (
        <ImportModal
          title="Import Students"
          expectedColumns={[
            { key:"name",        label:"Full Name",     required:true },
            { key:"class",       label:"Class",         required:true },
            { key:"parentName",  label:"Parent Name" },
            { key:"parentPhone", label:"Parent Phone" },
            { key:"dateOfBirth", label:"Date of Birth" },
            { key:"gender",      label:"Gender" },
            { key:"feesStatus",  label:"Fees Status" },
          ]}
          onImport={handleImportStudents}
          onClose={() => setShowImport(false)}
          onDownloadTemplate={downloadStudentTemplate}
        />
      )}
    </div>
  );
}
