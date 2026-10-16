import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppButton, EmptyState } from '../components/ui';
import { useShell } from '../state/ShellProvider';
import { useVfs } from '../state/VfsProvider';
import { fonts, radius, typeScale } from '../theme';
import type { AppProps } from '../registry';

export function RecycleBinApp(_props: AppProps) {
  const { palette } = useShell();
  const vfs = useVfs();
  const [status, setStatus] = useState('');

  const flash = (message: string) => {
    setStatus(message);
    setTimeout(() => setStatus(''), 1800);
  };

  return (
    <View style={[styles.root, { backgroundColor: palette.surface }]}>
      <View style={[styles.toolbar, { borderBottomColor: palette.border }]}>
        <Text style={[styles.count, { color: palette.text }]}>
          {vfs.trashNodes.length} مورد در سطل زباله
        </Text>
        <View style={{ flex: 1 }} />
        <AppButton
          label="خالی کردن سطل"
          icon="trash-outline"
          palette={palette}
          variant="danger"
          onPress={async () => {
            await vfs.emptyTrash();
            flash('سطل زباله خالی شد.');
          }}
        />
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {vfs.trashNodes.length === 0 ? (
          <EmptyState
            icon="trash-outline"
            title="سطل زباله خالی است"
            subtitle="فایل‌های حذف‌شده اینجا نگه داشته می‌شوند."
            palette={palette}
          />
        ) : (
          vfs.trashNodes.map((node) => (
            <View
              key={node.id}
              style={[styles.item, { backgroundColor: palette.surfaceAlt, borderColor: palette.border }]}
            >
              <Ionicons
                name={node.kind === 'folder' ? 'folder' : 'document-text-outline'}
                size={18}
                color={node.kind === 'folder' ? '#f2b544' : palette.textMuted}
              />
              <View style={styles.itemText}>
                <Text numberOfLines={1} style={[styles.itemTitle, { color: palette.text }]}>
                  {node.name}
                </Text>
                <Text style={[styles.itemMeta, { color: palette.textMuted }]}>
                  حذف‌شده در {node.deletedAt ? new Date(node.deletedAt).toLocaleString('fa-IR') : '—'}
                </Text>
              </View>
              <Pressable
                onPress={async () => {
                  await vfs.restore(node.id);
                  flash(`«${node.name}» بازیابی شد.`);
                }}
                style={styles.iconButton}
              >
                <Ionicons name="refresh-outline" size={16} color={palette.accent} />
              </Pressable>
              <Pressable
                onPress={async () => {
                  await vfs.purge(node.id);
                  flash(`«${node.name}» برای همیشه حذف شد.`);
                }}
                style={styles.iconButton}
              >
                <Ionicons name="close" size={16} color={palette.danger} />
              </Pressable>
            </View>
          ))
        )}
      </ScrollView>

      {status ? (
        <Text style={[styles.status, { color: palette.success }]}>{status}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  toolbar: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  count: {
    fontFamily: fonts.medium,
    fontSize: typeScale.body,
    writingDirection: 'rtl',
  },
  list: {
    padding: 10,
    gap: 8,
  },
  item: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  itemText: {
    flex: 1,
  },
  itemTitle: {
    fontFamily: fonts.regular,
    fontSize: typeScale.body,
    writingDirection: 'rtl',
  },
  itemMeta: {
    fontFamily: fonts.regular,
    fontSize: typeScale.small,
    writingDirection: 'rtl',
  },
  iconButton: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  status: {
    fontFamily: fonts.regular,
    fontSize: typeScale.small,
    textAlign: 'center',
    paddingBottom: 6,
    writingDirection: 'rtl',
  },
});
