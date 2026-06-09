'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import {
  Bell,
  BookOpen,
  Bot,
  ChevronRight,
  ClipboardCheck,
  CreditCard,
  FileText,
  Gauge,
  Layers3,
  LogOut,
  Menu,
  PlusCircle,
  Settings,
  ShieldCheck,
  Siren,
  Users,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

function getInitials(profile) {
  const source = profile?.displayName || profile?.email || 'AgentHub Code';
  const parts = source.replace(/@.*$/, '').split(/[.\s_-]+/).filter(Boolean);

  return (parts[0]?.[0] || 'A').concat(parts[1]?.[0] || parts[0]?.[1] || 'C').toUpperCase();
}

function getDisplayName(profile) {
  return profile?.displayName || profile?.email?.replace(/@.*$/, '') || 'AgentHub Code';
}

function getNotificationStorageKey(profile) {
  return profile?.email ? `agenthub:read-notifications:${profile.email}` : null;
}

function getCodeNavItems(role) {
  const commonItems = [
    { href: '/code', label: 'Tableau de bord', icon: Gauge, exact: true },
    { href: '/code/agents', label: 'Mes agents', icon: Bot, activePrefix: '/code/agents', exact: false },
    { href: '/code/templates', label: 'Modèles', icon: Layers3, activePrefix: '/code/templates' },
    { href: '/code/docs', label: 'Guides', icon: BookOpen, activePrefix: '/code/docs' },
  ];

  if (role !== 'admin') {
    return commonItems;
  }

  return [
    ...commonItems,
    { href: '/code/admin/review', label: 'Validation', icon: ClipboardCheck, activePrefix: '/code/admin/review' },
    { href: '/code/admin/agents', label: 'Agents admin', icon: Bot, activePrefix: '/code/admin/agents' },
    { href: '/code/admin/creators', label: 'Créateurs', icon: Users, activePrefix: '/code/admin/creators' },
    { href: '/code/admin/runtimes', label: 'Configuration', icon: ShieldCheck, activePrefix: '/code/admin/runtimes' },
    { href: '/code/admin/endpoints', label: 'API créateur', icon: Siren, activePrefix: '/code/admin/endpoints' },
    { href: '/code/admin/security', label: 'Sécurité', icon: ShieldCheck, activePrefix: '/code/admin/security' },
    { href: '/code/admin/payments', label: 'Paiements', icon: CreditCard, activePrefix: '/code/admin/payments' },
    { href: '/code/admin/ops', label: 'Ops', icon: Gauge, activePrefix: '/code/admin/ops' },
  ];
}

function getCodeNavSections(role) {
  const navItems = getCodeNavItems(role);
  const adminItems = role === 'admin' ? navItems.slice(4) : [];
  const resourceItems = role === 'admin' ? navItems.slice(2, 4) : navItems.slice(2);

  return [
    {
      key: 'primary',
      items: navItems.slice(0, 2),
    },
    {
      key: 'create',
      items: [{ href: '/code/agents/new', label: 'Créer un agent', icon: PlusCircle, featured: true, exact: true }],
      isolated: true,
    },
    {
      key: 'resources',
      items: resourceItems,
    },
    ...(adminItems.length > 0
      ? [
          {
            key: 'admin',
            items: adminItems,
          },
        ]
      : []),
  ];
}

