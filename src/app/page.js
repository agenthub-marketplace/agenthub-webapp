'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { ArrowRight } from 'lucide-react';

const MIN_TRANSITION_MS = 2000;

const choices = {
  agenthub: {
    href: '/agenthub',
    title: 'AgentHub',
    label: 'Marketplace',
    action: 'Explorer AgentHub',
    tone: 'agenthub',
    panel: 'bg-[#080612] text-[#F5F1FA]',
    overlay: {
      background:
        'radial-gradient(circle at 25% 20%, rgba(139,92,246,0.26), transparent 34%), linear-gradient(145deg, #17102C 0%, #080612 68%)',
    },
    button: 'bg-white text-[#120C22]',
    ghost: 'text-[#A78BCF]',
    texture:
      'linear-gradient(115deg, transparent 0%, rgba(167,139,207,0.08) 36%, transparent 64%), repeating-linear-gradient(135deg, rgba(255,255,255,0.035) 0 1px, transparent 1px 18px)',
  },
  code: {
    href: '/onboarding/creator',
    title: 'AgentHub',
    titleSuffix: 'Code',
    label: 'Build',
    action: 'Publier un agent',
    tone: 'code',
    panel: 'bg-[#F7F8FC] text-[#111827]',
    overlay: {
      background:
        'radial-gradient(circle at 74% 20%, rgba(124,58,237,0.12), transparent 34%), linear-gradient(145deg, #FFFFFF 0%, #EEF1F8 100%)',
    },
    button: 'bg-[#111827] text-white',
    ghost: 'text-[#6B7280]',
    texture:
      'linear-gradient(115deg, transparent 0%, rgba(107,63,160,0.06) 40%, transparent 70%), repeating-linear-gradient(135deg, rgba(17,24,39,0.04) 0 1px, transparent 1px 18px)',
  },
};

function LoadingTransition({ active, label, tone = 'agenthub' }) {
  const [mounted, setMounted] = useState(active);
  const [visible, setVisible] = useState(active);
  const isCode = tone === 'code';
  const accent = isCode ? '#111827' : '#D6C5E8';
  const glow = isCode ? 'rgba(17,24,39,0.20)' : 'rgba(139,92,246,0.35)';

  useEffect(() => {
    if (active) {
      let visibleFrame;
      const frame = window.requestAnimationFrame(() => {
        setMounted(true);
        visibleFrame = window.requestAnimationFrame(() => setVisible(true));
      });

      return () => {
        window.cancelAnimationFrame(frame);
        if (visibleFrame) {
          window.cancelAnimationFrame(visibleFrame);
        }
      };
    }

    const fadeFrame = window.requestAnimationFrame(() => setVisible(false));
    const timer = window.setTimeout(() => setMounted(false), 520);

    return () => {
      window.cancelAnimationFrame(fadeFrame);
      window.clearTimeout(timer);
    };
  }, [active]);

  if (!mounted) {
    return null;
  }

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center overflow-hidden text-white transition-opacity duration-500 ${
        visible ? 'opacity-100' : 'pointer-events-none opacity-0'
      } ${isCode ? 'bg-[#F7F8FC]' : 'bg-[#080612]'}`}
    >
      <style>{`
        @keyframes agenthub-logo-breathe {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.08); }
        }

        @keyframes agenthub-loader-ring {
          0% { transform: rotate(0deg) scale(0.94); opacity: 0.42; }
          50% { transform: rotate(180deg) scale(1.05); opacity: 0.82; }
          100% { transform: rotate(360deg) scale(0.94); opacity: 0.42; }
        }

        @keyframes agenthub-loader-orbit {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @keyframes agenthub-loader-sweep {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>

      <div
        className="absolute inset-0"
        style={{
          background: isCode
            ? 'linear-gradient(135deg, rgba(107,63,160,0.10), transparent 42%), repeating-linear-gradient(135deg, rgba(17,24,39,0.035) 0 1px, transparent 1px 20px), linear-gradient(180deg, #FFFFFF 0%, #EEF1F8 100%)'
            : 'linear-gradient(135deg, rgba(139,92,246,0.18), transparent 42%), repeating-linear-gradient(135deg, rgba(255,255,255,0.035) 0 1px, transparent 1px 20px), linear-gradient(180deg, #120C22 0%, #080612 100%)',
        }}
        aria-hidden="true"
      />
      <div
        className={`absolute h-72 w-72 rounded-full border ${isCode ? 'border-[#111827]/14' : 'border-[#8B5CF6]/28'}`}
        style={{ animation: 'agenthub-loader-ring 2.4s ease-in-out infinite' }}
        aria-hidden="true"
      />
      <div
        className={`absolute h-96 w-96 rounded-full border border-dashed ${isCode ? 'border-[#6B3FA0]/16' : 'border-[#D6C5E8]/14'}`}
        style={{ animation: 'agenthub-loader-orbit 6s linear infinite' }}
        aria-hidden="true"
      />

      <div className="relative flex flex-col items-center">
        <div className="relative mb-6 flex h-24 w-24 items-center justify-center">
          <span className="absolute inset-0 rounded-[2rem] blur-2xl" style={{ backgroundColor: glow }} aria-hidden="true" />
          <div
            className="relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-3xl bg-white shadow-[0_0_44px_rgba(139,92,246,0.35)]"
            style={{ animation: 'agenthub-logo-breathe 1.35s ease-in-out infinite' }}
          >
            <Image src="/logo.png" alt="AgentHub" width={66} height={66} className="object-contain p-1" priority />
          </div>
        </div>
        <p className={`font-display text-base font-semibold tracking-tight ${isCode ? 'text-[#111827]' : 'text-white'}`}>{label || 'AgentHub'}</p>
        <div className={`mt-6 h-1 w-48 overflow-hidden rounded-full ${isCode ? 'bg-[#D8DDEE]' : 'bg-white/10'}`}>
          <span
            className="block h-full w-1/2 rounded-full"
            style={{ backgroundColor: accent, animation: 'agenthub-loader-sweep 1.05s ease-in-out infinite' }}
          />
        </div>
        <div className={`mt-3 h-px w-24 ${isCode ? 'bg-[#111827]/10' : 'bg-white/12'}`} aria-hidden="true">
          <span
            className="block h-full w-1/2"
            style={{ backgroundColor: accent, animation: 'agenthub-loader-sweep 1.05s ease-in-out infinite' }}
          />
        </div>
      </div>
    </div>
  );
}

