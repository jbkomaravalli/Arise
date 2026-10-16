import {
  BarChart3,
  Brain,
  Dumbbell,
  Gauge,
  History,
  Home,
  Network,
  Settings,
  Swords,
  TerminalSquare,
  UserRound,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Bottom nav on mobile. */
  mobile?: boolean;
  end?: boolean;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Command',
    items: [
      { to: '/app', label: 'Dashboard', icon: Home, end: true, mobile: true },
      { to: '/app/quests', label: 'Quests', icon: Swords, mobile: true },
      { to: '/app/history', label: 'History', icon: History },
      { to: '/app/analytics', label: 'Analytics', icon: BarChart3 },
    ],
  },
  {
    label: 'Growth',
    items: [
      { to: '/app/attributes', label: 'Attributes', icon: Gauge },
      { to: '/app/skills', label: 'Skill Tree', icon: Network },
      { to: '/app/training', label: 'Training', icon: Dumbbell, mobile: true },
      { to: '/app/academy', label: 'Academy', icon: TerminalSquare, mobile: true },
      { to: '/app/mindset', label: 'Mindset', icon: Brain },
    ],
  },
  {
    label: 'System',
    items: [
      { to: '/app/profile', label: 'Profile', icon: UserRound, mobile: true },
      { to: '/app/settings', label: 'Settings', icon: Settings },
    ],
  },
];

export const MOBILE_NAV: NavItem[] = NAV_GROUPS.flatMap((g) => g.items).filter((i) => i.mobile);