function isActive(pathname, item) {
  if (item.href === '/code/agents') {
    return pathname === '/code/agents' || (pathname.startsWith('/code/agents/') && !pathname.startsWith('/code/agents/new'));
  }

  if (item.exact) {
    return pathname === item.href;
  }

  const prefix = item.activePrefix || item.href;
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function notificationMatchesItem(notification, item) {
  if (!notification?.href || !item?.href) {
    return false;
  }

  if (item.href === '/code') {
    return notification.href === '/code' || notification.href === '/code/dashboard';
  }

  const prefix = item.activePrefix || item.href;
  return notification.href === item.href || notification.href === prefix || notification.href.startsWith(`${prefix}/`);
}

const navSectionClasses = {
  primary: 'rounded-2xl bg-[#F8FAFC] p-2 ring-1 ring-[#E3E7F2] transition duration-200 hover:brightness-[0.97]',
  create: 'rounded-2xl bg-[#FAF5FF] p-2 ring-1 ring-[#DDD6FE] transition duration-200 hover:brightness-[0.97]',
  resources: 'rounded-2xl bg-[#F0F9FF] p-2 ring-1 ring-[#BFDBFE] transition duration-200 hover:brightness-[0.97]',
  admin: 'rounded-2xl bg-[#FFFBEB] p-2 ring-1 ring-[#FDE68A] transition duration-200 hover:brightness-[0.97]',
};

export function CodeSidebar({ mobile = false, onNavigate, profile, unreadNotifications = [] }) {
  const pathname = usePathname() || '';
  const navSections = getCodeNavSections(profile?.role);

  return (
    <aside className={`${mobile ? 'h-full' : 'sticky top-0 hidden h-screen lg:flex'} w-72 shrink-0 flex-col border-r border-[#DED6FF] bg-[linear-gradient(180deg,#FFFFFF_0%,#FAF7FF_100%)]`}>
      <div className="flex h-16 items-center gap-3 border-b border-[#DED6FF] px-5">
        <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-[0_10px_24px_rgba(109,64,160,0.18)] ring-1 ring-[#E9D5FF]">
          <Image src="/logo.png" alt="AgentHub Code" width={40} height={40} className="h-full w-full object-contain p-1" priority />
        </span>
        <div>
          <p className="font-display text-base font-bold text-[#111827]">AgentHub Code</p>
          <p className="text-xs text-[#6B7280]">Espace créateur</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-5">
        {navSections.map((section, sectionIndex) => (
          <div
            key={section.key}
            className={[
              'space-y-1',
              navSectionClasses[section.key] || '',
              sectionIndex > 0 ? 'mt-3' : '',
            ].join(' ')}
          >
            {section.items.map((item) => {
              const active = isActive(pathname, item);
              const Icon = item.icon;
              const notificationCount = unreadNotifications.filter((notification) => notificationMatchesItem(notification, item)).length;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  className={[
                    'flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-colors',
                    active
                      ? 'border border-[#C4B5FD] bg-[#F3E8FF] text-[#2B1A44] shadow-[0_8px_20px_rgba(109,64,160,0.08)]'
                      : item.featured
                        ? 'border border-[#C4B5FD] bg-white text-[#2B1A44] shadow-sm hover:border-[#8B5CF6] hover:bg-[#F5F3FF]'
                        : 'text-[#4B5563] hover:bg-[#F5F3FF] hover:text-[#2B1A44]',
                  ].join(' ')}
                >
                  <Icon className={`h-4 w-4 ${active || item.featured ? 'text-[#6B3FA0]' : 'text-[#6B7280]'}`} />
                  <span>{item.label}</span>
                  {notificationCount > 0 && (
                    <span className="ml-auto inline-flex min-w-5 items-center justify-center rounded-full bg-[#7C3AED] px-1.5 py-0.5 text-[11px] font-bold leading-none text-white shadow-sm">
                      {notificationCount > 9 ? '9+' : notificationCount}
                    </span>
                  )}
                  {active && notificationCount === 0 && <ChevronRight className="ml-auto h-4 w-4 text-[#6B3FA0]" />}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="border-t border-[#DED6FF] p-4">
        <Link
          href="/agenthub"
          onClick={onNavigate}
          className="mb-3 flex items-center gap-3 rounded-2xl border border-[#E3E7F2] bg-[#FBFCFF] px-3 py-2.5 text-sm font-medium text-[#374151] transition-colors hover:border-[#8B5CF6] hover:bg-[#F1F3F8]"
        >
          <FileText className="h-4 w-4 text-[#6B3FA0]" />
          Retour AgentHub
        </Link>
        <Link
          href="/settings"
          onClick={onNavigate}
          className="mb-4 flex items-center gap-3 rounded-2xl border border-[#E3E7F2] bg-white px-3 py-2.5 text-sm font-medium text-[#374151] transition-colors hover:border-[#8B5CF6] hover:bg-[#F5F3FF]"
        >
          <Settings className="h-4 w-4 text-[#6B3FA0]" />
          Paramètres du compte
        </Link>
        <div className="flex items-center gap-3 rounded-2xl border border-[#E9D5FF] bg-white p-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#6B3FA0] text-xs font-bold text-white">
            {getInitials(profile)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[#111827]">{getDisplayName(profile)}</p>
            <p className="text-xs capitalize text-[#6B7280]">{profile?.role || 'creator'}</p>
          </div>
        </div>
        <Link
          href="/auth/logout"
          onClick={onNavigate}
          className="mt-3 flex items-center justify-center gap-2 rounded-2xl border border-[#FECACA] bg-[#FEF2F2] px-3 py-2.5 text-sm font-semibold text-[#B91C1C] transition-colors hover:border-[#EF4444] hover:bg-[#FEE2E2]"
        >
          <LogOut className="h-4 w-4" />
          Se déconnecter
        </Link>
      </div>
    </aside>
  );
}

export function CodeTopbar({
  markNotificationsRead,
  notifications = [],
  notificationsOpen,
  onMenuClick,
  profile,
  setNotificationsOpen,
  unreadNotifications = [],
}) {
  const notificationCopy = {
    title: 'Notifications',
    empty: 'Aucune notification pour le moment.',
    open: 'Ouvrir les notifications',
    see: 'Voir',
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[#DED6FF] bg-white/90 px-4 backdrop-blur lg:px-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#D8DDEE] bg-white text-[#111827] lg:hidden"
          aria-label="Ouvrir la navigation AgentHub Code"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div>
          <p className="font-label text-[10px] text-[#6B3FA0]">AGENTHUB CODE</p>
          <p className="text-sm font-semibold text-[#111827]">Créer, publier, suivre</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              const nextOpen = !notificationsOpen;
              setNotificationsOpen(nextOpen);
              if (nextOpen) {
                markNotificationsRead();
              }
            }}
            className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-[#D8DDEE] bg-white text-[#4B5563] transition-colors hover:border-[#8B5CF6] hover:bg-[#F5F3FF] hover:text-[#111827]"
            aria-label={notificationCopy.open}
          >
            <Bell className="h-5 w-5" />
            {unreadNotifications.length > 0 && (
              <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-[#EF4444] px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white">
                {unreadNotifications.length > 9 ? '9+' : unreadNotifications.length}
              </span>
            )}
          </button>
          {notificationsOpen && (
            <>
              <button className="fixed inset-0 z-40 cursor-default" onClick={() => setNotificationsOpen(false)} aria-label="Fermer les notifications" />
              <div className="absolute right-0 top-full z-50 mt-2 w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-[#DED6FF] bg-white shadow-2xl">
                <div className="border-b border-[#E3E7F2] p-4">
                  <p className="font-display text-sm font-bold text-[#111827]">{notificationCopy.title}</p>
                </div>
                {notifications.length === 0 ? (
                  <div className="p-4 text-sm text-[#6B7280]">{notificationCopy.empty}</div>
                ) : (
                  <div className="max-h-[420px] overflow-y-auto">
                    {notifications.map((notification) => (
                      <Link
                        key={notification.id}
                        href={notification.href}
                        onClick={() => setNotificationsOpen(false)}
                        className="block border-b border-[#EEF1F8] p-4 transition-colors last:border-b-0 hover:bg-[#F8FAFC]"
                      >
                        <div className="flex gap-3">
                          <span
                            className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${
                              notification.tone === 'success'
                                ? 'bg-[#10B981]'
                                : notification.tone === 'error'
                                  ? 'bg-[#EF4444]'
                                  : notification.tone === 'warning'
                                    ? 'bg-[#F59E0B]'
                                    : 'bg-[#8B5CF6]'
                            }`}
                          />
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-[#111827]">{notification.title}</p>
                            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[#6B7280]">{notification.body}</p>
                            <p className="mt-2 text-xs font-semibold text-[#6B3FA0]">{notificationCopy.see}</p>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
        <Link href="/agenthub" className="hidden sm:block">
          <Button variant="outline" className="h-10 border-[#D8DDEE] bg-white text-[#111827] hover:border-[#8B5CF6] hover:bg-[#F1F3F8]">
            AgentHub
          </Button>
        </Link>
        <Link href="/settings" className="hidden md:block">
          <Button variant="outline" className="h-10 border-[#D8DDEE] bg-white text-[#111827] hover:border-[#8B5CF6] hover:bg-[#F1F3F8]">
            Compte
          </Button>
        </Link>
        <Link href="/auth/logout" className="hidden sm:block">
          <Button variant="outline" className="h-10 border-[#FECACA] bg-white text-[#B91C1C] hover:border-[#EF4444] hover:bg-[#FEF2F2]">
            <LogOut className="mr-2 h-4 w-4" />
            Déconnexion
          </Button>
        </Link>
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#6B3FA0] text-xs font-bold text-white">
          {getInitials(profile)}
        </span>
      </div>
    </header>
  );
}

export default function CodeShell({ children, profile }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [readNotificationIds, setReadNotificationIds] = useState([]);
  const notificationStorageKey = getNotificationStorageKey(profile);
  const unreadNotifications = useMemo(
    () => notifications.filter((notification) => !readNotificationIds.includes(notification.id)),
    [notifications, readNotificationIds],
  );

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      if (!notificationStorageKey) {
        setReadNotificationIds([]);
        return;
      }

      try {
        const raw = window.localStorage.getItem(notificationStorageKey);
        const parsed = raw ? JSON.parse(raw) : [];
        setReadNotificationIds(Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string') : []);
      } catch {
        setReadNotificationIds([]);
      }
    });

    return () => window.cancelAnimationFrame(frame);
  }, [notificationStorageKey]);

  useEffect(() => {
    if (!notificationStorageKey) {
      return;
    }

    let active = true;

    const loadNotifications = () => {
      fetch('/api/notifications', {
        credentials: 'same-origin',
        cache: 'no-store',
      })
        .then((response) => (response.ok ? response.json() : null))
        .then((payload) => {
          if (active) {
            setNotifications(Array.isArray(payload?.notifications) ? payload.notifications : []);
          }
        })
        .catch(() => {
          if (active) {
            setNotifications([]);
          }
        });
    };

    loadNotifications();
    const interval = window.setInterval(loadNotifications, 30000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [notificationStorageKey]);

  function markNotificationsRead() {
    const nextIds = [...new Set([...readNotificationIds, ...notifications.map((notification) => notification.id)])];
    setReadNotificationIds(nextIds);

    if (!notificationStorageKey) {
      return;
    }

    try {
      window.localStorage.setItem(notificationStorageKey, JSON.stringify(nextIds.slice(-80)));
    } catch {
      // Non-blocking: if localStorage is unavailable, the badge still clears
    }
  }

  return (
    <div className="code-theme min-h-screen bg-[#F7F8FC] text-[#111827]">
      <div className="flex min-h-screen">
        <CodeSidebar profile={profile} unreadNotifications={unreadNotifications} />
        <div className="min-w-0 flex-1">
          <CodeTopbar
            markNotificationsRead={markNotificationsRead}
            notifications={notifications}
            notificationsOpen={notificationsOpen}
            profile={profile}
            setNotificationsOpen={setNotificationsOpen}
            unreadNotifications={unreadNotifications}
            onMenuClick={() => setDrawerOpen(true)}
          />
          {children}
        </div>
      </div>

      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-[#111827]/40"
            aria-label="Fermer la navigation AgentHub Code"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[86vw] bg-white shadow-2xl">
            <button
              type="button"
              className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-xl border border-[#D8DDEE] bg-white text-[#111827]"
              aria-label="Fermer"
              onClick={() => setDrawerOpen(false)}
            >
              <X className="h-4 w-4" />
            </button>
            <CodeSidebar mobile profile={profile} unreadNotifications={unreadNotifications} onNavigate={() => setDrawerOpen(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
