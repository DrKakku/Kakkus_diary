const storageKey = "kakku-theme-mode";

function initThemeController() {
  const root = document.documentElement;
  const lightTheme = root.dataset.lightTheme;
  const darkTheme = root.dataset.darkTheme;
  const defaultMode = root.dataset.defaultMode === "light" ? "light" : "dark";

  if (!lightTheme || !darkTheme) return;

  const applyMode = (mode: "light" | "dark") => {
    root.dataset.colorMode = mode;
    root.dataset.theme = mode === "dark" ? darkTheme : lightTheme;
    root.style.colorScheme = mode;
    document
      .querySelectorAll<HTMLElement>("[data-theme-toggle-label], [data-theme-toggle-label-mobile]")
      .forEach((label) => {
        label.textContent = mode === "dark" ? "Light mode" : "Dark mode";
      });
  };

  let mode = root.dataset.colorMode === "light" || root.dataset.colorMode === "dark"
    ? (root.dataset.colorMode as "light" | "dark")
    : defaultMode;

  try {
    const storedMode = window.localStorage.getItem(storageKey);
    if (storedMode === "light" || storedMode === "dark") {
      mode = storedMode;
    }
  } catch {}

  applyMode(mode);

  const toggle = () => {
    mode = mode === "dark" ? "light" : "dark";
    applyMode(mode);
    try {
      window.localStorage.setItem(storageKey, mode);
    } catch {}
  };

  document.querySelectorAll<HTMLElement>("[data-theme-toggle], [data-theme-toggle-mobile]").forEach((button) => {
    button.addEventListener("click", toggle);
  });
}

initThemeController();
