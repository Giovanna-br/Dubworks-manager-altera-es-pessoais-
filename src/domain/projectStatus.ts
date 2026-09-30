export const PROJECT_STATUS_OPTIONS = [
  "Aguardando aprovação",
  "Aguardando início",
  "Seleção",
  "Em andamento",
  "Em edição",
  "Pausado",
  "Stand-by",
  "Finalizado",
] as const;

export type ProjectStatus = (typeof PROJECT_STATUS_OPTIONS)[number];
