import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api/client';
import { readStorage, removeStorage, uid, writeStorage } from '../lib/storage';
import { useAuth } from './AuthProvider';
import { useShell } from './ShellProvider';
import type { VfsNode } from './types';

const storageKeyFor = (version: string | undefined) => `wim.fs.v2.${version ?? 'win11'}`;

type SeedNode = { name: string; kind: 'file' | 'folder'; content?: string; children?: SeedNode[] };

/** ساختار اولیهٔ دیسک، دقیقاً مثل یک نصب تازهٔ ویندوز */
const DEFAULT_TREE: SeedNode = {
  name: 'C:',
  kind: 'folder',
  children: [
    {
      name: 'Users',
      kind: 'folder',
      children: [
        {
          name: 'Karim',
          kind: 'folder',
          children: [
            {
              name: 'Documents',
              kind: 'folder',
              children: [
                {
                  name: 'Welcome.txt',
                  kind: 'file',
                  content:
                    'Welcome to the Windows simulator!\n\nThis is a compact desktop on your phone.\n\n• Open apps from the taskbar.\n' +
                    '• Drag the title bar to move windows.\n' +
                    '• Resize a window from its bottom corner.\n' +
                    '• Your files can sync to a server (PostgreSQL).',
                },
                {
                  name: 'Notes.md',
                  kind: 'file',
                  content: '# Notes\n\n- This file is in the Documents folder.\n- Changes made in Notepad are saved.\n',
                },
              ],
            },
            {
              name: 'Desktop',
              kind: 'folder',
              children: [{ name: 'Todo.txt', kind: 'file', content: 'A simple to-do list\n' }],
            },
            {
              name: 'Pictures',
              kind: 'folder',
              children: [{ name: 'Landscape.txt', kind: 'file', content: 'Sample landscape image' }],
            },
            { name: 'Downloads', kind: 'folder', children: [] },
            { name: 'Music', kind: 'folder', children: [] },
          ],
        },
      ],
    },
    { name: 'Program Files', kind: 'folder', children: [] },
  ],
};

const now = () => new Date().toISOString();

const buildFlat = (seed: SeedNode, parentId: string | null): VfsNode[] => {
  const id = uid('fs');
  const node: VfsNode = {
    id,
    parentId,
    name: seed.name,
    kind: seed.kind,
    content: seed.content ?? '',
    createdAt: now(),
    updatedAt: now(),
    deletedAt: null,
  };
  const children = (seed.children ?? []).flatMap((child) => buildFlat(child, id));
  return [node, ...children];
};

const flatten = (serverNodes: ServerNode[], parentId: string | null = null): VfsNode[] =>
  serverNodes.flatMap((node) => {
    const flat: VfsNode = {
      id: node.id,
      parentId,
      name: node.name,
      kind: node.kind,
      content: node.content ?? '',
      createdAt: node.createdAt ?? now(),
      updatedAt: node.updatedAt ?? now(),
      deletedAt: null,
    };
    return [flat, ...flatten(node.children ?? [], node.id)];
  });

type ServerNode = {
  id: string;
  name: string;
  kind: 'file' | 'folder';
  content?: string;
  createdAt?: string;
  updatedAt?: string;
  children?: ServerNode[];
};

type VfsContextValue = {
  nodes: VfsNode[];
  ready: boolean;
  syncing: boolean;
  offline: boolean;
  childrenOf: (parentId: string | null, options?: { includeDeleted?: boolean }) => VfsNode[];
  nodeById: (id: string) => VfsNode | undefined;
  pathOf: (id: string) => string;
  nodeByPath: (path: string) => VfsNode | undefined;
  root: VfsNode | undefined;
  trashNodes: VfsNode[];
  createFolder: (parentId: string | null, name: string) => Promise<VfsNode | null>;
  createFile: (parentId: string | null, name: string, content?: string) => Promise<VfsNode | null>;
  updateFile: (id: string, content: string) => Promise<void>;
  rename: (id: string, name: string) => Promise<void>;
  move: (id: string, parentId: string | null) => Promise<void>;
  trash: (id: string) => Promise<void>;
  restore: (id: string) => Promise<void>;
  purge: (id: string) => Promise<void>;
  emptyTrash: () => Promise<void>;
  resetToDefault: () => Promise<void>;
};

