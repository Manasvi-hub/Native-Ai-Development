import ArchitectureFlowDiagram from "./ArchitectureFlowDiagram";
import { inferMicroserviceNodes } from "../utils/inferServicesFromPrompt";

/** @deprecated use inferMicroserviceNodes(prompt, workflowType) */
export function getWorkflowServiceLabels(workflowType) {
  return inferMicroserviceNodes("", workflowType);
}

/**
 * Architecture canvas powered by React Flow: directional edges, tier labels, and hierarchy.
 * `userPrompt` + `workflowType` drive inferred service nodes (see inferServicesFromPrompt).
 */
export default function ArchitectureDiagram({ architectureType, workflowType, userPrompt = "", flowStep = 0 }) {
  return (
    <ArchitectureFlowDiagram
      architectureType={architectureType}
      workflowType={workflowType}
      userPrompt={userPrompt}
      flowStep={flowStep}
    />
  );
}
