import AddIcon from "@mui/icons-material/Add";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import DeleteIcon from "@mui/icons-material/Delete";
import DevicesIcon from "@mui/icons-material/Devices";
import DownloadIcon from "@mui/icons-material/Download";
import ErrorIcon from "@mui/icons-material/Error";
import ExtensionIcon from "@mui/icons-material/Extension";
import InfoIcon from "@mui/icons-material/Info";
import PauseCircleIcon from "@mui/icons-material/PauseCircle";
import RefreshIcon from "@mui/icons-material/Refresh";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { useCallback, useEffect, useState } from "react";
import {
  type BridgePlugins,
  disablePlugin,
  enablePlugin,
  fetchInstalledPackages,
  fetchPlugins,
  type InstalledPackage,
  installPlugin,
  type PluginInfo,
  resetPlugin,
  uninstallPlugin,
} from "../../api/plugins.ts";

export const PluginsPage = () => {
  const [bridgePlugins, setBridgePlugins] = useState<BridgePlugins[]>([]);
  const [installedPkgs, setInstalledPkgs] = useState<InstalledPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [packageName, setPackageName] = useState("");
  const [installing, setInstalling] = useState(false);

  const loadAll = useCallback(async () => {
    try {
      const [plugins, installed] = await Promise.all([
        fetchPlugins(),
        fetchInstalledPackages(),
      ]);
      setBridgePlugins(plugins);
      setInstalledPkgs(installed);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load plugins");
    } finally {
      setLoading(false);
    }
  }, []);

  // Keep old name for bridge-level actions
  const loadPlugins = loadAll;

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleInstall = async () => {
    const name = packageName.trim();
    if (!name) return;
    setInstalling(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await installPlugin(name);
      setSuccess(
        `Installed ${result.packageName}${result.version ? `@${result.version}` : ""}. Restart the bridge to load it.`,
      );
      setPackageName("");
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Installation failed");
    } finally {
      setInstalling(false);
    }
  };

  const handleUninstall = async (pkg: string) => {
    if (
      !confirm(`Uninstall "${pkg}"? The bridge must be restarted afterwards.`)
    ) {
      return;
    }
    setActionLoading(`uninstall/${pkg}`);
    setError(null);
    setSuccess(null);
    try {
      await uninstallPlugin(pkg);
      setSuccess(`Uninstalled ${pkg}. Restart the bridge to apply.`);
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Uninstall failed");
    } finally {
      setActionLoading(null);
    }
  };

  const handleEnable = async (bridgeId: string, pluginName: string) => {
    const key = `${bridgeId}/${pluginName}/enable`;
    setActionLoading(key);
    try {
      await enablePlugin(bridgeId, pluginName);
      await loadPlugins();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to enable plugin");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDisable = async (bridgeId: string, pluginName: string) => {
    const key = `${bridgeId}/${pluginName}/disable`;
    setActionLoading(key);
    try {
      await disablePlugin(bridgeId, pluginName);
      await loadPlugins();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to disable plugin");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReset = async (bridgeId: string, pluginName: string) => {
    const key = `${bridgeId}/${pluginName}/reset`;
    setActionLoading(key);
    try {
      await resetPlugin(bridgeId, pluginName);
      await loadPlugins();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset plugin");
    } finally {
      setActionLoading(null);
    }
  };

  const totalPlugins = bridgePlugins.reduce(
    (sum, bp) => sum + bp.plugins.length,
    0,
  );

  return (
    <Box sx={{ p: 2 }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Typography variant="h5" component="h1">
          <ExtensionIcon sx={{ mr: 1, verticalAlign: "middle" }} />
          Plugins
        </Typography>
        <Tooltip title="Refresh">
          <IconButton onClick={loadPlugins} disabled={loading}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert
          severity="success"
          sx={{ mb: 2 }}
          onClose={() => setSuccess(null)}
        >
          {success}
        </Alert>
      )}

      {/* Install Plugin Section */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            <DownloadIcon
              sx={{ mr: 1, verticalAlign: "middle", fontSize: 20 }}
            />
            Install Plugin
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Enter an npm package name to install a plugin directly.
          </Typography>
          <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
            <TextField
              label="npm Package Name"
              placeholder="e.g. hamh-plugin-example"
              value={packageName}
              onChange={(e) => setPackageName(e.target.value)}
              disabled={installing}
              size="small"
              sx={{ flexGrow: 1, maxWidth: 400 }}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleInstall();
              }}
            />
            <Button
              variant="contained"
              onClick={handleInstall}
              disabled={installing || !packageName.trim()}
              startIcon={
                installing ? <CircularProgress size={16} /> : <AddIcon />
              }
            >
              {installing ? "Installing..." : "Install"}
            </Button>
          </Box>

          {/* Installed packages list */}
          {installedPkgs.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Divider sx={{ mb: 1 }} />
              <Typography
                variant="subtitle2"
                color="text.secondary"
                sx={{ mb: 1 }}
              >
                Installed Packages ({installedPkgs.length})
              </Typography>
              <Stack spacing={1}>
                {installedPkgs.map((pkg) => (
                  <Box
                    key={pkg.packageName}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      p: 1,
                      border: 1,
                      borderColor: "divider",
                      borderRadius: 1,
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <ExtensionIcon fontSize="small" color="action" />
                      <Typography variant="body2" fontWeight="bold">
                        {pkg.packageName}
                      </Typography>
                      <Chip
                        label={`v${pkg.version}`}
                        size="small"
                        variant="outlined"
                      />
                      <Typography variant="caption" color="text.secondary">
                        installed{" "}
                        {new Date(pkg.installedAt).toLocaleDateString()}
                      </Typography>
                    </Box>
                    <Tooltip title="Uninstall">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleUninstall(pkg.packageName)}
                        disabled={
                          actionLoading === `uninstall/${pkg.packageName}`
                        }
                      >
                        {actionLoading === `uninstall/${pkg.packageName}` ? (
                          <CircularProgress size={16} />
                        ) : (
                          <DeleteIcon fontSize="small" />
                        )}
                      </IconButton>
                    </Tooltip>
                  </Box>
                ))}
              </Stack>
            </Box>
          )}
        </CardContent>
      </Card>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
          <CircularProgress />
        </Box>
      ) : totalPlugins === 0 ? (
        <Card>
          <CardContent>
            <Box sx={{ textAlign: "center", py: 4 }}>
              <ExtensionIcon
                sx={{ fontSize: 64, color: "text.secondary", mb: 2 }}
              />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No Plugins Installed
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ maxWidth: 500, mx: "auto", mb: 3 }}
              >
                Plugins extend HAMH with custom device types, cloud
                integrations, and more. Install a plugin via npm or create your
                own.
              </Typography>
              <Alert severity="info" sx={{ maxWidth: 600, mx: "auto" }}>
                <Typography variant="body2">
                  <strong>How to install a plugin:</strong>
                </Typography>
                <Typography
                  variant="body2"
                  component="div"
                  sx={{ mt: 1, fontFamily: "monospace", fontSize: "0.85rem" }}
                >
                  1. Install:{" "}
                  <code>npm install hamh-plugin-example --prefix /data</code>
                  <br />
                  2. Configure in your bridge config or environment
                  <br />
                  3. Restart the bridge
                </Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>
                  See the{" "}
                  <a
                    href="https://riddix.github.io/home-assistant-matter-hub/plugin-development"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Plugin Development Guide
                  </a>{" "}
                  for details.
                </Typography>
              </Alert>
            </Box>
          </CardContent>
        </Card>
      ) : (
        <Stack spacing={3}>
          {bridgePlugins
            .filter((bp) => bp.plugins.length > 0)
            .map((bp) => (
              <Card key={bp.bridgeId}>
                <CardContent>
                  <Typography
                    variant="subtitle2"
                    color="text.secondary"
                    gutterBottom
                  >
                    Bridge: {bp.bridgeName}
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  <Stack spacing={2}>
                    {bp.plugins.map((plugin) => (
                      <PluginCard
                        key={plugin.name}
                        plugin={plugin}
                        bridgeId={bp.bridgeId}
                        actionLoading={actionLoading}
                        onEnable={handleEnable}
                        onDisable={handleDisable}
                        onReset={handleReset}
                      />
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            ))}
        </Stack>
      )}

      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            <InfoIcon sx={{ mr: 1, verticalAlign: "middle", fontSize: 20 }} />
            Creating a Plugin
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Plugins are npm packages that implement the MatterHubPlugin
            interface. They can register Matter devices, respond to commands
            from controllers, and poll external APIs for state changes.
          </Typography>
          <Alert severity="info">
            <Typography
              variant="body2"
              component="div"
              sx={{ fontFamily: "monospace", fontSize: "0.85rem" }}
            >
              {"// Minimal plugin example"}
              <br />
              {"export default class MyPlugin {"}
              <br />
              {"  name = 'my-plugin';"}
              <br />
              {"  version = '1.0.0';"}
              <br />
              {"  async onStart(ctx) {"}
              <br />
              {"    await ctx.registerDevice({"}
              <br />
              {"      id: 'my-device', name: 'My Device',"}
              <br />
              {"      deviceType: 'on_off_light',"}
              <br />
              {"      clusters: [{ clusterId: 'onOff',"}
              <br />
              {"        attributes: { onOff: false } }],"}
              <br />
              {"    });"}
              <br />
              {"  }"}
              <br />
              {"}"}
            </Typography>
          </Alert>
        </CardContent>
      </Card>
    </Box>
  );
};

