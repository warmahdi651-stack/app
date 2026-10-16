import type React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { AboutApp } from './apps/About';
import { BrowserApp } from './apps/Browser';
import { CalculatorApp } from './apps/Calculator';
import { ExplorerApp } from './apps/Explorer';
import { NotepadApp } from './apps/Notepad';
import { NotesApp } from './apps/Notes';
import { PaintApp } from './apps/Paint';
import { PhotosApp } from './apps/Photos';
import { RecycleBinApp } from './apps/RecycleBin';
import { SettingsApp } from './apps/Settings';
import { TerminalApp } from './apps/Terminal';

export type AppProps = {
  windowId: string;
  props: Record<string, unknown>;
};

export type AppGroup = 'system' | 'office' | 'media';

export type AppDefinition = {
  id: string;
  title: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
  component: React.ComponentType<AppProps>;
  group: AppGroup;
  defaultSize?: { width: number; height: number };
  singleton?: boolean;
  keywords?: string[];
};

export const APPS: AppDefinition[] = [
  {
    id: 'explorer',
    title: 'File Explorer',
    icon: 'folder-open',
    color: '#f2b544',
    component: ExplorerApp,
    group: 'system',
    keywords: ['file', 'explorer', 'Folder', 'File'],
  },
  {
    id: 'notepad',
    title: 'Notepad',
    icon: 'document-text',
    color: '#4c9aff',
    component: NotepadApp,
    group: 'office',
    keywords: ['text', 'note', 'Text'],
  },
  {
    id: 'terminal',
    title: 'Terminal',
    icon: 'terminal',
    color: '#2b2b2b',
    component: TerminalApp,
    group: 'system',
    keywords: ['cmd', 'shell', 'command'],
  },
  {
    id: 'calculator',
    title: 'Calculator',
    icon: 'calculator',
    color: '#7f5af0',
    component: CalculatorApp,
    group: 'office',
    keywords: ['calc', 'math'],
  },
  {
    id: 'settings',
    title: 'Settings',
    icon: 'settings',
    color: '#8a8a8a',
    component: SettingsApp,
    group: 'system',
    singleton: true,
    keywords: ['settings', 'theme', 'Settings'],
  },
  {
    id: 'browser',
    title: 'Browser',
    icon: 'globe',
    color: '#0a6cff',
    component: BrowserApp,
    group: 'system',
    keywords: ['browser', 'edge', 'web', 'internet'],
  },
  {
    id: 'paint',
    title: 'Paint',
    icon: 'brush',
    color: '#e0523c',
    component: PaintApp,
    group: 'media',
    keywords: ['paint', 'draw', 'Paint'],
  },
  {
    id: 'photos',
    title: 'Photos',
    icon: 'images',
    color: '#2fb575',
    component: PhotosApp,
    group: 'media',
    keywords: ['photo', 'gallery', 'image'],
  },
  {
    id: 'notes',
    title: 'Notes',
    icon: 'reader',
    color: '#e05d8c',
    component: NotesApp,
    group: 'office',
    keywords: ['note', 'sticky', 'Note'],
  },
  {
    id: 'recycle',
    title: 'Recycle Bin',
    icon: 'trash',
    color: '#5c8a6a',
    component: RecycleBinApp,
    group: 'system',
    singleton: true,
    keywords: ['trash', 'recycle', 'Delete'],
  },
  {
    id: 'about',
    title: 'About',
    icon: 'information-circle',
    color: '#6b7280',
    component: AboutApp,
    group: 'system',
    singleton: true,
    keywords: ['about', 'system', 'About'],
  },
];

export const getApp = (id: string): AppDefinition | undefined => APPS.find((app) => app.id === id);

export const GROUP_LABELS: Record<AppGroup, string> = {
  system: 'System apps',
  office: 'Productivity',
  media: 'Media',
};
