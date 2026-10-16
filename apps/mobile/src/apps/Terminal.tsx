import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ScrollViewInstance,
  type TextInputInstance,
} from 'react-native';
import { formatJalali } from '../lib/jalali';
import { toPersianDigits } from '../lib/fa';
import { useShell } from '../state/ShellProvider';
import { useVfs } from '../state/VfsProvider';
import { useWindows } from '../state/WindowProvider';
import { fonts, typeScale } from '../theme';
import type { AppProps } from '../registry';

type Line = { id: number; text: string; tone: 'normal' | 'accent' | 'error' | 'muted' };

const APP_ALIASES: Record<string, string> = {
  explorer: 'explorer',
  files: 'explorer',
  notepad: 'notepad',
  calc: 'calculator',
  calculator: 'calculator',
  settings: 'settings',
  browser: 'browser',
  edge: 'browser',
  paint: 'paint',
  photos: 'photos',
  notes: 'notes',
  recycle: 'recycle',
  trash: 'recycle',
  about: 'about',
  terminal: 'terminal',
};

export function TerminalApp({ windowId }: AppProps) {
  const { palette, settings } = useShell();
  const vfs = useVfs();
  const { openWindow, closeWindow } = useWindows();

  const [cwd, setCwd] = useState<string | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const counter = useRef(0);
  const scrollRef = useRef<ScrollViewInstance>(null);
  const inputRef = useRef<TextInputInstance>(null);

  useEffect(() => {
    if (!cwd && vfs.root) setCwd(vfs.root.id);
  }, [cwd, vfs.root]);

  const push = (text: string, tone: Line['tone'] = 'normal') => {
    counter.current += 1;
    setLines((prev) => [...prev, { id: counter.current, text, tone }]);
  };

  useEffect(() => {
    if (vfs.root) {
      push('Windows Terminal — شبیه‌ساز ویندوز', 'accent');
      push('برای دیدن فهرست دستورها «help» را بنویسید.', 'muted');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vfs.root?.id]);

  const currentDir = cwd ? vfs.nodeById(cwd) : undefined;
  const prompt = useMemo(() => {
    const path = cwd ? vfs.pathOf(cwd) : 'C:';
    return `${path}>`;
  }, [cwd, vfs.pathOf]);

  const resolvePath = (raw: string): { nodeId?: string; parentId?: string } => {
    const trimmed = raw.trim();
    if (!trimmed) return {};
    if (trimmed.startsWith('/') || /^[A-Za-z]:/.test(trimmed)) {
      const path = trimmed.replace(/^[A-Za-z]:/, '').replace(/^\//, '');
      const node = vfs.nodeByPath(`C:/${path}`);
      return { nodeId: node?.id };
    }
    if (trimmed === '..') return { nodeId: currentDir?.parentId ?? undefined };
    if (trimmed === '.') return { nodeId: currentDir?.id };
    const child = vfs
      .childrenOf(currentDir?.id ?? null)
      .find((n) => n.name.toLowerCase() === trimmed.toLowerCase());
    return { nodeId: child?.id };
  };

  const run = async (raw: string) => {
    const line = raw.trim();
    push(`${prompt} ${line}`, 'accent');
    if (!line) return;

    const [command, ...args] = line.split(/\s+/);
    const arg = args.join(' ');

    switch (command.toLowerCase()) {
      case 'help': {
        push('دستورهای موجود:');
        push('  dir | ls            نمایش محتوای پوشهٔ جاری');
        push('  cd <مسیر>           تغییر پوشهٔ جاری');
        push('  cat | type <فایل>   نمایش محتوای فایل');
        push('  echo <متن>          چاپ متن');
        push('  mkdir <نام>         ساخت پوشه');
        push('  touch <نام>         ساخت فایل');
        push('  del | rm <نام>      انتقال به سطل زباله');
        push('  tree                نمای درخت پوشه‌ها');
        push('  start <برنامه>      اجرای برنامه');
        push('  whoami | ver | date | time');
        push('  neofetch            اطلاعات سیستم');
        push('  cls | clear         پاک کردن صفحه');
        push('  exit                بستن ترمینال');
        break;
      }
      case 'dir':
      case 'ls': {
        const children = vfs.childrenOf(currentDir?.id ?? null);
        if (!children.length) {
          push('پوشه خالی است.', 'muted');
          break;
        }
        push('  Volume in drive C   Directory of ' + (cwd ? vfs.pathOf(cwd) : 'C:'));
        for (const child of children) {
          const date = new Date(child.updatedAt);
          push(
            `${child.kind === 'folder' ? '<DIR>       ' : toPersianDigits(child.content.length).padStart(8)}  ${date.toLocaleDateString('fa-IR')}   ${child.name}`,
          );
        }
        break;
      }
      case 'cd': {
        if (!arg) {
          push(cwd ? vfs.pathOf(cwd) : 'C:');
          break;
        }
        const { nodeId } = resolvePath(arg);
        const node = nodeId ? vfs.nodeById(nodeId) : undefined;
        if (!node) {
          push(`مسیر «${arg}» یافت نشد.`, 'error');
          break;
        }
        if (node.kind !== 'folder') {
          push('مسیر باید یک پوشه باشد.', 'error');
          break;
        }
        setCwd(node.id);
        break;
      }
      case 'cat':
      case 'type': {
        const { nodeId } = resolvePath(arg);
        const node = nodeId ? vfs.nodeById(nodeId) : undefined;
        if (!node) {
          push(`فایل «${arg}» یافت نشد.`, 'error');
          break;
        }
        if (node.kind === 'folder') {
          push('این یک پوشه است.', 'error');
          break;
        }
        push(node.content || '(فایل خالی است)', 'muted');
        break;
      }
      case 'echo':
        push(arg);
        break;
      case 'mkdir': {
        if (!arg) {
          push('نام پوشه را وارد کنید.', 'error');
          break;
        }
        await vfs.createFolder(currentDir?.id ?? null, arg);
        push(`پوشهٔ «${arg}» ساخته شد.`);
        break;
      }
      case 'touch': {
        if (!arg) {
          push('نام فایل را وارد کنید.', 'error');
          break;
        }
        await vfs.createFile(currentDir?.id ?? null, arg, '');
        push(`فایل «${arg}» ساخته شد.`);
        break;
      }
      case 'del':
      case 'rm': {
        const { nodeId } = resolvePath(arg);
        const node = nodeId ? vfs.nodeById(nodeId) : undefined;
        if (!node) {
          push(`«${arg}» یافت نشد.`, 'error');
          break;
        }
        await vfs.trash(node.id);
        push(`«${node.name}» به سطل زباله منتقل شد.`);
        break;
      }
      case 'tree': {
        const walk = (nodeId: string | null, prefix: string) => {
          const children = vfs.childrenOf(nodeId);
          children.forEach((child, index) => {
            const last = index === children.length - 1;
            push(`${prefix}${last ? '└── ' : '├── '}${child.name}`);
            if (child.kind === 'folder') walk(child.id, `${prefix}${last ? '    ' : '│   '}`);
          });
        };
        push(cwd ? vfs.pathOf(cwd) : 'C:');
        walk(currentDir?.id ?? null, '');
        break;
      }
      case 'start': {
        const appId = APP_ALIASES[arg.toLowerCase()];
        if (!appId) {
          push(`برنامهٔ «${arg}» شناخته نشد.`, 'error');
          break;
        }
        openWindow({ appId, title: 'در حال اجرا...', singleton: false });
        push(`برنامهٔ «${arg}» اجرا شد.`);
        break;
      }
      case 'whoami':
        push(settings.userName || 'user');
        break;
      case 'ver':
        push('Windows 11 Pro [نسخهٔ شبیه‌سازی‌شده — نسخهٔ ۱٫۰٫۰]');
        break;
      case 'date':
        push(formatJalali(new Date()));
        break;
      case 'time':
        push(new Date().toLocaleTimeString('fa-IR'));
        break;
      case 'neofetch': {
        push('  ▄▄▄▄▄▄▄▄▄▄▄▄', 'accent');
        push('  █ ▄▄▄       █ ▄▄▄   █ ▄▄▄', 'accent');
        push('  █ ███       █ ███   █ ███', 'accent');
        push('  █ ███       █ ███   █ ███', 'accent');
        push('  █ ███       █ ███   █ ███', 'accent');
        push('  █ ██▄▄▄▄▄▄▄▄ █ ██▄▄▄▄▄▄▄▄ █', 'accent');
        push('  █ ▀▀▀▀▀▀▀▀▀ █ ▀▀▀▀▀▀▀▀▀ █', 'accent');
        push('  ▀▀▀▀▀▀▀▀▀▀▀ ▀▀▀▀▀▀▀▀▀▀▀ ▀', 'accent');
        push('');
        push(`  کاربر: ${settings.userName || 'user'}`);
        push('  سیستم‌عامل: Windows 11 (شبیه‌سازی‌شده)');
        push(`  پوسته: نسخهٔ ۱٫۰٫۰ — React Native`);
        push(`  تاریخ: ${formatJalali(new Date())}`);
        break;
      }
      case 'cls':
      case 'clear':
        setLines([]);
        break;
      case 'exit':
        closeWindow(windowId);
        break;
      default:
        push(`'${command}' شناخته نشد. برای راهنما «help» را بنویسید.`, 'error');
    }
  };

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [lines]);

  return (
    <View style={[styles.root, { backgroundColor: '#0c0c0c' }]}>
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="always"
        onTouchStart={() => inputRef.current?.focus()}
      >
        {lines.map((line) => (
          <Text
            key={line.id}
            style={[
              styles.line,
              {
                color:
                  line.tone === 'accent'
                    ? '#4cc2ff'
                    : line.tone === 'error'
                      ? '#ff6b6b'
                      : line.tone === 'muted'
                        ? '#9aa0a6'
                        : '#e8eaed',
              },
            ]}
          >
            {line.text}
          </Text>
        ))}
        <View style={styles.promptRow}>
          <Text style={styles.promptText}>{prompt}</Text>
          <TextInput
            ref={inputRef}
            value={input}
            onChangeText={setInput}
            onSubmitEditing={() => {
              const value = input;
              setInput('');
              setHistory((prev) => [...prev, value]);
              setHistoryIndex(-1);
              run(value);
            }}
            onKeyPress={({ nativeEvent }) => {
              if (nativeEvent.key === 'ArrowUp') {
                const next = history.length + historyIndex;
                if (next > 0) {
                  setHistoryIndex(next - 1);
                  setInput(history[history.length - next] ?? '');
                }
              } else if (nativeEvent.key === 'ArrowDown') {
                if (historyIndex >= 0) {
                  const next = historyIndex - 1;
                  setHistoryIndex(next);
                  setInput(next >= 0 ? history[history.length - next - 1] ?? '' : '');
                }
              }
            }}
            style={styles.input}
            autoCapitalize="none"
            autoCorrect={false}
            cursorColor="#e8eaed"
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 10,
    paddingBottom: 40,
  },
  line: {
    fontFamily: fonts.regular,
    fontSize: typeScale.body,
    lineHeight: 19,
    writingDirection: 'ltr',
    textAlign: 'left',
  },
  promptRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  promptText: {
    fontFamily: fonts.regular,
    fontSize: typeScale.body,
    color: '#4cc2ff',
    writingDirection: 'ltr',
  },
  input: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: typeScale.body,
    color: '#e8eaed',
    padding: 0,
    writingDirection: 'ltr',
  },
});
