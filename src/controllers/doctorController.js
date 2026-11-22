const Doctor = require('../models/doctorModel');
const { validateDoctor, toDoctorData } = require('../validators/doctorValidator');
const { requireId } = require('../validators/common');
const { ValidationError, NotFoundError } = require('../utils/errors');

function parseDoctorBody(body) {
  const errors = validateDoctor(body);
  if (errors.length > 0) throw new ValidationError(errors);
  return toDoctorData(body);
}

async function listDoctors(req, res) {
  res.json(await Doctor.findAll());
}

async function getDoctor(req, res) {
  const doctor = await Doctor.findById(requireId(req.params.id));
  if (!doctor) throw new NotFoundError('Doctor');
  res.json(doctor);
}

async function createDoctor(req, res) {
  const doctor = await Doctor.create(parseDoctorBody(req.body));
  res.status(201).location(`/api/doctors/${doctor.id}`).json(doctor);
}

async function updateDoctor(req, res) {
  const id = requireId(req.params.id);
  const doctor = await Doctor.update(id, parseDoctorBody(req.body));
  if (!doctor) throw new NotFoundError('Doctor');
  res.json(doctor);
}

async function deleteDoctor(req, res) {
  const deleted = await Doctor.remove(requireId(req.params.id));
  if (!deleted) throw new NotFoundError('Doctor');
  res.status(204).end();
}

module.exports = { listDoctors, getDoctor, createDoctor, updateDoctor, deleteDoctor };