const VfsContext = createContext<VfsContextValue | null>(null);

export function VfsProvider({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  const { settings } = useShell();
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const diskKey = storageKeyFor(settings.shellVersion);
  const [activeDiskKey, setActiveDiskKey] = useState(diskKey);
  const [nodes, setNodes] = useState<VfsNode[]>([]);
  const [ready, setReady] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [offline, setOffline] = useState(false);
  const nodesRef = useRef<VfsNode[]>([]);
  nodesRef.current = nodes;

  useEffect(() => {
    let cancelled = false;
    setReady(false);
    (async () => {
      const saved = await readStorage<VfsNode[]>(diskKey, []);
      const data = saved.length ? saved : buildFlat(DEFAULT_TREE, null);
      if (cancelled) return;
      setNodes(data);
      setActiveDiskKey(diskKey);
      if (!saved.length) await writeStorage(diskKey, data);
      setReady(true);
    })();
    return () => { cancelled = true; };
  }, [diskKey]);

  useEffect(() => {
    if (ready && activeDiskKey === diskKey) void writeStorage(activeDiskKey, nodes);
  }, [nodes, ready, activeDiskKey, diskKey]);

  /** Server sync پس از Sign in */
  useEffect(() => {
    if (status !== 'authenticated') return;
    let cancelled = false;
    (async () => {
      setSyncing(true);
      try {
        const res = await api.get<{ tree: ServerNode[] }>('/api/fs/tree');
        if (cancelled) return;
        if (res.tree.length) {
          const diskName = `C: [${(settings.shellVersion ?? 'win11').toUpperCase()}]`;
          const currentDisk = res.tree.filter((root) => root.name === diskName);
          if (currentDisk.length) {
            const flat = flatten(currentDisk);
            if (flat[0]) flat[0].name = 'C:';
            setNodes(flat);
            await writeStorage(diskKey, flat);
          } else {
            await seedRemote();
          }
        } else {
          await seedRemote();
        }
        setOffline(false);
      } catch {
        if (!cancelled) setOffline(true);
      } finally {
        if (!cancelled) setSyncing(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [status]);

  const seedRemote = useCallback(async () => {
    const token = api.getToken();
    if (!token) return;
    const local = nodesRef.current;
    const root = local.find((n) => n.parentId === null);
    if (!root) return;

    const createRemote = async (node: VfsNode, parentRemoteId: string | null): Promise<string | null> => {
      try {
        if (node.kind === 'folder') {
          const res = await api.post<{ node: { id: string } }>('/api/fs/folders', {
            parentId: parentRemoteId,
            name: parentRemoteId === null ? `C: [${(settingsRef.current.shellVersion ?? 'win11').toUpperCase()}]` : node.name,
          });
          return res.node.id;
        }
        const res = await api.post<{ node: { id: string } }>('/api/fs/files', {
          parentId: parentRemoteId,
          name: node.name,
          content: node.content,
        });
        return res.node.id;
      } catch {
        return null;
      }
    };

    const rootRemoteId = await createRemote(root, null);
    if (!rootRemoteId) return;

    const walk = async (parentLocal: VfsNode, parentRemoteId: string) => {
      const children = nodesRef.current.filter((n) => n.parentId === parentLocal.id && !n.deletedAt);
      for (const child of children) {
        const remoteId = await createRemote(child, parentRemoteId);
        if (remoteId) await walk(child, remoteId);
      }
    };
    await walk(root, rootRemoteId);
  }, []);

  const childrenOf = useCallback(
    (parentId: string | null, options?: { includeDeleted?: boolean }) =>
      nodes.filter(
        (n) =>
          n.parentId === parentId &&
          (options?.includeDeleted ? true : !n.deletedAt),
      ),
    [nodes],
  );

  const nodeById = useCallback((id: string) => nodes.find((n) => n.id === id), [nodes]);

  const pathOf = useCallback(
    (id: string) => {
      const names: string[] = [];
      let current = nodes.find((n) => n.id === id);
      let guard = 0;
      while (current && guard < 64) {
        names.unshift(current.name);
        current = current.parentId ? nodes.find((n) => n.id === current!.parentId) : undefined;
        guard += 1;
      }
      return names.join('/');
    },
    [nodes],
  );

  const nodeByPath = useCallback(
    (path: string) => {
      const parts = path.split('/').filter(Boolean);
      let current: VfsNode | undefined;
      for (const part of parts) {
        const siblings = nodes.filter((n) => n.parentId === (current?.id ?? null) && !n.deletedAt);
        current = siblings.find((n) => n.name === part);
        if (!current) return undefined;
      }
      return current;
    },
    [nodes],
  );

  const root = useMemo(() => nodes.find((n) => n.parentId === null && !n.deletedAt), [nodes]);

  const trashNodes = useMemo(() => {
    const deleted = nodes.filter((n) => n.deletedAt);
    const deletedIds = new Set(deleted.map((n) => n.id));
    return deleted.filter((n) => !n.parentId || !deletedIds.has(n.parentId));
  }, [nodes]);

  const upsert = useCallback((node: VfsNode) => {
    setNodes((prev) => {
      const index = prev.findIndex((n) => n.id === node.id);
      if (index === -1) return [...prev, node];
      const copy = [...prev];
      copy[index] = node;
      return copy;
    });
  }, []);

  const createFolder = useCallback(
    async (parentId: string | null, name: string) => {
      const token = api.getToken();
      if (token) {
        try {
          const res = await api.post<{ node: { id: string; parentId: string | null; name: string; kind: 'folder' } }>(
            '/api/fs/folders',
            { parentId, name },
          );
          const node: VfsNode = {
            id: res.node.id,
            parentId: res.node.parentId,
            name: res.node.name,
            kind: 'folder',
            content: '',
            createdAt: now(),
            updatedAt: now(),
            deletedAt: null,
          };
          upsert(node);
          return node;
        } catch {
          setOffline(true);
        }
      }
      const node: VfsNode = {
        id: uid('fs'),
        parentId,
        name,
        kind: 'folder',
        content: '',
        createdAt: now(),
        updatedAt: now(),
        deletedAt: null,
      };
      upsert(node);
      return node;
    },
    [upsert],
  );

  const createFile = useCallback(
    async (parentId: string | null, name: string, content = '') => {
      const token = api.getToken();
      if (token) {
        try {
          const res = await api.post<{
            node: { id: string; parentId: string | null; name: string; kind: 'file' };
          }>('/api/fs/files', { parentId, name, content });
          const node: VfsNode = {
            id: res.node.id,
            parentId: res.node.parentId,
            name: res.node.name,
            kind: 'file',
            content,
            createdAt: now(),
            updatedAt: now(),
            deletedAt: null,
          };
          upsert(node);
          return node;
        } catch {
          setOffline(true);
        }
      }
      const node: VfsNode = {
        id: uid('fs'),
        parentId,
        name,
        kind: 'file',
        content,
        createdAt: now(),
        updatedAt: now(),
        deletedAt: null,
      };
      upsert(node);
      return node;
    },
    [upsert],
  );

  const updateFile = useCallback(
    async (id: string, content: string) => {
      const node = nodesRef.current.find((n) => n.id === id);
      if (!node) return;
      upsert({ ...node, content, updatedAt: now() });
      if (api.getToken()) {
        try {
          await api.put(`/api/fs/nodes/${id}/content`, { content });
          setOffline(false);
        } catch {
          setOffline(true);
        }
      }
    },
    [upsert],
  );

  const rename = useCallback(
    async (id: string, name: string) => {
      const node = nodesRef.current.find((n) => n.id === id);
      if (!node) return;
      upsert({ ...node, name, updatedAt: now() });
      if (api.getToken()) {
        try {
          await api.patch(`/api/fs/nodes/${id}`, { name });
        } catch {
          setOffline(true);
        }
      }
    },
    [upsert],
  );

  const move = useCallback(
    async (id: string, parentId: string | null) => {
      const node = nodesRef.current.find((n) => n.id === id);
      if (!node) return;
      upsert({ ...node, parentId, updatedAt: now() });
      if (api.getToken()) {
        try {
          await api.patch(`/api/fs/nodes/${id}`, { parentId });
        } catch {
          setOffline(true);
        }
      }
    },
    [upsert],
  );

  const trash = useCallback(
    async (id: string) => {
      const stamp = now();
      setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, deletedAt: stamp, updatedAt: stamp } : n)));
      if (api.getToken()) {
        try {
          await api.delete(`/api/fs/nodes/${id}`);
        } catch {
          setOffline(true);
        }
      }
    },
    [],
  );

  const restore = useCallback(
    async (id: string) => {
      const stamp = now();
      setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, deletedAt: null, updatedAt: stamp } : n)));
      if (api.getToken()) {
        try {
          await api.post(`/api/fs/nodes/${id}/restore`);
        } catch {
          setOffline(true);
        }
      }
    },
    [],
  );

  const purge = useCallback(
    async (id: string) => {
      setNodes((prev) => prev.filter((n) => n.id !== id));
      if (api.getToken()) {
        try {
          await api.delete(`/api/fs/nodes/${id}`, { permanent: true });
        } catch {
          setOffline(true);
        }
      }
    },
    [],
  );

  const emptyTrash = useCallback(async () => {
    const ids = trashNodes.map((n) => n.id);
    setNodes((prev) => prev.filter((n) => !ids.includes(n.id) && !n.deletedAt));
    if (api.getToken()) {
      for (const id of ids) {
        try {
          await api.delete(`/api/fs/nodes/${id}`, { permanent: true });
        } catch {
          setOffline(true);
        }
      }
    }
  }, [trashNodes]);

  const resetToDefault = useCallback(async () => {
    const seeded = buildFlat(DEFAULT_TREE, null);
    setNodes(seeded);
    await writeStorage(diskKey, seeded);
    if (api.getToken()) {
      const res = await api.get<{ trash: ServerNode[] }>('/api/fs/trash').catch(() => ({ trash: [] }));
      for (const item of res.trash) {
        await api.delete(`/api/fs/nodes/${item.id}`, { permanent: true }).catch(() => undefined);
      }
      await seedRemote();
    }
  }, [seedRemote]);

  const value = useMemo<VfsContextValue>(
    () => ({
      nodes,
      ready,
      syncing,
      offline,
      childrenOf,
      nodeById,
      pathOf,
      nodeByPath,
      root,
      trashNodes,
      createFolder,
      createFile,
      updateFile,
      rename,
      move,
      trash,
      restore,
      purge,
      emptyTrash,
      resetToDefault,
    }),
    [
      nodes,
      ready,
      syncing,
      offline,
      childrenOf,
      nodeById,
      pathOf,
      nodeByPath,
      root,
      trashNodes,
      createFolder,
      createFile,
      updateFile,
      rename,
      move,
      trash,
      restore,
      purge,
      emptyTrash,
      resetToDefault,
    ],
  );

  return <VfsContext.Provider value={value}>{children}</VfsContext.Provider>;
}

export function useVfs(): VfsContextValue {
  const ctx = useContext(VfsContext);
  if (!ctx) throw new Error('useVfs must be used inside VfsProvider.');
  return ctx;
}

export { removeStorage };
