import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { cn } from '../../utils/classNames';

interface SidebarProps {
  className?: string;
}

const links = [
  { to: '/admin', label: 'admin.nav.dashboard', end: true },
  { to: '/admin/complaints', label: 'admin.nav.complaints' },
  { to: '/admin/users', label: 'admin.nav.users' },
  { to: '/admin/institutions', label: 'admin.nav.institutions' },
  { to: '/admin/statistics', label: 'admin.nav.statistics' },
];

export function Sidebar({ className }: SidebarProps) {
  const { t } = useTranslation();

  return (
    <aside className={cn('w-56 shrink-0', className)}>
      <nav aria-label="Admin navigation" className="space-y-1">
        {links.map(({ to, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                'flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-gray-700 hover:bg-gray-100',
              )
            }
          >
            {t(label, { defaultValue: label.split('.').pop() ?? label })}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
