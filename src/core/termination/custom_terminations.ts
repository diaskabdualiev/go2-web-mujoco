// Custom termination classes registered via mjswan.envs.mdp.terminations.register_termination_func().
// This file is auto-generated at build time — do not edit manually.

type TerminationConstructor = new (config: import('./TerminationBase').TerminationConfig) => import('./TerminationBase').TerminationBase;

export const CustomTerminations: Record<string, TerminationConstructor> = {};
