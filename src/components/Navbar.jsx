'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Bell, Bot, Box, ChevronDown, Code2, Gauge, Home, LogOut, Menu, PlusCircle, Search, Settings as SettingsIcon, ShieldCheck, Trophy, User, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Flag from '@/components/Flag';
import CreatorIcon from '@/components/icons/CreatorIcon';
import { languages } from '@/lib/mock-data';
import { useT } from '@/lib/i18n';

function getInitials(profile) {
  const source = profile?.displayName || profile?.email || 'AgentHub';
  const parts = source
    .replace(/@.*$/, '')
    .split(/[.\s_-]+/)
    .filter(Boolean);

  return (parts[0]?.[0] || 'A').concat(parts[1]?.[0] || parts[0]?.[1] || 'H').toUpperCase();
}

function getDisplayName(profile) {
  return profile?.displayName || profile?.email?.replace(/@.*$/, '') || 'AgentHub';
}

function getNotificationStorageKey(profile) {
  return profile?.email ? `agenthub:read-notifications:${profile.email}` : null;
}

/**
 * @param {{
 *   profile?: {
 *     displayName: string | null,
 *     email: string,
 *     role: 'user' | 'creator' | 'admin'
 *   } | null
 * }} props
 */
export default function Navbar({ experience = 'agenthub', profile = null }) {
  const { t, lang, setLang } = useT();
  const pathname = usePathname() || '';
  const [fetchedProfile, setFetchedProfile] = useState(undefined);
  const [scrolled, setScrolled] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [readNotificationIds, setReadNotificationIds] = useState([]);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [drawerOpen]);

  useEffect(() => {
    if (profile) {
      return;
    }

    let active = true;

    fetch('/api/auth/me', {
      credentials: 'same-origin',
      cache: 'no-store',
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (active) {
          setFetchedProfile(payload?.authenticated ? payload.profile : null);
        }
      })
      .catch(() => {
        if (active) {
          setFetchedProfile(null);
        }
      });

    return () => {
      active = false;
    };
  }, [profile]);

  const authResolved = Boolean(profile) || fetchedProfile !== undefined;
  const resolvedProfile = profile ?? fetchedProfile ?? null;
  const isSignedIn = Boolean(resolvedProfile);
  const isCodeExperience = experience === 'code';
  const initials = getInitials(resolvedProfile);
  const displayName = getDisplayName(resolvedProfile);
  const routePrefix = pathname === '/en' || pathname.startsWith('/en/') ? '/en' : '';
  const searchHref = routePrefix ? '/en/search' : '/agenthub/search';
  const workspaceHref = routePrefix ? '/en/workspace' : '/agenthub/workspace';
  const agentHubHomeHref = routePrefix ? '/en/marketplace' : '/agenthub';
  const codeHomeHref = '/code';
  const currentLang = languages.find((l) => l.code === lang) || languages[0];
  const notificationStorageEmail = resolvedProfile?.email ?? null;
  const notificationCopy = lang === 'en'
    ? {
        title: 'Notifications',
        empty: 'No notifications yet.',
        open: 'Open notifications',
        see: 'Open',
      }
    : {
        title: 'Notifications',
        empty: 'Aucune notification pour le moment.',
        open: 'Ouvrir les notifications',
        see: 'Voir',
      };
  const unreadNotifications = notifications.filter((notification) => !readNotificationIds.includes(notification.id));
  const canAccessCreator = resolvedProfile?.role === 'creator' || resolvedProfile?.role === 'admin';
  const roleLinks = [
    ...(!isCodeExperience && canAccessCreator
      ? [
          {
            href: '/code/dashboard',
            label: t('nav.creatormode'),
            icon: CreatorIcon,
            featured: true,
            activePrefix: '/code',
          },
        ]
      : []),
    ...(resolvedProfile?.role === 'admin'
      ? [
          {
            href: `${routePrefix}/admin`,
            label: t('nav.admin'),
            icon: ShieldCheck,
            featured: false,
            secondaryRole: true,
            activePrefix: `${routePrefix}/admin`,
          },
        ]
      : []),
  ];
  const links = isCodeExperience
    ? [
        { href: '/code', label: 'Overview', icon: Code2, exact: true },
        {
          href: '/code/dashboard',
          label: 'Dashboard',
          icon: Gauge,
          activePrefix: '/code/dashboard',
        },
        {
          href: '/code/agents/new',
          label: 'Nouvel agent',
          icon: PlusCircle,
          activePrefix: '/code/agents/new',
          featured: true,
        },
        ...(resolvedProfile?.role === 'admin'
          ? [
              {
                href: `${routePrefix}/admin`,
                label: t('nav.admin'),
                icon: ShieldCheck,
                featured: false,
                secondaryRole: true,
                activePrefix: `${routePrefix}/admin`,
              },
            ]
          : []),
      ]
    : [
        { href: searchHref, label: t('nav.discoveragents'), icon: Search },
        {
          href: workspaceHref,
          label: t('nav.workspace'),
          icon: Box,
          activePrefix: workspaceHref,
        },
        { href: '/leaderboard', label: t('nav.leaderboard'), icon: Trophy },
        ...roleLinks,
      ];
  const switcherHref = isCodeExperience ? agentHubHomeHref : codeHomeHref;
  const switcherLabel = isCodeExperience ? 'AgentHub' : 'AgentHub Code';
  const showUserCredits = isSignedIn && !isCodeExperience;
  const navChrome = isCodeExperience
    ? scrolled
      ? 'bg-white border-b border-[#E3E7F2] shadow-[0_12px_34px_rgba(17,24,39,0.06)]'
      : 'bg-white border-b border-[#E3E7F2]'
    : scrolled
      ? 'nav-blur'
      : 'bg-[#080612]/90 backdrop-blur-sm border-b border-[#251A40]/70';
  const brandTextClass = isCodeExperience ? 'text-[#111827]' : 'text-[#F5F1FA]';
  const mutedNavText = isCodeExperience ? 'text-[#4B5563]' : 'text-[#A78BCF]';
  const navHoverClass = isCodeExperience ? 'hover:bg-[#F1F3F8] hover:text-[#111827]' : 'hover:bg-[#15112A] hover:text-[#F5F1FA]';
  const inactiveNavClass = `${mutedNavText} ${navHoverClass}`;
  const inactiveFeaturedClass = isCodeExperience
    ? 'border border-[#D8DDEE] bg-white text-[#111827] hover:bg-[#F1F3F8]'
    : 'bg-[#251A40] text-[#F5F1FA] hover:bg-[#2D1F50] hover:text-white';
  const activeNavClass = isCodeExperience ? 'bg-[#EEF1F8] text-[#111827]' : 'bg-[#1A152F] text-[#F5F1FA]';
  const switcherClass = isCodeExperience
    ? 'hidden rounded-xl border border-[#D8DDEE] bg-white px-3 py-2 text-sm font-medium text-[#374151] transition-colors hover:border-[#8B5CF6] hover:bg-[#F1F3F8] hover:text-[#111827] md:inline-flex'
    : 'hidden rounded-xl border border-[#2F184B] bg-[#110D24] px-3 py-2 text-sm font-medium text-[#D6C5E8] transition-colors hover:border-[#6B3FA0] hover:bg-[#1A152F] hover:text-white md:inline-flex';
  const drawerLinks = [
    { href: isCodeExperience ? codeHomeHref : agentHubHomeHref, label: t('nav.m.home'), icon: Home },
    ...links,
    { href: switcherHref, label: switcherLabel, icon: isCodeExperience ? Bot : Code2 },
    ...(isSignedIn
      ? [
          { href: '/profile', label: t('nav.myprofile'), icon: User },
          { href: '/settings', label: t('nav.settings'), icon: SettingsIcon },
        ]
      : []),
  ];

  const isNavLinkActive = (link) => {
    const target = link.href.split('#')[0];

    if (link.inactivePrefix && (pathname === link.inactivePrefix || pathname.startsWith(`${link.inactivePrefix}/`))) {
      return false;
    }

    if (link.exact) {
      return pathname === target;
    }

    if (link.activePrefix) {
      return pathname === link.activePrefix || pathname.startsWith(`${link.activePrefix}/`);
    }

    return pathname === target || (target !== '/' && target !== '/code' && pathname.startsWith(`${target}/`));
  };

  useEffect(() => {
    const storageKey = notificationStorageEmail ? `agenthub:read-notifications:${notificationStorageEmail}` : null;
    const frame = window.requestAnimationFrame(() => {
      if (!storageKey) {
        setReadNotificationIds([]);
        return;
      }

      try {
        const storedValue = window.localStorage.getItem(storageKey);
        const storedIds = storedValue ? JSON.parse(storedValue) : [];
        setReadNotificationIds(Array.isArray(storedIds) ? storedIds.filter((id) => typeof id === 'string') : []);
      } catch {
        setReadNotificationIds([]);
      }
    });

    return () => window.cancelAnimationFrame(frame);
  }, [notificationStorageEmail]);

  const markNotificationsRead = () => {
    const nextIds = [...new Set([...readNotificationIds, ...notifications.map((notification) => notification.id)])];
    setReadNotificationIds(nextIds);

    const storageKey = getNotificationStorageKey(resolvedProfile);
    if (!storageKey) {
      return;
    }

    try {
      window.localStorage.setItem(storageKey, JSON.stringify(nextIds));
    } catch {
      // Non-blocking: if localStorage is unavailable, the badge still clears
      // for the current render and will recover on the next successful read.
    }
  };

  useEffect(() => {
    if (!isSignedIn) {
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
  }, [isSignedIn, resolvedProfile?.email, resolvedProfile?.role]);

  return (
    <>
      <nav className={`sticky top-0 z-[60] transition-all duration-200 ${navChrome}`}>
        <div className="container flex h-16 items-center justify-between">
          <Link href={isCodeExperience ? codeHomeHref : agentHubHomeHref} className="flex items-center gap-3 group">
            <div className={`relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl bg-white ${isCodeExperience ? 'border border-[#E3E7F2] shadow-sm' : 'shadow-[0_0_18px_rgba(139,92,246,0.45)]'}`}>
              <Image src="/logo.png" alt="AgentHub" width={36} height={36} className="object-contain p-1" priority />
            </div>
            <span className={`font-display text-xl font-bold tracking-tight ${brandTextClass}`}>
              {isCodeExperience ? 'AgentHub Code' : 'AgentHub'}
            </span>
          </Link>

          <div className="hidden lg:flex items-center gap-2">
            {links.map((link) => {
              const active = isNavLinkActive(link);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`relative flex min-h-10 items-center gap-2 whitespace-nowrap rounded-xl px-3 py-2 text-sm transition-all ${
                    active
                      ? link.featured
                        ? 'bg-gradient-to-r from-[#6B3FA0] to-[#8B5CF6] text-white shadow-[0_0_14px_rgba(139,92,246,0.24)]'
                        : activeNavClass
                      : link.featured
                        ? inactiveFeaturedClass
                      : link.secondaryRole
                        ? inactiveNavClass
                      : inactiveNavClass
                  }`}
                >
                  <link.icon className="h-3.5 w-3.5" />
                  {link.label}
                  {active && !link.featured && <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-[#8B5CF6] glow-soft" />}
                </Link>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={switcherHref}
              className={switcherClass}
            >
              {switcherLabel}
            </Link>
            {showUserCredits && (
              <div className="hidden items-center gap-2 rounded-xl border border-[#2F184B] bg-[#110D24] px-3 py-2 text-sm font-medium text-[#F5F1FA] md:flex">
                <span className="h-2 w-2 rounded-full bg-[#8B5CF6]" />
                <span className="font-stat">0</span>
                <span className="text-[#A78BCF]">crédits</span>
              </div>
            )}
            <div className="relative hidden sm:block">
              <button
                onClick={() => setLangOpen(!langOpen)}
                className={`flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm transition-colors ${isCodeExperience ? 'text-[#4B5563] hover:bg-[#F1F3F8] hover:text-[#111827]' : 'text-[#D6C5E8] hover:bg-[#15112A]'}`}
              >
                <Flag code={currentLang.flag} />
                <span>{currentLang.code.toUpperCase()}</span>
                <ChevronDown className="h-3 w-3" />
              </button>
              {langOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setLangOpen(false)} />
                  <div className={`absolute right-0 top-full z-50 mt-2 w-44 overflow-hidden rounded-xl border shadow-2xl ${isCodeExperience ? 'border-[#E3E7F2] bg-white' : 'border-[#251A40] bg-[#1A152F]'}`}>
                    {languages.map((language) => (
                      <button
                        key={language.code}
                        onClick={() => {
                          setLang(language.code);
                          setLangOpen(false);
                        }}
                        className={`flex w-full items-center gap-3 px-3 py-2.5 text-sm transition-colors ${
                          isCodeExperience
                            ? lang === language.code ? 'bg-[#EEF1F8] text-[#111827]' : 'text-[#4B5563] hover:bg-[#F7F8FC]'
                            : lang === language.code ? 'bg-[#251A40]/50 text-[#F5F1FA]' : 'text-[#A78BCF] hover:bg-[#251A40]'
                        }`}
                      >
                        <Flag code={language.flag} />
                        <span>{language.label}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {isSignedIn ? (
              <>
                <div className="relative hidden sm:block">
                  <button
                    className={`relative rounded-md p-2 transition-colors ${isCodeExperience ? 'text-[#4B5563] hover:bg-[#F1F3F8] hover:text-[#111827]' : 'text-[#A78BCF] hover:bg-[#15112A] hover:text-[#F5F1FA]'}`}
                    aria-label={notificationCopy.open}
                    onClick={() => {
                      const nextOpen = !notificationsOpen;
                      setNotificationsOpen(nextOpen);
                      if (nextOpen) {
                        markNotificationsRead();
                      }
                      setUserOpen(false);
                      setLangOpen(false);
                    }}
                  >
                    <Bell className="h-5 w-5" />
                    {unreadNotifications.length > 0 && (
                      <>
                        <span className="pulse-dot absolute right-1 top-1 h-2 w-2 rounded-full bg-[#8B5CF6]" />
                        <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-[#8B5CF6] px-1 text-[10px] font-bold text-white">
                          {unreadNotifications.length}
                        </span>
                      </>
                    )}
                  </button>
                  {notificationsOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setNotificationsOpen(false)} />
                      <div className={`absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-xl border shadow-2xl ${isCodeExperience ? 'border-[#E3E7F2] bg-white' : 'border-[#251A40] bg-[#110D24]'}`}>
                        <div className={`border-b p-3 ${isCodeExperience ? 'border-[#E3E7F2]' : 'border-[#251A40]'}`}>
                          <p className={`font-display text-sm font-semibold ${isCodeExperience ? 'text-[#111827]' : 'text-[#F5F1FA]'}`}>{notificationCopy.title}</p>
                        </div>
                        {notifications.length === 0 ? (
                          <p className={`p-4 text-sm ${isCodeExperience ? 'text-[#6B7280]' : 'text-[#A78BCF]'}`}>{notificationCopy.empty}</p>
                        ) : (
                          <div className="max-h-96 overflow-y-auto">
                            {notifications.map((notification) => (
                              <Link
                                key={notification.id}
                                href={routePrefix && notification.href.startsWith('/') ? `${routePrefix}${notification.href}` : notification.href}
                                onClick={() => setNotificationsOpen(false)}
                                className={`block border-b p-3 transition-colors last:border-b-0 ${isCodeExperience ? 'border-[#E3E7F2] hover:bg-[#F7F8FC]' : 'border-[#251A40]/70 hover:bg-[#1A152F]'}`}
                              >
                                <div className="flex items-start gap-3">
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
                                    <p className={`text-sm font-semibold ${isCodeExperience ? 'text-[#111827]' : 'text-[#F5F1FA]'}`}>{notification.title}</p>
                                    <p className={`mt-1 line-clamp-2 text-xs leading-relaxed ${isCodeExperience ? 'text-[#6B7280]' : 'text-[#A78BCF]'}`}>{notification.body}</p>
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
                <div className="relative hidden sm:block">
                  <button
                    onClick={() => {
                      setUserOpen(!userOpen);
                      setLangOpen(false);
                      setNotificationsOpen(false);
                    }}
                    className={`flex items-center gap-2 rounded-full px-2 py-1.5 transition-colors ${isCodeExperience ? 'hover:bg-[#F1F3F8]' : 'hover:bg-[#15112A]'}`}
                    aria-label={t('nav.myprofile')}
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#6B3FA0] to-[#8B5CF6] text-xs font-stat text-white">
                      {initials}
                    </span>
                    <ChevronDown className={`h-3 w-3 ${isCodeExperience ? 'text-[#6B7280]' : 'text-[#A78BCF]'}`} />
                  </button>
                  {userOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setUserOpen(false)} />
                      <div className={`absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-xl border shadow-2xl ${isCodeExperience ? 'border-[#E3E7F2] bg-white' : 'border-[#251A40] bg-[#110D24]'}`}>
                        <div className={`border-b p-3 ${isCodeExperience ? 'border-[#E3E7F2]' : 'border-[#251A40]'}`}>
                          <p className={`truncate text-sm font-display font-semibold ${isCodeExperience ? 'text-[#111827]' : 'text-[#F5F1FA]'}`}>{displayName}</p>
                          <p className={`truncate text-xs ${isCodeExperience ? 'text-[#6B7280]' : 'text-[#A78BCF]'}`}>{resolvedProfile.email}</p>
                        </div>
                        <Link href="/profile" onClick={() => setUserOpen(false)} className={`flex items-center gap-3 px-3 py-2.5 text-sm transition-colors ${isCodeExperience ? 'bg-[#F7F8FC] text-[#111827] hover:bg-[#EEF1F8]' : 'bg-[#1A152F] text-[#F5F1FA] hover:bg-[#251A40]'}`}>
                          <User className="h-4 w-4" />
                          {t('nav.myprofile')}
                        </Link>
                        <Link href={isCodeExperience ? '/code/dashboard' : workspaceHref} onClick={() => setUserOpen(false)} className={`flex items-center gap-3 px-3 py-2.5 text-sm transition-colors ${isCodeExperience ? 'text-[#4B5563] hover:bg-[#F7F8FC] hover:text-[#111827]' : 'text-[#A78BCF] hover:bg-[#251A40] hover:text-[#F5F1FA]'}`}>
                          <Box className="h-4 w-4" />
                          {isCodeExperience ? 'Console Code' : t('nav.workspace')}
                        </Link>
                        <Link href="/settings" onClick={() => setUserOpen(false)} className={`flex items-center gap-3 px-3 py-2.5 text-sm transition-colors ${isCodeExperience ? 'text-[#4B5563] hover:bg-[#F7F8FC] hover:text-[#111827]' : 'text-[#A78BCF] hover:bg-[#251A40] hover:text-[#F5F1FA]'}`}>
                          <SettingsIcon className="h-4 w-4" />
                          {t('nav.settings')}
                        </Link>
                        {resolvedProfile.role === 'admin' && (
                          <Link href={`${routePrefix}/admin`} onClick={() => setUserOpen(false)} className={`flex items-center gap-3 px-3 py-2.5 text-sm transition-colors ${isCodeExperience ? 'text-[#4B5563] hover:bg-[#F7F8FC] hover:text-[#111827]' : 'text-[#A78BCF] hover:bg-[#251A40] hover:text-[#F5F1FA]'}`}>
                            <ShieldCheck className="h-4 w-4" />
                            {t('nav.admin')}
                          </Link>
                        )}
            <Link href={`${routePrefix}/auth/logout`} className={`flex items-center gap-3 border-t px-3 py-2.5 text-sm text-[#EF4444] transition-colors ${isCodeExperience ? 'border-[#E3E7F2] hover:bg-[#FEF2F2]' : 'border-[#251A40] hover:bg-[#251A40]'}`}>
                          <LogOut className="h-4 w-4" />
                          {t('nav.signout')}
                        </Link>
                      </div>
                    </>
                  )}
                </div>
              </>
            ) : authResolved ? (
              <>
                <Link href={`${routePrefix}/auth/login`} className="hidden sm:inline-flex">
                  <Button
                    variant="outline"
                    size="sm"
                    className={
                      isCodeExperience
                        ? 'border-[#D8DDEE] bg-white text-[#111827] hover:border-[#8B5CF6] hover:bg-[#F1F3F8]'
                        : 'border-[#6B3FA0]/70 bg-transparent text-[#F5F1FA] hover:bg-[#1A152F] hover:text-white'
                    }
                  >
                    {t('nav.signin')}
                  </Button>
                </Link>
                <Link href={`${routePrefix}/auth/signup`} className="hidden sm:inline-flex">
                  <Button
                    size="sm"
                    className={
                      isCodeExperience
                        ? 'border-0 bg-[#111827] text-white shadow-sm hover:bg-[#2B1A44]'
                        : 'border-0 bg-gradient-to-r from-[#6B3FA0] to-[#8B5CF6] text-white glow-soft transition-all hover:from-[#7C3AED] hover:to-[#A78BCF]'
                    }
                  >
                    {t('nav.signup')}
                  </Button>
                </Link>
              </>
            ) : (
              <div className="hidden h-9 w-[212px] sm:block" aria-hidden="true" />
            )}

            <button onClick={() => setDrawerOpen(true)} className={`sm:hidden rounded-md p-2 transition-colors ${isCodeExperience ? 'text-[#111827] hover:bg-[#F1F3F8]' : 'text-[#F5F1FA] hover:bg-[#15112A]'}`} aria-label="Menu">
              <Menu className="h-6 w-6" />
            </button>
          </div>
        </div>
      </nav>

      {drawerOpen && (
        <>
          <div className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm sm:hidden" onClick={() => setDrawerOpen(false)} />
          <div className={`fixed bottom-0 right-0 top-0 z-[100] flex w-[82%] max-w-[340px] flex-col overflow-y-auto border-l sm:hidden ${isCodeExperience ? 'border-[#E3E7F2] bg-white' : 'border-[#251A40] bg-[#0F0B22]'}`}>
            <div className={`flex items-center justify-between border-b p-4 ${isCodeExperience ? 'border-[#E3E7F2]' : 'border-[#251A40]'}`}>
              <span className={`font-display text-lg font-bold ${isCodeExperience ? 'text-[#111827]' : 'text-[#F5F1FA]'}`}>
                {isCodeExperience ? 'AgentHub Code' : 'AgentHub'}
              </span>
              <button onClick={() => setDrawerOpen(false)} className={`p-2 ${isCodeExperience ? 'text-[#6B7280] hover:text-[#111827]' : 'text-[#A78BCF] hover:text-[#F5F1FA]'}`}>
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 py-2">
              {isSignedIn && (
                <div className={`mx-4 mb-3 rounded-xl border p-3 ${isCodeExperience ? 'border-[#E3E7F2] bg-[#F8FAFC]' : 'border-[#251A40] bg-[#110D24]'}`}>
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#6B3FA0] to-[#8B5CF6] text-xs font-stat text-white">
                      {initials}
                    </span>
                    <div className="min-w-0">
                      <p className={`truncate text-sm font-display font-semibold ${isCodeExperience ? 'text-[#111827]' : 'text-[#F5F1FA]'}`}>{displayName}</p>
                      <p className={`truncate text-xs ${isCodeExperience ? 'text-[#6B7280]' : 'text-[#A78BCF]'}`}>{resolvedProfile.email}</p>
                    </div>
                  </div>
                  {showUserCredits && (
                    <div className="mt-3 flex items-center justify-between rounded-xl border border-[#2F184B] bg-[#0A0816] px-3 py-2 text-sm">
                      <span className="text-[#A78BCF]">Crédits</span>
                      <span className="font-stat text-[#F5F1FA]">0</span>
                    </div>
                  )}
                </div>
              )}
              {drawerLinks.map((link) => {
                const active = isNavLinkActive(link);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setDrawerOpen(false)}
                    className={`flex items-center gap-3 px-5 py-3.5 text-sm transition-colors ${
                      isCodeExperience
                        ? active
                          ? 'border-l-2 border-[#8B5CF6] bg-[#F5F3FF] text-[#111827]'
                          : 'text-[#4B5563] hover:bg-[#F8FAFC] hover:text-[#111827]'
                        : active
                          ? 'border-l-2 border-[#8B5CF6] bg-[#1A152F] text-[#F4EFFA]'
                          : 'text-[#9B72CF] hover:bg-[#15112A] hover:text-[#F4EFFA]'
                    }`}
                  >
                    <link.icon className="h-5 w-5" />
                    {link.label}
                  </Link>
                );
              })}
            </div>

            <div className={`border-t p-4 ${isCodeExperience ? 'border-[#E3E7F2]' : 'border-[#251A40]'}`}>
              <div className="mb-4 flex gap-2">
                {languages.map((language) => (
                  <button
                    key={language.code}
                    onClick={() => setLang(language.code)}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs transition-all ${
                      isCodeExperience
                        ? lang === language.code
                          ? 'border-[#8B5CF6] bg-[#F5F3FF] text-[#111827]'
                          : 'border-[#E3E7F2] text-[#6B7280]'
                        : lang === language.code ? 'border-[#8B5CF6] bg-[#1A152F] text-[#F5F1FA]' : 'border-[#251A40] text-[#A78BCF]'
                    }`}
                  >
                    <Flag code={language.flag} />
                    {language.label}
                  </button>
                ))}
              </div>
              {isSignedIn ? (
                <Link href={`${routePrefix}/auth/logout`} onClick={() => setDrawerOpen(false)}>
                  <Button variant="outline" className="w-full border-[#EF4444]/70 bg-transparent text-[#EF4444] hover:bg-[#EF4444]/10">
                    {t('nav.signout')}
                  </Button>
                </Link>
              ) : authResolved ? (
                <>
                  <Link href={`${routePrefix}/auth/login`} onClick={() => setDrawerOpen(false)}>
                    <Button variant="outline" className={`mb-2 w-full ${isCodeExperience ? 'border-[#D8DDEE] bg-white text-[#111827] hover:bg-[#F1F3F8]' : 'border-[#6B3FA0]/70 bg-transparent text-[#F5F1FA] hover:bg-[#1A152F]'}`}>
                      {t('nav.signin')}
                    </Button>
                  </Link>
                  <Link href={`${routePrefix}/auth/signup`} onClick={() => setDrawerOpen(false)}>
                    <Button className={`w-full border-0 text-white ${isCodeExperience ? 'bg-[#111827] hover:bg-[#2B1A44]' : 'bg-gradient-to-r from-[#6B3FA0] to-[#8B5CF6]'}`}>
                      {t('nav.signup')}
                    </Button>
                  </Link>
                </>
              ) : (
                <div className="h-24" aria-hidden="true" />
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
