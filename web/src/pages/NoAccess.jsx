import React from "react";

export default function NoAccessPage() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 text-center bg-transparent">
      <div className="max-w-lg space-y-4">
        <h1 className="text-2xl font-semibold text-slate-800 dark:text-slate-100">No Permissions Assigned</h1>
        <p className="text-slate-600 dark:text-slate-400">
          It looks like your account isn&apos;t set up with any permissions. Please reach out to your administrator for access.
        </p>
      </div>
    </div>
  );
}
