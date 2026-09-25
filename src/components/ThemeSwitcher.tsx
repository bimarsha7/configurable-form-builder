import { useId } from 'react';
import type { ThemePreference } from '../hooks/useTheme';
import { Icon, type IconName } from './ui/Icon';

const OPTIONS: { value: ThemePreference; label: string; icon: IconName }[] = [
  { value: 'system', label: 'System', icon: 'monitor' },
  { value: 'light', label: 'Light', icon: 'sun' },
  { value: 'dark', label: 'Dark', icon: 'moon' },
];

interface ThemeSwitcherProps {
  value: ThemePreference;
  onChange: (value: ThemePreference) => void;
}

/** Segmented control built on native radios, so arrow-key navigation comes for free. */
export function ThemeSwitcher({ value, onChange }: ThemeSwitcherProps) {
  const name = useId();

  return (
    <fieldset className="theme-switcher">
      <legend className="visually-hidden">Theme</legend>
      {OPTIONS.map((option) => (
        <label key={option.value} className="theme-switcher__option">
          <input
            type="radio"
            name={name}
            value={option.value}
            className="visually-hidden"
            checked={value === option.value}
            onChange={() => onChange(option.value)}
          />
          <Icon name={option.icon} size={14} />
          {option.label}
        </label>
      ))}
    </fieldset>
  );
}
