require('dotenv').config();
const prisma = require('../src/db');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const { generateId } = require('../src/utils/idGenerator');
const { seedApprovalUsers } = require('./seedApprovalUsers');

async function copySampleFiles() {
  const uploadDir = path.join(__dirname, '../uploads');
  const ocrDir = path.join(uploadDir, 'sb-documents');
  const svrDir = path.join(uploadDir, 'svr-documents');
  
  if (!fs.existsSync(ocrDir)) fs.mkdirSync(ocrDir, { recursive: true });
  if (!fs.existsSync(svrDir)) fs.mkdirSync(svrDir, { recursive: true });

  const artifactDir = path.join(__dirname, 'seed-data');
  
  const filesToCopy = [
    { src: path.join(artifactDir, 'SB_GE90_72_0685.pdf'), dest: path.join(ocrDir, 'SB_GE90_72_0685.pdf') },
    { src: path.join(artifactDir, 'SB_LEAP_1A_72_0449.pdf'), dest: path.join(ocrDir, 'SB_LEAP_1A_72_0449.pdf') },
    { src: path.join(artifactDir, 'SVR_660235_2026.pdf'), dest: path.join(svrDir, 'SVR_660235_2026.pdf') },
    { src: path.join(artifactDir, 'SVR_660235_2026.pdf'), dest: path.join(svrDir, 'SVR_906101_2026.pdf') },
    { src: path.join(artifactDir, 'SVR_660235_2026.pdf'), dest: path.join(svrDir, 'SVR_ESN_GTA01_2026.pdf') }
  ];

  for (const file of filesToCopy) {
    if (fs.existsSync(file.src)) {
      fs.copyFileSync(file.src, file.dest);
      console.log(`Copied ${path.basename(file.dest)} successfully.`);
    } else {
      console.warn(`[WARNING] Sample file not found: ${file.src}. PDF viewer might not work in demo.`);
    }
  }
}

