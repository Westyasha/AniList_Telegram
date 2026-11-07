import { useEffect, useRef } from "react";
import { createStore, useStore } from "./store";

type Handler = () => void;

interface Entry {
  id: number;
  handler: Handler;
}

const stack = createStore<Entry[]>([]);
let seq = 0;

export function useBackStack(): Entry[] {
  return useStore(stack);
}

export function popBack(): boolean {
  const entries = stack.get();
  const top = entries[entries.length - 1];
  if (!top) return false;
  top.handler();
  return true;
}

export function useBackHandler(active: boolean, handler: Handler): void {
  const ref = useRef(handler);
  useEffect(() => {
    ref.current = handler;
  });
  useEffect(() => {
    if (!active) return;
    seq += 1;
    const id = seq;
    stack.set((prev) => [...prev, { id, handler: () => ref.current() }]);
    return () => stack.set((prev) => prev.filter((entry) => entry.id !== id));
  }, [active]);
}
