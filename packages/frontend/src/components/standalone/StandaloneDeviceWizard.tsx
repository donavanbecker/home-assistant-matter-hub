import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Step from "@mui/material/Step";
import StepLabel from "@mui/material/StepLabel";
import Stepper from "@mui/material/Stepper";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import CardContent from "@mui/material/CardContent";
import Grid from "@mui/material/Grid";
// Device type metadata for selection step
const deviceTypes = [
  {
    id: "light",
    nameKey: "standaloneDeviceWizard.deviceType.light",
    descKey: "standaloneDeviceWizard.deviceType.lightDesc",
    icon: "💡",
  },
  {
    id: "switch",
    nameKey: "standaloneDeviceWizard.deviceType.switch",
    descKey: "standaloneDeviceWizard.deviceType.switchDesc",
    icon: "🔌",
  },
  {
    id: "sensor",
    nameKey: "standaloneDeviceWizard.deviceType.sensor",
    descKey: "standaloneDeviceWizard.deviceType.sensorDesc",
    icon: "📊",
  },
  {
    id: "climate",
    nameKey: "standaloneDeviceWizard.deviceType.climate",
    descKey: "standaloneDeviceWizard.deviceType.climateDesc",
    icon: "🌡️",
  },
  {
    id: "lock",
    nameKey: "standaloneDeviceWizard.deviceType.lock",
    descKey: "standaloneDeviceWizard.deviceType.lockDesc",
    icon: "🔒",
  },
  {
    id: "vacuum",
    nameKey: "standaloneDeviceWizard.deviceType.vacuum",
    descKey: "standaloneDeviceWizard.deviceType.vacuumDesc",
    icon: "🤖",
  },
  {
    id: "media_player",
    nameKey: "standaloneDeviceWizard.deviceType.mediaPlayer",
    descKey: "standaloneDeviceWizard.deviceType.mediaPlayerDesc",
    icon: "🎵",
  },
];
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { createStandaloneDevice } from "../../api/standalone-devices";

interface StandaloneDeviceWizardProps {
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export function StandaloneDeviceWizard({
  open,
  onClose,
  onComplete,
}: StandaloneDeviceWizardProps) {
  const { t } = useTranslation();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [deviceType, setDeviceType] = useState("");
  const [entities, setEntities] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleNext = () => {
    if (step === 0 && !name.trim()) {
      setError(t("standaloneDeviceWizard.nameRequired"));
      return;
    }
    if (step === 1 && !deviceType.trim()) {
      setError(t("standaloneDeviceWizard.deviceTypeRequired"));
      return;
    }
    if (step === 2 && !entities.trim()) {
      setError(t("standaloneDeviceWizard.entitiesRequired"));
      return;
    }
    setError(null);
    setStep((s) => s + 1);
  };

  const handleBack = () => setStep((s) => s - 1);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleFinish = async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      await createStandaloneDevice({
        name,
        deviceType,
        entities: entities
          .split(",")
          .map((e) => e.trim())
          .filter(Boolean),
      });
      onComplete();
      onClose();
    } catch (err: any) {
      setSubmitError(err?.message || t("standaloneDeviceWizard.createFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  const steps = [
    t("standaloneDeviceWizard.nameStep"),
    t("standaloneDeviceWizard.deviceTypeStep"),
    t("standaloneDeviceWizard.entitiesStep"),
    t("standaloneDeviceWizard.reviewStep"),
  ];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t("standaloneDeviceWizard.title")}</DialogTitle>
      <Box sx={{ px: 3, pt: 1 }}>
        <Stepper activeStep={step} alternativeLabel sx={{ mb: 2 }}>
          {steps.map((label, idx) => (
            <Step key={label} completed={step > idx}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {t("standaloneDeviceWizard.subtitle")}
        </Typography>
      </Box>
      <DialogContent>
        {submitError && (
          <Typography color="error" sx={{ mb: 2 }}>
            {submitError}
          </Typography>
        )}
        {step === 0 && (
          <>
            <TextField
              fullWidth
              label={t("standaloneDeviceWizard.deviceName")}
              value={name}
              onChange={(e) => setName(e.target.value)}
              error={!!error}
              helperText={error}
              autoFocus
            />
          </>
        )}
        {step === 1 && (
          <>
            <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>
              {t("standaloneDeviceWizard.deviceTypeStep")}
            </Typography>
            <Grid container spacing={2} sx={{ mb: 2 }}>
              {deviceTypes.map((type) => (
                <Grid item xs={12} sm={6} md={4} key={type.id}>
                  <Card
                    variant={deviceType === type.id ? "outlined" : undefined}
                    sx={{
                      borderColor: deviceType === type.id ? "primary.main" : "divider",
                      borderWidth: deviceType === type.id ? 2 : 1,
                      bgcolor: deviceType === type.id ? "action.selected" : "background.paper",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <CardActionArea
                      onClick={() => {
                        setDeviceType(type.id);
                        setError(null);
                      }}
                      sx={{ p: 2, height: "100%" }}
                    >
                      <Box sx={{ fontSize: 36, mb: 1 }}>{type.icon}</Box>
                      <CardContent sx={{ p: 0 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                          {t(type.nameKey)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {t(type.descKey)}
                        </Typography>
                      </CardContent>
                    </CardActionArea>
                  </Card>
                </Grid>
              ))}
            </Grid>
            {error && (
              <Typography color="error" sx={{ mb: 1 }}>{error}</Typography>
            )}
          </>
        )}
        {step === 2 && (
          <>
            <TextField
              fullWidth
              label={t("standaloneDeviceWizard.entities")}
              value={entities}
              onChange={(e) => setEntities(e.target.value)}
              error={!!error}
              helperText={error}
              autoFocus
            />
          </>
        )}
        {step === 3 && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle1" sx={{ mb: 1 }}>
              {t("standaloneDeviceWizard.reviewStep")}
            </Typography>
            <Typography>
              <b>{t("standaloneDeviceWizard.deviceName")}:</b> {name}
            </Typography>
            <Typography>
              <b>{t("standaloneDeviceWizard.deviceType")}:</b> {deviceType}
            </Typography>
            <Typography>
              <b>{t("standaloneDeviceWizard.entities")}:</b> {entities}
            </Typography>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={submitting}>
          {t("common.cancel")}
        </Button>
        {step > 0 && (
          <Button onClick={handleBack} disabled={submitting}>
            {t("common.back")}
          </Button>
        )}
        {step < 3 && (
          <Button onClick={handleNext} disabled={submitting}>
            {t("common.next")}
          </Button>
        )}
        {step === 3 && (
          <Button
            variant="contained"
            onClick={handleFinish}
            disabled={submitting}
          >
            {submitting
              ? t("standaloneDeviceWizard.creating")
              : t("common.finish")}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
