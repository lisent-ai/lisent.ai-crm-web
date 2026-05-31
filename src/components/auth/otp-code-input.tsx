"use client";

import { useRef, type ClipboardEvent, type KeyboardEvent } from "react";

type OtpCodeInputProps = {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  disabled?: boolean;
  autoFocus?: boolean;
};

// Reusable segmented OTP input: `length` single-digit boxes that behave as
// one field (auto-advance, backspace-to-previous, paste a full code).
// `value` is the digits-only string; the parent owns it.
export function OtpCodeInput({
  value,
  onChange,
  length = 6,
  disabled = false,
  autoFocus = true,
}: Readonly<OtpCodeInputProps>) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  function setDigit(index: number, digit: string) {
    const chars = value.split("");
    chars[index] = digit;
    onChange(chars.join("").replace(/\D/g, "").slice(0, length));
  }

  function handleChange(index: number, raw: string) {
    const digit = raw.replace(/\D/g, "").slice(-1);
    if (!digit) {
      setDigit(index, "");
      return;
    }
    setDigit(index, digit);
    if (index < length - 1) refs.current[index + 1]?.focus();
  }

  function handleKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !value[index] && index > 0) {
      refs.current[index - 1]?.focus();
    } else if (e.key === "ArrowLeft" && index > 0) {
      refs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < length - 1) {
      refs.current[index + 1]?.focus();
    }
  }

  function handlePaste(e: ClipboardEvent<HTMLInputElement>) {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (!pasted) return;
    e.preventDefault();
    onChange(pasted);
    refs.current[Math.min(pasted.length, length - 1)]?.focus();
  }

  return (
    <div className="flex justify-between gap-2" dir="ltr">
      {Array.from({ length }).map((_, i) => (
        <input
          // eslint-disable-next-line react/no-array-index-key
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          type="text"
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          maxLength={1}
          disabled={disabled}
          autoFocus={autoFocus && i === 0}
          value={value[i] ?? ""}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          className="h-14 w-full rounded-2xl border border-white/15 bg-white/5 text-center text-2xl font-semibold text-white outline-none transition focus:border-violet-300/60 focus:bg-white/10 disabled:opacity-50"
        />
      ))}
    </div>
  );
}
