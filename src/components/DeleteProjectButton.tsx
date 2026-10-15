"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

export function DeleteProjectButton({
  projectId,
  name,
}: {
  projectId: string;
  name: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [open, setOpen] = useState(false);

  function handleDelete() {
    startTransition(async () => {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        router.refresh();
      }
    });
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-1.5 fade-in">
        <button
          onClick={handleDelete}
          disabled={pending}
          className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-red-500 text-white hover:bg-red-600 disabled:opacity-50"
        >
          {pending ? "..." : "Confirmer"}
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="px-2.5 py-1.5 text-xs rounded-lg bg-[var(--color-bg-card)] text-[var(--color-text-muted)] hover:text-white"
        >
          Annuler
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      title={`Supprimer ${name}`}
      className="p-2 rounded-lg text-[var(--color-text-dim)] hover:text-red-400 hover:bg-red-500/10 transition"
    >
      <Trash2 size={16} />
    </button>
  );
}
