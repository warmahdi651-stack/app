export type VfsNode = {
  id: string;
  parentId: string | null;
  name: string;
  kind: 'file' | 'folder';
  content: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type WindowBounds = { x: number; y: number; width: number; height: number };

export type WindowInstance = {
  id: string;
  appId: string;
  title: string;
  bounds: WindowBounds;
  zIndex: number;
  minimized: boolean;
  maximized: boolean;
  props: Record<string, unknown>;
};

export type ShellVersion = 'win7' | 'win8' | 'win10' | 'win11';

export type ShellSettings = {
  shellVersion?: ShellVersion;
  theme: 'light' | 'dark';
  wallpaper: string;
  userName: string;
  use24Hour: boolean;
  showSeconds: boolean;
  animations: boolean;
  taskbarPosition: 'bottom' | 'top';
  accentColor: string;
};

export type AuthUser = {
  id: string;
  username: string;
  displayName: string;
};

export type AuthState = {
  status: 'loading' | 'guest' | 'authenticated';
  user: AuthUser | null;
  token: string | null;
  error: string | null;
  busy: boolean;
};