export default function PortalPage() {
  const router = useRouter();
  const redirectTimer = useRef(null);
  const introTimer = useRef(null);
  const [introLoading, setIntroLoading] = useState(true);
  const [selectedSpace, setSelectedSpace] = useState(null);

  useEffect(() => {
    introTimer.current = window.setTimeout(() => setIntroLoading(false), MIN_TRANSITION_MS);

    return () => {
      if (introTimer.current) {
        window.clearTimeout(introTimer.current);
      }
      if (redirectTimer.current) {
        window.clearTimeout(redirectTimer.current);
      }
    };
  }, []);

  const enterSpace = (key) => {
    if (selectedSpace) {
      return;
    }

    setSelectedSpace(key);
    redirectTimer.current = window.setTimeout(() => {
      router.push(choices[key].href);
    }, MIN_TRANSITION_MS);
  };

  const transitionLabel = selectedSpace
    ? `${choices[selectedSpace].title}${choices[selectedSpace].titleSuffix ? ` ${choices[selectedSpace].titleSuffix}` : ''}`
    : 'AgentHub';
  const transitionTone = selectedSpace ? choices[selectedSpace].tone : 'agenthub';

  return (
    <main className="min-h-screen overflow-hidden bg-[#080612]">
      <header className="fixed inset-x-0 top-0 z-40">
        <div className="mx-auto flex h-20 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-white shadow-[0_0_18px_rgba(139,92,246,0.28)]">
              <Image src="/logo.png" alt="AgentHub" width={36} height={36} className="object-contain p-1" priority />
            </span>
            <span className="font-display text-lg font-bold tracking-tight text-white drop-shadow-sm">AgentHub</span>
          </Link>
        </div>
      </header>

      <section className="flex min-h-screen flex-col md:flex-row">
        {Object.entries(choices).map(([key, choice]) => {
          return (
            <div
              key={key}
              className={`group relative flex min-h-[50vh] flex-1 overflow-hidden px-6 pb-10 pt-28 text-center transition-colors duration-300 md:min-h-screen md:px-10 lg:px-16 ${
                choice.panel
              }`}
            >
              <div className="pointer-events-none absolute inset-0" style={choice.overlay} />
              <div
                className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                style={{ background: choice.texture }}
                aria-hidden="true"
              />
              <div className="relative z-10 flex w-full flex-col items-center justify-end md:justify-center">
                <div className="mx-auto max-w-xl lg:max-w-2xl">
                  <p className={`font-label mb-4 text-xs ${choice.ghost}`}>{choice.label}</p>
                  <h1 className="font-display text-5xl font-bold leading-none tracking-tight sm:text-6xl lg:text-7xl">
                    <span className="inline-flex items-start justify-center gap-3">
                      <span>{choice.title}</span>
                      {choice.titleSuffix && (
                        <span className="mt-1 rounded-full border border-[#D8DDEE] bg-white/70 px-3 py-1 text-xl font-semibold italic leading-none tracking-tight text-[#6B3FA0] shadow-sm sm:text-2xl lg:text-3xl">
                          {choice.titleSuffix}
                        </span>
                      )}
                    </span>
                  </h1>
                </div>

                <Link
                  href={choice.href}
                  onClick={(event) => {
                    event.preventDefault();
                    enterSpace(key);
                  }}
                  className={`mt-8 inline-flex min-h-12 w-60 items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold shadow-sm transition-all duration-200 group-hover:translate-y-[-1px] group-hover:shadow-[0_16px_42px_rgba(0,0,0,0.18)] ${choice.button}`}
                  aria-label={choice.action}
                >
                  {choice.action}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>

            </div>
          );
        })}
      </section>

      <LoadingTransition active={introLoading || Boolean(selectedSpace)} label={transitionLabel} tone={transitionTone} />
    </main>
  );
}
