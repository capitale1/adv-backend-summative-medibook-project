const { calculateRefund } = require('../src/services/refundCalculator');

const HOUR = 60 * 60 * 1000;
const MINUTE = 60 * 1000;
const SLOT_START = new Date(2026, 11, 10, 10, 0, 0);
const FEE = 150;

function cancelledBefore(milliseconds) {
  return new Date(SLOT_START.getTime() - milliseconds);
}

describe('calculateRefund', () => {
  test('gives a full refund with more than 48 hours notice', () => {
    const refund = calculateRefund(FEE, SLOT_START, cancelledBefore(72 * HOUR));
    expect(refund).toEqual({ notice_hours: 72, percent: 100, amount: 150 });
  });

  test('gives a full refund one minute past the 48-hour boundary', () => {
    expect(calculateRefund(FEE, SLOT_START, cancelledBefore(48 * HOUR + MINUTE)).percent).toBe(100);
  });

  test('gives 50% at exactly 48 hours notice', () => {
    const refund = calculateRefund(FEE, SLOT_START, cancelledBefore(48 * HOUR));
    expect(refund.percent).toBe(50);
    expect(refund.amount).toBe(75);
  });

  test('gives 50% between 24 and 48 hours notice', () => {
    expect(calculateRefund(FEE, SLOT_START, cancelledBefore(30 * HOUR)).amount).toBe(75);
  });

  test('gives 50% at exactly 24 hours notice', () => {
    const refund = calculateRefund(FEE, SLOT_START, cancelledBefore(24 * HOUR));
    expect(refund.percent).toBe(50);
    expect(refund.amount).toBe(75);
  });

  test('gives no refund one minute short of 24 hours notice', () => {
    const refund = calculateRefund(FEE, SLOT_START, cancelledBefore(24 * HOUR - MINUTE));
    expect(refund.percent).toBe(0);
    expect(refund.amount).toBe(0);
  });

  test('gives no refund with less than 24 hours notice', () => {
    expect(calculateRefund(FEE, SLOT_START, cancelledBefore(2 * HOUR)).amount).toBe(0);
  });

  test('refunds partial payments in exact cents', () => {
    expect(calculateRefund(120.5, SLOT_START, cancelledBefore(30 * HOUR)).amount).toBe(60.25);
  });
});
