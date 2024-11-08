import { View, type ViewProps } from 'react-native';

import { useThemeColor } from '@/hooks/useThemeColor';
import { Colors } from 'react-native/Libraries/NewAppScreen';

export type ThemedViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
  colorName?:
    | 'text'
    | 'background'
    | 'backgroundSecondary'
    | 'tint'
    | 'icon'
    | 'tabIconDefault'
    | 'tabIconSelected';
};

export function ThemedView({
  style,
  lightColor,
  darkColor,
  colorName,
  ...otherProps
}: ThemedViewProps) {
  const backgroundColor = useThemeColor(
    { light: lightColor, dark: darkColor },
    colorName ?? 'background'
  );

  return <View style={[{ backgroundColor }, style]} {...otherProps} />;
}
