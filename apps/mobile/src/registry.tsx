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
    title: 'مدیر فایل',
    icon: 'folder-open',
    color: '#f2b544',
    component: ExplorerApp,
    group: 'system',
    keywords: ['file', 'explorer', 'پوشه', 'فایل'],
  },
  {
    id: 'notepad',
    title: 'Notepad',
    icon: 'document-text',
    color: '#4c9aff',
    component: NotepadApp,
    group: 'office',
    keywords: ['text', 'note', 'متن'],
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
    title: 'ماشین‌حساب',
    icon: 'calculator',
    color: '#7f5af0',
    component: CalculatorApp,
    group: 'office',
    keywords: ['calc', 'حساب'],
  },
  {
    id: 'settings',
    title: 'تنظیمات',
    icon: 'settings',
    color: '#8a8a8a',
    component: SettingsApp,
    group: 'system',
    singleton: true,
    keywords: ['settings', 'theme', 'تنظیمات'],
  },
  {
    id: 'browser',
    title: 'مرورگر',
    icon: 'globe',
    color: '#0a6cff',
    component: BrowserApp,
    group: 'system',
    keywords: ['browser', 'edge', 'web', 'اینترنت'],
  },
  {
    id: 'paint',
    title: 'نقاشی',
    icon: 'brush',
    color: '#e0523c',
    component: PaintApp,
    group: 'media',
    keywords: ['paint', 'draw', 'نقاشی'],
  },
  {
    id: 'photos',
    title: 'تصاویر',
    icon: 'images',
    color: '#2fb575',
    component: PhotosApp,
    group: 'media',
    keywords: ['photo', 'gallery', 'عکس'],
  },
  {
    id: 'notes',
    title: 'یادداشت‌ها',
    icon: 'reader',
    color: '#e05d8c',
    component: NotesApp,
    group: 'office',
    keywords: ['note', 'sticky', 'یادداشت'],
  },
  {
    id: 'recycle',
    title: 'سطل زباله',
    icon: 'trash',
    color: '#5c8a6a',
    component: RecycleBinApp,
    group: 'system',
    singleton: true,
    keywords: ['trash', 'recycle', 'حذف'],
  },
  {
    id: 'about',
    title: 'درباره',
    icon: 'information-circle',
    color: '#6b7280',
    component: AboutApp,
    group: 'system',
    singleton: true,
    keywords: ['about', 'system', 'درباره'],
  },
];

export const getApp = (id: string): AppDefinition | undefined => APPS.find((app) => app.id === id);

export const GROUP_LABELS: Record<AppGroup, string> = {
  system: 'برنامه‌های سیستم',
  office: 'ابزارهای کار',
  media: 'رسانه',
};
