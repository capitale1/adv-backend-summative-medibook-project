const { REFUND_POLICY } = require('../config/businessRules');
const { MS_PER_HOUR } = require('../utils/dateTime');

function getRefundPercent(noticeHours) {
  if (noticeHours > REFUND_POLICY.FULL_REFUND_ABOVE_HOURS) return REFUND_POLICY.FULL_REFUND_PERCENT;
  if (noticeHours >= REFUND_POLICY.PARTIAL_REFUND_FROM_HOURS) return REFUND_POLICY.PARTIAL_REFUND_PERCENT;
  return REFUND_POLICY.NO_REFUND_PERCENT;
}

function calculateRefund(amountPaid, slotStart, cancelledAt) {
  const noticeHours = (slotStart.getTime() - cancelledAt.getTime()) / MS_PER_HOUR;
  const percent = getRefundPercent(noticeHours);
  const amount = Math.round(amountPaid * percent) / 100;
  return { notice_hours: Math.round(noticeHours * 100) / 100, percent, amount };
}

module.exports = { calculateRefund, getRefundPercent };
