import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ContextMenu, type ContextMenuItem } from '../components/ContextMenu';
import { Dialog } from '../components/Dialog';
import { EmptyState, Field, ToolButton } from '../components/ui';
import { useShell } from '../state/ShellProvider';
import { useVfs } from '../state/VfsProvider';
import { useWindows } from '../state/WindowProvider';
import { fonts, radius, typeScale, type Palette } from '../theme';
import type { AppProps } from '../registry';

const fileIcon = (name: string): React.ComponentProps<typeof Ionicons>['name'] => {
  const ext = name.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'md':
      return 'reader';
    case 'json':
      return 'code-slash';
    case 'paint':
      return 'color-palette';
    case 'png':
    case 'jpg':
      return 'image';
    default:
      return 'document-text';
  }
};

export function ExplorerApp({ props }: AppProps) {
  const { palette } = useShell();
  const vfs = useVfs();
  const { openWindow } = useWindows();

  const [folderId, setFolderId] = useState<string | null>((props.folderId as string) ?? null);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [query, setQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [menu, setMenu] = useState<{ x: number; y: number; items: ContextMenuItem[] } | null>(null);
  const [dialog, setDialog] = useState<null | { mode: 'newFolder' | 'rename'; nodeId?: string; value: string }>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!folderId && vfs.root) setFolderId(vfs.root.id);
  }, [folderId, vfs.root]);

  const currentFolder = folderId ? vfs.nodeById(folderId) : undefined;
  const items = useMemo(() => {
    const children = vfs.childrenOf(folderId ?? null);
    const filtered = query
      ? children.filter((node) => node.name.includes(query))
      : children;
    return [...filtered].sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === 'folder' ? -1 : 1;
      return a.name.localeCompare(b.name, 'fa');
    });
  }, [vfs, folderId, query]);

  const navigate = (nextId: string) => {
    setFolderId(nextId);
    setHistory((prev) => [...prev.slice(0, historyIndex + 1), nextId]);
    setHistoryIndex((prev) => prev + 1);
  };

  const goBack = () => {
    if (historyIndex < 0) return;
    const next = historyIndex - 1;
    setHistoryIndex(next);
    setFolderId(history[next] ?? vfs.root?.id ?? null);
  };

  const goForward = () => {
    if (historyIndex >= history.length - 1) return;
    const next = historyIndex + 1;
    setHistoryIndex(next);
    setFolderId(history[next] ?? null);
  };

  const goUp = () => {
    const parent = currentFolder?.parentId;
    if (parent) navigate(parent);
  };

  const openItem = (nodeId: string) => {
    const node = vfs.nodeById(nodeId);
    if (!node) return;
    if (node.kind === 'folder') {
      navigate(node.id);
    } else {
      openWindow({
        appId: 'notepad',
        title: `${node.name} — Notepad`,
        props: { fileId: node.id },
      });
    }
  };

  const itemMenu = (nodeId: string, x: number, y: number) => {
    const node = vfs.nodeById(nodeId);
    if (!node) return;
    setMenu({
      x: Math.max(4, Math.min(x, 220)),
      y: Math.max(4, Math.min(y, 240)),
      items: [
        { key: 'open', label: 'باز کردن', icon: 'open-outline', onPress: () => openItem(node.id) },
        {
          key: 'rename',
          label: 'تغییر نام',
          icon: 'pencil-outline',
          onPress: () => setDialog({ mode: 'rename', nodeId: node.id, value: node.name }),
        },
        {
          key: 'delete',
          label: 'انتقال به سطل زباله',
          icon: 'trash-outline',
          danger: true,
          onPress: async () => {
            await vfs.trash(node.id);
            setToast(`«${node.name}» به سطل زباله منتقل شد.`);
          },
        },
      ],
    });
  };

  const quickAccess = useMemo(() => {
    const user = vfs.root ? vfs.childrenOf(vfs.root.id).find((n) => n.name === 'Users') : undefined;
    const home = user ? vfs.childrenOf(user.id).find((n) => n.kind === 'folder') : undefined;
    if (!home) return [];
    return vfs
      .childrenOf(home.id)
      .filter((n) => ['Documents', 'Desktop', 'Pictures', 'Downloads', 'Music'].includes(n.name))
      .map((n) => ({ node: n, label: FOLDER_LABELS[n.name] ?? n.name }));
  }, [vfs]);

  const address = vfs.pathOf(folderId ?? '');

  return (
    <View style={[styles.root, { backgroundColor: palette.surface }]}>
      <View style={[styles.toolbar, { borderBottomColor: palette.border }]}>
        <ToolButton icon="arrow-back" onPress={goBack} palette={palette} disabled={historyIndex <= 0} />
        <ToolButton
          icon="arrow-forward"
          onPress={goForward}
          palette={palette}
          disabled={historyIndex >= history.length - 1}
        />
        <ToolButton icon="arrow-up" onPress={goUp} palette={palette} disabled={!currentFolder?.parentId} />
        <ToolButton
          icon={viewMode === 'grid' ? 'list-outline' : 'grid-outline'}
          onPress={() => setViewMode((m) => (m === 'grid' ? 'list' : 'grid'))}
          palette={palette}
        />
        <ToolButton
          icon="search"
          onPress={() => setShowSearch((v) => !v)}
          palette={palette}
          active={showSearch}
        />
        <ToolButton
          icon="folder-open-outline"
          label="پوشهٔ جدید"
          onPress={() => setDialog({ mode: 'newFolder', value: 'پوشهٔ جدید' })}
          palette={palette}
        />
      </View>

      <View style={[styles.addressBar, { borderBottomColor: palette.border, backgroundColor: palette.surfaceAlt }]}>
        <Ionicons name="folder-open" size={13} color={palette.textMuted} />
        <Text numberOfLines={1} style={[styles.address, { color: palette.textMuted }]}>
          {address || 'C:'}
        </Text>
        <Text style={[styles.count, { color: palette.textMuted }]}>
          {items.length} مورد
        </Text>
      </View>

      {showSearch ? (
        <View style={[styles.searchRow, { borderBottomColor: palette.border }]}>
          <Ionicons name="search" size={14} color={palette.textMuted} />
          <Field
            value={query}
            onChangeText={setQuery}
            placeholder="جست‌وجو در این پوشه..."
            palette={palette}
            style={styles.searchInput}
          />
          {query ? (
            <Pressable onPress={() => setQuery('')}>
              <Ionicons name="close-circle" size={15} color={palette.textMuted} />
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentInner}
        keyboardShouldPersistTaps="handled"
      >
        {items.length === 0 ? (
          <EmptyState
            icon="folder-open-outline"
            title="این پوشه خالی است"
            subtitle="می‌توانید با دکمهٔ «پوشهٔ جدید» یک پوشه بسازید."
            palette={palette}
          />
        ) : viewMode === 'grid' ? (
          <View style={styles.grid}>
            {items.map((node) => (
              <Pressable
                key={node.id}
                onPress={() => openItem(node.id)}
                onLongPress={(e) => itemMenu(node.id, e.nativeEvent.locationX, e.nativeEvent.locationY)}
                style={({ pressed }) => [
                  styles.gridItem,
                  { backgroundColor: pressed ? palette.surfaceHover : 'transparent' },
                ]}
              >
                <Ionicons
                  name={node.kind === 'folder' ? 'folder' : fileIcon(node.name)}
                  size={34}
                  color={node.kind === 'folder' ? '#f2b544' : palette.textMuted}
                />
                <Text numberOfLines={2} style={[styles.itemName, { color: palette.text }]}>
                  {node.name}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : (
          <View>
            {items.map((node) => (
              <Pressable
                key={node.id}
                onPress={() => openItem(node.id)}
                onLongPress={(e) => itemMenu(node.id, e.nativeEvent.locationX, e.nativeEvent.locationY)}
                style={({ pressed }) => [
                  styles.listItem,
                  { backgroundColor: pressed ? palette.surfaceHover : 'transparent' },
                ]}
              >
                <Ionicons
                  name={node.kind === 'folder' ? 'folder' : fileIcon(node.name)}
                  size={17}
                  color={node.kind === 'folder' ? '#f2b544' : palette.textMuted}
                />
                <Text numberOfLines={1} style={[styles.listName, { color: palette.text }]}>
                  {node.name}
                </Text>
                <Text style={[styles.listMeta, { color: palette.textMuted }]}>
                  {node.kind === 'folder' ? 'پوشه' : `${node.content.length} نویسه`}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>

      {quickAccess.length > 0 ? (
        <View style={[styles.quickRow, { borderTopColor: palette.border, backgroundColor: palette.surfaceAlt }]}>
          {quickAccess.map((item) => (
            <Pressable
              key={item.node.id}
              onPress={() => navigate(item.node.id)}
              style={({ pressed }) => [styles.quickItem, pressed && { opacity: 0.6 }]}
            >
              <Ionicons name="folder-open-outline" size={13} color={palette.accent} />
              <Text style={[styles.quickLabel, { color: palette.text }]}>{item.label}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {toast ? (
        <Pressable onPress={() => setToast(null)} style={[styles.toast, { backgroundColor: palette.accent }]}>
          <Text style={[styles.toastText, { color: palette.textOnAccent }]}>{toast}</Text>
        </Pressable>
      ) : null}

      {menu ? (
        <ContextMenu {...menu} palette={palette} onClose={() => setMenu(null)} />
      ) : null}

      <Dialog
        visible={dialog !== null}
        title={dialog?.mode === 'rename' ? 'تغییر نام' : 'پوشهٔ جدید'}
        palette={palette}
        inputValue={dialog?.value ?? ''}
        onChangeInput={(text) => setDialog((d) => (d ? { ...d, value: text } : d))}
        inputPlaceholder="نام"
        onCancel={() => setDialog(null)}
        onConfirm={async () => {
          if (!dialog) return;
          if (dialog.mode === 'rename' && dialog.nodeId) {
            await vfs.rename(dialog.nodeId, dialog.value.trim() || 'بدون‌نام');
          } else {
            await vfs.createFolder(folderId, dialog.value.trim() || 'پوشهٔ جدید');
          }
          setDialog(null);
        }}
      />
    </View>
  );
}

const FOLDER_LABELS: Record<string, string> = {
  Documents: 'اسناد',
  Desktop: 'دسکتاپ',
  Pictures: 'تصاویر',
  Downloads: 'دانلودها',
  Music: 'موسیقی',
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  toolbar: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 6,
    paddingVertical: 5,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  addressBar: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  address: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: typeScale.small + 1,
    writingDirection: 'ltr',
    textAlign: 'right',
  },
  count: {
    fontFamily: fonts.regular,
    fontSize: typeScale.small,
  },
  searchRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  searchInput: {
    flex: 1,
    minHeight: 28,
    paddingVertical: 2,
  },
  content: {
    flex: 1,
  },
  contentInner: {
    padding: 10,
  },
  grid: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
  },
  gridItem: {
    width: '25%',
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: radius.md,
    gap: 6,
  },
  itemName: {
    fontFamily: fonts.regular,
    fontSize: typeScale.small + 1,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  listItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 6,
    paddingVertical: 8,
    borderRadius: radius.md,
  },
  listName: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: typeScale.body,
    writingDirection: 'rtl',
  },
  listMeta: {
    fontFamily: fonts.regular,
    fontSize: typeScale.small,
  },
  quickRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  quickItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
  },
  quickLabel: {
    fontFamily: fonts.regular,
    fontSize: typeScale.small + 1,
  },
  toast: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
    padding: 10,
    borderRadius: radius.md,
  },
  toastText: {
    fontFamily: fonts.regular,
    fontSize: typeScale.small + 1,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
});
