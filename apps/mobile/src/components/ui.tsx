import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { fonts, radius, typeScale, type Palette } from '../theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

export function ToolButton({
  icon,
  label,
  onPress,
  palette,
  active,
  disabled,
}: {
  icon: IconName;
  label?: string;
  onPress: () => void;
  palette: Palette;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.toolButton,
        {
          backgroundColor: active ? palette.accentSoft : pressed ? palette.surfaceHover : 'transparent',
          opacity: disabled ? 0.4 : 1,
        },
      ]}
    >
      <Ionicons name={icon} size={15} color={active ? palette.accent : palette.textMuted} />
      {label ? (
        <Text style={[styles.toolLabel, { color: active ? palette.accent : palette.textMuted }]}>{label}</Text>
      ) : null}
    </Pressable>
  );
}

export function AppButton({
  label,
  onPress,
  palette,
  variant = 'normal',
  icon,
  disabled,
  style,
}: {
  label: string;
  onPress: () => void;
  palette: Palette;
  variant?: 'normal' | 'primary' | 'danger' | 'ghost';
  icon?: IconName;
  disabled?: boolean;
  style?: ViewStyle;
}) {
  const background =
    variant === 'primary'
      ? palette.accent
      : variant === 'danger'
        ? palette.danger
        : variant === 'ghost'
          ? 'transparent'
          : palette.surfaceAlt;
  const color =
    variant === 'primary' || variant === 'danger' ? palette.textOnAccent : palette.text;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.appButton,
        {
          backgroundColor: background,
          borderColor: variant === 'ghost' ? palette.border : 'transparent',
          opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      {icon ? <Ionicons name={icon} size={14} color={color} /> : null}
      <Text style={[styles.appButtonText, { color }]}>{label}</Text>
    </Pressable>
  );
}

export function Field({
  value,
  onChangeText,
  placeholder,
  palette,
  secureTextEntry,
  multiline,
  autoCapitalize = 'none',
  style,
  onSubmitEditing,
}: {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  palette: Palette;
  secureTextEntry?: boolean;
  multiline?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  style?: StyleProp<TextStyle>;
  onSubmitEditing?: () => void;
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={palette.textMuted}
      secureTextEntry={secureTextEntry}
      multiline={multiline}
      autoCapitalize={autoCapitalize}
      onSubmitEditing={onSubmitEditing}
      style={[
        styles.field,
        {
          backgroundColor: palette.inputBg,
          borderColor: palette.border,
          color: palette.text,
          minHeight: multiline ? 90 : 34,
          textAlignVertical: multiline ? 'top' : 'center',
        },
        style,
      ]}
    />
  );
}

export function EmptyState({
  icon,
  title,
  subtitle,
  palette,
}: {
  icon: IconName;
  title: string;
  subtitle?: string;
  palette: Palette;
}) {
  return (
    <View style={styles.empty}>
      <Ionicons name={icon} size={36} color={palette.textMuted} />
      <Text style={[styles.emptyTitle, { color: palette.text }]}>{title}</Text>
      {subtitle ? <Text style={[styles.emptySubtitle, { color: palette.textMuted }]}>{subtitle}</Text> : null}
    </View>
  );
}

export function SectionTitle({ text, palette }: { text: string; palette: Palette }) {
  return (
    <Text style={[styles.sectionTitle, { color: palette.textMuted }]}>{text.toUpperCase()}</Text>
  );
}

export function Row({
  icon,
  title,
  subtitle,
  onPress,
  palette,
  right,
  selected,
}: {
  icon?: IconName;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  palette: Palette;
  right?: React.ReactNode;
  selected?: boolean;
}) {
  const content = (
    <View
      style={[
        styles.row,
        {
          backgroundColor: selected ? palette.accentSoft : 'transparent',
          borderRadius: radius.md,
        },
      ]}
    >
      {icon ? <Ionicons name={icon} size={16} color={selected ? palette.accent : palette.textMuted} /> : null}
      <View style={styles.rowText}>
        <Text style={[styles.rowTitle, { color: palette.text }]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[styles.rowSubtitle, { color: palette.textMuted }]} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right}
    </View>
  );

  if (!onPress) return content;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => (pressed ? { opacity: 0.7 } : undefined)}>
      {content}
    </Pressable>
  );
}

export function Toggle({
  value,
  onChange,
  palette,
}: {
  value: boolean;
  onChange: (next: boolean) => void;
  palette: Palette;
}) {
  return (
    <Pressable
      onPress={() => onChange(!value)}
      style={[
        styles.toggle,
        { backgroundColor: value ? palette.accent : palette.surfaceHover, borderColor: palette.border },
      ]}
    >
      <View
        style={[
          styles.knob,
          {
            backgroundColor: value ? palette.textOnAccent : palette.textMuted,
            alignSelf: value ? 'flex-end' : 'flex-start',
          },
        ]}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  toolButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: radius.md,
  },
  toolLabel: {
    fontFamily: fonts.regular,
    fontSize: typeScale.small + 1,
  },
  appButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  appButtonText: {
    fontFamily: fonts.medium,
    fontSize: typeScale.body,
  },
  field: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontFamily: fonts.regular,
    fontSize: typeScale.body,
    writingDirection: 'ltr',
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 20,
  },
  emptyTitle: {
    fontFamily: fonts.medium,
    fontSize: typeScale.body,
  },
  emptySubtitle: {
    fontFamily: fonts.regular,
    fontSize: typeScale.small + 1,
    textAlign: 'center',
  },
  sectionTitle: {
    fontFamily: fonts.bold,
    fontSize: typeScale.small,
    letterSpacing: 0.6,
    marginBottom: 6,
    marginTop: 10,
    writingDirection: 'ltr',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  rowText: {
    flex: 1,
  },
  rowTitle: {
    fontFamily: fonts.regular,
    fontSize: typeScale.body,
    writingDirection: 'ltr',
  },
  rowSubtitle: {
    fontFamily: fonts.regular,
    fontSize: typeScale.small,
    writingDirection: 'ltr',
  },
  toggle: {
    width: 40,
    height: 22,
    borderRadius: radius.pill,
    borderWidth: 1,
    padding: 2,
    justifyContent: 'center',
  },
  knob: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
});
