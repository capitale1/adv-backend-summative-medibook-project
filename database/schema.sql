-- MediBook database schema (3NF)
-- Run on a fresh MySQL 8 server:  mysql -u root -p < database/schema.sql

DROP DATABASE IF EXISTS medibook;
CREATE DATABASE medibook CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE medibook;

-- ---------------------------------------------------------------
-- patients
-- ---------------------------------------------------------------
CREATE TABLE patients (
  id          INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  full_name   VARCHAR(100)  NOT NULL,
  email       VARCHAR(150)  NOT NULL,
  phone       VARCHAR(20)   NOT NULL,
  created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT uq_patients_email UNIQUE (email),
  CONSTRAINT chk_patients_email CHECK (email LIKE '%_@_%._%')
);

-- ---------------------------------------------------------------
-- doctors
-- ---------------------------------------------------------------
CREATE TABLE doctors (
  id                INT UNSIGNED   NOT NULL AUTO_INCREMENT,
  full_name         VARCHAR(100)   NOT NULL,
  specialty         VARCHAR(100)   NOT NULL,
  consultation_fee  DECIMAL(10,2)  NOT NULL,
  room              VARCHAR(10)    NOT NULL,
  created_at        DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT chk_doctors_fee CHECK (consultation_fee >= 0)
);

-- ---------------------------------------------------------------
-- appointments  (links patients and doctors; also holds cancellation/refund history)
-- ---------------------------------------------------------------
CREATE TABLE appointments (
  id             INT UNSIGNED   NOT NULL AUTO_INCREMENT,
  patient_id     INT UNSIGNED   NOT NULL,
  doctor_id      INT UNSIGNED   NOT NULL,
  slot_start     DATETIME       NOT NULL,
  amount_paid    DECIMAL(10,2)  NOT NULL,
  status         ENUM('BOOKED','CANCELLED') NOT NULL DEFAULT 'BOOKED',
  booked_at      DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  cancelled_at   DATETIME       NULL,
  refund_amount  DECIMAL(10,2)  NULL,

  -- Equals slot_start while the appointment is BOOKED, NULL once CANCELLED.
  -- The UNIQUE key below uses it, so a doctor can never hold two BOOKED
  -- appointments at the same date/time, but a cancelled slot can be rebooked
  -- (MySQL allows many NULLs in a UNIQUE index) and the cancelled row is kept.
  active_slot    DATETIME GENERATED ALWAYS AS
                   (CASE WHEN status = 'BOOKED' THEN slot_start END) STORED,

  PRIMARY KEY (id),
  CONSTRAINT fk_appointments_patient FOREIGN KEY (patient_id)
    REFERENCES patients (id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_appointments_doctor FOREIGN KEY (doctor_id)
    REFERENCES doctors (id) ON UPDATE CASCADE ON DELETE RESTRICT,

  CONSTRAINT uq_doctor_active_slot UNIQUE (doctor_id, active_slot),

  CONSTRAINT chk_slot_boundary
    CHECK (MINUTE(slot_start) IN (0, 30) AND SECOND(slot_start) = 0),
  CONSTRAINT chk_working_hours
    CHECK (HOUR(slot_start) BETWEEN 9 AND 16),          -- last slot starts 16:30, ends 17:00
  CONSTRAINT chk_amount_paid
    CHECK (amount_paid >= 0),
  CONSTRAINT chk_refund_range
    CHECK (refund_amount IS NULL OR (refund_amount >= 0 AND refund_amount <= amount_paid)),
  CONSTRAINT chk_cancellation_consistency
    CHECK (
      (status = 'BOOKED'    AND cancelled_at IS NULL     AND refund_amount IS NULL) OR
      (status = 'CANCELLED' AND cancelled_at IS NOT NULL AND refund_amount IS NOT NULL)
    ),

  INDEX idx_appointments_doctor_slot (doctor_id, slot_start),
  INDEX idx_appointments_patient (patient_id)
);
