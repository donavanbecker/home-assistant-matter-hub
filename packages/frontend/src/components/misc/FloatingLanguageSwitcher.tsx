import LanguageIcon from "@mui/icons-material/Language";
import Box from "@mui/material/Box";
import Fab from "@mui/material/Fab";
import Fade from "@mui/material/Fade";
import Paper from "@mui/material/Paper";
import Popper from "@mui/material/Popper";
import Typography from "@mui/material/Typography";
import { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

interface LanguageOption {
  code: string;
  flag: string;
  name: string;
}

const languages: LanguageOption[] = [
  { code: "en", flag: "🇬🇧", name: "English" },
  { code: "de", flag: "🇩🇪", name: "Deutsch" },
];

export function FloatingLanguageSwitcher() {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement>(null);

  const currentLang = i18n.language?.split("-")[0] ?? "en";

  const handleToggle = useCallback(() => {
    setOpen((prev) => !prev);
  }, []);

  const handleSelect = useCallback(
    (code: string) => {
      i18n.changeLanguage(code);
      setOpen(false);
    },
    [i18n],
  );

  return (
    <>
      <Fab
        ref={anchorRef}
        size="small"
        color="primary"
        onClick={handleToggle}
        aria-label="Change language"
        sx={{
          position: "fixed",
          bottom: 24,
          right: 24,
          zIndex: 1300,
        }}
      >
        <LanguageIcon />
      </Fab>

      <Popper
        open={open}
        anchorEl={anchorRef.current}
        placement="top-end"
        transition
        sx={{ zIndex: 1300 }}
      >
        {({ TransitionProps }) => (
          <Fade {...TransitionProps} timeout={200}>
            <Paper
              elevation={8}
              sx={{
                mb: 1,
                py: 0.5,
                minWidth: 160,
                borderRadius: 2,
                overflow: "hidden",
              }}
            >
              {languages.map((lang) => (
                <Box
                  key={lang.code}
                  onClick={() => handleSelect(lang.code)}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                    px: 2,
                    py: 1,
                    cursor: "pointer",
                    bgcolor:
                      currentLang === lang.code
                        ? "action.selected"
                        : "transparent",
                    "&:hover": {
                      bgcolor: "action.hover",
                    },
                    transition: "background-color 0.15s",
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: "1.4rem",
                      lineHeight: 1,
                      userSelect: "none",
                    }}
                  >
                    {lang.flag}
                  </Typography>
                  <Typography
                    variant="body2"
                    fontWeight={currentLang === lang.code ? 600 : 400}
                  >
                    {lang.name}
                  </Typography>
                </Box>
              ))}
            </Paper>
          </Fade>
        )}
      </Popper>
    </>
  );
}
