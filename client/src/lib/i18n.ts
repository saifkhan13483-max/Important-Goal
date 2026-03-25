export type Language = "en" | "es" | "fr";

export const LANGUAGES: { code: Language; label: string; flag: string }[] = [
  { code: "en", label: "English", flag: "🇺🇸" },
  { code: "es", label: "Español", flag: "🇪🇸" },
  { code: "fr", label: "Français", flag: "🇫🇷" },
];

type TranslationKeys = {
  dashboard: string;
  goals: string;
  systems: string;
  templates: string;
  checkins: string;
  analytics: string;
  journal: string;
  aiCoach: string;
  workspace: string;
  settings: string;
  logout: string;
  newGoal: string;
  newSystem: string;
  save: string;
  cancel: string;
  delete: string;
  edit: string;
  done: string;
  missed: string;
  fallback: string;
  streak: string;
  streakFreeze: string;
  achievements: string;
  notifications: string;
  referral: string;
  partner: string;
  publicProfile: string;
  weeklyReport: string;
  language: string;
  focusTimer: string;
  habitStack: string;
  calendarSync: string;
  todayProgress: string;
  loading: string;
  error: string;
  welcome: string;
  signIn: string;
  signUp: string;
  freeDays: string;
  noDataYet: string;
};

const translations: Record<Language, TranslationKeys> = {
  en: {
    dashboard: "Dashboard",
    goals: "My Goals",
    systems: "My Systems",
    templates: "Templates",
    checkins: "Today's Progress",
    analytics: "Progress Insights",
    journal: "Reflections",
    aiCoach: "AI Coach",
    workspace: "Team Workspace",
    settings: "Settings",
    logout: "Sign out",
    newGoal: "New Goal",
    newSystem: "New System",
    save: "Save",
    cancel: "Cancel",
    delete: "Delete",
    edit: "Edit",
    done: "Done",
    missed: "Missed",
    fallback: "Fallback",
    streak: "Streak",
    streakFreeze: "Streak Freeze",
    achievements: "Achievements",
    notifications: "Notifications",
    referral: "Refer a Friend",
    partner: "Accountability Partner",
    publicProfile: "Public Profile",
    weeklyReport: "Weekly Report",
    language: "Language",
    focusTimer: "Focus Timer",
    habitStack: "Habit Stack",
    calendarSync: "Calendar Sync",
    todayProgress: "Today's Progress",
    loading: "Loading...",
    error: "Something went wrong",
    welcome: "Welcome back",
    signIn: "Sign In",
    signUp: "Sign Up",
    freeDays: "days free",
    noDataYet: "No data yet",
  },
  es: {
    dashboard: "Panel",
    goals: "Mis Metas",
    systems: "Mis Sistemas",
    templates: "Plantillas",
    checkins: "Progreso de Hoy",
    analytics: "Perspectivas",
    journal: "Reflexiones",
    aiCoach: "Coach de IA",
    workspace: "Espacio de Equipo",
    settings: "Configuración",
    logout: "Cerrar sesión",
    newGoal: "Nueva Meta",
    newSystem: "Nuevo Sistema",
    save: "Guardar",
    cancel: "Cancelar",
    delete: "Eliminar",
    edit: "Editar",
    done: "Hecho",
    missed: "Perdido",
    fallback: "Plan B",
    streak: "Racha",
    streakFreeze: "Congelar Racha",
    achievements: "Logros",
    notifications: "Notificaciones",
    referral: "Invitar un Amigo",
    partner: "Compañero de Responsabilidad",
    publicProfile: "Perfil Público",
    weeklyReport: "Informe Semanal",
    language: "Idioma",
    focusTimer: "Temporizador",
    habitStack: "Pila de Hábitos",
    calendarSync: "Sincronizar Calendario",
    todayProgress: "Progreso de Hoy",
    loading: "Cargando...",
    error: "Algo salió mal",
    welcome: "Bienvenido de vuelta",
    signIn: "Iniciar sesión",
    signUp: "Registrarse",
    freeDays: "días gratis",
    noDataYet: "Aún no hay datos",
  },
  fr: {
    dashboard: "Tableau de bord",
    goals: "Mes Objectifs",
    systems: "Mes Systèmes",
    templates: "Modèles",
    checkins: "Progrès du Jour",
    analytics: "Aperçus",
    journal: "Réflexions",
    aiCoach: "Coach IA",
    workspace: "Espace Équipe",
    settings: "Paramètres",
    logout: "Se déconnecter",
    newGoal: "Nouvel Objectif",
    newSystem: "Nouveau Système",
    save: "Enregistrer",
    cancel: "Annuler",
    delete: "Supprimer",
    edit: "Modifier",
    done: "Fait",
    missed: "Manqué",
    fallback: "Plan B",
    streak: "Série",
    streakFreeze: "Geler la Série",
    achievements: "Succès",
    notifications: "Notifications",
    referral: "Parrainer un Ami",
    partner: "Partenaire Responsable",
    publicProfile: "Profil Public",
    weeklyReport: "Rapport Hebdomadaire",
    language: "Langue",
    focusTimer: "Minuteur Focus",
    habitStack: "Pile d'Habitudes",
    calendarSync: "Sync Calendrier",
    todayProgress: "Progrès du Jour",
    loading: "Chargement...",
    error: "Une erreur s'est produite",
    welcome: "Bon retour",
    signIn: "Se connecter",
    signUp: "S'inscrire",
    freeDays: "jours gratuits",
    noDataYet: "Pas encore de données",
  },
};

let currentLang: Language = (localStorage.getItem("strivo_lang") as Language) || "en";

export function getLanguage(): Language {
  return currentLang;
}

export function setLanguage(lang: Language): void {
  currentLang = lang;
  localStorage.setItem("strivo_lang", lang);
}

export function t(key: keyof TranslationKeys): string {
  return translations[currentLang]?.[key] ?? translations.en[key] ?? key;
}

export function useI18n() {
  const lang = getLanguage();
  return {
    lang,
    t: (key: keyof TranslationKeys) => translations[lang]?.[key] ?? translations.en[key] ?? key,
  };
}
