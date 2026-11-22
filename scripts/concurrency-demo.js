const BASE_URL = process.env.API_URL || 'http://localhost:3000';

async function main() {
  const [doctorId, slotStart, ...patientArgs] = process.argv.slice(2);
  if (!doctorId || !slotStart) {
    console.log('Usage: node scripts/concurrency-demo.js <doctorId> "<YYYY-MM-DD HH:MM>" [patientIds...]');
    process.exit(1);
  }
  const patientIds = patientArgs.length > 0 ? patientArgs.map(Number) : [1, 2, 3, 4, 5];

  const results = await Promise.all(
    patientIds.map(async (patientId) => {
      const response = await fetch(`${BASE_URL}/api/appointments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patient_id: patientId, doctor_id: Number(doctorId), slot_start: slotStart }),
      });
      return { patientId, status: response.status, body: await response.json() };
    })
  );

  for (const { patientId, status, body } of results) {
    console.log(`patient ${patientId}: ${status} ${body.error || `booked appointment #${body.id}`}`);
  }
}

main();