async function main() {
  console.log('🧹 Cleaning up database tables...');
  await prisma.reviewAction.deleteMany({});
  await prisma.approval.deleteMany({});
  await prisma.serviceBulletinRead.deleteMany({});
  await prisma.complianceRecord.deleteMany({});
  
  // Updated model names based on current schema
  await prisma.documentConfigurationItem.deleteMany({});
  await prisma.documentLlpStatus.deleteMany({});
  await prisma.documentSbStatus.deleteMany({});
  await prisma.documentAccessoriesList.deleteMany({});
  
  await prisma.sbGroupResult.deleteMany({});
  await prisma.sbRequirementMember.deleteMany({});
  await prisma.sbRequirementGroup.deleteMany({});
  await prisma.sbComplianceAudit.deleteMany({});
  await prisma.engineHistoryLog.deleteMany({});
  await prisma.engineActiveComponent.deleteMany({});
  await prisma.iq03Report.deleteMany({});
  await prisma.engineDataSubmittal.deleteMany({});
  
  await prisma.shopVisitReport.deleteMany({});
  await prisma.eesEvaluationItem.deleteMany({});
  await prisma.eesDocument.deleteMany({});
  await prisma.engineeringRecommendation.deleteMany({});
  await prisma.ocrResult.deleteMany({});

  await prisma.sbRelation.deleteMany({});
  await prisma.serviceBulletin.deleteMany({});
  await prisma.engine.deleteMany({});
  await prisma.aircraft.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.operator.deleteMany({});
  console.log('✅ Cleanup completed.\n');

  await copySampleFiles();
  console.log('\n🏢 Seeding Operators...');
  const opGaruda = await prisma.operator.create({ data: { id: generateId('OP'), code: 'GA', name: 'Garuda Indonesia' } });
  const opCitilink = await prisma.operator.create({ data: { id: generateId('OP'), code: 'QG', name: 'Citilink' } });

  console.log('👤 Seeding Users...');
  const pass = await bcrypt.hash('tech123', 10);
  const adminPass = await bcrypt.hash('admin123', 10);
  
  const userAdmin = await prisma.user.create({ data: { id: generateId('USR'), email: 'admin@gmf.co.id', username: 'admin', password: adminPass, role: 'ADMIN' } });
  const firstEng = await prisma.user.create({ data: { id: generateId('USR'), email: 'firsteng@gmf.co.id', username: 'first_engineer', password: pass, role: 'ENGINEER', operatorId: opGaruda.id } });
  const secondEng = await prisma.user.create({ data: { id: generateId('USR'), email: 'secondeng@gmf.co.id', username: 'second_engineer', password: pass, role: 'MANAGER', operatorId: opGaruda.id } });
  const tech = await prisma.user.create({ data: { id: generateId('USR'), email: 'technician@gmf.co.id', username: 'technician', password: pass, role: 'TECHNICIAN', operatorId: opGaruda.id } });

  const firstEngCiti = await prisma.user.create({ data: { id: generateId('USR'), email: 'firsteng.citilink@gmf.co.id', username: 'first_eng_citi', password: pass, role: 'ENGINEER', operatorId: opCitilink.id } });

  const approvalCandidateUsers = await seedApprovalUsers(prisma, {
    operators: { GA: opGaruda, QG: opCitilink },
  });
  console.log('✅ Approval candidate users:', approvalCandidateUsers.map((user) => ({
    preferredId: user.preferredId,
    actualId: user.actualId,
    email: user.email,
  })));

  console.log('✈️ Seeding Aircraft Fleet...');
  const aircrafts = [
    { registration: 'PK-GIA', msn: '33501', aircraftType: 'B737-800', operatorId: opGaruda.id },
    { registration: 'PK-GTA', msn: '6432', aircraftType: 'A320-200', operatorId: opCitilink.id },
    { registration: 'PK-GIE', msn: '37701', aircraftType: 'B777-300ER', operatorId: opGaruda.id }
  ];
  const acMap = {};
  for (const ac of aircrafts) {
    const record = await prisma.aircraft.create({ data: { id: generateId('AC'), registration: ac.registration, msn: ac.msn, aircraftType: ac.aircraftType, operatorId: ac.operatorId, active: true } });
    acMap[ac.registration] = record.id;
  }

  console.log('⚙️ Seeding Engines...');
  const engines = [
    { esn: '660235', msn: '33501', model: 'CFM56-7B26E', position: '1', aircraftRegistration: 'PK-GIA' },
    { esn: 'ESN-GTA01', msn: '6432', model: 'LEAP-1A26', position: '1', aircraftRegistration: 'PK-GTA' },
    { esn: '906101', msn: '37701', model: 'GE90-115B', position: '1', aircraftRegistration: 'PK-GIE' }
  ];
  const engMap = {};
  for (const eng of engines) {
    const record = await prisma.engine.create({ data: { id: generateId('ENG'), esn: eng.esn, msn: eng.msn, model: eng.model, position: eng.position, aircraftId: acMap[eng.aircraftRegistration], active: true } });
    engMap[eng.esn] = record.id;
  }

  console.log('📑 Seeding Realistic SBs & Scenarios...');
  
  // SCENARIO 1: COMPLETED (GE90)
  const sb1 = await prisma.serviceBulletin.create({
    data: {
      id: generateId('SB'),
      sbNumber: 'GE90 SB 72-0685 R06',
      revision: 'R06',
      title: 'ENGINE - Fan Hub Frame Assembly (72-23-00) - TGB Roller Bearing Inner Race Material Change',
      issuer: 'GE Aerospace',
      issueDate: new Date('2025-12-22'),
      receivedAt: new Date('2026-07-01'),
      status: 'ACTIVE',
      complianceCategory: 3,
      aircraftType: 'B777-300ER',
      impactType: 'E',
      operatorId: opGaruda.id,
      originalFileName: 'SB_GE90_72_0685.pdf',
      storedFileName: 'SB_GE90_72_0685.pdf'
    }
  });

  const ees1 = await prisma.eesDocument.create({
    data: { id: generateId('EES'), eesNumber: `EES-GA-${sb1.id.slice(-6)}`, sourceSbId: sb1.id, reviewStatus: 'APPROVED', createdAt: new Date() }
  });

  await prisma.approval.create({
    data: { id: generateId('APP'), eesId: ees1.id, approvalLevel: 2, status: 'APPROVED', submittedById: firstEng.id, assignedToId: secondEng.id, submittedAt: new Date(), reviewedAt: new Date(), comment: 'Approved for execution' }
  });
  
  await prisma.reviewAction.create({
    data: { id: generateId('REV'), eesId: ees1.id, action: 'APPROVED', actorId: secondEng.id, actorRole: 'MANAGER', comment: 'Looks good' }
  });

  // SCENARIO 2: PENDING SECOND ENGINEER (Category 4)
  const sb2 = await prisma.serviceBulletin.create({
    data: {
      id: generateId('SB'),
      sbNumber: 'GE90 SB 72-0686 R01',
      revision: 'R01',
      title: 'ENGINE - Fan Hub Frame Assembly - Routine Inspection',
      issuer: 'GE Aerospace',
      issueDate: new Date('2026-01-10'),
      receivedAt: new Date('2026-07-02'),
      status: 'ACTIVE',
      complianceCategory: 4, // >= 4 goes to Second Engineer
      aircraftType: 'B777-300ER',
      impactType: 'E',
      operatorId: opGaruda.id,
    }
  });

  const ees2 = await prisma.eesDocument.create({
    data: { id: generateId('EES'), eesNumber: `EES-GA-${sb2.id.slice(-6)}`, sourceSbId: sb2.id, reviewStatus: 'PENDING', createdAt: new Date() }
  });

  await prisma.approval.create({
    data: { id: generateId('APP'), eesId: ees2.id, approvalLevel: 1, status: 'PENDING', submittedById: firstEng.id, assignedToId: firstEng.id, submittedAt: new Date() }
  });

  // SCENARIO 3: PENDING MANAGER (Category 3)
  const sb3 = await prisma.serviceBulletin.create({
    data: {
      id: generateId('SB'),
      sbNumber: 'LEAP-1A-72-00-0449',
      revision: '01A',
      title: 'ENGINE - GENERAL (72-00-00) - INTRODUCTION OF NEW LPTACC COOLING MANIFOLD',
      issuer: 'CFM International',
      issueDate: new Date('2026-02-02'),
      receivedAt: new Date(),
      status: 'ACTIVE',
      complianceCategory: 3, // < 4 goes to Manager for GA, but this is Citilink? Let's use Garuda to test pending-manager properly.
      aircraftType: 'B737-800',
      impactType: 'D',
      operatorId: opGaruda.id, 
    }
  });

  const ees3 = await prisma.eesDocument.create({
    data: { id: generateId('EES'), eesNumber: `EES-GA-${sb3.id.slice(-6)}`, sourceSbId: sb3.id, reviewStatus: 'PENDING', createdAt: new Date() }
  });

  await prisma.approval.create({
    data: { id: generateId('APP'), eesId: ees3.id, approvalLevel: 1, status: 'PENDING', submittedById: firstEng.id, assignedToId: secondEng.id, submittedAt: new Date() }
  });

  console.log('🔗 Seeding SB Relations...');
  // Scenario 4: A Service Bulletin to be superseded
  const sb4 = await prisma.serviceBulletin.create({
    data: {
      id: generateId('SB'),
      sbNumber: 'GE90 SB 72-0680',
      revision: 'R00',
      title: 'OLD ENGINE - Fan Hub Frame Assembly',
      issuer: 'GE Aerospace',
      issueDate: new Date('2024-01-01'),
      receivedAt: new Date('2024-02-01'),
      status: 'SUPERSEDED',
      complianceCategory: 3,
      aircraftType: 'B777-300ER',
      operatorId: opGaruda.id,
    }
  });

  // SB1 supersedes SB4
  await prisma.sbRelation.create({
    data: {
      sourceSbId: sb1.id,
      targetSbNumber: sb4.sbNumber,
      relationType: 'SUPERSEDES',
      conditionType: 'NONE'
    }
  });

  console.log('🏭 Seeding Shop Visit Report...');
  const svrRawPayload = {
    svr_schema: {
      engine_type: 'CFM56-7B26E',
      engine_serial_number: '660235',
      shop_in_date: '23 FEB 2026',
      shop_out_date: '04 MAR 2026',
      report_date: '05 MAR 2026',
      reason_for_shop_visit: 'Performance restoration and scheduled LLP inspection',
      tsn: '42,650 FH',
      csn: '28,410 FC',
      tslv: '8,250 FH',
      cslv: '5,420 FC',
      authorized_release_status: 'RELEASED',
      configuration_report: [
        {
          module: 'FAN',
          part_name: 'FAN BLADE',
          in_out: 'IN',
          part_number: '340-001-026-0',
          serial: 'FB12345',
          qty: '24',
          tsn: '15,230',
          csn: '9,870',
          tso: '0',
          cso: '0',
          work_accompl: 'Inspected, blended and reinstalled'
        },
        {
          module: 'HPC',
          part_name: 'HPC ROTOR STAGE 1',
          in_out: 'IN',
          part_number: '338-001-501-0',
          serial: 'HPC660235',
          qty: '1',
          tsn: '42,650',
          csn: '28,410',
          tso: '8,250',
          cso: '5,420',
          work_accompl: 'Dimensional inspection satisfactory'
        }
      ],
      life_limited_part_status: [
        {
          no: '1',
          description: 'FAN DISK',
          part_number: '340-123-01',
          serial_number: 'FD555',
          total_hour: '42,650',
          total_cycle: '28,410',
          total_cycles_category: { flight: 28410 },
          life_limit_cycles: { flight: 30000 },
          remaining_cycles: { flight: 1590 },
          remark: 'Serviceable'
        }
      ],
      service_bulletin_status: [
        {
          sb_number: 'GE90 SB 72-0685 R06',
          notification_date_of_compliance: '04 MAR 2026',
          description: 'Fan Hub Frame Assembly inspection',
          cat_type: 'CATEGORY 3',
          module_applicability: 'FAN MODULE',
          method_of_compliance: 'INSPECTED PER SB',
          remarks: 'Complied during shop visit'
        }
      ],
      airworthiness_directive_status: [
        {
          ad_number: 'FAA AD 2020-04-04',
          reference_sb: 'CFM SB 72-1050',
          recurr_insp: 'NO',
          notification_date_of_compliance: '02 MAR 2026',
          description: 'HPT rotor inspection',
          module_applicability: 'HPT MODULE',
          method_of_compliance: 'INSPECTION ACCOMPLISHED',
          remarks: 'No finding'
        }
      ],
      accessories_list: [
        {
          no: '1',
          description: 'HYDROMECHANICAL UNIT',
          received: {
            pn: '442324',
            sn: 'HMU-660235',
            tsn: '18,120',
            tso: '6,300'
          },
          installed: {
            pn: '442324',
            sn: 'HMU-778812',
            tsn: '9,450',
            tso: '0'
          },
          maintenance_performed: 'Replacement and functional test satisfactory'
        }
      ]
    }
  };

  const svr1 = await prisma.shopVisitReport.create({
    data: {
      id: generateId('SVR'),
      engine: { connect: { id: engMap['660235'] } },
      engineSerialNumber: '660235',
      engineType: 'CFM56-7B26E',
      shopInDate: '23 FEB 2026',
      shopOutDate: '04 MAR 2026',
      reportDate: '05 MAR 2026',
      reasonForShopVisit: 'Performance restoration and scheduled LLP inspection',
      tsn: '42,650 FH',
      csn: '28,410 FC',
      tslv: '8,250 FH',
      cslv: '5,420 FC',
      authorizedReleaseStatus: 'RELEASED',
      originalFileName: 'SVR_660235_2026.pdf',
      storedFileName: 'SVR_660235_2026.pdf',
      rawPayload: svrRawPayload,
      configurationReport: {
        create: [
          {
            engineSerialNumber: '660235',
            module: 'FAN',
            partName: 'FAN BLADE',
            inOut: 'IN',
            partNumber: '340-001-026-0',
            serial: 'FB12345',
            qty: '24',
            tsn: '15,230',
            csn: '9,870',
            tso: '0',
            cso: '0',
            workAccompl: 'Inspected, blended and reinstalled'
          },
          {
            engineSerialNumber: '660235',
            module: 'HPC',
            partName: 'HPC ROTOR STAGE 1',
            inOut: 'IN',
            partNumber: '338-001-501-0',
            serial: 'HPC660235',
            qty: '1',
            tsn: '42,650',
            csn: '28,410',
            tso: '8,250',
            cso: '5,420',
            workAccompl: 'Dimensional inspection satisfactory'
          }
        ]
      },
      llpStatus: {
        create: [
          {
            engineSerialNumber: '660235',
            no: '1',
            description: 'FAN DISK',
            partNumber: '340-123-01',
            serialNumber: 'FD555',
            totalHour: '42,650',
            totalCycle: '28,410',
            totalCyclesCategory: { flight: 28410 },
            lifeLimitCycles: { flight: 30000 },
            remainingCycles: { flight: 1590 },
            remark: 'Serviceable'
          }
        ]
      },
      sbStatus: {
        create: [
          {
            engineSerialNumber: '660235',
            sbNumber: sb1.sbNumber,
            notificationDateOfCompliance: '04 MAR 2026',
            description: 'Fan Hub Frame Assembly inspection',
            catType: `CATEGORY ${sb1.complianceCategory}`,
            moduleApplicability: 'FAN MODULE',
            methodOfCompliance: 'INSPECTED PER SB',
            remarks: 'Complied during shop visit'
          }
        ]
      },
      adStatus: {
        create: [
          {
            engineSerialNumber: '660235',
            adNumber: 'FAA AD 2020-04-04',
            referenceSb: 'CFM SB 72-1050',
            recurrInsp: 'NO',
            notificationDateOfCompliance: '02 MAR 2026',
            description: 'HPT rotor inspection',
            moduleApplicability: 'HPT MODULE',
            methodOfCompliance: 'INSPECTION ACCOMPLISHED',
            remarks: 'No finding'
          }
        ]
      },
      accessoriesList: {
        create: [
          {
            engineSerialNumber: '660235',
            no: '1',
            description: 'HYDROMECHANICAL UNIT',
            receivedPn: '442324',
            receivedSn: 'HMU-660235',
            receivedTsn: '18,120',
            receivedTso: '6,300',
            installedPn: '442324',
            installedSn: 'HMU-778812',
            installedTsn: '9,450',
            installedTso: '0',
            maintenancePerformed: 'Replacement and functional test satisfactory'
          }
        ]
      }
    }
  });

  const svr2 = await prisma.shopVisitReport.create({
    data: {
      id: generateId('SVR'),
      engine: { connect: { id: engMap['906101'] } },
      engineSerialNumber: '906101',
      engineType: 'GE90-115B',
      shopInDate: '12 APR 2026',
      shopOutDate: '30 MAY 2026',
      reportDate: '01 JUN 2026',
      reasonForShopVisit: 'HPC module inspection and performance restoration',
      tsn: '36,820 FH',
      csn: '7,940 FC',
      tslv: '9,120 FH',
      cslv: '1,860 FC',
      authorizedReleaseStatus: 'RELEASED',
      originalFileName: 'SVR_906101_2026.pdf',
      storedFileName: 'SVR_906101_2026.pdf',
      rawPayload: {
        svr_schema: {
          engine_type: 'GE90-115B',
          engine_serial_number: '906101',
          shop_in_date: '12 APR 2026',
          shop_out_date: '30 MAY 2026',
          report_date: '01 JUN 2026',
          reason_for_shop_visit: 'HPC module inspection and performance restoration',
          tsn: '36,820 FH',
          csn: '7,940 FC',
          tslv: '9,120 FH',
          cslv: '1,860 FC',
          authorized_release_status: 'RELEASED',
          configuration_report: [
            {
              module: 'HPC',
              part_name: 'HPC STATOR STAGE 5',
              in_out: 'IN',
              part_number: '2305M89G01',
              serial: 'HPCS5-906101',
              qty: '1',
              tsn: '18,450',
              csn: '3,920',
              tso: '0',
              cso: '0',
              work_accompl: 'Borescope inspection and dimensional check'
            }
          ],
          life_limited_part_status: [
            {
              no: '1',
              description: 'HPT ROTOR STAGE 1 DISK',
              part_number: '1847M90P01',
              serial_number: 'HPTD-906101',
              total_hour: '36,820',
              total_cycle: '7,940',
              total_cycles_category: { flight: 7940 },
              life_limit_cycles: { flight: 15000 },
              remaining_cycles: { flight: 7060 },
              remark: 'Continue in service'
            }
          ],
          service_bulletin_status: [
            {
              sb_number: 'GE90 SB 72-0686 R01',
              notification_date_of_compliance: '28 MAY 2026',
              description: 'Fan Hub Frame Assembly routine inspection',
              cat_type: 'CATEGORY 4',
              module_applicability: 'FAN MODULE',
              method_of_compliance: 'INSPECTION ACCOMPLISHED',
              remarks: 'No defect found'
            }
          ],
          airworthiness_directive_status: [
            {
              ad_number: 'FAA AD 2023-12-09',
              reference_sb: 'GE90 SB 72-0686 R01',
              recurr_insp: 'YES',
              notification_date_of_compliance: '28 MAY 2026',
              description: 'Fan hub frame recurring inspection',
              module_applicability: 'FAN MODULE',
              method_of_compliance: 'REPETITIVE INSPECTION ACCOMPLISHED',
              remarks: 'Next inspection due in 1,500 cycles'
            }
          ],
          accessories_list: [
            {
              no: '1',
              description: 'FUEL PUMP',
              received: {
                pn: '1838M10P01',
                sn: 'FP-906101-A',
                tsn: '21,700',
                tso: '9,120'
              },
              installed: {
                pn: '1838M10P01',
                sn: 'FP-906101-B',
                tsn: '8,200',
                tso: '0'
              },
              maintenance_performed: 'Replaced and leak tested'
            }
          ]
        }
      },
      configurationReport: {
        create: [
          {
            engineSerialNumber: '906101',
            module: 'HPC',
            partName: 'HPC STATOR STAGE 5',
            inOut: 'IN',
            partNumber: '2305M89G01',
            serial: 'HPCS5-906101',
            qty: '1',
            tsn: '18,450',
            csn: '3,920',
            tso: '0',
            cso: '0',
            workAccompl: 'Borescope inspection and dimensional check'
          }
        ]
      },
      llpStatus: {
        create: [
          {
            engineSerialNumber: '906101',
            no: '1',
            description: 'HPT ROTOR STAGE 1 DISK',
            partNumber: '1847M90P01',
            serialNumber: 'HPTD-906101',
            totalHour: '36,820',
            totalCycle: '7,940',
            totalCyclesCategory: { flight: 7940 },
            lifeLimitCycles: { flight: 15000 },
            remainingCycles: { flight: 7060 },
            remark: 'Continue in service'
          }
        ]
      },
      sbStatus: {
        create: [
          {
            engineSerialNumber: '906101',
            sbNumber: sb2.sbNumber,
            notificationDateOfCompliance: '28 MAY 2026',
            description: 'Fan Hub Frame Assembly routine inspection',
            catType: `CATEGORY ${sb2.complianceCategory}`,
            moduleApplicability: 'FAN MODULE',
            methodOfCompliance: 'INSPECTION ACCOMPLISHED',
            remarks: 'No defect found'
          }
        ]
      },
      adStatus: {
        create: [
          {
            engineSerialNumber: '906101',
            adNumber: 'FAA AD 2023-12-09',
            referenceSb: sb2.sbNumber,
            recurrInsp: 'YES',
            notificationDateOfCompliance: '28 MAY 2026',
            description: 'Fan hub frame recurring inspection',
            moduleApplicability: 'FAN MODULE',
            methodOfCompliance: 'REPETITIVE INSPECTION ACCOMPLISHED',
            remarks: 'Next inspection due in 1,500 cycles'
          }
        ]
      },
      accessoriesList: {
        create: [
          {
            engineSerialNumber: '906101',
            no: '1',
            description: 'FUEL PUMP',
            receivedPn: '1838M10P01',
            receivedSn: 'FP-906101-A',
            receivedTsn: '21,700',
            receivedTso: '9,120',
            installedPn: '1838M10P01',
            installedSn: 'FP-906101-B',
            installedTsn: '8,200',
            installedTso: '0',
            maintenancePerformed: 'Replaced and leak tested'
          }
        ]
      }
    }
  });

  const svr3 = await prisma.shopVisitReport.create({
    data: {
      id: generateId('SVR'),
      engine: { connect: { id: engMap['ESN-GTA01'] } },
      engineSerialNumber: 'ESN-GTA01',
      engineType: 'LEAP-1A26',
      shopInDate: '08 JUN 2026',
      shopOutDate: '21 JUN 2026',
      reportDate: '22 JUN 2026',
      reasonForShopVisit: 'LPTACC cooling manifold modification',
      tsn: '12,480 FH',
      csn: '7,360 FC',
      tslv: '4,100 FH',
      cslv: '2,450 FC',
      authorizedReleaseStatus: 'RELEASED',
      originalFileName: 'SVR_ESN_GTA01_2026.pdf',
      storedFileName: 'SVR_ESN_GTA01_2026.pdf',
      rawPayload: {
        svr_schema: {
          engine_type: 'LEAP-1A26',
          engine_serial_number: 'ESN-GTA01',
          shop_in_date: '08 JUN 2026',
          shop_out_date: '21 JUN 2026',
          report_date: '22 JUN 2026',
          reason_for_shop_visit: 'LPTACC cooling manifold modification',
          tsn: '12,480 FH',
          csn: '7,360 FC',
          tslv: '4,100 FH',
          cslv: '2,450 FC',
          authorized_release_status: 'RELEASED',
          configuration_report: [
            {
              module: 'LPT',
              part_name: 'LPTACC COOLING MANIFOLD',
              in_out: 'IN',
              part_number: '2445M17G01',
              serial: 'LPTACC-GTA01',
              qty: '1',
              tsn: '0',
              csn: '0',
              tso: '0',
              cso: '0',
              work_accompl: 'New manifold installed per service bulletin'
            }
          ],
          life_limited_part_status: [
            {
              no: '1',
              description: 'FAN DISK',
              part_number: '2625M31P01',
              serial_number: 'LEAP-FD-GTA01',
              total_hour: '12,480',
              total_cycle: '7,360',
              total_cycles_category: { flight: 7360 },
              life_limit_cycles: { flight: 30000 },
              remaining_cycles: { flight: 22640 },
              remark: 'Serviceable'
            }
          ],
          service_bulletin_status: [
            {
              sb_number: 'LEAP-1A-72-00-0449',
              notification_date_of_compliance: '20 JUN 2026',
              description: 'Introduction of new LPTACC cooling manifold',
              cat_type: 'CATEGORY 3',
              module_applicability: 'LPT MODULE',
              method_of_compliance: 'MODIFICATION ACCOMPLISHED',
              remarks: 'New configuration installed'
            }
          ],
          airworthiness_directive_status: [
            {
              ad_number: 'EASA AD 2024-0102',
              reference_sb: 'LEAP-1A-72-00-0449',
              recurr_insp: 'NO',
              notification_date_of_compliance: '20 JUN 2026',
              description: 'LPTACC manifold modification',
              module_applicability: 'LPT MODULE',
              method_of_compliance: 'TERMINATING ACTION ACCOMPLISHED',
              remarks: 'AD requirement closed'
            }
          ],
          accessories_list: [
            {
              no: '1',
              description: 'STARTER AIR VALVE',
              received: {
                pn: '2458M90P01',
                sn: 'SAV-GTA01-A',
                tsn: '12,480',
                tso: '4,100'
              },
              installed: {
                pn: '2458M90P02',
                sn: 'SAV-GTA01-B',
                tsn: '0',
                tso: '0'
              },
              maintenance_performed: 'Modified configuration installed and tested'
            }
          ]
        }
      },
      configurationReport: {
        create: [
          {
            engineSerialNumber: 'ESN-GTA01',
            module: 'LPT',
            partName: 'LPTACC COOLING MANIFOLD',
            inOut: 'IN',
            partNumber: '2445M17G01',
            serial: 'LPTACC-GTA01',
            qty: '1',
            tsn: '0',
            csn: '0',
            tso: '0',
            cso: '0',
            workAccompl: 'New manifold installed per service bulletin'
          }
        ]
      },
      llpStatus: {
        create: [
          {
            engineSerialNumber: 'ESN-GTA01',
            no: '1',
            description: 'FAN DISK',
            partNumber: '2625M31P01',
            serialNumber: 'LEAP-FD-GTA01',
            totalHour: '12,480',
            totalCycle: '7,360',
            totalCyclesCategory: { flight: 7360 },
            lifeLimitCycles: { flight: 30000 },
            remainingCycles: { flight: 22640 },
            remark: 'Serviceable'
          }
        ]
      },
      sbStatus: {
        create: [
          {
            engineSerialNumber: 'ESN-GTA01',
            sbNumber: sb3.sbNumber,
            notificationDateOfCompliance: '20 JUN 2026',
            description: 'Introduction of new LPTACC cooling manifold',
            catType: `CATEGORY ${sb3.complianceCategory}`,
            moduleApplicability: 'LPT MODULE',
            methodOfCompliance: 'MODIFICATION ACCOMPLISHED',
            remarks: 'New configuration installed'
          }
        ]
      },
      adStatus: {
        create: [
          {
            engineSerialNumber: 'ESN-GTA01',
            adNumber: 'EASA AD 2024-0102',
            referenceSb: sb3.sbNumber,
            recurrInsp: 'NO',
            notificationDateOfCompliance: '20 JUN 2026',
            description: 'LPTACC manifold modification',
            moduleApplicability: 'LPT MODULE',
            methodOfCompliance: 'TERMINATING ACTION ACCOMPLISHED',
            remarks: 'AD requirement closed'
          }
        ]
      },
      accessoriesList: {
        create: [
          {
            engineSerialNumber: 'ESN-GTA01',
            no: '1',
            description: 'STARTER AIR VALVE',
            receivedPn: '2458M90P01',
            receivedSn: 'SAV-GTA01-A',
            receivedTsn: '12,480',
            receivedTso: '4,100',
            installedPn: '2458M90P02',
            installedSn: 'SAV-GTA01-B',
            installedTsn: '0',
            installedTso: '0',
            maintenancePerformed: 'Modified configuration installed and tested'
          }
        ]
      }
    }
  });

  console.log(`✅ Seeded 3 SVR examples: ${svr1.id}, ${svr2.id}, ${svr3.id}`);

  console.log('🔗 Seeding Compliance Record...');
  const cmp1 = await prisma.complianceRecord.create({
    data: {
      id: generateId('CMP'),
      engineId: engMap['660235'],
      sbId: sb1.id,
      svrId: svr1.id,
      status: 'COMPLIED',
      complianceDate: '04 MAR 2026',
      remarks: 'Complied during Shop Visit'
    }
  });

  console.log('📋 Seeding additional important models (EES Evaluations, EDS, IQ03, Groups, History, Audits)...');
  
  // 1. EES Evaluation Items
  await prisma.eesEvaluationItem.create({
    data: {
      id: generateId('EVAL'),
      eesDocumentId: ees1.id,
      itemNo: '1',
      requirementDesc: 'Inspect Fan Hub Frame Assembly',
      remarks: 'No cracks found',
      isApplicable: true
    }
  });

  // 2. Engine Data Submittal (EDS)
  const eds1 = await prisma.engineDataSubmittal.create({
    data: {
      id: generateId('EDS'),
      engine: { connect: { id: engMap['906101'] } },
      engineSerialNumber: '906101',
      engineType: 'GE90-115B',
      originalFileName: 'EDS_906101_2026.pdf',
      rawPayload: JSON.stringify({ "date": "10 JAN 2026", "tsn": "15000", "csn": "12000" }),
      accessoriesList: {
        create: [
          { engineSerialNumber: '906101', no: '1', description: 'Fuel Pump', installedPn: 'FP-123', installedSn: 'SN-001' }
        ]
      }
    }
  });

  // 3. IQ03 Report
  const iq03_1 = await prisma.iq03Report.create({
    data: {
      id: generateId('IQ03'),
      engine: { connect: { id: engMap['ESN-GTA01'] } },
      engineSerialNumber: 'ESN-GTA01',
      engineType: 'LEAP-1A26',
      originalFileName: 'IQ03_GTA01_2026.pdf',
      rawPayload: JSON.stringify({ "date": "15 MAR 2026" })
    }
  });

  // 4. Engine Active Component
  await prisma.engineActiveComponent.create({
    data: {
      engineId: engMap['660235'],
      partNumber: '340-001-026-0',
      partName: 'FAN BLADE',
      module: 'FAN',
      tsn: '1500',
      csn: '1200',
      lastUpdatedFrom: 'SVR'
    }
  });

  // 5. SB Requirement Group & Member & Result
  const reqGroup = await prisma.sbRequirementGroup.create({
    data: {
      groupCode: 'GRP-GE90-001',
      groupName: 'GE90 Essential Mods',
      fulfillmentRule: 'ALL_OF',
      minimumRequired: 1
    }
  });

  await prisma.sbRequirementMember.create({
    data: {
      requirementGroupId: reqGroup.id,
      targetSbNumber: sb1.sbNumber,
      sequenceNumber: 1
    }
  });

  await prisma.sbGroupResult.create({
    data: {
      requirementGroupId: reqGroup.id,
      engineId: engMap['660235'],
      fulfillmentStatus: 'SATISFIED',
      satisfiedByComplianceId: cmp1.id,
      satisfiedAt: new Date()
    }
  });

  // 6. Engine History Log
  await prisma.engineHistoryLog.create({
    data: {
      engineId: engMap['660235'],
      documentType: 'SVR',
      svrId: svr1.id,
      changedById: tech.id,
      notes: 'Initial SVR processed'
    }
  });

  // 7. SB Compliance Audit
  await prisma.sbComplianceAudit.create({
    data: {
      complianceRecordId: cmp1.id,
      previousStatus: 'OPEN',
      newStatus: 'COMPLIED',
      changeSource: 'SYSTEM',
      changeReason: 'SVR upload matched requirements',
      changedById: tech.id
    }
  });

  // 8. Service Bulletin Read
  await prisma.serviceBulletinRead.create({
    data: {
      userId: firstEng.id,
      serviceBulletinId: sb1.id
    }
  });

  console.log('🎉 Seeding completed successfully!');
}

main()
  .catch((e) => { console.error('❌ Seeder failed:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
