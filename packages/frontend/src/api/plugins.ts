export interface PluginCircuitBreaker {
  failures: number;
  disabled: boolean;
  lastError?: string;
  disabledAt?: number;
}

export interface PluginDeviceInfo {
  id: string;
  name: string;
  deviceType: string;
}

export interface PluginInfo {
  name: string;
  version: string;
  source: string;
  enabled: boolean;
  config: Record<string, unknown>;
  circuitBreaker?: PluginCircuitBreaker;
  devices: PluginDeviceInfo[];
}

export interface BridgePlugins {
  bridgeId: string;
  bridgeName: string;
  plugins: PluginInfo[];
}

export async function fetchPlugins(): Promise<BridgePlugins[]> {
  const response = await fetch("api/plugins");
  if (!response.ok) {
    throw new Error(`Failed to fetch plugins: ${response.statusText}`);
  }
  return response.json();
}

export async function enablePlugin(
  bridgeId: string,
  pluginName: string,
): Promise<void> {
  const response = await fetch(
    `api/plugins/${bridgeId}/${encodeURIComponent(pluginName)}/enable`,
    { method: "POST" },
  );
  if (!response.ok) {
    throw new Error(`Failed to enable plugin: ${response.statusText}`);
  }
}

export async function disablePlugin(
  bridgeId: string,
  pluginName: string,
): Promise<void> {
  const response = await fetch(
    `api/plugins/${bridgeId}/${encodeURIComponent(pluginName)}/disable`,
    { method: "POST" },
  );
  if (!response.ok) {
    throw new Error(`Failed to disable plugin: ${response.statusText}`);
  }
}

export async function resetPlugin(
  bridgeId: string,
  pluginName: string,
): Promise<void> {
  const response = await fetch(
    `api/plugins/${bridgeId}/${encodeURIComponent(pluginName)}/reset`,
    { method: "POST" },
  );
  if (!response.ok) {
    throw new Error(`Failed to reset plugin: ${response.statusText}`);
  }
}
