const { getSlotRuleViolations } = require('../src/validators/slotValidator');
const { parseLocalDateTime } = require('../src/utils/dateTime');

const NOW = new Date(2026, 11, 1, 12, 0, 0);

function violationsFor(text) {
  return getSlotRuleViolations(parseLocalDateTime(text), NOW);
}

describe('getSlotRuleViolations', () => {
  test('accepts a future slot on a 30-minute boundary within working hours', () => {
    expect(violationsFor('2026-12-10 10:30')).toEqual([]);
  });

  test('accepts the first (09:00) and last (16:30) slots of the day', () => {
    expect(violationsFor('2026-12-10 09:00')).toEqual([]);
    expect(violationsFor('2026-12-10 16:30')).toEqual([]);
  });

  test('rejects 17:00 because the appointment would end after closing time', () => {
    expect(violationsFor('2026-12-10 17:00')).toEqual([expect.stringMatching(/working hours/)]);
  });

  test('rejects a slot before opening time', () => {
    expect(violationsFor('2026-12-10 08:30')).toEqual([expect.stringMatching(/working hours/)]);
  });

  test('rejects 09:15 because it is not on a 30-minute boundary', () => {
    expect(violationsFor('2026-12-10 09:15')).toEqual([expect.stringMatching(/30-minute boundary/)]);
  });

  test('rejects a slot in the past and a slot starting exactly now', () => {
    expect(violationsFor('2026-11-30 10:00')).toEqual([expect.stringMatching(/future/)]);
    expect(violationsFor('2026-12-01 12:00')).toEqual([expect.stringMatching(/future/)]);
  });

  test('reports every rule broken at once', () => {
    expect(violationsFor('2026-11-30 18:45')).toHaveLength(3);
  });
});

describe('parseLocalDateTime', () => {
  test('parses both space and T separators', () => {
    expect(parseLocalDateTime('2026-12-10 10:30')).toEqual(new Date(2026, 11, 10, 10, 30));
    expect(parseLocalDateTime('2026-12-10T10:30:00')).toEqual(new Date(2026, 11, 10, 10, 30));
  });

  test.each(['tomorrow', '2026-02-30 10:00', '2026-12-10 25:00', '10/12/2026 10:00', '', null, 20261210])(
    'rejects malformed or impossible value %p',
    (value) => {
      expect(parseLocalDateTime(value)).toBeNull();
    }
  );
});
