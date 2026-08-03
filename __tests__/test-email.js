require('dotenv').config();
const emailService = require('./src/services/emailService');

async function runTest() {
  console.log("Menyiapkan tes pengiriman email (Request & Rejected)...");
  
  // Dummy PDF Buffer to simulate attachment
  const dummyPdfBuffer = Buffer.from('%PDF-1.4\n1 0 obj\n<<\n/Title (Dummy PDF EES)\n>>\nendobj\n%%EOF');

  console.log("\n--- Mengirim Email Request ---");
  await emailService.sendApprovalRequestEmail(
    'dwontoljarwo@gmail.com',
    'EES-SB-72-1082-TEST',
    'MANAGER',
    'http://localhost:3000/approvals/123',
    dummyPdfBuffer
  );

  console.log("\n--- Mengirim Email Rejected ---");
  await emailService.sendApprovalRejectedEmail(
    'dwontoljarwo@gmail.com',
    'EES-SB-72-1082-TEST',
    'Dokumen ini kurang tanda tangan pada lampiran halaman 3. Mohon diperbaiki segera.',
    'MANAGER',
    'http://localhost:3000/ees/123',
    dummyPdfBuffer
  );

  console.log("\nSelesai! Silakan klik URL Preview di atas untuk melihat hasilnya.");
}

runTest().catch(console.error);
