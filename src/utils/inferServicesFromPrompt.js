/**
 * Heuristic mapping from free-text intent + workflow to architecture node labels.
 * Used for canvas visualization (not a real LLM).
 */

const WORKFLOW_DEFAULT_SERVICES = {
  "e-commerce": ["Catalog", "Orders", "Payments"],
  banking: ["Accounts", "Ledger", "Transfers"],
  healthcare: ["Patients", "Records", "Billing"],
};

/** Keyword → canonical service name (workflow helps disambiguate duplicates). */
const KEYWORDS_BY_WORKFLOW = {
  "e-commerce": [
    { keys: ["order", "orders", "cart", "checkout", "basket"], label: "Order service" },
    { keys: ["payment", "payments", "pay", "stripe", "paypal", "checkout"], label: "Payment service" },
    { keys: ["user", "users", "auth", "login", "signup", "identity", "customer account"], label: "User service" },
    { keys: ["catalog", "product", "products", "sku", "listing"], label: "Catalog service" },
    { keys: ["inventory", "stock", "warehouse"], label: "Inventory service" },
    { keys: ["shipping", "shipment", "delivery", "fulfillment"], label: "Shipping service" },
    { keys: ["search", "recommendation", "recommend"], label: "Search service" },
    { keys: ["notification", "email", "sms", "push"], label: "Notification service" },
    { keys: ["review", "rating", "reviews"], label: "Reviews service" },
    { keys: ["wishlist", "favorites"], label: "Wishlist service" },
  ],
  banking: [
    { keys: ["account", "accounts", "checking", "savings"], label: "Account service" },
    { keys: ["transfer", "transfers", "wire", "ach"], label: "Transfer service" },
    { keys: ["payment", "bill pay", "rtp"], label: "Payment service" },
    { keys: ["ledger", "posting", "double-entry"], label: "Ledger service" },
    { keys: ["fraud", "aml", "sanctions"], label: "Fraud service" },
    { keys: ["kyc", "onboarding", "identity", "customer"], label: "KYC service" },
    { keys: ["statement", "statements", "reporting"], label: "Statements service" },
    { keys: ["loan", "credit", "mortgage"], label: "Lending service" },
    { keys: ["card", "debit", "credit card"], label: "Card service" },
    { keys: ["compliance", "audit", "regulatory"], label: "Compliance service" },
  ],
  healthcare: [
    { keys: ["patient", "patients", "demographics"], label: "Patient service" },
    { keys: ["ehr", "emr", "record", "records", "clinical"], label: "Records service" },
    { keys: ["billing", "claims", "claim", "insurance"], label: "Billing service" },
    { keys: ["appointment", "scheduling", "schedule"], label: "Scheduling service" },
    { keys: ["prescription", "rx", "medication"], label: "Prescription service" },
    { keys: ["lab", "labs", "result"], label: "Lab service" },
    { keys: ["hl7", "fhir", "interoperability"], label: "Interop service" },
    { keys: ["telehealth", "telemedicine", "video visit"], label: "Telehealth service" },
  ],
};

function normalizePrompt(prompt) {
  return String(prompt ?? "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function asServiceLabel(name) {
  const t = String(name).trim();
  if (!t) return "Core service";
  if (/service$/i.test(t)) return t;
  return `${t} service`;
}

function defaultServicesForWorkflow(workflowType) {
  const row = WORKFLOW_DEFAULT_SERVICES[workflowType] ?? ["Core A", "Core B", "Core C"];
  return row.map((d) => asServiceLabel(d));
}

/**
 * Collect unique labels from keyword rules matched in the prompt (order preserved).
 */
function labelsFromKeywordHits(normalized, workflowType) {
  const rules = KEYWORDS_BY_WORKFLOW[workflowType] ?? [];
  const seen = new Set();
  const out = [];
  for (const rule of rules) {
    for (const k of rule.keys) {
      if (normalized.includes(k)) {
        const label = rule.label;
        const key = label.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          out.push(label);
        }
        break;
      }
    }
  }
  return out;
}

/**
 * Merge prompt-derived services with workflow defaults; dedupe; cap list length.
 */
export function inferMicroserviceNodes(prompt, workflowType, { maxNodes = 6 } = {}) {
  const normalized = normalizePrompt(prompt);
  const fromPrompt = labelsFromKeywordHits(normalized, workflowType);
  const defaults = defaultServicesForWorkflow(workflowType);

  const merged = [];
  const seen = new Set();

  for (const label of fromPrompt) {
    const k = label.toLowerCase();
    if (!seen.has(k)) {
      seen.add(k);
      merged.push(label);
    }
  }
  for (const label of defaults) {
    const k = label.toLowerCase();
    if (merged.length >= maxNodes) break;
    if (!seen.has(k)) {
      seen.add(k);
      merged.push(label);
    }
  }

  return merged.length ? merged : defaults.slice(0, Math.min(3, maxNodes));
}

/** Short module names for monolith pills (no "service" suffix). */
export function inferMonolithModules(prompt, workflowType) {
  const nodes = inferMicroserviceNodes(prompt, workflowType, { maxNodes: 5 });
  return nodes.map((n) => n.replace(/\s+service$/i, "").trim() || "Module");
}

/**
 * Event-driven async consumer nodes derived from inferred domains.
 */
export function inferEventConsumerLabels(prompt, workflowType) {
  const nodes = inferMicroserviceNodes(prompt, workflowType, { maxNodes: 6 });
  const pick = nodes.slice(0, 3);
  const suffixes = ["projector", "processor", "subscriber"];
  return pick.map((name, i) => {
    const base = name.replace(/\s+service$/i, "").trim() || "Domain";
    return `${base} ${suffixes[i % suffixes.length]}`;
  });
}

/** Broker topic hint from first inferred domains. */
export function inferTopicHint(prompt, workflowType) {
  const nodes = inferMicroserviceNodes(prompt, workflowType, { maxNodes: 4 });
  const staticFallback = {
    "e-commerce": "orders.* · payments.*",
    banking: "transfers.* · compliance.*",
    healthcare: "patient.* · claims.*",
  };
  if (!nodes.length) return staticFallback[workflowType] ?? "domain.* · integration.*";

  const parts = nodes.slice(0, 3).map((n) => {
    const slug = n
      .replace(/\s+service$/i, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "");
    return `${slug || "topic"}.*`;
  });
  return [...new Set(parts)].join(" · ");
}

/**
 * Full bundle for diagrams + logging.
 */
export function inferArchitectureFromPrompt(prompt, workflowType) {
  return {
    microservices: inferMicroserviceNodes(prompt, workflowType),
    monolithModules: inferMonolithModules(prompt, workflowType),
    eventConsumers: inferEventConsumerLabels(prompt, workflowType),
    topicHint: inferTopicHint(prompt, workflowType),
  };
}
