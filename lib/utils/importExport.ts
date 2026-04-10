import * as XLSX from 'xlsx';

export const exportToExcel = (data: any[], filename: string) => {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
  XLSX.writeFile(workbook, `${filename}.xlsx`);
};

export const downloadTemplate = (columns: string[], filename: string) => {
  const data = [columns.reduce((acc, col) => ({ ...acc, [col]: "" }), {})];
  exportToExcel(data, filename);
};

export const downloadClassTemplate = () => {
  downloadTemplate(["name", "stream", "capacity", "subjects"], "Class_Import_Template");
};

export const downloadTeacherTemplate = () => {
  downloadTemplate(["name", "subjects", "classes", "phone", "email", "status"], "Teacher_Import_Template");
};

export const downloadStudentTemplate = () => {
  downloadTemplate(["name", "studentId", "class", "gender", "dob", "parentName", "parentPhone", "status"], "Student_Import_Template");
};
