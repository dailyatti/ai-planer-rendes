export type AIProvider = 'deepseek' | null;

export interface AIPermissions {
  plannerContext: boolean;
  financialContext: boolean;
  invoicingContext: boolean;
  writeActions: boolean;
}

export interface AIConfig {
  provider: AIProvider;
  apiKey: string;
  model?: string;
  baseUrl?: string;
  permissions?: AIPermissions;
}
