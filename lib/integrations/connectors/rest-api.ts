import { applyMappings, type FieldMapping } from "@/lib/integrations/field-mapping";

export type RestConnectorConfig = {
  base_url: string;
  auth_type?: "bearer" | "basic" | "api_key";
  token?: string;
  username?: string;
  password?: string;
  api_key?: string;
  api_key_header?: string;
  endpoints?: Record<string, string>;
};

export type SyncResult = {
  object_type: string;
  records_processed: number;
  error_count: number;
};

export class RestApiConnector {
  async testConnection(config: RestConnectorConfig): Promise<boolean> {
    const response = await fetch(config.base_url, { headers: this.buildHeaders(config), method: "GET" });
    return response.ok;
  }

  async fetchRecords(config: RestConnectorConfig, endpoint: string, params?: Record<string, string>): Promise<unknown[]> {
    const url = new URL(endpoint, config.base_url);
    Object.entries(params ?? {}).forEach(([key, value]) => url.searchParams.set(key, value));
    const response = await fetch(url, { headers: this.buildHeaders(config), method: "GET" });
    if (!response.ok) {
      throw new Error(`REST fetch failed with ${response.status}.`);
    }
    const payload = await response.json();
    if (Array.isArray(payload)) return payload;
    if (Array.isArray((payload as { data?: unknown[] }).data)) return (payload as { data: unknown[] }).data;
    return [];
  }

  async syncObjectType(config: RestConnectorConfig, objectType: string, mappings: FieldMapping[]): Promise<{ records: Record<string, unknown>[]; stats: SyncResult }> {
    const endpoint = config.endpoints?.[objectType] ?? `/${objectType}`;
    const records = await this.fetchRecords(config, endpoint);
    const mapped = records.map((record) => applyMappings(record as Record<string, unknown>, mappings));
    return { records: mapped, stats: { object_type: objectType, records_processed: mapped.length, error_count: 0 } };
  }

  private buildHeaders(config: RestConnectorConfig) {
    const headers: Record<string, string> = { Accept: "application/json" };
    if (config.auth_type === "bearer" && config.token) headers.Authorization = `Bearer ${config.token}`;
    if (config.auth_type === "api_key" && config.api_key) headers[config.api_key_header ?? "x-api-key"] = config.api_key;
    if (config.auth_type === "basic" && config.username && config.password) headers.Authorization = `Basic ${Buffer.from(`${config.username}:${config.password}`).toString("base64")}`;
    return headers;
  }
}
