import React from "react";

export default function CollectionErrorBanner({ error }: { error: string | null }) {
  if (!error) return null;

  if (error === "index_required") {
    return (
      <div className="flex items-center gap-3 p-4 rounded-xl
                      bg-on-tertiary-container/10
                      border border-on-tertiary-container/20 mb-4">
        <span className="material-symbols-outlined text-[20px]
                         text-on-tertiary-container">info</span>
        <div>
          <p className="font-body text-sm text-on-surface font-light">
            Setting up database index...
          </p>
          <p className="font-body text-xs text-outline mt-0.5">
            This takes 2–3 minutes on first use.
            Data will appear automatically.
          </p>
        </div>
      </div>
    );
  }

  if (error === "permission_denied") {
    return (
      <div className="flex items-center gap-3 p-4 rounded-xl
                      bg-error/8 border border-error/20 mb-4">
        <span className="material-symbols-outlined text-[20px]
                         text-error">lock</span>
        <p className="font-body text-sm text-error font-light">
          Access restricted. Contact your administrator.
        </p>
      </div>
    );
  }

  return null;
}
