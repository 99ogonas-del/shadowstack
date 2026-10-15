"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Code as CodeIcon,
  UploadCloud,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Loader2,
  Rocket,
  ScanLine,
} from "lucide-react";

type Mode = "github" | "zip" | "manual";

export function NewScanForm({
  defaultMode,
  defaultType,
  defaultProjectId: _defaultProjectId,
}: {
  defaultMode: string;
  defaultType: string;
  defaultProjectId?: string;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>((defaultMode as Mode) ?? "github");
  const [type, setType] = useState<string>(defaultType);
  const [githubUrl, setGithubUrl] = useState("");
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [manualCode, setManualCode] = useState("");
  const [manualFilename, setManualFilename] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState<
    | "idle"
    | "uploading"
    | "extracting"
    | "analyzing"
    | "scoring"
    | "done"
    | "error"
  >("idle");
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const progressMap = {
    idle: 0,
    uploading: 15,
    extracting: 35,
    analyzing: 65,
    scoring: 90,
    done: 100,
    error: 0,
  };

  function setStageAuto(
    start: typeof stage,
    sequence: Array<typeof stage>,
    delay: number,
  ) {
    sequence.forEach((s, i) => {
      setTimeout(() => setStage(s), delay * (i + 1));
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    setStageAuto(
      "uploading",
      ["extracting", "analyzing", "scoring"],
      700,
    );

    try {
      let endpoint = "/api/projects";
      const body: Record<string, string> = {
        source: mode,
        name,
        description,
        type,
      };

      if (mode === "github") {
        body.sourceUrl = githubUrl;
      } else if (mode === "zip") {
        // multipart — fall through to fetch with FormData
      } else if (mode === "manual") {
        body.sourceUrl = "inline://paste";
        body.code = manualCode;
        body.filename = manualFilename;
      }

      let res: Response;
      if (mode === "zip" && zipFile) {
        const fd = new FormData();
        fd.append("source", mode);
        fd.append("type", type);
        fd.append("name", name);
        fd.append("description", description);
        fd.append("zip", zipFile);
        res = await fetch(endpoint, { method: "POST", body: fd });
      } else {
        res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Erreur ${res.status}`);
      }
      const data = await res.json();

      setStage("done");
      setTimeout(() => {
        if (data.projectId) router.push(`/projects/${data.projectId}`);
        else router.push("/projects");
        router.refresh();
      }, 700);
    } catch (e: unknown) {
      const err = e as Error;
      setError(err.message);
      setStage("error");
    } finally {
      setLoading(false);
    }
  }

  const stageLabels: Record<typeof stage, string> = {
    idle: "Prêt",
    uploading: "Téléversement...",
    extracting: "Extraction du code...",
    analyzing: "Analyse IA en cours...",
    scoring: "Calcul du score...",
    done: "Terminé !",
    error: "Erreur",
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 card">
        {/* Mode tabs */}
        <div className="flex gap-1 p-1 bg-[#0a0a1a] rounded-xl border border-[var(--color-border)] mb-6">
          <ModeButton
            icon={CodeIcon}
            label="GitHub"
            active={mode === "github"}
            onClick={() => setMode("github")}
          />
          <ModeButton
            icon={UploadCloud}
            label="ZIP"
            active={mode === "zip"}
            onClick={() => setMode("zip")}
          />
          <ModeButton
            icon={Sparkles}
            label="Coller du code"
            active={mode === "manual"}
            onClick={() => setMode("manual")}
          />
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Mode-specific inputs */}
          {mode === "github" && (
            <div>
              <label className="form-label">URL du dépôt GitHub public</label>
              <input
                type="url"
                className="input"
                placeholder="https://github.com/utilisateur/projet"
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
                required
              />
              <p className="text-xs text-[var(--color-text-dim)] mt-2">
                Seuls les dépôts publics sont supportés. Pour les privés, importe
                un ZIP.
              </p>
            </div>
          )}

          {mode === "zip" && (
            <div>
              <label className="form-label">Fichier .zip de code</label>
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const f = e.dataTransfer.files?.[0];
                  if (f && f.name.endsWith(".zip")) setZipFile(f);
                }}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition ${
                  zipFile
                    ? "border-cyan-500/40 bg-cyan-500/5"
                    : "border-[var(--color-border)] hover:border-cyan-500/30 bg-[#0a0a1a]"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".zip"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0] ?? null;
                    if (f) setZipFile(f);
                  }}
                />
                {zipFile ? (
                  <div className="flex items-center justify-center gap-2 text-cyan-300">
                    <CheckCircle2 size={20} />
                    <span className="font-medium">{zipFile.name}</span>
                    <span className="text-xs text-[var(--color-text-dim)]">
                      ({(zipFile.size / 1024).toFixed(0)} KB)
                    </span>
                  </div>
                ) : (
                  <>
                    <UploadCloud
                      size={28}
                      className="mx-auto text-[var(--color-text-muted)] mb-2"
                    />
                    <div className="text-sm text-white">
                      Glisse ton .zip ici ou{" "}
                      <span className="text-cyan-300">parcours tes fichiers</span>
                    </div>
                    <div className="text-xs text-[var(--color-text-dim)] mt-1">
                      Max 50 MB
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {mode === "manual" && (
            <>
              <div>
                <label className="form-label">Nom du fichier</label>
                <input
                  type="text"
                  className="input"
                  placeholder="ex: api/users.py"
                  value={manualFilename}
                  onChange={(e) => setManualFilename(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="form-label">Code à analyser</label>
                <textarea
                  className="input font-mono text-xs min-h-[200px] resize-y"
                  placeholder="Colle ton code ici..."
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  required
                />
              </div>
            </>
          )}

          {/* Common fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Nom du projet</label>
              <input
                type="text"
                className="input"
                placeholder="mon-super-projet"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="form-label">Type d'analyse</label>
              <select
                className="input"
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
                <option value="full">Analyse complète</option>
                <option value="security">Audit sécurité</option>
                <option value="cleanup">Nettoyage du code</option>
                <option value="costs">Optimisation coûts</option>
              </select>
            </div>
          </div>

          <div>
            <label className="form-label">Description (optionnel)</label>
            <input
              type="text"
              className="input"
              placeholder="À quoi sert ce projet ?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          {/* Progress bar */}
          {loading && (
            <div className="rounded-xl bg-[#0a0a1a] border border-[var(--color-border)] p-4 fade-in">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="text-white font-medium">
                  {stageLabels[stage]}
                </span>
                <span className="text-cyan-300">
                  {progressMap[stage]}%
                </span>
              </div>
              <div className="h-2 rounded-full bg-[#0a0a1a] overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-400 to-purple-500 transition-all duration-500"
                  style={{ width: `${progressMap[stage]}%` }}
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full justify-center py-3"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                {stageLabels[stage]}
              </>
            ) : (
              <>
                <ScanLine size={16} /> Lancer le scan
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>
      </div>

      {/* Side info */}
      <div className="space-y-4">
        <div className="card">
          <h4 className="font-bold text-white mb-3 flex items-center gap-2">
            <Rocket size={16} className="text-cyan-300" />
            Ce qui va se passer
          </h4>
          <ol className="space-y-3 text-sm text-[var(--color-text-muted)]">
            {[
              "Extraction des fichiers source",
              "Détection des secrets & dépendances vulnérables",
              "Analyse statique des patterns IA piégeux",
              "Estimation des économies API/DB",
              "Score de santé final + correctifs",
            ].map((s, i) => (
              <li key={s} className="flex gap-2.5">
                <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 text-[11px] flex items-center justify-center shrink-0 mt-0.5 font-semibold">
                  {i + 1}
                </span>
                {s}
              </li>
            ))}
          </ol>
        </div>

        <div className="card bg-gradient-to-br from-cyan-500/5 to-purple-500/5 border-cyan-500/20">
          <h4 className="font-bold text-white mb-2 flex items-center gap-2">
            <Sparkles size={16} className="text-purple-300" />
            Tips pour meilleurs résultats
          </h4>
          <ul className="space-y-1.5 text-xs text-[var(--color-text-muted)]">
            <li>• Inclus package.json ou requirements.txt</li>
            <li>• Le scan respecte le .gitignore</li>
            <li>• Max 50MB — exclure node_modules</li>
            <li>• Public uniquement pour GitHub</li>
          </ul>
        </div>
      </div>

      <style jsx>{`
        :global(.form-label) {
          display: block;
          font-size: 12px;
          font-weight: 600;
          color: var(--color-text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 6px;
        }
      `}</style>
    </div>
  );
}

function ModeButton({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2 ${
        active
          ? "bg-gradient-to-r from-cyan-500/20 to-purple-500/20 text-white border border-cyan-400/30"
          : "text-[var(--color-text-muted)] hover:text-white border border-transparent"
      }`}
    >
      <Icon size={16} />
      {label}
    </button>
  );
}
