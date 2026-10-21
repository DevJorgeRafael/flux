export interface DailyInterestProjection {
  day: number;
  balance: number;
  interestEarned: number;
}

function assertNonNegativeFinite(value: number, name: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${name} debe ser un número finito mayor o igual a cero.`);
  }
}

function assertPositiveInteger(value: number, name: string): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw new RangeError(`${name} debe ser un número entero mayor que cero.`);
  }
}

export function calculateMonthlyGain(capital: number, annualRatePercent: number): number {
  assertNonNegativeFinite(capital, 'El capital');
  assertNonNegativeFinite(annualRatePercent, 'La tasa anual');
  return (capital * (annualRatePercent / 100)) / 12;
}

export function calculateFixedTermMaturity(
  capital: number,
  annualRatePercent: number,
  termMonths: number
): number {
  assertNonNegativeFinite(capital, 'El capital');
  assertNonNegativeFinite(annualRatePercent, 'La tasa anual');
  assertNonNegativeFinite(termMonths, 'El plazo');
  assertPositiveInteger(termMonths, 'El plazo');
  return capital + capital * (annualRatePercent / 100) * (termMonths / 12);
}

export function calculateDailyProjection(
  initialBalance: number,
  annualRatePercent: number,
  days: number
): DailyInterestProjection[] {
  assertNonNegativeFinite(initialBalance, 'El saldo');
  assertNonNegativeFinite(annualRatePercent, 'La tasa anual');
  assertNonNegativeFinite(days, 'La cantidad de días');
  assertPositiveInteger(days, 'La cantidad de días');

  const dailyRate = annualRatePercent / 100 / 365;
  const projection: DailyInterestProjection[] = [];
  let balance = initialBalance;

  for (let day = 1; day <= days; day += 1) {
    balance *= 1 + dailyRate;
    projection.push({
      day,
      balance,
      interestEarned: balance - initialBalance,
    });
  }

  return projection;
}
