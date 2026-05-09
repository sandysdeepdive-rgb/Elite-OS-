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
import { downloadTeacherTemplate } from "@/lib/utils/importExport";
import { useSchoolData, useCollection } from "@/lib/hooks/useSchoolData";
import { collection, addDoc, serverTimestamp, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { sanitizeText, sanitizePhone, sanitizeEmail } from "@/lib/utils/sanitize";

interface Teacher {
  id: string;
  code: string;
  name: string;
  subjects: string[];
  classes: string[];
  phone: string;
  status: "approved" | "pending";
}

import { useAuthGuard } from '@/lib/hooks/useAuthGuard';

export default function AdminTeachers() {
  useAuthGuard('admin');
  const { schoolId, schoolName, adminName } = useSchoolData();
  const { data: teachers, loading, error: teachersError } = useCollection<Teacher>(schoolId, "teachers");

  const [search, setSearch] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editTeacher, setEditTeacher] = useState<Teacher | null>(null);
  const [deleteTeacher, setDeleteTeacher] = useState<Teacher | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    subjects: [] as string[],
    classes: "",
    phone: "",
    email: "",
    status: "approved" as "approved" | "pending",
  });

  const handleImportTeachers = async (rows: Record<string, unknown>[]) => {
    if (!schoolId) return;
    let codeCounter = teachers.length + 1;
    for (const row of rows) {
      if (!row.name) continue;
      
      const subjectsStr = String(row.subjects || "");
      const classesStr = String(row.classes || "");
      
      await addDoc(
        collection(db, "schools", schoolId, "teachers"),
        {
          name: sanitizeText(String(row.name || "")),
          subjects: subjectsStr.split(",").map(s => sanitizeText(s)).filter(Boolean),
          classes: classesStr.split(",").map(c => sanitizeText(c)).filter(Boolean),
          phone: sanitizePhone(String(row.phone || "")),
          email: sanitizeEmail(String(row.email || "")),
          status: sanitizeText(String(row.status || "approved")),
          code: sanitizeText(String(codeCounter).padStart(2, "0")),
          createdAt: serverTimestamp(),
        }
      );
      codeCounter++;
    }
  };

  const filteredTeachers = useMemo(() => {
    return teachers.filter((teacher) => {
      const matchesSearch =
        teacher.name?.toLowerCase().includes(search.toLowerCase()) ||
        teacher.code?.toLowerCase().includes(search.toLowerCase()) ||
        (teacher.subjects && teacher.subjects.some(s => s.toLowerCase().includes(search.toLowerCase())));
      const matchesSubject = subjectFilter ? teacher.subjects?.includes(subjectFilter) : true;
      const matchesStatus = statusFilter ? teacher.status === statusFilter : true;
      return matchesSearch && matchesSubject && matchesStatus;
    });
  }, [teachers, search, subjectFilter, statusFilter]);

  const getInitials = (name: string) => {
    if (!name) return "TR";
    return name.replace(/^(Mr\.|Ms\.|Mrs\.|Dr\.)\s*/i, '').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const handleAddTeacher = async () => {
    if (!schoolId) return;
    await addDoc(
      collection(db, "schools", schoolId, "teachers"),
      {
        name: sanitizeText(formData.name),
        subjects: formData.subjects.map(s => sanitizeText(s)),
        classes: formData.classes.split(",").map(c => sanitizeText(c)).filter(Boolean),
        phone: sanitizePhone(formData.phone),
        email: sanitizeEmail(formData.email),
        status: formData.status,
        code: sanitizeText(formData.code || String(teachers.length + 1).padStart(2, "0")),
        createdAt: serverTimestamp(),
      }
    );
    setShowAddModal(false);
    setFormData({ name: "", code: "", subjects: [], classes: "", phone: "", email: "", status: "approved" });
  };

  const handleEditTeacher = async () => {
    if (!schoolId || !editTeacher) return;
    await updateDoc(
      doc(db, "schools", schoolId, "teachers", editTeacher.id),
      { 
        ...formData,
        classes: formData.classes.split(",").map(c => c.trim()).filter(Boolean),
      }
    );
    setEditTeacher(null);
    setFormData({ name: "", code: "", subjects: [], classes: "", phone: "", email: "", status: "approved" });
  };

  const handleDeleteTeacher = async () => {
    if (!schoolId || !deleteTeacher) return;
    await deleteDoc(
      doc(db, "schools", schoolId, "teachers", deleteTeacher.id)
    );
    setDeleteTeacher(null);
  };

  const openEditModal = (teacher: Teacher) => {
    setFormData({
      name: teacher.name || "",
      code: teacher.code || "",
      subjects: teacher.subjects || [],
      classes: (teacher.classes || []).join(", "),
      phone: teacher.phone || "",
      email: "", // Not in interface but in form
      status: teacher.status || "approved",
    });
    setEditTeacher(teacher);
  };

  return (
    <div className="flex min-h-screen mesh-gradient-bg">
      <AdminSidebar
        activeHref="/admin/teachers"
      />
      <div className="flex-1 flex flex-col min-w-0 pb-32 lg:pb-8">
        <TopAppBar title="Teachers" subtitle="Staff Directory" />
        <main className="flex-1 px-6 py-8 max-w-5xl mx-auto w-full space-y-6">
          <CollectionErrorBanner error={teachersError} />
          {/* Section 1: Page header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h1 className="font-headline text-3xl font-light italic text-primary">
                Staff Directory
              </h1>
              <p className="font-body text-sm text-on-surface-variant mt-1">
                {teachers.length} active staff members
              </p>
            </div>
            <div className="flex items-center gap-3">
              <EliteButton variant="outlined" onClick={() => setShowImport(true)}>
                <span className="material-symbols-outlined text-[18px] mr-2">upload</span>
                Import
              </EliteButton>
              <EliteButton variant="primary" onClick={() => {
                setFormData({ name: "", code: "", subjects: [], classes: "", phone: "", email: "", status: "approved" });
                setShowAddModal(true);
              }}>
                <span className="material-symbols-outlined text-[18px] mr-2">person_add</span>
                Add Teacher
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
                  placeholder="Search by name, code, or subject..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full h-11 bg-surface-container-low rounded-full pl-11 pr-4 font-body text-sm font-light placeholder:text-outline border-none focus:ring-2 focus:ring-primary-container focus:outline-none"
                />
              </div>
              <select
                value={subjectFilter}
                onChange={(e) => setSubjectFilter(e.target.value)}
                className="h-11 bg-surface-container-low rounded-full px-4 font-body text-sm font-light border-none focus:ring-2 focus:ring-primary-container focus:outline-none"
              >
                <option value="">All Subjects</option>
                {["Physics", "Mathematics", "English", "Biology", "Chemistry", "Geography", "History", "Literature"].map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-11 bg-surface-container-low rounded-full px-4 font-body text-sm font-light border-none focus:ring-2 focus:ring-primary-container focus:outline-none"
              >
                <option value="">All Status</option>
                <option value="approved">Approved</option>
                <option value="pending">Pending</option>
              </select>
            </div>
          </GlassCard>

          {/* Section 3: DataTable */}
          <DataTable
            columns={[
              {
                key: "code",
                label: "Code",
                width: "80px",
                render: (v) => (
                  <span className="font-label text-[10px] uppercase tracking-[0.1em] bg-surface-container px-2 py-1 rounded-full text-on-surface-variant">
                    TR-{String(v)}
                  </span>
                ),
              },
              {
                key: "name",
                label: "Teacher",
                render: (v, row) => (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary-container/10 text-primary-container flex items-center justify-center font-label text-[10px] font-bold">
                      {getInitials(String(v))}
                    </div>
                    <div>
                      <p className="font-body text-sm text-on-surface font-light">{String(v)}</p>
                      <p className="font-label text-[10px] text-outline">{(row as Teacher).phone}</p>
                    </div>
                  </div>
                ),
              },
              {
                key: "subjects",
                label: "Subjects",
                width: "140px",
                render: (v, row) => {
                  const subjects = (row as Teacher).subjects || [];
                  if (subjects.length === 0) return <span className="text-outline text-xs">-</span>;
                  return (
                    <div className="flex flex-wrap gap-1">
                      {subjects.slice(0, 2).map((s) => (
                        <Badge key={s} variant="default" size="sm">{s}</Badge>
                      ))}
                      {subjects.length > 2 && (
                        <Badge variant="default" size="sm">+{subjects.length - 2}</Badge>
                      )}
                    </div>
                  );
                },
              },
              {
                key: "classes",
                label: "Classes",
                width: "180px",
                render: (v) => (
                  <div className="flex flex-wrap gap-1">
                    {((v as string[]) || []).map((c) => (
                      <Badge key={c} variant="default" size="sm">{c}</Badge>
                    ))}
                  </div>
                ),
              },
              {
                key: "status",
                label: "Status",
                width: "110px",
                render: (v) => (
                  <Badge variant={v as "approved" | "pending"} dot>
                    {String(v).charAt(0).toUpperCase() + String(v).slice(1)}
                  </Badge>
                ),
              },
              {
                key: "actions",
                label: "",
                width: "100px",
                align: "right",
                render: (_, row) => (
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); openEditModal(row as Teacher); }}
                      className="w-8 h-8 rounded-full hover:bg-surface-container flex items-center justify-center transition-colors text-on-surface-variant"
                    >
                      <span className="material-symbols-outlined text-[18px]">edit</span>
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteTeacher(row as Teacher); }}
                      className="w-8 h-8 rounded-full hover:bg-error/10 flex items-center justify-center transition-colors text-error"
                    >
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  </div>
                ),
              },
            ]}
            data={filteredTeachers}
            loading={loading}
            keyExtractor={(t) => t.id}
            emptyMessage="No records found — Add your first entry to get started"
            emptyIcon="person_off"
          />
        </main>
      </div>
      <BottomNavBar items={ADMIN_NAV_ITEMS} activeHref="/admin/teachers" />

      {/* Add/Edit Modal */}
      {(showAddModal || editTeacher) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-inverse-surface/40 backdrop-blur-sm">
          <GlassCard className="w-full max-w-md max-h-[90vh] overflow-y-auto" padding="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-headline text-2xl font-light italic text-primary">
                {editTeacher ? "Edit Teacher" : "Add Teacher"}
              </h3>
              <button
                onClick={() => { setShowAddModal(false); setEditTeacher(null); }}
                className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
            <div className="space-y-4">
              <EliteInput 
                label="Full Name" 
                placeholder="e.g. Mr. Ssemwogerere John" 
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
              />
              <div className="grid grid-cols-2 gap-4">
                <EliteInput 
                  label="Email" 
                  type="email" 
                  placeholder="e.g. john@elite.edu" 
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                />
                <EliteInput 
                  label="Phone" 
                  placeholder="e.g. 0772111222" 
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-label text-[10px] uppercase tracking-[0.15em] text-outline block mb-2">Subjects</label>
                  <div className="max-h-32 overflow-y-auto bg-surface-container-low rounded-xl p-3 border border-outline-variant/20 space-y-2">
                    {["Physics", "Mathematics", "English", "Biology", "Chemistry", "Geography", "History", "Literature"].map((s) => (
                      <label key={s} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.subjects.includes(s)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({ ...formData, subjects: [...formData.subjects, s] });
                            } else {
                              setFormData({ ...formData, subjects: formData.subjects.filter(sub => sub !== s) });
                            }
                          }}
                          className="rounded border-outline-variant text-primary-container focus:ring-primary-container"
                        />
                        <span className="font-body text-sm text-on-surface">{s}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <EliteInput 
                  label="Teacher Code" 
                  placeholder="e.g. 01" 
                  value={formData.code}
                  onChange={(e) => setFormData({...formData, code: e.target.value})}
                />
              </div>
              <EliteInput 
                label="Classes Assigned" 
                placeholder="e.g. S.4A, S.5A (comma separated)" 
                value={formData.classes}
                onChange={(e) => setFormData({...formData, classes: e.target.value})}
              />
              <div>
                <label className="font-label text-[10px] uppercase tracking-[0.15em] text-outline block mb-2">Status</label>
                <select 
                  className="w-full h-12 bg-surface-container-low rounded-xl px-4 font-body text-sm font-light border-none focus:ring-2 focus:ring-primary-container focus:outline-none" 
                  value={formData.status}
                  onChange={(e) => setFormData({...formData, status: e.target.value as "approved" | "pending"})}
                >
                  <option value="approved">Approved</option>
                  <option value="pending">Pending</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <EliteButton variant="outlined" fullWidth onClick={() => { setShowAddModal(false); setEditTeacher(null); }}>
                  Cancel
                </EliteButton>
                <EliteButton variant="primary" fullWidth onClick={editTeacher ? handleEditTeacher : handleAddTeacher}>
                  {editTeacher ? "Save Changes" : "Create Teacher"}
                </EliteButton>
              </div>
            </div>
          </GlassCard>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTeacher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-inverse-surface/40 backdrop-blur-sm">
          <GlassCard className="w-full max-w-sm" padding="p-6">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-error/10 text-error flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-[32px]">warning</span>
              </div>
              <h3 className="font-headline text-xl font-light text-on-surface mb-2">
                Delete Teacher?
              </h3>
              <p className="font-body text-sm text-on-surface-variant mb-6">
                Are you sure you want to remove <strong>{deleteTeacher.name}</strong>? This action cannot be undone and will unassign them from all classes.
              </p>
              <div className="flex gap-3 w-full">
                <EliteButton variant="outlined" fullWidth onClick={() => setDeleteTeacher(null)}>
                  Cancel
                </EliteButton>
                <button
                  className="flex-1 bg-error text-white rounded-full py-3 font-label text-[11px] uppercase tracking-[0.1em] hover:bg-error/90 transition-colors"
                  onClick={handleDeleteTeacher}
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
          title="Import Teachers"
          expectedColumns={[
            { key:"name",     label:"Full Name", required:true },
            { key:"subjects", label:"Subjects" },
            { key:"classes",  label:"Classes" },
            { key:"phone",    label:"Phone" },
            { key:"email",    label:"Email" },
            { key:"status",   label:"Status" },
          ]}
          onImport={handleImportTeachers}
          onClose={() => setShowImport(false)}
          onDownloadTemplate={downloadTeacherTemplate}
        />
      )}
    </div>
  );
}
