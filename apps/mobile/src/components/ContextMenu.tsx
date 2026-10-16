import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { fonts, radius, typeScale, type Palette } from '../theme';

export type ContextMenuItem = {
  key: string;
  label: string;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  danger?: boolean;
  onPress: () => void;
};

/** منوی زمینه داخل پنجره (مثل منوی راست‌کلیک ویندوز) */
export function ContextMenu({
  x,
  y,
  items,
  palette,
  onClose,
  width = 170,
}: {
  x: number;
  y: number;
  items: ContextMenuItem[];
  palette: Palette;
  onClose: () => void;
  width?: number;
}) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      <View
        style={[
          styles.menu,
          {
            backgroundColor: palette.menu,
            borderColor: palette.menuBorder,
            top: y,
            left: x,
            width,
          },
        ]}
      >
        {items.map((item, index) => (
          <View key={item.key}>
            {index > 0 ? <View style={[styles.separator, { backgroundColor: palette.border }]} /> : null}
            <Pressable
              onPress={() => {
                onClose();
                item.onPress();
              }}
              style={({ pressed }) => [
                styles.item,
                { backgroundColor: pressed ? palette.surfaceHover : 'transparent' },
              ]}
            >
              {item.icon ? (
                <Ionicons name={item.icon} size={14} color={item.danger ? palette.danger : palette.text} />
              ) : null}
              <Text
                style={[
                  styles.label,
                  { color: item.danger ? palette.danger : palette.text },
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  menu: {
    position: 'absolute',
    borderRadius: radius.md,
    borderWidth: 1,
    paddingVertical: 4,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  label: {
    fontFamily: fonts.regular,
    fontSize: typeScale.body,
    writingDirection: 'ltr',
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 2,
  },
});
