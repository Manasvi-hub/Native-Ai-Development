import { useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import VantaBackground from "../components/VantaBackground";
import ArchitectureDiagram from "../components/ArchitectureDiagram";
import { inferArchitectureFromPrompt } from "../utils/inferServicesFromPrompt";

const ARCHITECTURE_TYPES = [
  { value: "microservices", label: "Microservices" },
  { value: "monolith", label: "Monolith" },
  { value: "event-driven", label: "Event-driven" },
];

const WORKFLOW_TYPES = [
  { value: "e-commerce", label: "E-commerce" },
  { value: "banking", label: "Banking" },
  { value: "healthcare", label: "Healthcare" },
];

export default function TranslationPage() {
  const navigate = useNavigate();
  const [architectureType, setArchitectureType] = useState("microservices");
  const [workflowType, setWorkflowType] = useState("e-commerce");
  const [userPrompt, setUserPrompt] = useState(() =>
    typeof window !== "undefined" ? localStorage.getItem("userPrompt") ?? "" : ""
  );
  const [generationRunId, setGenerationRunId] = useState(0);
  const [phase, setPhase] = useState("idle"); // idle | generating | complete
  const [completedSteps, setCompletedSteps] = useState(0);

  useEffect(() => {
    const stored = localStorage.getItem("userPrompt");
    if (stored != null) setUserPrompt(stored);
  }, []);

  useEffect(() => {
    if (generationRunId === 0) return;

    setCompletedSteps(0);
    setPhase("generating");

    let currentStep = 0;
    const interval = setInterval(() => {
      currentStep += 1;
      setCompletedSteps(Math.min(currentStep, 4));
      if (currentStep >= 4) {
        setPhase("complete");
        clearInterval(interval);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [generationRunId]);

  const handleGenerateArchitecture = () => {
    setGenerationRunId((id) => id + 1);
  };

  const steps = [
    { icon: "📐", label: "Architecture", emoji: "🏗️" },
    { icon: "🗄️", label: "Database", emoji: "💾" },
    { icon: "🔗", label: "APIs", emoji: "⚡" },
    { icon: "🎨", label: "UI Design", emoji: "✨" },
  ];

  const archLabel = ARCHITECTURE_TYPES.find((a) => a.value === architectureType)?.label ?? architectureType;
  const workflowLabel = WORKFLOW_TYPES.find((w) => w.value === workflowType)?.label ?? workflowType;

  /** Nodes shown on canvas — derived from workflow defaults + keywords in user prompt */
  const inferredArchitecture = useMemo(
    () => inferArchitectureFromPrompt(userPrompt, workflowType),
    [userPrompt, workflowType]
  );

  const logEntries = useMemo(() => {
    const svcList = inferredArchitecture.microservices.join(", ");
    const archMessages = {
      microservices: [
        `Architecture · mapped services: ${svcList}`,
        "Data · schema draft + per-service ownership / integration contracts",
        "APIs · gateway routes, service discovery, auth delegation",
        "UI · BFF aggregation + design system tokens",
      ],
      monolith: [
        `Architecture · monolith modules: ${inferredArchitecture.monolithModules.join(", ")}`,
        "Data · shared schema + migration plan + ORM mappings",
        "APIs · unified route map + middleware stack",
        "UI · single bundle + shared components + theming",
      ],
      "event-driven": [
        `Architecture · broker + consumers: ${inferredArchitecture.eventConsumers.join(", ")}`,
        `Integration · topics: ${inferredArchitecture.topicHint}`,
        "Data · event store + read-model DBs + idempotency keys",
        "UI · query side + real-time subscriptions (SSE/WebSocket)",
      ],
    };
    const stepMsgs = archMessages[architectureType] ?? archMessages.microservices;

    return [
      { id: 1, ts: "00:00", level: "info", message: "Session started · intent loaded from storage" },
      {
        id: 2,
        ts: "00:01",
        level: "info",
        message: `Target · ${archLabel} · ${workflowLabel} workflow`,
      },
      {
        id: 3,
        ts: "00:01",
        level: "info",
        message:
          userPrompt.trim().length > 0
            ? `Intent (excerpt) · “${userPrompt.trim().slice(0, 120)}${userPrompt.trim().length > 120 ? "…" : ""}”`
            : "Intent · (no prompt text — using workflow defaults for services)",
      },
      { id: 4, ts: "00:02", level: "info", message: "Parsing requirements and constraints…" },
      { id: 5, ts: "00:03", level: "success", message: stepMsgs[0] },
      { id: 6, ts: "00:05", level: "success", message: stepMsgs[1] },
      { id: 7, ts: "00:07", level: "success", message: stepMsgs[2] },
      { id: 8, ts: "00:09", level: "success", message: stepMsgs[3] },
      { id: 9, ts: "—", level: "system", message: "Awaiting validation pipeline…" },
    ];
  }, [
    archLabel,
    workflowLabel,
    architectureType,
    inferredArchitecture,
    userPrompt,
  ]);

  const visibleLogCount =
    generationRunId === 0 ? 0 : Math.min(completedSteps + 5, logEntries.length);

  const showCanvas = generationRunId > 0;
  const isGenerating = phase === "generating";

  /** Drives sequential edge glow: 1 = first links, … 4 = full data-flow (synced with generation progress) */
  const architectureFlowStep = useMemo(() => {
    if (!showCanvas) return 0;
    if (completedSteps >= 4) return 4;
    if (completedSteps === 0 && isGenerating) return 1;
    if (isGenerating && completedSteps > 0) return Math.min(4, completedSteps + 1);
    return 0;
  }, [showCanvas, completedSteps, isGenerating]);

  const selectClass =
    "mt-1.5 w-full cursor-pointer appearance-none rounded-lg border border-white/15 bg-slate-900/80 px-3 py-2.5 text-sm text-white outline-none transition focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/25";

  return (
    <VantaBackground fullWidth>
      <div className="translation-dashboard flex h-full min-h-0 w-full flex-1 flex-col lg:flex-row lg:overflow-hidden">
        {/* Left — Control panel + sidebar selects */}
        <aside
          className="flex w-full shrink-0 flex-col border-b border-white/10 bg-slate-950/40 backdrop-blur-xl lg:w-72 lg:min-w-[16rem] lg:max-w-[20rem] lg:border-b-0 lg:border-r xl:w-80"
          aria-label="Generation controls"
        >
          <div className="border-b border-white/10 px-4 py-4 lg:px-5">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-violet-300/80">
              Translation
            </p>
            <h1 className="mt-1 text-lg font-bold leading-tight text-white lg:text-xl">
              AI Architecture Generator
            </h1>
            <p className="mt-2 text-xs leading-relaxed text-slate-400">
              System design view · progress and actions
            </p>
          </div>

          <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 py-4 lg:px-5">
            {/* Sidebar: architecture & workflow */}
            <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Intent prompt
              </h2>
              <p className="mt-2 line-clamp-4 max-h-[5.5rem] overflow-hidden text-[11px] leading-relaxed text-slate-300">
                {userPrompt.trim()
                  ? userPrompt.trim()
                  : "No prompt stored. Enter intent on the Intent page, or type below."}
              </p>
              <textarea
                className="mt-2 min-h-[72px] w-full resize-y rounded-lg border border-white/15 bg-slate-900/80 px-3 py-2 text-[11px] text-slate-200 outline-none placeholder:text-slate-600 focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30"
                placeholder="Paste or refine your app intent…"
                value={userPrompt}
                onChange={(e) => {
                  const v = e.target.value;
                  setUserPrompt(v);
                  localStorage.setItem("userPrompt", v);
                }}
                disabled={isGenerating}
                aria-label="User intent prompt"
              />
              <p className="mt-1.5 text-[10px] text-slate-500">
                Services on the canvas are inferred from this text + workflow.
              </p>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Configuration
              </h2>
              <div className="mt-4 space-y-4">
                <div>
                  <label htmlFor="architecture-type" className="text-xs font-medium text-slate-300">
                    Architecture type
                  </label>
                  <select
                    id="architecture-type"
                    className={selectClass}
                    value={architectureType}
                    onChange={(e) => setArchitectureType(e.target.value)}
                    disabled={isGenerating}
                  >
                    {ARCHITECTURE_TYPES.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="workflow-type" className="text-xs font-medium text-slate-300">
                    Workflow type
                  </label>
                  <select
                    id="workflow-type"
                    className={selectClass}
                    value={workflowType}
                    onChange={(e) => setWorkflowType(e.target.value)}
                    disabled={isGenerating}
                  >
                    {WORKFLOW_TYPES.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <button
                type="button"
                onClick={handleGenerateArchitecture}
                disabled={isGenerating}
                className="button-3d mt-4 w-full rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-900/30 transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isGenerating ? "Generating…" : "Generate Architecture"}
              </button>
              <p className="mt-2 text-[10px] leading-relaxed text-slate-500">
                Renders the live diagram in the center canvas and streams AI logs.
              </p>
            </div>

            <div>
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                Generation progress
              </h2>
              <div className="space-y-3">
                {steps.map((step, index) => (
                  <div key={step.label} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                    <div className="flex items-center gap-2">
                      <div
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                          !showCanvas
                            ? "bg-slate-800/80 text-slate-600"
                            : completedSteps > index
                              ? "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-400/40"
                              : completedSteps === index + 1
                                ? "bg-violet-500/30 text-white ring-1 ring-violet-400/50"
                                : "bg-slate-800/80 text-slate-500"
                        }`}
                      >
                        {!showCanvas ? "—" : completedSteps > index ? "✓" : index + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-white">{step.label}</p>
                        <p className="text-[11px] text-slate-500">{step.emoji}</p>
                      </div>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-800">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          !showCanvas
                            ? "bg-transparent"
                            : completedSteps > index
                              ? "bg-emerald-500/80"
                              : completedSteps === index + 1
                                ? "bg-violet-500"
                                : "bg-transparent"
                        }`}
                        style={{
                          width:
                            !showCanvas
                              ? "0%"
                              : completedSteps > index
                                ? "100%"
                                : completedSteps === index + 1
                                  ? "75%"
                                  : "0%",
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-dashed border-white/15 bg-slate-900/40 p-3">
              <p className="text-[11px] leading-relaxed text-slate-400">
                {!showCanvas ? (
                  <>
                    <span className="font-medium text-slate-300">Ready.</span> Choose{" "}
                    <span className="text-violet-200">{archLabel}</span> and{" "}
                    <span className="text-cyan-200/90">{workflowLabel}</span>, then generate.
                  </>
                ) : completedSteps < 4 ? (
                  <>
                    <span className="font-medium text-violet-200">Generating…</span> architecture,
                    data, APIs, and UI layers.
                  </>
                ) : (
                  <>
                    <span className="font-medium text-emerald-300">Ready.</span> Continue to
                    validation.
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="mt-auto border-t border-white/10 p-4 lg:p-5">
            <button
              type="button"
              onClick={() => navigate("/validate")}
              className="button-3d w-full rounded-xl bg-[#5751d1] px-4 py-3 text-sm font-semibold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-45"
              disabled={completedSteps < 4 || !showCanvas}
            >
              {completedSteps === 4 && showCanvas ? "Continue to Validation →" : "Continue to Validation"}
            </button>
          </div>
        </aside>

        {/* Center — Architecture canvas (max width) */}
        <main
          className="flex min-h-[min(60vh,28rem)] min-w-0 flex-1 flex-col border-b border-white/10 bg-slate-950/25 lg:min-h-0 lg:border-b-0"
          aria-label="Architecture canvas"
        >
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-white/10 px-4 py-3 lg:px-6">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-cyan-300/90">
                Canvas
              </p>
              <p className="text-sm font-semibold text-white">Live architecture</p>
              {showCanvas && (
                <>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    {archLabel} · {workflowLabel}
                  </p>
                  <p className="mt-1 max-w-[42rem] text-[10px] leading-snug text-slate-400">
                    <span className="font-medium text-slate-300">Mapped services: </span>
                    {architectureType === "microservices" &&
                      inferredArchitecture.microservices.join(" · ")}
                    {architectureType === "monolith" &&
                      inferredArchitecture.monolithModules.join(" · ")}
                    {architectureType === "event-driven" &&
                      inferredArchitecture.eventConsumers.join(" · ")}
                  </p>
                </>
              )}
            </div>
            <span className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-medium text-slate-400">
              {showCanvas ? `${completedSteps}/4 layers` : "—"}
            </span>
          </div>

          <div className="relative flex flex-1 items-stretch justify-center overflow-auto p-4 lg:p-6">
            {!showCanvas ? (
              <div className="flex h-full min-h-[280px] w-full max-w-[min(100%,56rem)] flex-col items-center justify-center rounded-2xl border border-dashed border-white/20 bg-slate-950/50 p-8 text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-violet-500/10 text-2xl">
                  ◇
                </div>
                <p className="text-base font-semibold text-white">No architecture rendered yet</p>
                <p className="mt-2 max-w-sm text-sm text-slate-400">
                  Select <span className="text-slate-200">architecture</span> and{" "}
                  <span className="text-slate-200">workflow</span> in the sidebar, then click{" "}
                  <span className="font-medium text-violet-300">Generate Architecture</span> to
                  visualize your system here.
                </p>
              </div>
            ) : (
              <div
                className={`architecture-container glass-card-3d h-full w-full max-w-[min(100%,56rem)] rounded-2xl p-6 sm:p-8 lg:p-10 ${isGenerating ? "ring-2 ring-violet-500/30" : ""}`}
              >
                <ArchitectureDiagram
                  architectureType={architectureType}
                  workflowType={workflowType}
                  userPrompt={userPrompt}
                  flowStep={architectureFlowStep}
                />

                <div className="particle-system">
                  <div className="data-particle particle-1" />
                  <div className="data-particle particle-2" />
                  <div className="data-particle particle-3" />
                  <div className="data-particle particle-4" />
                  <div className="data-particle particle-5" />
                </div>
              </div>
            )}
          </div>
        </main>

        {/* Right — AI logs */}
        <aside
          className="flex w-full shrink-0 flex-col border-t border-white/10 bg-slate-950/40 backdrop-blur-xl lg:w-80 lg:min-w-[17rem] lg:max-w-[22rem] lg:border-l lg:border-t-0 xl:w-96"
          aria-label="AI logs"
        >
          <div className="border-b border-white/10 px-4 py-4 lg:px-5">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-emerald-300/80">
              AI logs
            </p>
            <p className="mt-1 text-sm font-semibold text-white">Pipeline output</p>
            <p className="mt-1 text-xs text-slate-500">Structured trace · read-only</p>
          </div>

          <div className="flex flex-1 flex-col overflow-hidden">
            <div className="flex items-center gap-2 border-b border-white/5 px-4 py-2 lg:px-5">
              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
              <span className="text-[10px] font-mono text-slate-500">
                {generationRunId > 0 ? "stream · live" : "idle"}
              </span>
            </div>
            <ul className="flex-1 space-y-2 overflow-y-auto px-4 py-3 font-mono text-[11px] leading-relaxed lg:px-5">
              {generationRunId === 0 && (
                <li className="rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-3 text-slate-500">
                  Run <span className="text-violet-300">Generate Architecture</span> to stream logs.
                </li>
              )}
              {logEntries.slice(0, visibleLogCount).map((entry, i) => (
                <li
                  key={`${generationRunId}-${entry.id}`}
                  className={`rounded-lg border px-2.5 py-2 transition-opacity duration-300 ${
                    entry.level === "success"
                      ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-100/90"
                      : entry.level === "system"
                        ? "border-slate-600/40 bg-slate-800/40 text-slate-400"
                        : "border-white/10 bg-white/[0.04] text-slate-300"
                  } ${i === visibleLogCount - 1 && generationRunId > 0 ? "ring-1 ring-violet-500/30" : ""}`}
                >
                  <div className="mb-1 flex items-center justify-between gap-2 text-[10px] text-slate-500">
                    <span>{entry.ts}</span>
                    <span className="uppercase">{entry.level}</span>
                  </div>
                  <span className="block break-words text-[11px]">{entry.message}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="border-t border-white/10 px-4 py-3 lg:px-5">
            <p className="text-center text-[10px] text-slate-500">
              {generationRunId === 0
                ? "Waiting for generation…"
                : "Generating your app architecture"}
              {generationRunId > 0 && (
                <>
                  <span className="inline-block animate-pulse"> ·</span>
                  <span className="inline-block animate-pulse" style={{ animationDelay: "0.2s" }}>
                    {" "}
                    ·
                  </span>
                  <span className="inline-block animate-pulse" style={{ animationDelay: "0.4s" }}>
                    {" "}
                    ·
                  </span>
                </>
              )}
            </p>
          </div>
        </aside>
      </div>
    </VantaBackground>
  );
}
