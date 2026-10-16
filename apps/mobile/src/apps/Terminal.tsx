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
      push('Windows Terminal', 'accent');
      push('Type “help” to see the list of commands.', 'muted');
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
        push('Available commands:');
        push('  dir | ls            List current folder contents');
        push('  cd <path>            Change current folder');
        push('  cat | type <File>   Print file contents');
        push('  echo <Text>          Print text');
        push('  mkdir <Name>         Create folder');
        push('  touch <Name>         Create file');
        push('  del | rm <Name>      Move to Recycle Bin');
        push('  tree                Show folder tree');
        push('  start <app>           Launch app');
        push('  whoami | ver | date | time');
        push('  neofetch            System information');
        push('  cls | clear         Clear screen');
        push('  exit                Close terminal');
        break;
      }
      case 'dir':
      case 'ls': {
        const children = vfs.childrenOf(currentDir?.id ?? null);
        if (!children.length) {
          push('Folder is empty.', 'muted');
          break;
        }
        push('  Volume in drive C   Directory of ' + (cwd ? vfs.pathOf(cwd) : 'C:'));
        for (const child of children) {
          const date = new Date(child.updatedAt);
          push(
            `${child.kind === 'folder' ? '<DIR>       ' : String(child.content.length).padStart(8)}  ${date.toLocaleDateString('en-US')}   ${child.name}`,
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
          push(`Path “${arg}” was not found.`, 'error');
          break;
        }
        if (node.kind !== 'folder') {
          push('Path must be a folder.', 'error');
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
          push(`File “${arg}” was not found.`, 'error');
          break;
        }
        if (node.kind === 'folder') {
          push('This is a folder.', 'error');
          break;
        }
        push(node.content || '(File is empty)', 'muted');
        break;
      }
      case 'echo':
        push(arg);
        break;
      case 'mkdir': {
        if (!arg) {
          push('Enter a folder name.', 'error');
          break;
        }
        await vfs.createFolder(currentDir?.id ?? null, arg);
        push(`Folder “${arg}” created.`);
        break;
      }
      case 'touch': {
        if (!arg) {
          push('Enter a file name.', 'error');
          break;
        }
        await vfs.createFile(currentDir?.id ?? null, arg, '');
        push(`File “${arg}” created.`);
        break;
      }
      case 'del':
      case 'rm': {
        const { nodeId } = resolvePath(arg);
        const node = nodeId ? vfs.nodeById(nodeId) : undefined;
        if (!node) {
          push(`“${arg}” was not found.`, 'error');
          break;
        }
        await vfs.trash(node.id);
        push(`“${node.name}” moved to Recycle Bin.`);
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
          push(`App “${arg}” was not recognized.`, 'error');
          break;
        }
        openWindow({ appId, title: 'Launching...', singleton: false });
        push(`App “${arg}” launched.`);
        break;
      }
      case 'whoami':
        push(settings.userName || 'user');
        break;
      case 'ver':
        push(`Windows ${settings.shellVersion?.replace('win', '') ?? '11'} [Simulator 2.0.0]`);
        break;
      case 'date':
        push(new Date().toLocaleDateString('en-US'));
        break;
      case 'time':
        push(new Date().toLocaleTimeString('en-US'));
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
        push(`  User: ${settings.userName || 'user'}`);
        push(`  OS: Windows ${settings.shellVersion?.replace('win', '') ?? '11'} (simulated)`);
        push(`  Shell: Version 2.0.0 — React Native`);
        push(`  Date: ${new Date().toLocaleDateString('en-US')}`);
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
        push(`'${command}' is not recognized. Type 'help' for assistance.`, 'error');
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
