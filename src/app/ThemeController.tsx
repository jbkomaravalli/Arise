import { useEffect } from 'react';
import { useAuth } from './AuthProvider';
import { useData } from './DataProvider';

/**
 * Applies appearance preferences to the document root:
 *  - data-accent: violet (default) | indigo | cyan
 *  - data-surface: midnight (default) | amoled
 *  - data-reduced-motion: true disables CSS animation globally
 */
export function ThemeController() {
  const { bootstrap } = useData();
  const { status } = useAuth();
  const prefs = bootstrap?.profile.preferences;

  useEffect(() => {
    const root = document.documentElement;
    if (status === 'signedOut' || !prefs) {
      root.removeAttribute('data-accent');
      root.removeAttribute('data-surface');
      root.removeAttribute('data-reduced-motion');
      return;
    }
    if (prefs.accent && prefs.accent !== 'violet') root.setAttribute('data-accent', prefs.accent);
    else root.removeAttribute('data-accent');

    if (prefs.surface === 'amoled') root.setAttribute('data-surface', 'amoled');
    else root.removeAttribute('data-surface');

    const reduced =
      prefs.reducedMotion ||
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
    if (reduced) root.setAttribute('data-reduced-motion', 'true');
    else root.removeAttribute('data-reduced-motion');
  }, [prefs, status]);

  return null;
}
