import CategoryIcon from "@mui/icons-material/Category";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DevicesIcon from "@mui/icons-material/Devices";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExtensionIcon from "@mui/icons-material/Extension";
import FilterListIcon from "@mui/icons-material/FilterList";
import LabelIcon from "@mui/icons-material/Label";
import MeetingRoomIcon from "@mui/icons-material/MeetingRoom";
import SearchIcon from "@mui/icons-material/Search";
import ViewModuleIcon from "@mui/icons-material/ViewModule";
import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  type FilterValues,
  fetchAreas,
  fetchFilterValues,
  fetchLabels,
  type HomeAssistantArea,
  type HomeAssistantLabel,
} from "../../api/labels.ts";

interface ValueListProps {
  values: string[];
  copiedId: string | null;
  onCopy: (value: string) => void;
  searchable?: boolean;
}

const ValueList = ({
  values,
  copiedId,
  onCopy,
  searchable,
}: ValueListProps) => {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search) return values;
    const lower = search.toLowerCase();
    return values.filter((v) => v.toLowerCase().includes(lower));
  }, [values, search]);

  if (values.length === 0) {
    return (
      <Box sx={{ p: 2, textAlign: "center" }}>
        <Typography color="text.secondary" variant="body2">
          No values found.
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {searchable && values.length > 10 && (
        <Box sx={{ px: 2, pt: 1, pb: 0.5 }}>
          <TextField
            size="small"
            fullWidth
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              },
            }}
          />
        </Box>
      )}
      <Box sx={{ p: 1.5, display: "flex", flexWrap: "wrap", gap: 0.75 }}>
        {filtered.map((value) => (
          <Chip
            key={value}
            label={value}
            size="small"
            variant={copiedId === value ? "filled" : "outlined"}
            color={copiedId === value ? "success" : "default"}
            onClick={() => onCopy(value)}
            sx={{ fontFamily: "monospace", fontSize: "0.8rem" }}
          />
        ))}
        {search && filtered.length === 0 && (
          <Typography color="text.secondary" variant="body2" sx={{ p: 1 }}>
            No matches for &quot;{search}&quot;
          </Typography>
        )}
      </Box>
    </Box>
  );
};

