import React, { useState, useRef } from "react";
import GlassCard from "./GlassCard";
import EliteButton from "./EliteButton";
import * as XLSX from "xlsx";

interface ColumnDef {
  key: string;
  label: string;
  required?: boolean;
}

interface ImportModalProps {
  title: string;
  expectedColumns: ColumnDef[];
  onImport: (data: Record<string, any>[]) => Promise<void>;
  onClose: () => void;
  onDownloadTemplate: () => void;
}

export default function ImportModal({
  title,
  expectedColumns,
  onImport,
  onClose,
  onDownloadTemplate,
}: ImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
    }
  };

  const handleImport = async () => {
    if (!file) {
      setError("Please select a file to import.");
      return;
    }

    setIsImporting(true);
    setError(null);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet);

      if (jsonData.length === 0) {
        throw new Error("The selected file is empty.");
      }

      // Basic validation
      const firstRow = jsonData[0];
      const missingRequired = expectedColumns
        .filter((col) => col.required)
        .filter((col) => !(col.key in firstRow));

      if (missingRequired.length > 0) {
        throw new Error(
          `Missing required columns: ${missingRequired
            .map((c) => c.label || c.key)
            .join(", ")}`
        );
      }

      await onImport(jsonData);
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to import data. Please check the file format.");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-inverse-surface/40 backdrop-blur-sm">
      <GlassCard className="w-full max-w-md" padding="p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-headline text-xl font-light text-primary">
            {title}
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-surface-container-highest transition-colors"
          >
            <span className="material-symbols-outlined text-[20px] text-on-surface-variant">
              close
            </span>
          </button>
        </div>

        <div className="space-y-6">
          {error && (
            <div className="p-3 rounded-lg bg-error/10 text-error text-sm font-body">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <p className="font-body text-sm text-on-surface-variant">
              1. Download the template file
            </p>
            <EliteButton
              variant="outlined"
              fullWidth
              onClick={onDownloadTemplate}
            >
              <span className="material-symbols-outlined text-[18px] mr-2">
                download
              </span>
              Download Template
            </EliteButton>
          </div>

          <div className="space-y-2">
            <p className="font-body text-sm text-on-surface-variant">
              2. Upload your completed file (.xlsx, .xls, .csv)
            </p>
            <div
              className="border-2 border-dashed border-outline-variant/50 rounded-xl p-6 text-center cursor-pointer hover:bg-surface-container-low transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileChange}
              />
              <div className="w-12 h-12 rounded-full bg-primary-container/10 flex items-center justify-center mx-auto mb-3">
                <span className="material-symbols-outlined text-[24px] text-primary-container">
                  upload_file
                </span>
              </div>
              <p className="font-body text-sm text-on-surface font-medium mb-1">
                {file ? file.name : "Click to select file"}
              </p>
              <p className="font-label text-[10px] uppercase tracking-[0.1em] text-outline">
                Excel or CSV files only
              </p>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <EliteButton variant="outlined" fullWidth onClick={onClose}>
              Cancel
            </EliteButton>
            <EliteButton
              variant="primary"
              fullWidth
              onClick={handleImport}
              disabled={!file || isImporting}
            >
              {isImporting ? "Importing..." : "Import Data"}
            </EliteButton>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
