import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import { resetStorageMemory } from '@/data/local/storage';

// jsdom lacks matchMedia — used by reduced-motion detection.
if (!window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

// jsdom lacks ResizeObserver — recharts ResponsiveContainer needs it to render.
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = ResizeObserverMock;

beforeEach(() => {
  window.localStorage.clear();
  resetStorageMemory();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});
