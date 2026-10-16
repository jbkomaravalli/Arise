import { createContext, useContext, useState, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface TabsContextValue {
  value: string;
  setValue: (value: string) => void;
}

const TabsContext = createContext<TabsContextValue | null>(null);

export function Tabs({
  defaultValue,
  children,
  className,
  onChange,
}: {
  defaultValue: string;
  children: ReactNode;
  className?: string;
  onChange?: (value: string) => void;
}) {
  const [value, setValue] = useState(defaultValue);
  return (
    <TabsContext.Provider
      value={{
        value,
        setValue: (v) => {
          setValue(v);
          onChange?.(v);
        },
      }}
    >
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabList({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      role="tablist"
      className={cn(
        'inline-flex flex-wrap items-center gap-1 rounded-xl border border-line bg-abyss/60 p-1',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Tab({ value, children }: { value: string; children: ReactNode }) {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error('Tab must be used inside Tabs');
  const active = ctx.value === value;
  return (
    <button
      role="tab"
      aria-selected={active}
      onClick={() => ctx.setValue(value)}
      className={cn(
        'rounded-lg px-3.5 py-1.5 text-[0.8125rem] font-medium transition-colors',
        active ? 'bg-primary/15 text-ink shadow-[inset_0_0_0_1px_var(--color-primary)]/30' : 'text-muted hover:text-ink',
      )}
    >
      {children}
    </button>
  );
}

export function TabPanel({ value, children }: { value: string; children: ReactNode }) {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error('TabPanel must be used inside Tabs');
  if (ctx.value !== value) return null;
  return (
    <div role="tabpanel" className="mt-4">
      {children}
    </div>
  );
}
