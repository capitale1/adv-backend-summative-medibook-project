const Patient = require('../models/patientModel');
const { validatePatient, toPatientData } = require('../validators/patientValidator');
const { requireId } = require('../validators/common');
const { ValidationError, NotFoundError } = require('../utils/errors');

function parsePatientBody(body) {
  const errors = validatePatient(body);
  if (errors.length > 0) throw new ValidationError(errors);
  return toPatientData(body);
}

async function listPatients(req, res) {
  res.json(await Patient.findAll());
}

async function getPatient(req, res) {
  const patient = await Patient.findById(requireId(req.params.id));
  if (!patient) throw new NotFoundError('Patient');
  res.json(patient);
}

async function createPatient(req, res) {
  const patient = await Patient.create(parsePatientBody(req.body));
  res.status(201).location(`/api/patients/${patient.id}`).json(patient);
}

async function updatePatient(req, res) {
  const id = requireId(req.params.id);
  const patient = await Patient.update(id, parsePatientBody(req.body));
  if (!patient) throw new NotFoundError('Patient');
  res.json(patient);
}

async function deletePatient(req, res) {
  const deleted = await Patient.remove(requireId(req.params.id));
  if (!deleted) throw new NotFoundError('Patient');
  res.status(204).end();
}

module.exports = { listPatients, getPatient, createPatient, updatePatient, deletePatient };
