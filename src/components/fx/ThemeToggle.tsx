import { AnimatePresence, motion } from "framer-motion";
import { Moon, Sun } from "lucide-react";
import { usePrefs } from "./PrefsProvider";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { prefs, toggleTheme } = usePrefs();
  const dark = prefs.theme === "dark";
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      aria-label={dark ? "Passer au thème clair" : "Passer au thème sombre"}
      title={dark ? "Thème clair" : "Thème sombre"}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={prefs.theme}
          initial={{ rotate: -90, opacity: 0, scale: 0.6 }}
          animate={{ rotate: 0, opacity: 1, scale: 1 }}
          exit={{ rotate: 90, opacity: 0, scale: 0.6 }}
          transition={{ duration: 0.25 }}
          className="flex"
        >
          {dark ? <Sun /> : <Moon />}
        </motion.span>
      </AnimatePresence>
    </Button>
  );
}
