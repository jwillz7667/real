import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPhoneNumber(value: string): string {
  const cleaned = value.replace(/\D/g, "");
  if (cleaned.length === 0) return "";
  if (cleaned.length <= 1) return `+${cleaned}`;
  if (cleaned.length <= 4) return `+${cleaned.slice(0, 1)} (${cleaned.slice(1)})`;
  if (cleaned.length <= 7) return `+${cleaned.slice(0, 1)} (${cleaned.slice(1, 4)}) ${cleaned.slice(4)}`;
  if (cleaned.length <= 11) return `+${cleaned.slice(0, 1)} (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  return `+${cleaned.slice(0, cleaned.length - 10)} (${cleaned.slice(-10, -7)}) ${cleaned.slice(-7, -4)}-${cleaned.slice(-4)}`;
}

export function parsePhoneNumber(formatted: string): string {
  const cleaned = formatted.replace(/\D/g, "");
  return cleaned.startsWith("1") ? `+${cleaned}` : `+1${cleaned}`;
}

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function formatTimestamp(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function formatTimestampWithMs(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const time = d.toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const ms = d.getMilliseconds().toString().padStart(3, "0");
  return `${time}.${ms}`;
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export function truncatePayload(payload: unknown, maxLength = 100): string {
  const str = JSON.stringify(payload);
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength) + "...";
}

export function estimateCost(inputTokens: number, outputTokens: number): number {
  const inputCost = (inputTokens / 1_000_000) * 100;
  const outputCost = (outputTokens / 1_000_000) * 200;
  return Number((inputCost + outputCost).toFixed(4));
}
