// Utility functions for the xPay application

export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(dateStr: string, options?: Intl.DateTimeFormatOptions): string {
  const defaultOptions: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  };
  return new Date(dateStr).toLocaleDateString('en-US', options || defaultOptions);
}

export function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffTime = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
}

export function getCategoryIcon(category: string): string {
  const icons: Record<string, string> = {
    food: '🍔',
    transport: '🚗',
    shopping: '🛍️',
    entertainment: '🎬',
    bills: '📄',
    health: '🏥',
    education: '📚',
    salary: '💰',
    investment: '📈',
    freelance: '💼',
    other: '📦',
  };
  return icons[category] || '📦';
}

export function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    food: 'bg-orange-100 text-orange-600',
    transport: 'bg-blue-100 text-blue-600',
    shopping: 'bg-pink-100 text-pink-600',
    entertainment: 'bg-purple-100 text-purple-600',
    bills: 'bg-slate-100 text-slate-600',
    health: 'bg-red-100 text-red-600',
    education: 'bg-indigo-100 text-indigo-600',
    salary: 'bg-green-100 text-green-600',
    investment: 'bg-emerald-100 text-emerald-600',
    freelance: 'bg-cyan-100 text-cyan-600',
    other: 'bg-gray-100 text-gray-600',
  };
  return colors[category] || 'bg-gray-100 text-gray-600';
}

export function validateEmail(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

export function validatePassword(password: string): { valid: boolean; message: string } {
  if (password.length < 6) {
    return { valid: false, message: 'Password must be at least 6 characters' };
  }
  if (password.length > 72) {
    return { valid: false, message: 'Password must be less than 72 characters' };
  }
  return { valid: true, message: '' };
}

export function classNames(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + '...';
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export function groupTransactionsByDate<T extends { date: string }>(
  transactions: T[]
): { date: string; label: string; transactions: T[] }[] {
  const groups: Record<string, T[]> = {};

  transactions.forEach((txn) => {
    const date = txn.date.split('T')[0];
    if (!groups[date]) groups[date] = [];
    groups[date].push(txn);
  });

  return Object.entries(groups)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, txns]) => ({
      date,
      label: formatRelativeDate(date),
      transactions: txns,
    }));
}
