import { signal } from '@angular/core';

export function createStoredSignal<T>(key: string, initial: T) {
  const read = (): T => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return initial;
      return JSON.parse(raw) as T;
    } catch {
      return initial;
    }
  };

  const state = signal<T>(read());

  const persist = (value: T) => {
    state.set(value);
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // ignore quota / storage errors
    }
  };

  return { state, persist };
}

