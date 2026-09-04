export const KPI_PRODUCTION_PROJECT_REF = "ktpolnkyyfkowxdmijww";
export const KPI_PRODUCTION_STANDARD_ORIGIN = `https://${KPI_PRODUCTION_PROJECT_REF}.supabase.co`;

type KpiRuntimeConfig = {
  appEnvironment?: string;
  dataEnvironment?: string;
  supabaseUrl?: string;
};

export type KpiRuntimeValidation =
  | { enabled: false; reason: "app_environment" }
  | { enabled: false; reason: "data_environment" }
  | { enabled: false; reason: "missing_supabase_url" }
  | { enabled: false; reason: "production_custom_domain_forbidden" }
  | { enabled: false; reason: "production_project_mismatch" }
  | { enabled: true; origin: typeof KPI_PRODUCTION_STANDARD_ORIGIN };

export function validateProductionKpiRuntime(config: KpiRuntimeConfig): KpiRuntimeValidation {
  if (config.appEnvironment?.trim().toLowerCase() !== "preview") {
    return { enabled: false, reason: "app_environment" };
  }
  if (config.dataEnvironment?.trim().toLowerCase() !== "production") {
    return { enabled: false, reason: "data_environment" };
  }

  const configuredUrl = config.supabaseUrl?.trim();
  if (!configuredUrl) return { enabled: false, reason: "missing_supabase_url" };

  let origin: string;
  try {
    const parsed = new URL(configuredUrl);
    if (parsed.username || parsed.password || parsed.pathname !== "/" || parsed.search || parsed.hash) {
      return { enabled: false, reason: "production_project_mismatch" };
    }
    origin = parsed.origin;
  } catch {
    return { enabled: false, reason: "production_project_mismatch" };
  }

  if (origin === "https://api.tribe-neon.com") {
    return { enabled: false, reason: "production_custom_domain_forbidden" };
  }
  if (origin !== KPI_PRODUCTION_STANDARD_ORIGIN) {
    return { enabled: false, reason: "production_project_mismatch" };
  }
  return { enabled: true, origin: KPI_PRODUCTION_STANDARD_ORIGIN };
}
