require('dotenv').config();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const fs = require('fs/promises');
const path = require('path');
const prisma = require('../src/db/index.js');

async function main() {
  console.log('Starting database seeding...');

  await prisma.ocrDocumentUpload.deleteMany({});
  await prisma.eesEvaluationItem.deleteMany({});
  await prisma.eesDocument.deleteMany({});
  await prisma.complianceTask.deleteMany({});
  await prisma.airworthinessDocument.deleteMany({});
  await prisma.engine.deleteMany({});
  await prisma.aircraft.deleteMany({});
  await prisma.user.deleteMany({});
  console.log('Cleaned existing tables.');

  const adminPassword = await bcrypt.hash('admin123', 10);
  const technicianPassword = await bcrypt.hash('tech123', 10);

  const admin = await prisma.user.create({
    data: {
      email: 'admin@gmf.com',
      password: adminPassword,
      role: 'ADMIN'
    }
  });

  const technician = await prisma.user.create({
    data: {
      email: 'technician@gmf.com',
      password: technicianPassword,
      role: 'TECHNICIAN'
    }
  });

  const aircraft = await prisma.aircraft.create({
    data: {
      registration: 'PK-GMF',
      msn: 'GMF-SEED-737-001',
      aircraftType: 'B737-800',
      operator: 'GMF Trial Operator',
      engines: {
        create: [
          {
            esn: 'ESN-SEED-X01',
            model: 'CFM56-7B',
            position: 'LH'
          },
          {
            esn: 'ESN-SEED-X02',
            model: 'CFM56-7B',
            position: 'RH'
          }
        ]
      }
    },
    include: {
      engines: true
    }
  });

  const adDocument = await prisma.airworthinessDocument.create({
    data: {
      documentType: 'AD',
      documentNumber: 'AD-2026-CFM-04',
      title: 'Fan Blade Leading Edge Inspection',
      issuer: 'DGCA / Trial Data',
      revision: 'R0',
      status: 'ACTIVE',
      priority: 'CRITICAL',
      issueDate: new Date('2026-06-01T00:00:00.000Z'),
      effectiveDate: new Date('2026-06-15T00:00:00.000Z'),
      dueDate: new Date('2026-09-15T00:00:00.000Z'),
      description: 'Trial AD seed for monitoring urgent inspection compliance.',
      createdById: admin.id
    }
  });

  const sbDocument = await prisma.airworthinessDocument.create({
    data: {
      documentType: 'SB',
      documentNumber: 'SB-CFM56-1234',
      title: 'Electronic Engine Control Software Upgrade',
      issuer: 'CFM International / Trial Data',
      revision: 'R1',
      status: 'ACTIVE',
      priority: 'HIGH',
      issueDate: new Date('2026-05-20T00:00:00.000Z'),
      dueDate: new Date('2026-12-31T00:00:00.000Z'),
      description: 'Trial SB seed for software modification tracking.',
      createdById: admin.id
    }
  });

  const adTask = await prisma.complianceTask.create({
    data: {
      documentId: adDocument.id,
      aircraftId: aircraft.id,
      engineId: aircraft.engines[0].id,
      title: 'Inspect LH engine fan blade leading edges',
      description: 'Perform detailed visual inspection for erosion and crack indications.',
      taskType: 'INSPECTION',
      status: 'OPEN',
      priority: 'CRITICAL',
      isRepetitive: true,
      dueDate: new Date('2026-09-15T00:00:00.000Z'),
      reference: 'AMM 72-21-01-200',
      remarks: 'Seed task linked to AD and aircraft/engine effectivity.',
      assignedToId: technician.id,
      createdById: admin.id
    }
  });

  const sbTask = await prisma.complianceTask.create({
    data: {
      documentId: sbDocument.id,
      aircraftId: aircraft.id,
      engineId: aircraft.engines[1].id,
      title: 'Upgrade RH engine EEC software',
      description: 'Upgrade electronic engine control software to the required version.',
      taskType: 'SOFTWARE_UPDATE',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      isRepetitive: false,
      dueDate: new Date('2026-12-31T00:00:00.000Z'),
      reference: 'SB CFM56 73-0125',
      remarks: 'Seed task showing SB monitoring flow.',
      assignedToId: technician.id,
      createdById: admin.id
    }
  });

  const webhookEesDocument = await prisma.eesDocument.create({
    data: {
      eesNumber: 'EES-WEBHOOK-SEED-001',
      bulletinNumber: sbDocument.documentNumber,
      documentId: sbDocument.id,
      evaluations: {
        create: [
          {
            itemNo: '1',
            paragraph: 'Para 3.A',
            requirementDesc: 'Perform a detailed visual inspection of the fan blade leading edges for erosion.',
            taskType: 'Inspection',
            reference: 'AMM 72-21-01-200',
            isApplicable: true,
            adRelated: adDocument.documentNumber,
            isWarranty: false,
            affectedEsn: ['ESN-SEED-X01', 'ESN-SEED-X02'],
            isRepetitive: true,
            dueAt: 'Next A-Check or 250 Flight Cycles',
            remarks: 'Example data as if AI OCR already sent JSON to /api/webhooks/ees.',
            complianceTaskId: adTask.id
          },
          {
            itemNo: '2',
            paragraph: 'Para 3.B',
            requirementDesc: 'Upgrade the electronic engine control software to version 5.4.1.',
            taskType: 'Modification',
            reference: 'SB CFM56 73-0125',
            isApplicable: true,
            adRelated: 'N/A',
            isWarranty: true,
            affectedEsn: ['ESN-SEED-X02'],
            isRepetitive: false,
            dueAt: 'Next Shop Visit',
            remarks: 'Warranty claim should be reviewed by planning team.',
            complianceTaskId: sbTask.id
          }
        ]
      }
    },
    include: {
      evaluations: true
    }
  });

  const fakePdfBuffer = Buffer.from('%PDF-1.4\nseed pdf placeholder\n%%EOF');
  const checksum = crypto.createHash('sha256').update(fakePdfBuffer).digest('hex');
  const storageRoot = path.resolve(__dirname, '../uploads/ocr-documents');
  const storedFileName = `seed-upload-${checksum.slice(0, 12)}.pdf`;
  const storagePath = path.join(storageRoot, storedFileName);
  const fileUrl = `/storage/ocr-documents/${encodeURIComponent(storedFileName)}`;
  await fs.mkdir(storageRoot, { recursive: true });
  await fs.writeFile(storagePath, fakePdfBuffer);

  const ocrUpload = await prisma.ocrDocumentUpload.create({
    data: {
      originalFileName: 'seed-uploaded-ad-sb.pdf',
      storedFileName,
      storagePath,
      fileUrl,
      mimeType: 'application/pdf',
      fileSize: fakePdfBuffer.length,
      checksum,
      status: 'UPLOADED',
      ocrProvider: 'URL_STORAGE_ONLY',
      createdById: technician.id
    }
  });

  console.log('Seeded users:');
  console.log(` - ${admin.email} / admin123 / ${admin.role}`);
  console.log(` - ${technician.email} / tech123 / ${technician.role}`);
  console.log('Seeded aircraft and engines:');
  console.log(` - ${aircraft.registration} (${aircraft.aircraftType})`);
  aircraft.engines.forEach((engine) => {
    console.log(` - ${engine.position} ${engine.model} / ${engine.esn}`);
  });
  console.log('Seeded AD/SB documents and compliance tasks:');
  console.log(` - ${adDocument.documentNumber} -> task ${adTask.id} (${adTask.status})`);
  console.log(` - ${sbDocument.documentNumber} -> task ${sbTask.id} (${sbTask.status})`);
  console.log('Seeded EES flows:');
  console.log(` - Webhook JSON flow: ${webhookEesDocument.eesNumber} with ${webhookEesDocument.evaluations.length} items`);
  console.log(` - PDF storage flow: upload ${ocrUpload.id} -> ${ocrUpload.fileUrl}`);
  console.log('Database seeding completed successfully.');
}

main()
  .catch((error) => {
    console.error('Seeding failed with error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
