export type AppTheme = 'light' | 'dark' | 'system';

const THEME_KEY = 'msp_theme';

export function getSavedTheme(): AppTheme {
  const value = localStorage.getItem(THEME_KEY);
  if (value === 'light' || value === 'dark' || value === 'system') return value;
  return 'light';
}

export function applyTheme(theme: AppTheme): void {
  const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
  const shouldUseDark = theme === 'dark' || (theme === 'system' && prefersDark);
  document.documentElement.classList.toggle('dark', shouldUseDark);
  document.documentElement.setAttribute('data-theme', shouldUseDark ? 'dark' : 'light');
  const meta = document.querySelector('meta[name="theme-color"]');
  meta?.setAttribute('content', shouldUseDark ? '#0f172a' : '#059669');
}

export function saveTheme(theme: AppTheme): void {
  localStorage.setItem(THEME_KEY, theme);
  applyTheme(theme);
}
