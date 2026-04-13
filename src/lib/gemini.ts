import { GoogleGenAI } from "@google/genai";

export async function callGemini(
  apiKey: string,
  prompt: string,
  imageBase64?: string,
  mimeType?: string
) {
  const ai = new GoogleGenAI({ apiKey });
  
  const contents: any[] = [];
  
  if (imageBase64 && mimeType) {
    contents.push({
      inlineData: {
        mimeType: mimeType,
        data: imageBase64,
      },
    });
  }
  
  contents.push({ text: prompt });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: { parts: contents },
      config: {
        temperature: 0.1,
        responseMimeType: "application/json",
      },
    });

    const text = response.text;
    if (!text) throw new Error("Empty response from AI");

    // Strip markdown fences if present
    const clean = text.replace(/^```json\s*/m, "").replace(/^```\s*/m, "").replace(/```\s*$/m, "").trim();
    
    return JSON.parse(clean);
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    throw new Error(error.message || "Failed to call Gemini API");
  }
}

export const PROMPTS = {
  IDENTIFY: `You are an expert electrical engineering professor analyzing a DC circuit for Thevenin's theorem analysis.

Analyze this circuit image carefully. Identify every component, every node, and the circuit topology.

Return ONLY a valid JSON object. No explanation, no markdown, no code fences. Raw JSON only.

JSON schema:
{
  "components": [
    {
      "id": string,           // e.g. "V1", "R1", "R2", "RL"
      "type": string,         // "voltage_source" | "current_source" | "resistor"  
      "value": string,        // e.g. "12V", "4Ω", "unknown"
      "branch": string        // plain english location: "left vertical branch", "top series path", etc.
    }
  ],
  "nodes": [
    {
      "id": string,           // "A", "B", "N1", "N2", etc.
      "description": string   // "top-right junction", "ground rail", etc.
    }
  ],
  "load_resistor_id": string,         // the ID of RL (the component to be removed)
  "load_terminals": {
    "positive": string,               // node ID of terminal A
    "negative": string                // node ID of terminal B (usually ground)
  },
  "meshes": [
    {
      "id": string,           // "M1", "M2", etc.
      "components": [string], // component IDs in this mesh loop
      "direction": string     // "clockwise" | "counterclockwise"
    }
  ],
  "topology_summary": string,        // 1-2 sentence human-readable description
  "can_solve": boolean,              // true if circuit is solvable with Thevenin's theorem
  "cannot_solve_reason": string      // null if can_solve is true, else explain why
}`,

  MESH_SETUP: (circuitData: string, rlId: string, pos: string, neg: string) => `You are an electrical engineering professor. Given the circuit analysis below, assign mesh current variables and prepare for KVL analysis.

Circuit data: ${circuitData}

Note: The load resistor ${rlId} has been REMOVED. We are finding Vth (open-circuit voltage at terminals ${pos} and ${neg}).

Return ONLY valid JSON. No markdown. No explanation.

{
  "mesh_currents": [
    {
      "variable": string,       // "I1", "I2", etc.
      "mesh_id": string,        // "M1", "M2", etc.  
      "direction": string,      // "clockwise" | "counterclockwise"
      "description": string     // which loop in plain english
    }
  ],
  "open_circuit_note": string,  // explain which mesh current is zero due to open circuit at RL terminals
  "ready_for_kvl": boolean
}`,

  KVL: (circuitData: string, meshData: string, rlId: string, terminals: string) => `You are an electrical engineering professor writing KVL equations for Thevenin's theorem.

Circuit: ${circuitData}
Mesh assignments: ${meshData}
Load resistor ${rlId} is REMOVED (open circuit at terminals ${terminals}).

Write KVL equations for EACH mesh loop. Follow this convention:
- Voltage rises (sources in direction of travel): positive
- Voltage drops (resistors): negative  
- Shared branch currents: use (Ia - Ib) notation

Return ONLY valid JSON:
{
  "kvl_equations": [
    {
      "mesh": string,               // "M1", "M2", etc.
      "raw_equation": string,       // symbolic: "V1 - R1*I1 - R2*(I1-I2) = 0"
      "substituted_equation": string, // with values: "12 - 4*I1 - 6*(I1-I2) = 0"
      "simplified": string,         // rearranged: "10*I1 - 6*I2 = 12"
      "equation_label": string      // "(Equation 1)", "(Equation 2)", etc.
    }
  ],
  "system_of_equations": string,   // all equations together as a clean string for display
  "note": string                   // any special observations (e.g. "I2 = 0 due to open circuit")
}`,

  SOLVE: (kvlEquations: string) => `Solve the following system of KVL equations step by step.

Equations: ${kvlEquations}

Show every algebraic step. Use substitution or elimination method. Be explicit.

Return ONLY valid JSON:
{
  "method": string,             // "substitution" | "elimination" | "direct (single mesh)"
  "solution_steps": [
    {
      "step_number": number,
      "operation": string,      // e.g. "Substitute I2 = 0 into Equation 1"
      "expression": string,     // the equation at this step
      "result": string          // what we know after this step
    }
  ],
  "mesh_current_values": [
    {
      "variable": string,       // "I1", "I2"
      "value": number,          // in Amperes
      "unit": "A"
    }
  ],
  "solution_check": string      // verify: re-substitute values back into original equations
}`,

  VTH: (circuitData: string, meshCurrents: string, pos: string, neg: string) => `Calculate the open-circuit voltage Vth at terminals ${pos}-${neg} using the solved mesh currents.

Circuit: ${circuitData}
Mesh currents: ${meshCurrents}

Identify which branch connects directly to the terminals. Use the appropriate mesh current and component value to calculate Vth.

Return ONLY valid JSON:
{
  "vth_derivation_steps": [
    {
      "step": string,       // e.g. "Terminal A is connected to node between R2 and R3"
      "expression": string, // e.g. "Vth = V_AB = R2 × I1"
      "substituted": string,// e.g. "Vth = 6 × 1.2"
      "result": string      // e.g. "Vth = 7.2V"
    }
  ],
  "vth_value": number,      // in Volts
  "vth_unit": "V",
  "physical_meaning": string // 1 sentence: what Vth represents in this circuit
}`,

  RTH: (circuitData: string, terminals: string) => `Calculate the Thevenin resistance (Rth) seen from terminals ${terminals} with all independent sources deactivated.

Circuit topology: ${circuitData}
All voltage sources are replaced by short circuits. All current sources are replaced by open circuits.

Simplify the remaining resistor network step by step from the perspective of terminals [A]-[B].
Show each series/parallel combination explicitly.

Return ONLY valid JSON:
{
  "deactivated_sources": [string],   // list of sources replaced
  "remaining_network": string,       // describe the resistor network in plain english
  "simplification_steps": [
    {
      "step_number": number,
      "operation": string,           // "R1 and R2 are now in parallel"
      "expression": string,          // "R1∥R2 = (R1 × R2)/(R1 + R2)"
      "substituted": string,         // "(4 × 6)/(4 + 6)"
      "result": string,              // "= 2.4Ω"
      "remaining_network_description": string  // what the network looks like after this step
    }
  ],
  "rth_value": number,
  "rth_unit": "Ω",
  "rth_formula": string             // final formula: e.g. "Rth = R3 + R1∥R2 = 2 + 2.4 = 4.4Ω"
}`,

  VERIFY: (circuitData: string, rl: number, vth: number, rth: number, il: number) => `Verify Thevenin's theorem for this circuit by computing the load current IL directly from the original circuit (without using Thevenin equivalents) and confirming it matches our Thevenin solution.

Original circuit: ${circuitData}
Load resistor RL = ${rl} Ω
Our Thevenin solution: Vth = ${vth}, Rth = ${rth}, IL_thevenin = ${il}

Use mesh/nodal analysis or voltage divider on the ORIGINAL complete circuit (with RL included) to find IL directly.

Return ONLY valid JSON:
{
  "method_used": string,        // "mesh analysis" | "nodal analysis" | "voltage divider + current divider"
  "direct_calculation_steps": [
    {
      "step": string,
      "expression": string,
      "result": string
    }
  ],
  "il_direct_value": number,    // IL from direct analysis
  "il_thevenin_value": number,  // should match our computed IL
  "percentage_error": number,   // abs((direct - thevenin)/direct * 100)
  "verified": boolean,          // true if percentage_error < 1%
  "conclusion": string          // "Thevenin's theorem is verified. Both methods yield IL ≈ X A."
}`
};
