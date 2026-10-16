import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppButton, EmptyState, Field } from '../components/ui';
import { api } from '../api/client';
import { readStorage, writeStorage, uid } from '../lib/storage';
import { useAuth } from '../state/AuthProvider';
import { useShell } from '../state/ShellProvider';
import { fonts, radius, typeScale } from '../theme';
import type { AppProps } from '../registry';

type Note = {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
  updatedAt: string;
};

const LOCAL_KEY = 'wim.notes.v1';

export function NotesApp(_props: AppProps) {
  const { palette } = useShell();
  const auth = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftBody, setDraftBody] = useState('');
  const [synced, setSynced] = useState(false);

  const persistLocal = useCallback(async (next: Note[]) => {
    await writeStorage(LOCAL_KEY, next);
  }, []);

  const load = useCallback(async () => {
    if (auth.status === 'authenticated') {
      try {
        const res = await api.get<{ notes: Note[] }>('/api/notes');
        setNotes(res.notes);
        setSynced(true);
        return;
      } catch {
        setSynced(false);
      }
    }
    const local = await readStorage<Note[]>(LOCAL_KEY, []);
    setNotes(local);
  }, [auth.status]);

  useEffect(() => {
    void load();
  }, [load]);

  const createNote = async () => {
    const note: Note = {
      id: uid('note'),
      title: 'یادداشت جدید',
      body: '',
      pinned: false,
      updatedAt: new Date().toISOString(),
    };
    setNotes((prev) => [note, ...prev]);
    setSelectedId(note.id);
    setDraftTitle(note.title);
    setDraftBody('');
    await persistLocal([note, ...notes]);
  };

  const saveNote = async (id: string) => {
    const updated = notes.map((note) =>
      note.id === id
        ? { ...note, title: draftTitle || 'بدون‌عنوان', body: draftBody, updatedAt: new Date().toISOString() }
        : note,
    );
    setNotes(updated);
    await persistLocal(updated);
    if (auth.status === 'authenticated') {
      try {
        await api.put(`/api/notes/${id}`, { title: draftTitle || 'بدون‌عنوان', body: draftBody });
        setSynced(true);
      } catch {
        setSynced(false);
      }
    }
  };

  const removeNote = async (id: string) => {
    const updated = notes.filter((note) => note.id !== id);
    setNotes(updated);
    setSelectedId(null);
    await persistLocal(updated);
    if (auth.status === 'authenticated') {
      await api.delete(`/api/notes/${id}`).catch(() => undefined);
    }
  };

  const selectNote = (note: Note) => {
    setSelectedId(note.id);
    setDraftTitle(note.title);
    setDraftBody(note.body);
  };

  if (selectedId) {
    const note = notes.find((n) => n.id === selectedId);
    return (
      <View style={[styles.root, { backgroundColor: palette.surface }]}>
        <View style={[styles.editorBar, { borderBottomColor: palette.border }]}>
          <Pressable onPress={() => setSelectedId(null)} style={styles.backButton}>
            <Ionicons name="arrow-back" size={15} color={palette.text} />
          </Pressable>
          <AppButton label="ذخیره" palette={palette} variant="primary" onPress={() => void saveNote(selectedId)} />
          <View style={{ flex: 1 }} />
          <Pressable onPress={() => void removeNote(selectedId)} style={styles.backButton}>
            <Ionicons name="trash-outline" size={15} color={palette.danger} />
          </Pressable>
        </View>
        <View style={styles.editorBody}>
          <Field
            value={draftTitle}
            onChangeText={setDraftTitle}
            placeholder="عنوان"
            palette={palette}
            autoCapitalize="words"
            style={styles.titleInput}
          />
          <Field
            value={draftBody}
            onChangeText={setDraftBody}
            placeholder="متن یادداشت..."
            palette={palette}
            multiline
            autoCapitalize="sentences"
            style={styles.bodyInput}
          />
          {note ? (
            <Text style={[styles.updated, { color: palette.textMuted }]}>
              آخرین ویرایش: {new Date(note.updatedAt).toLocaleString('fa-IR')}
            </Text>
          ) : null}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: palette.surface }]}>
      <View style={[styles.listBar, { borderBottomColor: palette.border }]}>
        <Text style={[styles.listTitle, { color: palette.text }]}>یادداشت‌ها</Text>
        <View style={{ flex: 1 }} />
        <Text style={[styles.syncBadge, { color: synced ? palette.success : palette.textMuted }]}>
          {synced ? 'همگام' : 'محلی'}
        </Text>
        <AppButton label="جدید" icon="add" palette={palette} variant="primary" onPress={() => void createNote()} />
      </View>
      <ScrollView contentContainerStyle={styles.list}>
        {notes.length === 0 ? (
          <EmptyState
            icon="document-text-outline"
            title="یادداشتی ندارید"
            subtitle="با دکمهٔ «جدید» اولین یادداشت را بسازید."
            palette={palette}
          />
        ) : (
          notes.map((note) => (
            <Pressable
              key={note.id}
              onPress={() => selectNote(note)}
              style={({ pressed }) => [
                styles.noteCard,
                {
                  backgroundColor: pressed ? palette.surfaceHover : palette.surfaceAlt,
                  borderColor: palette.border,
                },
              ]}
            >
              <Text numberOfLines={1} style={[styles.noteTitle, { color: palette.text }]}>
                {note.title}
              </Text>
              <Text numberOfLines={2} style={[styles.noteBody, { color: palette.textMuted }]}>
                {note.body || '(خالی)'}
              </Text>
            </Pressable>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  listBar: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  listTitle: {
    fontFamily: fonts.bold,
    fontSize: typeScale.title,
    writingDirection: 'rtl',
  },
  syncBadge: {
    fontFamily: fonts.regular,
    fontSize: typeScale.small,
  },
  list: {
    padding: 10,
    gap: 8,
  },
  noteCard: {
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 10,
    gap: 4,
  },
  noteTitle: {
    fontFamily: fonts.medium,
    fontSize: typeScale.body,
    writingDirection: 'rtl',
  },
  noteBody: {
    fontFamily: fonts.regular,
    fontSize: typeScale.small + 1,
    lineHeight: 18,
    writingDirection: 'rtl',
  },
  editorBar: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backButton: {
    width: 28,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editorBody: {
    flex: 1,
    padding: 10,
    gap: 8,
  },
  titleInput: {
    fontFamily: fonts.bold,
    fontSize: typeScale.title,
  },
  bodyInput: {
    flex: 1,
    lineHeight: 22,
  },
  updated: {
    fontFamily: fonts.regular,
    fontSize: typeScale.small,
    writingDirection: 'rtl',
  },
});
