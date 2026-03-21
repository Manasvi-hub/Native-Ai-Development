import { useCallback, useEffect, useMemo } from "react";
import {
  Background,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Panel,
  Position,
  ReactFlow,
  ReactFlowProvider,
  SmoothStepEdge,
  useEdgesState,
  useNodesState,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { inferArchitectureFromPrompt } from "../utils/inferServicesFromPrompt";

const nodeTypes = { arch: ArchNode };

const reqMarker = { type: MarkerType.ArrowClosed, color: "#c4b5fd", width: 18, height: 18 };
const resMarker = { type: MarkerType.ArrowClosed, color: "#22d3ee", width: 18, height: 18 };

const edgeDefaults = {
  style: { stroke: "#a78bfa", strokeWidth: 2 },
  markerEnd: reqMarker,
};

const labelBg = {
  labelStyle: { fill: "#f8fafc", fontSize: 10, fontWeight: 600 },
  labelBgStyle: { fill: "rgba(15, 23, 42, 0.92)", stroke: "rgba(148, 163, 184, 0.35)" },
  labelBgPadding: [4, 6],
  labelBgBorderRadius: 6,
};

const resLabelBg = {
  labelStyle: { fill: "#ecfeff", fontSize: 10, fontWeight: 600 },
  labelBgStyle: { fill: "rgba(8, 47, 73, 0.92)", stroke: "rgba(34, 211, 238, 0.45)" },
  labelBgPadding: [4, 6],
  labelBgBorderRadius: 6,
};

/** Glowing / dimmed smooth-step edge — request vs response styling + labels */
function GlowEdge(props) {
  const active = props.data?.active === true;
  const isResponse = props.data?.pathKind === "response";

  const stroke = isResponse
    ? active
      ? "#67e8f9"
      : "#475569"
    : active
      ? "#f5f3ff"
      : "#64748b";

  const glow = active
    ? isResponse
      ? "drop-shadow(0 0 10px rgba(34, 211, 238, 0.85)) drop-shadow(0 0 18px rgba(6, 182, 212, 0.35))"
      : "drop-shadow(0 0 10px rgba(196, 181, 253, 0.95)) drop-shadow(0 0 20px rgba(139, 92, 246, 0.45))"
    : "none";

  const baseStyle = {
    ...props.style,
    stroke,
    strokeWidth: active ? (isResponse ? 2.6 : 2.85) : 1.45,
    opacity: active ? 1 : 0.36,
    filter: glow,
    ...(isResponse ? { strokeDasharray: "7 4" } : {}),
  };

  const labelProps =
    isResponse && active
      ? resLabelBg
      : active
        ? labelBg
        : {
            labelStyle: { ...labelBg.labelStyle, opacity: 0.5 },
            labelBgStyle: { ...labelBg.labelBgStyle, opacity: 0.6 },
            labelBgPadding: labelBg.labelBgPadding,
            labelBgBorderRadius: labelBg.labelBgBorderRadius,
          };

  return (
    <g className={active ? "flow-edge-glow-wrap" : "flow-edge-dim-wrap"}>
      <SmoothStepEdge
        {...props}
        {...labelProps}
        markerEnd={isResponse ? resMarker : reqMarker}
        style={baseStyle}
        animated={Boolean(active && props.data?.animated !== false && !isResponse)}
      />
    </g>
  );
}

const edgeTypes = { glow: GlowEdge };

/**
 * How many edges (in edgeOrder) are "lit" for a given pipeline step 0–4.
 * Step advances with generation progress; 4 = full graph glowing.
 */
function getActiveEdgeCount(flowStep, total) {
  if (flowStep <= 0 || total === 0) return 0;
  if (flowStep >= 4) return total;
  return Math.ceil((flowStep / 4) * total);
}

function decorateEdges(edges, edgeOrder, flowStep) {
  const total = edgeOrder.length;
  const nActive = getActiveEdgeCount(flowStep, total);
  const activeIds = new Set(edgeOrder.slice(0, nActive));

  return edges.map((e) => {
    const active = activeIds.has(e.id);
    const pathKind = e.data?.pathKind ?? "request";
    return {
      ...e,
      type: "glow",
      data: {
        ...e.data,
        pathKind,
        active,
        animated: active,
      },
      style: {
        ...e.style,
        ...(e.id === "e-bus-dlq" && active ? { strokeDasharray: "6 4" } : {}),
      },
    };
  });
}

/** Handles: left lane = request (↓), right lane = response (↑) — avoids overlapping paths */
function FlowHandles({ nodeRole }) {
  const h = "pointer-events-auto !h-2.5 !w-2.5 !border !border-slate-900/80";
  if (nodeRole === "fe") {
    return (
      <>
        <Handle id="b-req" type="source" position={Position.Bottom} style={{ left: "34%" }} className={`${h} !bg-violet-400`} title="Request out" />
        <Handle id="b-res" type="target" position={Position.Bottom} style={{ left: "66%" }} className={`${h} !bg-cyan-400`} title="Response in" />
      </>
    );
  }
  if (nodeRole === "api" || nodeRole === "svc" || nodeRole === "mono" || nodeRole === "lb") {
    return (
      <>
        <Handle id="t-req" type="target" position={Position.Top} style={{ left: "34%" }} className={`${h} !bg-violet-400`} title="Request in" />
        <Handle id="t-res-out" type="source" position={Position.Top} style={{ left: "66%" }} className={`${h} !bg-cyan-400`} title="Response out" />
        <Handle id="b-req" type="source" position={Position.Bottom} style={{ left: "34%" }} className={`${h} !bg-violet-400`} title="Request out" />
        <Handle id="b-res" type="target" position={Position.Bottom} style={{ left: "66%" }} className={`${h} !bg-cyan-400`} title="Response in" />
      </>
    );
  }
  if (nodeRole === "db") {
    return (
      <>
        <Handle id="t-req" type="target" position={Position.Top} style={{ left: "34%" }} className={`${h} !bg-violet-400`} title="Request in" />
        <Handle id="t-res-out" type="source" position={Position.Top} style={{ left: "66%" }} className={`${h} !bg-cyan-400`} title="Response out" />
      </>
    );
  }
  return (
    <>
      <Handle type="target" position={Position.Top} className={`${h} !bg-violet-400`} />
      <Handle type="source" position={Position.Bottom} className={`${h} !bg-violet-400`} />
    </>
  );
}

/** Custom node: tier + title + optional dual request/response handles */
function ArchNode({ data }) {
  const tier = data.tier ?? "";
  const variant = data.variant ?? "service";
  const nodeRole = data.nodeRole;

  const variantClasses = {
    frontend: "border-sky-400/45 bg-gradient-to-br from-sky-950/90 to-slate-950/90 ring-1 ring-sky-500/20",
    api: "border-fuchsia-400/45 bg-gradient-to-br from-fuchsia-950/80 to-slate-950/90 ring-1 ring-fuchsia-500/20",
    service: "border-violet-400/45 bg-gradient-to-br from-violet-950/85 to-slate-950/90 ring-1 ring-violet-500/20",
    database: "border-emerald-400/45 bg-gradient-to-br from-emerald-950/85 to-slate-950/90 ring-1 ring-emerald-500/20",
    monolith: "border-indigo-400/50 bg-gradient-to-br from-indigo-950/90 to-slate-950/90 ring-1 ring-indigo-400/25",
    eventbus: "border-amber-400/50 bg-gradient-to-br from-amber-950/90 to-slate-950/90 ring-1 ring-amber-400/30",
    dlq: "border-orange-400/40 bg-gradient-to-br from-orange-950/70 to-slate-950/90 ring-1 ring-orange-500/15",
  };
  const shell = variantClasses[variant] ?? variantClasses.service;

  return (
    <div
      className={`arch-flow-node relative rounded-xl border px-3 py-2.5 shadow-lg backdrop-blur-sm ${shell} min-w-[132px] max-w-[200px]`}
    >
      <FlowHandles nodeRole={nodeRole} />
      {nodeRole && ["fe", "api", "svc", "db", "mono", "lb"].includes(nodeRole) && (
        <div className="pointer-events-none absolute -bottom-5 left-1/2 flex w-[120%] -translate-x-1/2 justify-between text-[8px] font-medium text-white/35">
          <span className="text-violet-300/90">req</span>
          <span className="text-cyan-300/90">res</span>
        </div>
      )}
      {tier && (
        <p className="mb-1 text-[9px] font-semibold uppercase tracking-wider text-white/45">{tier}</p>
      )}
      <p className="text-[12px] font-bold leading-tight text-white">{data.title}</p>
      {data.subtitle && (
        <p className="mt-1 text-[9px] leading-snug text-white/60">{data.subtitle}</p>
      )}
    </div>
  );
}

const W = 168;
const CX = 380;

function xCentered(index, count, gap = 176) {
  if (count <= 0) return CX - W / 2;
  const total = (count - 1) * gap;
  const start = CX - total / 2;
  return start + index * gap - W / 2;
}

function buildMicroservicesFlow(inferred) {
  const services = inferred.microservices.length ? inferred.microservices : ["Core A", "Core B", "Core C"];
  const n = Math.min(services.length, 6);

  const nodes = [
    {
      id: "fe",
      type: "arch",
      position: { x: CX - W / 2, y: 24 },
      data: {
        tier: "Client tier",
        variant: "frontend",
        nodeRole: "fe",
        title: "Frontend / BFF",
        subtitle: "Web · mobile · SSR",
      },
    },
    {
      id: "api",
      type: "arch",
      position: { x: CX - W / 2, y: 140 },
      data: {
        tier: "Edge",
        variant: "api",
        nodeRole: "api",
        title: "API Gateway",
        subtitle: "Auth · routing · rate limits",
      },
    },
    ...services.slice(0, n).map((label, i) => ({
      id: `svc-${i}`,
      type: "arch",
      position: { x: xCentered(i, n), y: 268 },
      data: {
        tier: "Services",
        variant: "service",
        nodeRole: "svc",
        title: label,
        subtitle: "Bounded context",
      },
    })),
    {
      id: "db",
      type: "arch",
      position: { x: CX - W / 2, y: 400 },
      data: {
        tier: "Persistence",
        variant: "database",
        nodeRole: "db",
        title: "Data stores",
        subtitle: "Per-service DB · cache",
      },
    },
  ];

  const reqLabel = (s) => s;
  const resLabel = (s) => s;

  const requestEdges = [
    {
      id: "e-fe-api-req",
      source: "fe",
      target: "api",
      sourceHandle: "b-req",
      targetHandle: "t-req",
      label: reqLabel("Request → gateway"),
      data: { pathKind: "request", caption: "HTTPS / JSON" },
      ...edgeDefaults,
    },
    ...Array.from({ length: n }, (_, i) => ({
      id: `e-api-svc-req-${i}`,
      source: "api",
      target: `svc-${i}`,
      sourceHandle: "b-req",
      targetHandle: "t-req",
      label: reqLabel("Request → service"),
      data: { pathKind: "request", caption: "Routed call" },
      ...edgeDefaults,
    })),
    ...Array.from({ length: n }, (_, i) => ({
      id: `e-svc-db-req-${i}`,
      source: `svc-${i}`,
      target: "db",
      sourceHandle: "b-req",
      targetHandle: "t-req",
      label: reqLabel("Request → DB"),
      data: { pathKind: "request", caption: "Query / write" },
      ...edgeDefaults,
    })),
  ];

  const responseEdges = [
    ...Array.from({ length: n }, (_, i) => ({
      id: `e-db-svc-res-${i}`,
      source: "db",
      target: `svc-${i}`,
      sourceHandle: "t-res-out",
      targetHandle: "b-res",
      label: resLabel("Response ← DB"),
      data: { pathKind: "response", caption: "Rows / ack" },
      ...edgeDefaults,
    })),
    ...Array.from({ length: n }, (_, i) => ({
      id: `e-svc-api-res-${i}`,
      source: `svc-${i}`,
      target: "api",
      sourceHandle: "t-res-out",
      targetHandle: "b-res",
      label: resLabel("Response → API"),
      data: { pathKind: "response", caption: "DTO / events" },
      ...edgeDefaults,
    })),
    {
      id: "e-api-fe-res",
      source: "api",
      target: "fe",
      sourceHandle: "t-res-out",
      targetHandle: "b-res",
      label: resLabel("Response → client"),
      data: { pathKind: "response", caption: "JSON / UI model" },
      ...edgeDefaults,
    },
  ];

  const edges = [...requestEdges, ...responseEdges];

  const edgeOrder = [
    ...requestEdges.map((e) => e.id),
    ...responseEdges.map((e) => e.id),
  ];

  return { nodes, edges, edgeOrder };
}

function buildMonolithFlow(inferred) {
  const modules = inferred.monolithModules.length
    ? inferred.monolithModules
    : ["UI", "Domain", "Data"];
  const subtitle = modules.slice(0, 4).join(" · ");

  const nodes = [
    {
      id: "fe",
      type: "arch",
      position: { x: CX - W / 2, y: 32 },
      data: {
        tier: "Presentation",
        variant: "frontend",
        nodeRole: "fe",
        title: "Frontend",
        subtitle: "SPA / SSR",
      },
    },
    {
      id: "lb",
      type: "arch",
      position: { x: CX - W / 2, y: 148 },
      data: {
        tier: "Traffic",
        variant: "api",
        nodeRole: "lb",
        title: "Load balancer",
        subtitle: "Health · sessions",
      },
    },
    {
      id: "mono",
      type: "arch",
      position: { x: CX - W / 2 - 20, y: 264 },
      data: {
        tier: "Application",
        variant: "monolith",
        nodeRole: "mono",
        title: "Monolith",
        subtitle: subtitle,
      },
    },
    {
      id: "db",
      type: "arch",
      position: { x: CX - W / 2, y: 400 },
      data: {
        tier: "Persistence",
        variant: "database",
        nodeRole: "db",
        title: "Primary database",
        subtitle: "Shared schema · migrations",
      },
    },
  ];

  const requestEdges = [
    {
      id: "e-fe-lb-req",
      source: "fe",
      target: "lb",
      sourceHandle: "b-req",
      targetHandle: "t-req",
      label: "Request → LB",
      data: { pathKind: "request" },
      ...edgeDefaults,
    },
    {
      id: "e-lb-mono-req",
      source: "lb",
      target: "mono",
      sourceHandle: "b-req",
      targetHandle: "t-req",
      label: "Request → app",
      data: { pathKind: "request" },
      ...edgeDefaults,
    },
    {
      id: "e-mono-db-req",
      source: "mono",
      target: "db",
      sourceHandle: "b-req",
      targetHandle: "t-req",
      label: "Request → DB",
      data: { pathKind: "request" },
      ...edgeDefaults,
    },
  ];

  const responseEdges = [
    {
      id: "e-db-mono-res",
      source: "db",
      target: "mono",
      sourceHandle: "t-res-out",
      targetHandle: "b-res",
      label: "Response ← DB",
      data: { pathKind: "response" },
      ...edgeDefaults,
    },
    {
      id: "e-mono-lb-res",
      source: "mono",
      target: "lb",
      sourceHandle: "t-res-out",
      targetHandle: "b-res",
      label: "Response → LB",
      data: { pathKind: "response" },
      ...edgeDefaults,
    },
    {
      id: "e-lb-fe-res",
      source: "lb",
      target: "fe",
      sourceHandle: "t-res-out",
      targetHandle: "b-res",
      label: "Response → client",
      data: { pathKind: "response" },
      ...edgeDefaults,
    },
  ];

  const edges = [...requestEdges, ...responseEdges];
  const edgeOrder = [...requestEdges.map((e) => e.id), ...responseEdges.map((e) => e.id)];

  return { nodes, edges, edgeOrder };
}

function buildEventDrivenFlow(inferred) {
  const consumers = inferred.eventConsumers.length
    ? inferred.eventConsumers
    : ["Worker A", "Worker B", "Worker C"];
  const k = Math.min(consumers.length, 4);
  const topics = inferred.topicHint || "domain.*";

  const nodes = [
    {
      id: "fe",
      type: "arch",
      position: { x: CX - W / 2, y: 16 },
      data: {
        tier: "Ingress",
        variant: "frontend",
        title: "Channels",
        subtitle: "Web · partners",
      },
    },
    {
      id: "cmd",
      type: "arch",
      position: { x: CX - W / 2, y: 128 },
      data: {
        tier: "Command path",
        variant: "api",
        title: "Command / ingest API",
        subtitle: "Validate · publish",
      },
    },
    {
      id: "bus",
      type: "arch",
      position: { x: CX - W / 2 - 24, y: 240 },
      data: {
        tier: "Messaging",
        variant: "eventbus",
        title: "Event bus / broker",
        subtitle: topics,
      },
    },
    ...consumers.slice(0, k).map((label, i) => ({
      id: `c-${i}`,
      type: "arch",
      position: { x: xCentered(i, k, 168), y: 368 },
      data: {
        tier: "Async consumers",
        variant: "service",
        title: label,
        subtitle: "Subscribe · process",
      },
    })),
    {
      id: "estore",
      type: "arch",
      position: { x: xCentered(0, 3, 150) + 30, y: 492 },
      data: {
        tier: "Storage",
        variant: "database",
        title: "Event store",
        subtitle: "Source of truth",
      },
    },
    {
      id: "read",
      type: "arch",
      position: { x: xCentered(1, 3, 150) + 30, y: 492 },
      data: {
        tier: "Storage",
        variant: "database",
        title: "Read models",
        subtitle: "CQRS projections",
      },
    },
    {
      id: "dlq",
      type: "arch",
      position: { x: xCentered(2, 3, 150) + 30, y: 492 },
      data: {
        tier: "Reliability",
        variant: "dlq",
        title: "DLQ",
        subtitle: "Poison · replay",
      },
    },
  ];

  const edges = [
    {
      id: "e-fe-cmd",
      source: "fe",
      target: "cmd",
      label: "Command / request",
      data: { pathKind: "request", caption: "Ingress" },
      ...edgeDefaults,
    },
    {
      id: "e-cmd-bus",
      source: "cmd",
      target: "bus",
      label: "Publish events",
      data: { pathKind: "request", caption: "Topics" },
      ...edgeDefaults,
    },
    ...Array.from({ length: k }, (_, i) => ({
      id: `e-bus-c-${i}`,
      source: "bus",
      target: `c-${i}`,
      label: "Deliver / consume",
      data: { pathKind: "request", caption: "Subscribers" },
      ...edgeDefaults,
    })),
    {
      id: "e-bus-estore",
      source: "bus",
      target: "estore",
      label: "Append to log",
      data: { pathKind: "request" },
      ...edgeDefaults,
    },
    {
      id: "e-bus-dlq",
      source: "bus",
      target: "dlq",
      label: "Failed messages",
      data: { pathKind: "request" },
      ...edgeDefaults,
      style: { ...edgeDefaults.style, strokeDasharray: "6 4" },
    },
    ...Array.from({ length: k }, (_, i) => ({
      id: `e-c-read-${i}`,
      source: `c-${i}`,
      target: "read",
      label: "Read projection",
      data: { pathKind: "response", caption: "CQRS read side" },
      ...edgeDefaults,
    })),
  ];

  const edgeOrder = [
    "e-fe-cmd",
    "e-cmd-bus",
    ...Array.from({ length: k }, (_, i) => `e-bus-c-${i}`),
    "e-bus-estore",
    "e-bus-dlq",
    ...Array.from({ length: k }, (_, i) => `e-c-read-${i}`),
  ];

  return { nodes, edges, edgeOrder };
}

function buildGraph(architectureType, inferred) {
  switch (architectureType) {
    case "monolith":
      return buildMonolithFlow(inferred);
    case "event-driven":
      return buildEventDrivenFlow(inferred);
    case "microservices":
    default:
      return buildMicroservicesFlow(inferred);
  }
}

function FlowCanvas({ architectureType, workflowType, userPrompt, flowStep = 0 }) {
  const inferred = useMemo(
    () => inferArchitectureFromPrompt(userPrompt, workflowType),
    [userPrompt, workflowType]
  );

  const graph = useMemo(
    () => buildGraph(architectureType, inferred),
    [architectureType, inferred]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(graph.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  useEffect(() => {
    const g = buildGraph(architectureType, inferred);
    setNodes(g.nodes);
  }, [architectureType, inferred, setNodes]);

  useEffect(() => {
    setEdges(decorateEdges(graph.edges, graph.edgeOrder, flowStep));
  }, [graph.edges, graph.edgeOrder, flowStep, setEdges]);

  const onInit = useCallback((instance) => {
    instance.fitView({ padding: 0.2, maxZoom: 1.15, minZoom: 0.4 });
  }, []);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      onInit={onInit}
      fitView
      minZoom={0.35}
      maxZoom={1.25}
      className="rounded-xl bg-slate-950/40"
    >
      <Background color="#64748b" gap={20} size={1} className="opacity-40" />
      <Panel
        position="top-left"
        className="z-10 m-2 max-w-[220px] rounded-lg border border-white/15 bg-slate-950/92 px-3 py-2.5 text-[10px] leading-snug text-slate-300 shadow-xl backdrop-blur-sm"
      >
        <p className="mb-2 text-[9px] font-bold uppercase tracking-wider text-slate-500">Request vs response</p>
        <p className="mb-1.5">
          <span className="font-semibold text-violet-200">Request</span>
          <span className="text-slate-500"> — </span>
          solid violet · downstack (Frontend → API → Services → DB)
        </p>
        <p>
          <span className="font-semibold text-cyan-200">Response</span>
          <span className="text-slate-500"> — </span>
          dashed cyan · upstack (DB → Services → API → Frontend)
        </p>
      </Panel>
      <Controls
        className="!overflow-hidden !rounded-lg !border !border-white/10 !bg-slate-900/95 !shadow-xl [&_button]:!border-white/10 [&_button]:!bg-slate-800 [&_button]:!fill-slate-200"
        showInteractive={false}
      />
      <MiniMap
        className="!overflow-hidden !rounded-lg !border !border-white/10 !bg-slate-900/90"
        nodeColor={(n) => {
          const v = n.data?.variant;
          if (v === "frontend") return "#38bdf8";
          if (v === "api") return "#e879f9";
          if (v === "database") return "#34d399";
          if (v === "eventbus") return "#fbbf24";
          if (v === "dlq") return "#fb923c";
          if (v === "monolith") return "#818cf8";
          return "#a78bfa";
        }}
        maskColor="rgba(15, 23, 42, 0.75)"
      />
    </ReactFlow>
  );
}

/**
 * React Flow diagram: directional edges for system flow (FE → API → services → DB, etc.).
 */
export default function ArchitectureFlowDiagram({
  architectureType,
  workflowType,
  userPrompt = "",
  flowStep = 0,
}) {
  return (
    <div className="architecture-flow-root h-[min(560px,70vh)] w-full min-h-[420px]">
      <ReactFlowProvider>
        <FlowCanvas
          architectureType={architectureType}
          workflowType={workflowType}
          userPrompt={userPrompt}
          flowStep={flowStep}
        />
      </ReactFlowProvider>
    </div>
  );
}
