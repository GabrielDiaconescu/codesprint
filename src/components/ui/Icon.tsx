import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

import { useTheme } from '@/theme';

/**
 * Icon system (SPEC §8).
 *
 * One wrapper over a single icon set, so icon names stay type-checked and sizes/colours come
 * from the theme. Icons are decorative by default — a meaningful icon must be paired with a
 * text label rather than carrying the meaning alone (SPEC §47).
 */
export type IconName = ComponentProps<typeof Ionicons>['name'];

export type IconSize = 'sm' | 'md' | 'lg' | 'xl';

const SIZES: Record<IconSize, number> = { sm: 16, md: 20, lg: 24, xl: 32 };

export interface IconProps {
  name: IconName;
  size?: IconSize | number;
  color?: string;
  /** Provide only when the icon is the sole carrier of meaning. */
  label?: string;
}

export const Icon = ({ name, size = 'md', color, label }: IconProps) => {
  const theme = useTheme();

  return (
    <Ionicons
      name={name}
      size={typeof size === 'number' ? size : SIZES[size]}
      color={color ?? theme.colors.textPrimary}
      accessibilityElementsHidden={!label}
      importantForAccessibility={label ? 'yes' : 'no-hide-descendants'}
      accessibilityLabel={label}
      accessibilityRole={label ? 'image' : undefined}
    />
  );
};
