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

  if (error === "permission_denied" || error === "access_denied") {
    return (
      <div className="flex items-center gap-3 p-4 rounded-xl
                      bg-error/8 border border-error/20 mb-4">
        <span className="material-symbols-outlined text-[20px]
                         text-error">lock</span>
        <div className="flex-1">
          <p className="font-body text-sm text-error font-medium">
            Access Restricted
          </p>
          <p className="font-body text-xs text-error/80 mt-0.5">
            Your role does not have permission to view this specific collection. 
            Ensure you are assigned the correct school and role.
          </p>
        </div>
      </div>
    );
  }

  if (error === "account_setup_incomplete") {
    return (
      <div className="flex items-center gap-3 p-4 rounded-xl
                      bg-orange-500/10 border border-orange-500/20 mb-4">
        <span className="material-symbols-outlined text-[20px]
                         text-orange-500">warning</span>
        <div className="flex-1">
          <p className="font-body text-sm text-orange-600 font-medium">
            Account Setup Incomplete
          </p>
          <p className="font-body text-xs text-orange-600/80 mt-0.5">
            Your login exists but your user profile was not found. 
            Try logging out and back in, or contact technical support.
          </p>
        </div>
      </div>
    );
  }

  return null;
}
