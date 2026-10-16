import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { fonts, radius, typeScale, type Palette } from '../theme';
import { AppButton, Field } from './ui';

/** پنجرهٔ گفت‌وگوی کوچک داخل خود برNameه */
export function Dialog({
  visible,
  title,
  message,
  palette,
  inputValue,
  onChangeInput,
  inputPlaceholder,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  danger,
}: {
  visible: boolean;
  title: string;
  message?: string;
  palette: Palette;
  inputValue?: string;
  onChangeInput?: (text: string) => void;
  inputPlaceholder?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View
          style={[
            styles.dialog,
            { backgroundColor: palette.window, borderColor: palette.windowBorder },
          ]}
        >
          <Text style={[styles.title, { color: palette.text }]}>{title}</Text>
          {message ? <Text style={[styles.message, { color: palette.textMuted }]}>{message}</Text> : null}
          {onChangeInput !== undefined ? (
            <Field
              value={inputValue ?? ''}
              onChangeText={onChangeInput}
              placeholder={inputPlaceholder}
              palette={palette}
              autoCapitalize="none"
            />
          ) : null}
          <View style={styles.actions}>
            <AppButton
              label={cancelLabel}
              onPress={onCancel}
              palette={palette}
              variant="ghost"
              style={styles.action}
            />
            <AppButton
              label={confirmLabel}
              onPress={onConfirm}
              palette={palette}
              variant={danger ? 'danger' : 'primary'}
              style={styles.action}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  dialog: {
    width: '100%',
    maxWidth: 340,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: typeScale.title,
    writingDirection: 'ltr',
  },
  message: {
    fontFamily: fonts.regular,
    fontSize: typeScale.body,
    lineHeight: 20,
    writingDirection: 'ltr',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    gap: 8,
    marginTop: 4,
  },
  action: {
    minWidth: 92,
  },
});
