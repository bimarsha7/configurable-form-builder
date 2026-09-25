import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { THEME_STORAGE_KEY, useTheme } from '../hooks/useTheme';
import { ThemeSwitcher } from './ThemeSwitcher';

function ThemedApp() {
  const { preference, setPreference } = useTheme();
  return <ThemeSwitcher value={preference} onChange={setPreference} />;
}

/** jsdom has no matchMedia; this fake lets tests flip the OS setting. */
function mockSystemTheme(initiallyDark: boolean) {
  let matches = initiallyDark;
  const listeners = new Set<() => void>();
  vi.stubGlobal('matchMedia', () => ({
    get matches() {
      return matches;
    },
    addEventListener: (_: string, listener: () => void) => listeners.add(listener),
    removeEventListener: (_: string, listener: () => void) => listeners.delete(listener),
  }));
  return (dark: boolean) => {
    matches = dark;
    listeners.forEach((listener) => listener());
  };
}

const currentTheme = () => document.documentElement.dataset.theme;

afterEach(() => {
  vi.unstubAllGlobals();
  delete document.documentElement.dataset.theme;
});

describe('ThemeSwitcher', () => {
  it('follows the system theme by default, including live changes', () => {
    const setSystemDark = mockSystemTheme(true);
    render(<ThemedApp />);

    expect(screen.getByRole('radio', { name: 'System' })).toBeChecked();
    expect(currentTheme()).toBe('dark');

    act(() => setSystemDark(false));
    expect(currentTheme()).toBe('light');
  });

  it('lets the user override the system theme and remembers the choice', async () => {
    const setSystemDark = mockSystemTheme(true);
    const user = userEvent.setup();
    const { unmount } = render(<ThemedApp />);

    await user.click(screen.getByRole('radio', { name: 'Light' }));
    expect(currentTheme()).toBe('light');
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');

    // An explicit choice ignores the OS setting.
    act(() => setSystemDark(true));
    expect(currentTheme()).toBe('light');

    unmount();
    render(<ThemedApp />);
    expect(screen.getByRole('radio', { name: 'Light' })).toBeChecked();
  });

  it('ignores an invalid stored value', () => {
    mockSystemTheme(false);
    window.localStorage.setItem(THEME_STORAGE_KEY, 'purple');
    render(<ThemedApp />);

    expect(screen.getByRole('radio', { name: 'System' })).toBeChecked();
    expect(currentTheme()).toBe('light');
  });
});
