import { useCallback, useEffect, useState } from "react";

/* Loads data for a page. `reload` refetches; `setData` updates locally after a save. */
export function useAsync(loader, deps = []) {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const run = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await loader();
      setState({ data, error: null, loading: false });
      return data;
    } catch (error) {
      setState((s) => ({ ...s, error, loading: false }));
      return null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(() => {
    run();
  }, [run]);
  const setData = useCallback((updater) => {
    setState((s) => ({ ...s, data: typeof updater === "function" ? updater(s.data) : updater }));
  }, []);
  return { ...state, reload: run, setData };
}

export function moveItem(items, fromId, toId) {
  if (fromId === null || fromId === toId) return null;
  const from = items.findIndex((i) => i.id === fromId);
  const to = items.findIndex((i) => i.id === toId);
  if (from < 0 || to < 0) return null;
  const next = items.slice();
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

/* Drag-and-drop reordering. The list updates immediately; `commit` receives the new ID order
   and, if it fails, the caller reverts. Keyboard users can use the move buttons on each card. */
export function useDragReorder(items, { onChange, commit }) {
  const [dragId, setDragId] = useState(null);
  const [overId, setOverId] = useState(null);

  const bind = (id) => ({
    draggable: true,
    onDragStart: (event) => {
      setDragId(id);
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", String(id));
    },
    onDragOver: (event) => {
      event.preventDefault();
      if (overId !== id) setOverId(id);
    },
    onDragEnd: () => {
      setDragId(null);
      setOverId(null);
    },
    onDrop: (event) => {
      event.preventDefault();
      const next = moveItem(items, dragId, id);
      setDragId(null);
      setOverId(null);
      if (next) {
        onChange(next);
        commit(next.map((item) => item.id));
      }
    },
  });

  const moveBy = (id, delta) => {
    const index = items.findIndex((i) => i.id === id);
    const target = items[index + delta];
    if (index < 0 || !target) return;
    const next = moveItem(items, id, target.id);
    if (next) {
      onChange(next);
      commit(next.map((item) => item.id));
    }
  };

  return { bind, dragId, overId, moveBy };
}
