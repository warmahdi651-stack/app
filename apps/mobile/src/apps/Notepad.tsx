import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Dialog } from '../components/Dialog';
import { AppButton, Field } from '../components/ui';
import { toPersianDigits } from '../lib/fa';
import { useShell } from '../state/ShellProvider';
import { useVfs } from '../state/VfsProvider';
import { useWindows } from '../state/WindowProvider';
import { fonts, radius, typeScale } from '../theme';
import type { AppProps } from '../registry';

export function NotepadApp({ props, windowId }: AppProps) {
  const { palette } = useShell();
  const vfs = useVfs();
  const { setWindowTitle, closeWindow } = useWindows();

  const fileId = props.fileId as string | undefined;
  const [content, setContent] = useState('');
  const [dirty, setDirty] = useState(false);
  const [wrap, setWrap] = useState(true);
  const [dialog, setDialog] = useState<null | { mode: 'saveAs' | 'rename'; value: string }>(null);
  const [status, setStatus] = useState('');

  const file = fileId ? vfs.nodeById(fileId) : undefined;

  useEffect(() => {
    if (file) {
      setContent(file.content);
      setDirty(false);
      setWindowTitle(windowId, `${file.name} — Notepad`);
    } else {
      setContent('');
      setWindowTitle(windowId, 'Notepad — سند بدون‌نام');
    }
  }, [file, fileId, setWindowTitle, windowId]);

  const stats = useMemo(() => {
    const text = content;
    const lines = text.split('\n');
    const line = lines.length;
    const column = (lines[lines.length - 1]?.length ?? 0) + 1;
    return { line, column, chars: text.length, words: text.trim() ? text.trim().split(/\s+/).length : 0 };
  }, [content]);

  const save = async () => {
    if (!fileId) {
      setDialog({ mode: 'saveAs', value: 'سند.txt' });
      return;
    }
    await vfs.updateFile(fileId, content);
    setDirty(false);
    setStatus('ذخیره شد');
    setTimeout(() => setStatus(''), 1600);
  };

  return (
    <View style={[styles.root, { backgroundColor: palette.surface }]}>
      <View style={[styles.menuBar, { borderBottomColor: palette.border, backgroundColor: palette.surfaceAlt }]}>
        <MenuItem label="فایل" palette={palette} onPress={() => setDialog({ mode: 'saveAs', value: file?.name ?? 'سند.txt' })} />
        <MenuItem
          label="ویرایش"
          palette={palette}
          onPress={() => setContent((c) => c + '\n')}
        />
        <MenuItem
          label="قالب"
          palette={palette}
          onPress={() => setWrap((w) => !w)}
          active={wrap}
        />
        <View style={{ flex: 1 }} />
        {dirty ? <Text style={[styles.dirty, { color: palette.warning }]}>تغییرات ذخیره‌نشده</Text> : null}
        <Pressable
          onPress={save}
          style={({ pressed }) => [styles.saveButton, { backgroundColor: palette.accent, opacity: pressed ? 0.8 : 1 }]}
        >
          <Ionicons name="save-outline" size={13} color={palette.textOnAccent} />
          <Text style={[styles.saveText, { color: palette.textOnAccent }]}>ذخیره</Text>
        </Pressable>
      </View>

      <TextInput
        value={content}
        onChangeText={(text) => {
          setContent(text);
          setDirty(true);
        }}
        multiline
        textAlignVertical="top"
        style={[
          styles.editor,
          {
            color: palette.text,
            backgroundColor: palette.inputBg,
            textAlign: 'right',
            writingDirection: 'rtl',
          },
          wrap ? undefined : { height: 220 },
        ]}
      />

      <View style={[styles.statusBar, { borderTopColor: palette.border, backgroundColor: palette.surfaceAlt }]}>
        <Text style={[styles.statusText, { color: palette.textMuted }]}>
          سطر {toPersianDigits(stats.line)}، ستون {toPersianDigits(stats.column)}
        </Text>
        <Text style={[styles.statusText, { color: palette.textMuted }]}>
          {toPersianDigits(stats.chars)} نویسه
        </Text>
        <Text style={[styles.statusText, { color: palette.textMuted }]}>
          {toPersianDigits(stats.words)} واژه
        </Text>
        <View style={{ flex: 1 }} />
        {status ? <Text style={[styles.statusText, { color: palette.success }]}>{status}</Text> : null}
      </View>

      <Dialog
        visible={dialog !== null}
        title={dialog?.mode === 'rename' ? 'تغییر نام فایل' : 'ذخیره به‌عنوان'}
        palette={palette}
        inputValue={dialog?.value ?? ''}
        onChangeInput={(text) => setDialog((d) => (d ? { ...d, value: text } : d))}
        inputPlaceholder="نام فایل"
        onCancel={() => setDialog(null)}
        onConfirm={async () => {
          if (!dialog) return;
          const name = dialog.value.trim() || 'سند.txt';
          if (fileId) {
            await vfs.rename(fileId, name);
            await vfs.updateFile(fileId, content);
            setDirty(false);
          } else {
            const parent = vfs.root?.id ?? null;
            const created = await vfs.createFile(parent, name, content);
            if (created) {
              setWindowTitle(windowId, `${name} — Notepad`);
            }
            setDirty(false);
          }
          setDialog(null);
        }}
      />
    </View>
  );
}

function MenuItem({
  label,
  palette,
  onPress,
  active,
}: {
  label: string;
  palette: { accent: string; text: string; surfaceHover: string };
  onPress: () => void;
  active?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.menuItem,
        { backgroundColor: pressed ? palette.surfaceHover : 'transparent' },
      ]}
    >
      <Text style={[styles.menuText, { color: active ? palette.accent : palette.text }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  menuBar: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  menuItem: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  menuText: {
    fontFamily: fonts.regular,
    fontSize: typeScale.small + 1,
  },
  dirty: {
    fontFamily: fonts.regular,
    fontSize: typeScale.small,
    marginHorizontal: 6,
  },
  saveButton: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.md,
  },
  saveText: {
    fontFamily: fonts.medium,
    fontSize: typeScale.small + 1,
  },
  editor: {
    flex: 1,
    padding: 10,
    fontFamily: fonts.regular,
    fontSize: typeScale.body + 1,
    lineHeight: 22,
  },
  statusBar: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  statusText: {
    fontFamily: fonts.regular,
    fontSize: typeScale.small,
  },
});
