"use client";

export function ConfirmDialog({ open, title, description, confirmLabel, destructive, onCancel, onConfirm }: { open: boolean; title: string; description: string; confirmLabel?: string; destructive?: boolean; onCancel: () => void; onConfirm: () => void }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" onClick={onCancel}>
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-xl" onClick={(event) => event.stopPropagation()}>
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        <p className="mt-2 text-sm text-slate-500">{description}</p>
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onCancel} className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700">Cancel</button>
          <button type="button" onClick={onConfirm} className={`rounded-full px-4 py-2 text-sm font-semibold text-white ${destructive ? "bg-danger" : "bg-supply-500"}`}>{confirmLabel ?? "Confirm"}</button>
        </div>
      </div>
    </div>
  );
}