export const LabelsPage = () => {
  const [labels, setLabels] = useState<HomeAssistantLabel[]>([]);
  const [areas, setAreas] = useState<HomeAssistantArea[]>([]);
  const [filterValues, setFilterValues] = useState<FilterValues | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [labelsData, areasData, filterData] = await Promise.all([
        fetchLabels(),
        fetchAreas(),
        fetchFilterValues(),
      ]);
      setLabels(labelsData);
      setAreas(areasData);
      setFilterValues(filterData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" component="h1" sx={{ mb: 3 }}>
        <FilterListIcon sx={{ mr: 1, verticalAlign: "middle" }} />
        Filter Reference
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        Browse all available filter values for your bridge configuration. Click
        any value to copy it to your clipboard.
      </Alert>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Labels */}
      <Typography variant="h6" sx={{ mb: 1 }}>
        <LabelIcon sx={{ mr: 0.5, fontSize: 20, verticalAlign: "middle" }} />
        Labels ({labels.length})
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Use with filter type <b>&quot;entity_label&quot;</b> or{" "}
        <b>&quot;device_label&quot;</b>. You can use either the display name or
        the label_id.
      </Typography>
      <Card sx={{ mb: 4 }}>
        {labels.length === 0 ? (
          <Box sx={{ p: 3, textAlign: "center" }}>
            <Typography color="text.secondary">
              No labels found in Home Assistant. Create labels under Settings
              &gt; Labels.
            </Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: "bold" }}>
                    Display Name
                  </TableCell>
                  <TableCell sx={{ fontWeight: "bold" }}>label_id</TableCell>
                  <TableCell width={48} />
                </TableRow>
              </TableHead>
              <TableBody>
                {labels.map((label) => (
                  <TableRow key={label.label_id} hover>
                    <TableCell>
                      {label.color && (
                        <Box
                          component="span"
                          sx={{
                            display: "inline-block",
                            width: 12,
                            height: 12,
                            borderRadius: "50%",
                            backgroundColor: label.color,
                            mr: 1,
                            verticalAlign: "middle",
                          }}
                        />
                      )}
                      {label.name}
                    </TableCell>
                    <TableCell>
                      <code>{label.label_id}</code>
                    </TableCell>
                    <TableCell>
                      <Tooltip
                        title={
                          copiedId === label.label_id ? "Copied!" : "Copy ID"
                        }
                      >
                        <IconButton
                          size="small"
                          onClick={() => copyToClipboard(label.label_id)}
                        >
                          <ContentCopyIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Card>

      {/* Areas */}
      <Typography variant="h6" sx={{ mb: 1 }}>
        <MeetingRoomIcon
          sx={{ mr: 0.5, fontSize: 20, verticalAlign: "middle" }}
        />
        Areas ({areas.length})
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Use with filter type <b>&quot;area&quot;</b>. Areas are also used for
        automatic room assignment in Matter controllers.
      </Typography>
      <Card sx={{ mb: 4 }}>
        {areas.length === 0 ? (
          <Box sx={{ p: 3, textAlign: "center" }}>
            <Typography color="text.secondary">
              No areas found in Home Assistant. Create areas under Settings &gt;
              Areas.
            </Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: "bold" }}>
                    Display Name
                  </TableCell>
                  <TableCell sx={{ fontWeight: "bold" }}>area_id</TableCell>
                  <TableCell width={48} />
                </TableRow>
              </TableHead>
              <TableBody>
                {areas.map((area) => (
                  <TableRow key={area.area_id} hover>
                    <TableCell>{area.name}</TableCell>
                    <TableCell>
                      <code>{area.area_id}</code>
                    </TableCell>
                    <TableCell>
                      <Tooltip
                        title={
                          copiedId === area.area_id ? "Copied!" : "Copy ID"
                        }
                      >
                        <IconButton
                          size="small"
                          onClick={() => copyToClipboard(area.area_id)}
                        >
                          <ContentCopyIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Card>

      {/* Other filter values */}
      {filterValues && (
        <>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Other Filter Values
          </Typography>

          <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <ViewModuleIcon sx={{ mr: 1 }} />
              <Typography>Domains ({filterValues.domains.length})</Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ p: 0 }}>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ px: 2, pb: 1 }}
              >
                Use with filter type <b>&quot;domain&quot;</b>.
              </Typography>
              <ValueList
                values={filterValues.domains}
                copiedId={copiedId}
                onCopy={copyToClipboard}
              />
            </AccordionDetails>
          </Accordion>

          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <ExtensionIcon sx={{ mr: 1 }} />
              <Typography>
                Platforms / Integrations ({filterValues.platforms.length})
              </Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ p: 0 }}>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ px: 2, pb: 1 }}
              >
                Use with filter type <b>&quot;platform&quot;</b>.
              </Typography>
              <ValueList
                values={filterValues.platforms}
                copiedId={copiedId}
                onCopy={copyToClipboard}
              />
            </AccordionDetails>
          </Accordion>

          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <CategoryIcon sx={{ mr: 1 }} />
              <Typography>
                Entity Categories ({filterValues.entityCategories.length})
              </Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ p: 0 }}>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ px: 2, pb: 1 }}
              >
                Use with filter type <b>&quot;entity_category&quot;</b>.
              </Typography>
              <ValueList
                values={filterValues.entityCategories}
                copiedId={copiedId}
                onCopy={copyToClipboard}
              />
            </AccordionDetails>
          </Accordion>

          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <CategoryIcon sx={{ mr: 1 }} />
              <Typography>
                Device Classes ({filterValues.deviceClasses.length})
              </Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ p: 0 }}>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ px: 2, pb: 1 }}
              >
                Use with filter type <b>&quot;device_class&quot;</b>.
              </Typography>
              <ValueList
                values={filterValues.deviceClasses}
                copiedId={copiedId}
                onCopy={copyToClipboard}
                searchable
              />
            </AccordionDetails>
          </Accordion>

          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <DevicesIcon sx={{ mr: 1 }} />
              <Typography>
                Device Names ({filterValues.deviceNames.length})
              </Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ p: 0 }}>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ px: 2, pb: 1 }}
              >
                Use with filter type <b>&quot;device_name&quot;</b>.
              </Typography>
              <ValueList
                values={filterValues.deviceNames}
                copiedId={copiedId}
                onCopy={copyToClipboard}
                searchable
              />
            </AccordionDetails>
          </Accordion>

          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <DevicesIcon sx={{ mr: 1 }} />
              <Typography>
                Product Names ({filterValues.productNames.length})
              </Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ p: 0 }}>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ px: 2, pb: 1 }}
              >
                Use with filter type <b>&quot;product_name&quot;</b>.
              </Typography>
              <ValueList
                values={filterValues.productNames}
                copiedId={copiedId}
                onCopy={copyToClipboard}
                searchable
              />
            </AccordionDetails>
          </Accordion>
        </>
      )}
    </Box>
  );
};
