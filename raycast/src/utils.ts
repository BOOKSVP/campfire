export function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function isExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt) < new Date();
}

export function getExpiryDate(option: string): string | null {
  const now = new Date();
  switch (option) {
    case "30min": {
      now.setMinutes(now.getMinutes() + 30);
      return now.toISOString();
    }
    case "1hour": {
      now.setHours(now.getHours() + 1);
      return now.toISOString();
    }
    case "2hours": {
      now.setHours(now.getHours() + 2);
      return now.toISOString();
    }
    case "4hours": {
      now.setHours(now.getHours() + 4);
      return now.toISOString();
    }
    case "eod": {
      now.setHours(17, 0, 0, 0);
      if (now < new Date()) now.setDate(now.getDate() + 1);
      return now.toISOString();
    }
    default:
      return null;
  }
}
