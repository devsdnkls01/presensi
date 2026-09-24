/**
 * Utility functions for Indonesian Western Time (WIB - Asia/Jakarta, UTC+7)
 * Ensures consistent date and time across all environments (Vercel Serverless, Node.js, etc.)
 */

export function getWIBDate(date: Date = new Date()): string {
  // Returns 'YYYY-MM-DD' in Asia/Jakarta timezone
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export function getWIBTime(date: Date = new Date()): string {
  // Returns 'HH:mm:ss' in Asia/Jakarta timezone (24-hour format)
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).format(date);
}

export function getWIBDateTime(date: Date = new Date()): { date: string; time: string } {
  return {
    date: getWIBDate(date),
    time: getWIBTime(date),
  };
}

export function getWIBMonth(date: Date = new Date()): string {
  // Returns 'YYYY-MM' in Asia/Jakarta timezone
  return getWIBDate(date).slice(0, 7);
}
