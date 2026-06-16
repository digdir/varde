import { Button } from '@digdir/designsystemet-react';
import { MoonIcon, SunIcon } from '@navikt/aksel-icons';
import { useEffect, useState } from 'react';

type Scheme = 'light' | 'dark';

export function ThemeToggle() {
  const [scheme, setScheme] = useState<Scheme>('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const attr = document.documentElement.getAttribute('data-color-scheme');
    if (attr === 'light' || attr === 'dark') {
      setScheme(attr);
    } else {
      const prefersDark = window.matchMedia(
        '(prefers-color-scheme: dark)',
      ).matches;
      setScheme(prefersDark ? 'dark' : 'light');
    }
  }, []);

  const toggle = () => {
    const next: Scheme = scheme === 'dark' ? 'light' : 'dark';
    setScheme(next);
    document.documentElement.setAttribute('data-color-scheme', next);
    try {
      localStorage.setItem('color-scheme', next);
    } catch {
      // ignore – persistence is best-effort
    }
  };

  // Until mounted, render the light-mode label so SSR and first client render
  // match (the no-flash script may already have set a different scheme).
  const isDark = mounted && scheme === 'dark';

  return (
    <Button type='button' variant='tertiary' data-size='sm' onClick={toggle}>
      {isDark ? (
        <MoonIcon aria-hidden='true' />
      ) : (
        <SunIcon aria-hidden='true' />
      )}
      Bytt fargemodus
    </Button>
  );
}
