'use client';

import { useEffect, useRef, useState } from 'react';
import { AlertCircle, Check, Copy } from 'lucide-react';

export default function CopyTextButton({
  copiedLabel = 'Copié',
  errorLabel = 'Copie impossible',
  label = 'Copier',
  text,
}) {
  const [state, setState] = useState('idle');
  const resetTimerRef = useRef(null);
  const normalizedText = typeof text === 'string' ? text.trim() : '';
  const disabled = !normalizedText;

  useEffect(() => () => {
    if (resetTimerRef.current) {
      window.clearTimeout(resetTimerRef.current);
    }
  }, []);

  function scheduleReset() {
    if (resetTimerRef.current) {
      window.clearTimeout(resetTimerRef.current);
    }

    resetTimerRef.current = window.setTimeout(() => {
      setState('idle');
      resetTimerRef.current = null;
    }, 1600);
  }

  async function writeClipboardText(value) {
    if (window.navigator?.clipboard?.writeText) {
      await window.navigator.clipboard.writeText(value);
      return;
    }

    const textArea = document.createElement('textarea');
    textArea.value = value;
    textArea.setAttribute('readonly', '');
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    textArea.style.top = '0';
    document.body.appendChild(textArea);
    textArea.select();

    try {
      const copied = document.execCommand('copy');

      if (!copied) {
        throw new Error('copy_failed');
      }
    } finally {
      document.body.removeChild(textArea);
    }
  }

  async function copyText() {
    if (disabled) {
      return;
    }

    try {
      await writeClipboardText(normalizedText);
      setState('copied');
      scheduleReset();
    } catch {
      setState('error');
      scheduleReset();
    }
  }

  const isCopied = state === 'copied';
  const isError = state === 'error';
  const statusLabel = isCopied ? copiedLabel : isError ? errorLabel : label;

  return (
    <button
      type="button"
      onClick={copyText}
      disabled={disabled}
      aria-label={statusLabel}
      aria-live="polite"
      className="inline-flex h-8 items-center justify-center gap-1.5 rounded-full border border-[#6B3FA0]/55 bg-[#251A40] px-3 text-[11px] font-semibold text-[#E9D5FF] transition-colors hover:border-[#8B5CF6] hover:bg-[#33205A] disabled:cursor-not-allowed disabled:border-[#2F184B] disabled:bg-[#171022] disabled:text-[#7F6B9C]"
    >
      {isCopied ? (
        <Check className="h-3.5 w-3.5" />
      ) : isError ? (
        <AlertCircle className="h-3.5 w-3.5" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
      {statusLabel}
    </button>
  );
}
