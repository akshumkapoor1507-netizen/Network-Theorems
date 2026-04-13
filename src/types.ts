export type Step = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

export type VirtualStep = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;

export interface Component {
  id: string;
  type: "voltage_source" | "current_source" | "resistor";
  value: string;
  branch: string;
}

export interface Node {
  id: string;
  description: string;
}

export interface Mesh {
  id: string;
  components: string[];
  direction: "clockwise" | "counterclockwise";
}

export interface CircuitData {
  components: Component[];
  nodes: Node[];
  load_resistor_id: string;
  load_terminals: {
    positive: string;
    negative: string;
  };
  meshes: Mesh[];
  topology_summary: string;
  can_solve: boolean;
  cannot_solve_reason: string | null;
}

export interface MeshCurrent {
  variable: string;
  mesh_id: string;
  direction: string;
  description: string;
}

export interface MeshData {
  mesh_currents: MeshCurrent[];
  open_circuit_note: string;
  ready_for_kvl: boolean;
}

export interface KVLEquation {
  mesh: string;
  raw_equation: string;
  substituted_equation: string;
  simplified: string;
  equation_label: string;
}

export interface KVLData {
  kvl_equations: KVLEquation[];
  system_of_equations: string;
  note: string;
}

export interface SolutionStep {
  step_number: number;
  operation: string;
  expression: string;
  result: string;
}

export interface MeshCurrentValue {
  variable: string;
  value: number;
  unit: string;
}

export interface SolveData {
  method: string;
  solution_steps: SolutionStep[];
  mesh_current_values: MeshCurrentValue[];
  solution_check: string;
}

export interface VthStep {
  step: string;
  expression: string;
  substituted: string;
  result: string;
}

export interface VthData {
  vth_derivation_steps: VthStep[];
  vth_value: number;
  vth_unit: string;
  physical_meaning: string;
}

export interface RthStep {
  step_number: number;
  operation: string;
  expression: string;
  substituted: string;
  result: string;
  remaining_network_description: string;
}

export interface RthData {
  deactivated_sources: string[];
  remaining_network: string;
  simplification_steps: RthStep[];
  rth_value: number;
  rth_unit: string;
  rth_formula: string;
}

export interface VerifyData {
  method_used: string;
  direct_calculation_steps: {
    step: string;
    expression: string;
    result: string;
  }[];
  il_direct_value: number;
  il_thevenin_value: number;
  percentage_error: number;
  verified: boolean;
  conclusion: string;
}

export interface Observation {
  id: string;
  step: number;
  parameter: string;
  symbol: string;
  value: string;
  unit: string;
}

export interface VirtualObservation {
  id: string;
  v1: number;
  r1: number;
  r2: number;
  r3: number;
  rl: number;
  vth: number;
  rth: number;
  il: number;
}

export interface APILogEntry {
  timestamp: string;
  step: string;
  promptSnippet: string;
  responseSnippet: string;
}

export interface AppState {
  apiKey: string;
  imageBase64: string;
  imageMimeType: string;
  currentStep: Step;
  completedSteps: Step[];
  circuitData: CircuitData | null;
  meshData: MeshData | null;
  kvlData: KVLData | null;
  solveData: SolveData | null;
  vthData: VthData | null;
  rthData: RthData | null;
  verifyData: VerifyData | null;
  vth: number | null;
  rth: number | null;
  rl: number | null;
  il: number | null;
  observations: Observation[];
  apiLog: APILogEntry[];
}
