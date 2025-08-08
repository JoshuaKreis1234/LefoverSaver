export const money = (amountCents: number, currency = 'USD', locale = 'en-US') =>
  new Intl.NumberFormat(locale, { style: 'currency', currency }).format((amountCents || 0) / 100);
