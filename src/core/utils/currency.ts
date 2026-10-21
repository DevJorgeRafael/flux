export function formatCurrency(
  value: number,
  showSign: boolean = false,
  isBalanceVisible: boolean = true
): string {
  if (!isBalanceVisible) {
    return '••••••';
  }
  const abs = Math.abs(value);
  const formatted = new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(abs);

  if (showSign && value > 0) {
    return `+${formatted}`;
  }
  if (value < 0) {
    return `-${formatted}`;
  }
  return formatted;
}
