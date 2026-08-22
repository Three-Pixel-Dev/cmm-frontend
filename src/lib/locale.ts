import i18n from "@/i18n";

export type AppLanguage = "en" | "my";

export function setAppLanguage(lng: AppLanguage) {
  void i18n.changeLanguage(lng);
  try {
    localStorage.setItem("lang", lng);
  } catch {
    // ignore quota / privacy errors
  }
  document.documentElement.lang = lng;
}

export function getAppLanguage(): AppLanguage {
  return i18n.language === "my" ? "my" : "en";
}
