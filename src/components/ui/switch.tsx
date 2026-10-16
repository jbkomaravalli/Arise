import * as SwitchPrimitive from '@radix-ui/react-switch';
import { cn } from '@/lib/cn';

export function Switch({
  checked,
  onCheckedChange,
  disabled,
  label,
  className,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  label: string;
  className?: string;
}) {
  return (
    <SwitchPrimitive.Root
      checked={checked}
      onCheckedChange={onCheckedChange}
      disabled={disabled}
      aria-label={label}
      className={cn(
        'group relative h-6 w-11 shrink-0 cursor-pointer rounded-full border border-line bg-abyss transition-colors',
        'data-[state=checked]:border-primary/60 data-[state=checked]:bg-primary/80',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
    >
      <SwitchPrimitive.Thumb className="block h-5 w-5 translate-x-0.5 rounded-full bg-muted shadow transition-transform duration-200 will-change-transform data-[state=checked]:translate-x-[1.375rem] data-[state=checked]:bg-white" />
    </SwitchPrimitive.Root>
  );
}
