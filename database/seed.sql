-- MediBook seed data
-- Run after schema.sql:  mysql -u root -p < database/seed.sql
USE medibook;

INSERT INTO patients (id, full_name, email, phone) VALUES
  (1, 'Ama Mensah',    'ama@mail.com',    '0244-111-222'),
  (2, 'Kojo Owusu',    'kojo@mail.com',   '0555-333-444'),
  (3, 'Akosua Darko',  'akosua@mail.com', '0201-555-666'),
  (4, 'Kwesi Appiah',  'kwesi@mail.com',  '0277-888-999'),
  (5, 'Esi Quaye',     'esi@mail.com',    '0503-222-111');

-- Dr. Asante (id 3) intentionally has NO appointments (needed for the doctors report).
INSERT INTO doctors (id, full_name, specialty, consultation_fee, room) VALUES
  (1, 'Dr. Kwame Boateng', 'Dermatology', 150.00, 'R-12'),
  (2, 'Dr. Efua Adjei',    'Paediatrics', 100.00, 'R-03'),
  (3, 'Dr. Yaw Asante',    'Cardiology',  200.00, 'R-07');

-- Past appointments from the original spreadsheet (AP-002 paid less than the fee).
INSERT INTO appointments (patient_id, doctor_id, slot_start, amount_paid, booked_at) VALUES
  (1, 1, '2026-08-10 09:00:00', 150.00, '2026-07-01 10:00:00'),
  (2, 1, '2026-08-10 09:30:00', 120.00, '2026-07-02 10:00:00'),
  (1, 2, '2026-08-15 10:00:00', 100.00, '2026-07-03 10:00:00');

-- A cancelled appointment with a 50% refund (39 hours' notice), kept for refund history.
INSERT INTO appointments
  (patient_id, doctor_id, slot_start, amount_paid, status, booked_at, cancelled_at, refund_amount) VALUES
  (3, 2, '2026-12-10 11:00:00', 100.00, 'CANCELLED', '2026-11-01 09:00:00', '2026-12-08 20:00:00', 50.00);

-- Upcoming appointments with Dr. Adjei.
INSERT INTO appointments (patient_id, doctor_id, slot_start, amount_paid, booked_at) VALUES
  (4, 2, '2026-11-25 10:00:00', 100.00, '2026-11-15 12:00:00'),
  (5, 2, '2026-11-26 14:30:00', 100.00, '2026-11-16 12:00:00');

-- Near-cap day: Dr. Boateng has 11 of 12 slots booked on 2026-11-27
-- (above the 80% busy-day threshold, one slot left for demoing the cap/waitlist).
INSERT INTO appointments (patient_id, doctor_id, slot_start, amount_paid, booked_at) VALUES
  (1, 1, '2026-11-27 09:00:00', 150.00, '2026-11-10 08:00:00'),
  (2, 1, '2026-11-27 09:30:00', 150.00, '2026-11-10 08:05:00'),
  (3, 1, '2026-11-27 10:00:00', 150.00, '2026-11-10 08:10:00'),
  (4, 1, '2026-11-27 10:30:00', 150.00, '2026-11-11 09:00:00'),
  (5, 1, '2026-11-27 11:00:00', 150.00, '2026-11-11 09:05:00'),
  (1, 1, '2026-11-27 11:30:00', 150.00, '2026-11-12 10:00:00'),
  (2, 1, '2026-11-27 12:00:00', 150.00, '2026-11-12 10:05:00'),
  (3, 1, '2026-11-27 12:30:00', 150.00, '2026-11-13 11:00:00'),
  (4, 1, '2026-11-27 13:00:00', 150.00, '2026-11-13 11:05:00'),
  (5, 1, '2026-11-27 13:30:00', 150.00, '2026-11-14 12:00:00'),
  (1, 1, '2026-11-27 14:00:00', 150.00, '2026-11-14 12:05:00');
