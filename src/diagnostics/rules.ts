export type DiagnosticStatus = "pass" | "warn" | "fail";

export type DiagnosticResult = {
  status: DiagnosticStatus;
  title: string;
  details?: string;
  suggestions?: string[];
};
