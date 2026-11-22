const Report = require('../models/reportModel');
const { requireId } = require('../validators/common');
const { NotFoundError } = require('../utils/errors');
const { DAILY_APPOINTMENT_CAP, BUSY_DAY_THRESHOLD, STATISTICS_WINDOW_DAYS } = require('../config/businessRules');

async function getDoctorStatistics(req, res) {
  const doctorId = requireId(req.params.id);
  const summary = await Report.getDoctorSummary(doctorId);
  if (!summary) throw new NotFoundError('Doctor');

  const [dailyCounts, utilization] = await Promise.all([
    Report.getDailyAppointmentCounts(doctorId, STATISTICS_WINDOW_DAYS, DAILY_APPOINTMENT_CAP),
    Report.getWindowUtilization(doctorId, STATISTICS_WINDOW_DAYS, DAILY_APPOINTMENT_CAP),
  ]);

  res.json({
    ...summary,
    daily_cap: DAILY_APPOINTMENT_CAP,
    next_7_days: dailyCounts,
    utilization_next_7_days: utilization,
  });
}

async function getDoctorsReport(req, res) {
  res.json(await Report.getDoctorsReport());
}

async function getBusyDaysReport(req, res) {
  const busyDays = await Report.getBusyDays(DAILY_APPOINTMENT_CAP, BUSY_DAY_THRESHOLD);
  res.json({
    threshold: `more than ${BUSY_DAY_THRESHOLD * 100}% of ${DAILY_APPOINTMENT_CAP} daily slots`,
    busy_days: busyDays,
  });
}

module.exports = { getDoctorStatistics, getDoctorsReport, getBusyDaysReport };
