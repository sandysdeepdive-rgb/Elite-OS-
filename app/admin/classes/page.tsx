"use client";

import { useState } from "react";
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
import { downloadClassTemplate } from "@/lib/utils/importExport";
import { useSchoolData, useCollection } from "@/lib/hooks/useSchoolData";
import { collection, addDoc, serverTimestamp, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { sanitizeText } from "@/lib/utils/sanitize";

interface ClassRecord {
  id: string;
  name: string;
  classTeacher: string;
  teacherCode: string;
  subjects: string[];
  studentCount: number;
  capacity: number;
  status: "active" | "inactive";
}

import { useAuthGuard } from '@/lib/hooks/useAuthGuard';

export default function AdminClassesPage() {
  useAuthGuard('admin');
  const { schoolId, schoolName, adminName } = useSchoolData();
  const { data: classes, loading, error: classesError } = useCollection<ClassRecord>(schoolId, "classes");

  const [showAddModal, setShowAddModal] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editClass, setEditClass] = useState<ClassRecord | null>(null);
  const [deleteClass, setDeleteClass] = useState<ClassRecord | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    stream: "",
    classTeacher: "",
    capacity: "",
    subjects: "",
  });

  const handleImportClasses = async (rows: Record<string, unknown>[]) => {
    if (!schoolId) return;
    for (const row of rows) {
      if (!row.name) continue;
      
      const subjectsStr = String(row.subjects || "");
      
      await addDoc(
        collection(db, "schools", schoolId, "classes"),
        {
          name: sanitizeText(String(row.name || "")),
          stream: sanitizeText(String(row.stream || "")),
          capacity: Number(row.capacity) || 40,
          studentCount: 0,
          subjects: subjectsStr.split(",").map(s => sanitizeText(s)).filter(Boolean),
          classTeacher: "",
          teacherCode: "",
          status: "active",
          createdAt: serverTimestamp(),
        }
      );
    }
  };

  const handleAddClass = async () => {
    if (!schoolId) return;
    await addDoc(
      collection(db, "schools", schoolId, "classes"),
      {
        name: sanitizeText(formData.name),
        stream: sanitizeText(formData.stream),
        classTeacher: sanitizeText(formData.classTeacher),
        capacity: Number(formData.capacity) || 40,
        studentCount: 0,
        subjects: formData.subjects.split(",").map(s => sanitizeText(s)).filter(Boolean),
        teacherCode: sanitizeText(formData.classTeacher.split("— TR-")[1] || ""),
        status: "active",
        createdAt: serverTimestamp(),
      }
    );
    setShowAddModal(false);
    setFormData({ name: "", stream: "", classTeacher: "", capacity: "", subjects: "" });
  };

  const handleEditClass = async () => {
    if (!schoolId || !editClass) return;
    await updateDoc(
      doc(db, "schools", schoolId, "classes", editClass.id),
      {
        name: sanitizeText(formData.name),
        stream: sanitizeText(formData.stream),
        classTeacher: sanitizeText(formData.classTeacher),
        capacity: Number(formData.capacity) || 40,
        subjects: formData.subjects.split(",").map(s => sanitizeText(s)).filter(Boolean),
        teacherCode: sanitizeText(formData.classTeacher.split("— TR-")[1] || ""),
      }
    );
    setEditClass(null);
    setFormData({ name: "", stream: "", classTeacher: "", capacity: "", subjects: "" });
  };

  const handleDeleteClass = async () => {
    if (!schoolId || !deleteClass) return;
    await deleteDoc(
      doc(db, "schools", schoolId, "classes", deleteClass.id)
    );
    setDeleteClass(null);
  };

  const openEditModal = (cls: ClassRecord) => {
    setFormData({
      name: cls.name || "",
      stream: "", // Not in interface but in form
      classTeacher: cls.classTeacher ? `${cls.classTeacher} — TR-${cls.teacherCode}` : "",
      capacity: String(cls.capacity || 40),
      subjects: (cls.subjects || []).join(", "),
    });
    setEditClass(cls);
  };

  return (
    <div className="flex min-h-screen mesh-gradient-bg">
      <AdminSidebar
        activeHref="/admin/classes"
      />
      <div className="flex-1 flex flex-col min-w-0 pb-32 lg:pb-8">
        <TopAppBar title="Classes" subtitle="Academic Structure" />
        <main className="flex-1 px-6 py-8 max-w-5xl mx-auto w-full space-y-6">
          <CollectionErrorBanner error={classesError} />
          {/* Section 1 — Header with actions */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h2 className="font-headline text-3xl font-light italic text-primary">
                Academic Structure
              </h2>
              <p className="font-label text-[10px] uppercase tracking-[0.15em] text-outline mt-1">
                {classes.length} active classes
              </p>
            </div>
            <div className="flex gap-3">
              <EliteButton
                variant="outlined"
                size="sm"
                onClick={() => setShowImport(true)}
              >
                <span className="material-symbols-outlined text-[16px] mr-1.5">
                  upload
                </span>
                Import
              </EliteButton>
              <EliteButton
                variant="primary"
                size="sm"
                onClick={() => {
                  setFormData({ name: "", stream: "", classTeacher: "", capacity: "", subjects: "" });
                  setShowAddModal(true);
                }}
              >
                <span className="material-symbols-outlined text-[16px] mr-1.5">
                  add
                </span>
                Add Class
              </EliteButton>
            </div>
          </div>

          {/* Section 2 — Summary row */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Total Classes", value: String(classes.length), icon: "class" },
              { label: "Total Streams", value: String(new Set(classes.map(c => c.name.replace(/[^a-zA-Z]/g, ''))).size || 0), icon: "schema" },
              { label: "Avg Class Size", value: String(classes.length > 0 ? Math.round(classes.reduce((sum, c) => sum + (c.studentCount || 0), 0) / classes.length) : 0), icon: "group" },
            ].map((stat) => (
              <GlassCard key={stat.label} padding="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary-container/10 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[20px] text-primary-container">
                      {stat.icon}
                    </span>
                  </div>
                  <div>
                    <p className="font-headline text-2xl font-light text-primary leading-none">
                      {stat.value}
                    </p>
                    <p className="font-label text-[10px] uppercase tracking-[0.1em] text-outline mt-0.5">
                      {stat.label}
                    </p>
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>

          {/* Section 3 — Classes DataTable */}
          <DataTable
            columns={[
              {
                key: "name",
                label: "Class",
                render: (v) => (
                  <span className="font-headline text-xl font-light text-primary">
                    {String(v)}
                  </span>
                ),
              },
              {
                key: "classTeacher",
                label: "Class Teacher",
                render: (v, row) => (
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-primary-container/10 flex items-center justify-center">
                      <span className="font-label text-[10px] text-primary-container">
                        {String(v)
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .slice(0, 2)}
                      </span>
                    </div>
                    <div>
                      <p className="font-body text-sm font-light text-on-surface">
                        {String(v)}
                      </p>
                      <p className="font-label text-[10px] text-outline">
                        TR-{(row as ClassRecord).teacherCode}
                      </p>
                    </div>
                  </div>
                ),
              },
              {
                key: "subjects",
                label: "Subjects",
                render: (v) => (
                  <div className="flex gap-1 flex-wrap">
                    {((v as string[]) || []).slice(0, 3).map((s) => (
                      <Badge key={s} variant="default" size="sm">
                        {s}
                      </Badge>
                    ))}
                    {((v as string[]) || []).length > 3 && (
                      <Badge variant="default" size="sm">
                        +{((v as string[]) || []).length - 3}
                      </Badge>
                    )}
                  </div>
                ),
              },
              {
                key: "studentCount",
                label: "Students",
                width: "100px",
                align: "right",
                render: (v, row) => (
                  <div className="text-right">
                    <span className="font-label text-[11px] text-on-surface">
                      {String(v)}
                    </span>
                    <span className="font-label text-[10px] text-outline">
                      /{(row as ClassRecord).capacity}
                    </span>
                    <div className="w-full h-1 bg-surface-container rounded-full overflow-hidden mt-1">
                      <div
                        className="h-full bg-primary-container rounded-full"
                        style={{
                          width: `${
                            (Number(v) / (row as ClassRecord).capacity) * 100
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                ),
              },
              {
                key: "status",
                label: "Status",
                width: "100px",
                render: (v) => (
                  <Badge variant={v as "active"} dot>
                    {String(v).charAt(0).toUpperCase() + String(v).slice(1)}
                  </Badge>
                ),
              },
              {
                key: "id",
                label: "",
                width: "60px",
                align: "right",
                render: (_, row) => (
                  <div className="flex gap-1 justify-end">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditModal(row as ClassRecord);
                      }}
                      className="w-8 h-8 rounded-full hover:bg-surface-container-high flex items-center justify-center transition-colors"
                    >
                      <span className="material-symbols-outlined text-[16px] text-outline">
                        edit
                      </span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteClass(row as ClassRecord);
                      }}
                      className="w-8 h-8 rounded-full hover:bg-error/10 flex items-center justify-center transition-colors"
                    >
                      <span className="material-symbols-outlined text-[16px] text-outline hover:text-error">
                        delete
                      </span>
                    </button>
                  </div>
                ),
              },
            ]}
            data={classes}
            loading={loading}
            keyExtractor={(c) => c.id}
            emptyMessage="No records found — Add your first entry to get started"
            emptyIcon="class"
          />
        </main>
      </div>
      <BottomNavBar items={ADMIN_NAV_ITEMS} activeHref="/admin/classes" />

      {/* Add/Edit Class Modal */}
      {(showAddModal || editClass) && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-inverse-surface/40 backdrop-blur-sm">
          <GlassCard className="w-full max-w-md" padding="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-headline text-2xl font-light italic text-primary">
                {editClass ? "Edit Class" : "Add New Class"}
              </h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditClass(null);
                }}
                className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-[18px]">
                  close
                </span>
              </button>
            </div>
            <div className="space-y-4">
              <EliteInput 
                label="Class Name" 
                placeholder="e.g. S.4A" 
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
              />
              <EliteInput
                label="Stream"
                placeholder="e.g. Science / Arts / Commerce"
                value={formData.stream}
                onChange={(e) => setFormData({...formData, stream: e.target.value})}
              />
              {/* Class Teacher dropdown */}
              <div>
                <label className="font-label text-[10px] uppercase tracking-[0.15em] text-outline block mb-2">
                  Class Teacher
                </label>
                <select 
                  className="w-full h-14 bg-surface-container-low rounded-full px-4 font-body text-sm font-light border-none focus:ring-2 focus:ring-primary-container focus:outline-none"
                  value={formData.classTeacher}
                  onChange={(e) => setFormData({...formData, classTeacher: e.target.value})}
                >
                  <option value="">Select teacher...</option>
                  {[
                    "Mr. Ssemwogerere John — TR-01",
                    "Ms. Nakiganda Ruth — TR-02",
                    "Mr. Ochieng David — TR-03",
                  ].map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </div>
              <EliteInput
                label="Capacity"
                type="number"
                placeholder="e.g. 45"
                value={formData.capacity}
                onChange={(e) => setFormData({...formData, capacity: e.target.value})}
              />
              {/* Subjects — comma separated */}
              <EliteInput
                label="Subjects"
                placeholder="e.g. Mathematics, Physics, Chemistry"
                hint="Separate subjects with commas"
                value={formData.subjects}
                onChange={(e) => setFormData({...formData, subjects: e.target.value})}
              />
              <div className="flex gap-3 pt-2">
                <EliteButton
                  variant="outlined"
                  fullWidth
                  onClick={() => {
                    setShowAddModal(false);
                    setEditClass(null);
                  }}
                >
                  Cancel
                </EliteButton>
                <EliteButton variant="primary" fullWidth onClick={editClass ? handleEditClass : handleAddClass}>
                  {editClass ? "Save Changes" : "Add Class"}
                </EliteButton>
              </div>
            </div>
          </GlassCard>
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-inverse-surface/40 backdrop-blur-sm">
          <GlassCard className="w-full max-w-sm" padding="p-6">
            <div className="w-12 h-12 rounded-full bg-error/10 flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-[24px] text-error">
                delete
              </span>
            </div>
            <h3 className="font-headline text-xl font-light text-primary text-center mb-2">
              Remove Class?
            </h3>
            <p className="font-body text-sm text-on-surface-variant font-light text-center mb-6">
              This will permanently remove{" "}
              <strong className="font-medium text-on-surface">
                {deleteClass.name}
              </strong>{" "}
              from the academic structure.
            </p>
            <div className="flex gap-3">
              <EliteButton
                variant="outlined"
                fullWidth
                onClick={() => setDeleteClass(null)}
              >
                Cancel
              </EliteButton>
              <EliteButton
                variant="primary"
                fullWidth
                className="bg-error hover:bg-error/90"
                onClick={handleDeleteClass}
              >
                Remove
              </EliteButton>
            </div>
          </GlassCard>
        </div>
      )}

      {/* Import Modal */}
      {showImport && (
        <ImportModal
          title="Import Classes"
          expectedColumns={[
            { key:"name",     label:"Class Name", required:true },
            { key:"stream",   label:"Stream" },
            { key:"capacity", label:"Capacity" },
            { key:"subjects", label:"Subjects" },
          ]}
          onImport={handleImportClasses}
          onClose={() => setShowImport(false)}
          onDownloadTemplate={downloadClassTemplate}
        />
      )}
    </div>
  );
}
