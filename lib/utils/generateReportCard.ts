import jsPDF from "jspdf";

interface ReportCardData {
  studentName: string;
  studentId: string;
  class: string;
  term: string;
  year: string;
  schoolName: string;
  schoolMotto?: string;
  grades: {
    subject: string;
    score: number;
    letterGrade: string;
    remarks?: string;
    teacherName?: string;
  }[];
  attendance: {
    present: number;
    absent: number;
    late: number;
    percentage: number;
  };
  classTeacher?: string;
  principalName?: string;
  generatedAt: string;
}

export function generateReportCardPDF(data: ReportCardData) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const W = 210; // A4 width
  const margin = 20;
  let y = margin;

  // ── COLORS ──────────────────────────────────────
  const petrol  = [43, 77, 90] as const;
  const ink     = [20, 20, 22] as const;
  const cloud   = [244, 242, 237] as const;
  const outline = [193, 199, 203] as const;

  // ── HEADER BACKGROUND ───────────────────────────
  doc.setFillColor(...petrol);
  doc.rect(0, 0, W, 45, "F");

  // School name
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text(data.schoolName.toUpperCase(), W / 2, 16, {
    align: "center"
  });

  // Motto
  if (data.schoolMotto) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "italic");
    doc.text(data.schoolMotto, W / 2, 23, { align: "center" });
  }

  // Report card title
  doc.setFontSize(13);
  doc.setFont("helvetica", "normal");
  doc.text("ACADEMIC REPORT CARD", W / 2, 32, {
    align: "center"
  });

  // Term and year
  doc.setFontSize(10);
  doc.text(`${data.term} — ${data.year}`, W / 2, 39, {
    align: "center"
  });

  y = 55;

  // ── STUDENT INFO BOX ────────────────────────────
  doc.setFillColor(...cloud);
  doc.roundedRect(margin, y, W - margin * 2, 28, 3, 3, "F");

  doc.setTextColor(...ink);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");

  // Left column
  doc.setTextColor(114, 120, 123);
  doc.text("STUDENT NAME", margin + 5, y + 7);
  doc.setTextColor(...ink);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(data.studentName, margin + 5, y + 14);

  // Right column — class
  doc.setTextColor(114, 120, 123);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("CLASS", W / 2, y + 7);
  doc.setTextColor(...ink);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(data.class, W / 2, y + 14);

  // Student ID
  doc.setTextColor(114, 120, 123);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("STUDENT ID", margin + 5, y + 22);
  doc.setTextColor(...ink);
  doc.setFontSize(9);
  doc.text(data.studentId, margin + 5, y + 27);

  y += 38;

  // ── GRADES TABLE ────────────────────────────────
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...petrol);
  doc.text("ACADEMIC PERFORMANCE", margin, y);

  y += 6;

  // Table header
  doc.setFillColor(...petrol);
  doc.rect(margin, y, W - margin * 2, 8, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");

  const colSubject  = margin + 3;
  const colScore    = margin + 75;
  const colGrade    = margin + 100;
  const colRemarks  = margin + 120;

  doc.text("SUBJECT", colSubject, y + 5.5);
  doc.text("SCORE", colScore, y + 5.5);
  doc.text("GRADE", colGrade, y + 5.5);
  doc.text("REMARKS", colRemarks, y + 5.5);

  y += 8;

  // Table rows
  let totalScore = 0;
  data.grades.forEach((grade, i) => {
    const rowBg = i % 2 === 0 ? cloud : ([255,255,255] as const);
    doc.setFillColor(rowBg[0], rowBg[1], rowBg[2]);
    doc.rect(margin, y, W - margin * 2, 8, "F");

    doc.setTextColor(...ink);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");

    doc.text(grade.subject, colSubject, y + 5.5);
    doc.text(String(grade.score), colScore, y + 5.5);

    // Grade with color
    const gradeColor: [number,number,number] =
      grade.score >= 75 ? [74, 103, 65] :
      grade.score >= 50 ? [43, 77, 90]  :
                          [186, 26, 26];
    doc.setTextColor(...gradeColor);
    doc.setFont("helvetica", "bold");
    doc.text(grade.letterGrade, colGrade, y + 5.5);

    doc.setTextColor(...ink);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    if (grade.remarks) {
      doc.text(
        grade.remarks.slice(0, 35),
        colRemarks, y + 5.5
      );
    }

    totalScore += grade.score;
    y += 8;
  });

  // Total row
  const avg = data.grades.length > 0
    ? Math.round(totalScore / data.grades.length) : 0;

  doc.setFillColor(...petrol);
  doc.rect(margin, y, W - margin * 2, 9, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("AVERAGE SCORE", colSubject, y + 6);
  doc.text(`${avg}%`, colScore, y + 6);
  const avgGrade =
    avg >= 80 ? "D1" : avg >= 75 ? "D2" :
    avg >= 70 ? "C3" : avg >= 65 ? "C4" :
    avg >= 60 ? "C5" : avg >= 55 ? "C6" :
    avg >= 50 ? "P7" : avg >= 45 ? "P8" : "F9";
  doc.text(avgGrade, colGrade, y + 6);

  y += 18;

  // ── ATTENDANCE BOX ──────────────────────────────
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...petrol);
  doc.text("ATTENDANCE SUMMARY", margin, y);

  y += 6;
  doc.setFillColor(...cloud);
  doc.roundedRect(margin, y, W - margin * 2, 20, 3, 3, "F");

  const attCols = [margin+5, margin+45, margin+85, margin+125];
  const attLabels = ["PRESENT","ABSENT","LATE","RATE"];
  const attValues = [
    String(data.attendance.present),
    String(data.attendance.absent),
    String(data.attendance.late),
    `${data.attendance.percentage}%`,
  ];

  attLabels.forEach((label, i) => {
    doc.setTextColor(114, 120, 123);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text(label, attCols[i], y + 7);
    doc.setTextColor(...ink);
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text(attValues[i], attCols[i], y + 16);
  });

  y += 28;

  // ── SIGNATURES ──────────────────────────────────
  doc.setDrawColor(...outline);

  // Class teacher signature
  doc.line(margin, y + 10, margin + 50, y + 10);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(114, 120, 123);
  doc.text("CLASS TEACHER", margin, y + 15);
  if (data.classTeacher) {
    doc.setTextColor(...ink);
    doc.setFontSize(9);
    doc.text(data.classTeacher, margin, y + 21);
  }

  // Principal signature
  doc.line(W - margin - 50, y + 10, W - margin, y + 10);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(114, 120, 123);
  doc.text("PRINCIPAL / HEAD TEACHER",
    W - margin - 50, y + 15);

  y += 30;

  // ── FOOTER ──────────────────────────────────────
  doc.setFillColor(...petrol);
  doc.rect(0, 287 - 12, W, 12, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text(
    `Generated by EliteSchool's OS  •  ${data.generatedAt}  •  Confidential`,
    W / 2, 287 - 5, { align: "center" }
  );

  // Save the PDF
  doc.save(
    `${data.studentName.replace(/\s+/g, "_")}_ReportCard_${data.term}_${data.year}.pdf`
  );
}