function PluginCard({
  plugin,
  bridgeId,
  actionLoading,
  onEnable,
  onDisable,
  onReset,
}: {
  plugin: PluginInfo;
  bridgeId: string;
  actionLoading: string | null;
  onEnable: (bridgeId: string, name: string) => void;
  onDisable: (bridgeId: string, name: string) => void;
  onReset: (bridgeId: string, name: string) => void;
}) {
  const cb = plugin.circuitBreaker;
  const isCircuitBroken = cb?.disabled === true;
  const isEnabled = plugin.enabled && !isCircuitBroken;

  const statusColor = isCircuitBroken
    ? "error"
    : isEnabled
      ? "success"
      : "default";

  const statusLabel = isCircuitBroken
    ? "Circuit Breaker Open"
    : isEnabled
      ? "Active"
      : "Disabled";

  const StatusIcon = isCircuitBroken
    ? ErrorIcon
    : isEnabled
      ? CheckCircleIcon
      : PauseCircleIcon;

  return (
    <Box
      sx={{
        p: 2,
        border: 1,
        borderColor: isCircuitBroken ? "error.main" : "divider",
        borderRadius: 1,
        bgcolor: isCircuitBroken ? "error.50" : undefined,
      }}
    >
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
            <ExtensionIcon fontSize="small" />
            <Typography variant="subtitle1" fontWeight="bold">
              {plugin.name}
            </Typography>
            <Chip
              label={`v${plugin.version}`}
              size="small"
              variant="outlined"
            />
            <Chip
              label={statusLabel}
              size="small"
              color={statusColor}
              icon={<StatusIcon />}
            />
          </Box>
          <Typography variant="body2" color="text.secondary">
            Source: {plugin.source}
          </Typography>
          {plugin.devices.length > 0 && (
            <Box sx={{ mt: 1 }}>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mb: 0.5 }}
              >
                <DevicesIcon
                  sx={{ fontSize: 14, mr: 0.5, verticalAlign: "middle" }}
                />
                {plugin.devices.length} device
                {plugin.devices.length !== 1 ? "s" : ""}:
              </Typography>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                {plugin.devices.map((d) => (
                  <Chip
                    key={d.id}
                    label={`${d.name} (${d.deviceType})`}
                    size="small"
                    variant="outlined"
                  />
                ))}
              </Box>
            </Box>
          )}
          {isCircuitBroken && cb?.lastError && (
            <Alert severity="error" sx={{ mt: 1 }}>
              <Typography variant="body2">
                <strong>Last error:</strong> {cb.lastError}
              </Typography>
              {cb.disabledAt && (
                <Typography variant="caption" color="text.secondary">
                  Disabled at: {new Date(cb.disabledAt).toLocaleString()}
                </Typography>
              )}
            </Alert>
          )}
        </Box>
        <Box sx={{ display: "flex", gap: 1 }}>
          {isCircuitBroken ? (
            <Button
              size="small"
              variant="contained"
              color="warning"
              onClick={() => onReset(bridgeId, plugin.name)}
              disabled={actionLoading === `${bridgeId}/${plugin.name}/reset`}
            >
              {actionLoading === `${bridgeId}/${plugin.name}/reset`
                ? "Resetting..."
                : "Reset"}
            </Button>
          ) : isEnabled ? (
            <Button
              size="small"
              variant="outlined"
              color="error"
              onClick={() => onDisable(bridgeId, plugin.name)}
              disabled={actionLoading === `${bridgeId}/${plugin.name}/disable`}
            >
              {actionLoading === `${bridgeId}/${plugin.name}/disable`
                ? "Disabling..."
                : "Disable"}
            </Button>
          ) : (
            <Button
              size="small"
              variant="contained"
              onClick={() => onEnable(bridgeId, plugin.name)}
              disabled={actionLoading === `${bridgeId}/${plugin.name}/enable`}
            >
              {actionLoading === `${bridgeId}/${plugin.name}/enable`
                ? "Enabling..."
                : "Enable"}
            </Button>
          )}
        </Box>
      </Box>
    </Box>
  );
}
