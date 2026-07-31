require('dotenv').config();

const fs = require('fs');
const path = require('path');
const prisma = require('../src/db');

const examples = [
  {
    id: 'SVR-DEMO-660235',
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
    configurationReport: [
      {
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
      }
    ],
    llpStatus: [
      {
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
    ],
    sbStatus: [
      {
        sbNumber: 'GE90 SB 72-0685 R06',
        notificationDateOfCompliance: '04 MAR 2026',
        description: 'Fan Hub Frame Assembly inspection',
        catType: 'CATEGORY 3',
        moduleApplicability: 'FAN MODULE',
        methodOfCompliance: 'INSPECTED PER SB',
        remarks: 'Complied during shop visit'
      }
    ],
    adStatus: [
      {
        adNumber: 'FAA AD 2020-04-04',
        referenceSb: 'CFM SB 72-1050',
        recurrInsp: 'NO',
        notificationDateOfCompliance: '02 MAR 2026',
        description: 'HPT rotor inspection',
        moduleApplicability: 'HPT MODULE',
        methodOfCompliance: 'INSPECTION ACCOMPLISHED',
        remarks: 'No finding'
      }
    ],
    accessoriesList: [
      {
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
  },
  {
    id: 'SVR-DEMO-906101',
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
    configurationReport: [
      {
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
    ],
    llpStatus: [
      {
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
    ],
    sbStatus: [
      {
        sbNumber: 'GE90 SB 72-0686 R01',
        notificationDateOfCompliance: '28 MAY 2026',
        description: 'Fan Hub Frame Assembly routine inspection',
        catType: 'CATEGORY 4',
        moduleApplicability: 'FAN MODULE',
        methodOfCompliance: 'INSPECTION ACCOMPLISHED',
        remarks: 'No defect found'
      }
    ],
    adStatus: [
      {
        adNumber: 'FAA AD 2023-12-09',
        referenceSb: 'GE90 SB 72-0686 R01',
        recurrInsp: 'YES',
        notificationDateOfCompliance: '28 MAY 2026',
        description: 'Fan hub frame recurring inspection',
        moduleApplicability: 'FAN MODULE',
        methodOfCompliance: 'REPETITIVE INSPECTION ACCOMPLISHED',
        remarks: 'Next inspection due in 1,500 cycles'
      }
    ],
    accessoriesList: [
      {
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
  },
  {
    id: 'SVR-DEMO-ESN-GTA01',
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
    configurationReport: [
      {
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
    ],
    llpStatus: [
      {
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
    ],
    sbStatus: [
      {
        sbNumber: 'LEAP-1A-72-00-0449',
        notificationDateOfCompliance: '20 JUN 2026',
        description: 'Introduction of new LPTACC cooling manifold',
        catType: 'CATEGORY 3',
        moduleApplicability: 'LPT MODULE',
        methodOfCompliance: 'MODIFICATION ACCOMPLISHED',
        remarks: 'New configuration installed'
      }
    ],
    adStatus: [
      {
        adNumber: 'EASA AD 2024-0102',
        referenceSb: 'LEAP-1A-72-00-0449',
        recurrInsp: 'NO',
        notificationDateOfCompliance: '20 JUN 2026',
        description: 'LPTACC manifold modification',
        moduleApplicability: 'LPT MODULE',
        methodOfCompliance: 'TERMINATING ACTION ACCOMPLISHED',
        remarks: 'AD requirement closed'
      }
    ],
    accessoriesList: [
      {
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
];

const toRawPayload = (example) => ({
  svr_schema: {
    engine_type: example.engineType,
    engine_serial_number: example.engineSerialNumber,
    shop_in_date: example.shopInDate,
    shop_out_date: example.shopOutDate,
    report_date: example.reportDate,
    reason_for_shop_visit: example.reasonForShopVisit,
    tsn: example.tsn,
    csn: example.csn,
    tslv: example.tslv,
    cslv: example.cslv,
    authorized_release_status: example.authorizedReleaseStatus,
    configuration_report: example.configurationReport.map((item) => ({
      module: item.module,
      part_name: item.partName,
      in_out: item.inOut,
      part_number: item.partNumber,
      serial: item.serial,
      qty: item.qty,
      tsn: item.tsn,
      csn: item.csn,
      tso: item.tso,
      cso: item.cso,
      work_accompl: item.workAccompl
    })),
    life_limited_part_status: example.llpStatus.map((item) => ({
      no: item.no,
      description: item.description,
      part_number: item.partNumber,
      serial_number: item.serialNumber,
      total_hour: item.totalHour,
      total_cycle: item.totalCycle,
      total_cycles_category: item.totalCyclesCategory,
      life_limit_cycles: item.lifeLimitCycles,
      remaining_cycles: item.remainingCycles,
      remark: item.remark
    })),
    service_bulletin_status: example.sbStatus.map((item) => ({
      sb_number: item.sbNumber,
      notification_date_of_compliance: item.notificationDateOfCompliance,
      description: item.description,
      cat_type: item.catType,
      module_applicability: item.moduleApplicability,
      method_of_compliance: item.methodOfCompliance,
      remarks: item.remarks
    })),
    airworthiness_directive_status: example.adStatus.map((item) => ({
      ad_number: item.adNumber,
      reference_sb: item.referenceSb,
      recurr_insp: item.recurrInsp,
      notification_date_of_compliance: item.notificationDateOfCompliance,
      description: item.description,
      module_applicability: item.moduleApplicability,
      method_of_compliance: item.methodOfCompliance,
      remarks: item.remarks
    })),
    accessories_list: example.accessoriesList.map((item) => ({
      no: item.no,
      description: item.description,
      received: {
        pn: item.receivedPn,
        sn: item.receivedSn,
        tsn: item.receivedTsn,
        tso: item.receivedTso
      },
      installed: {
        pn: item.installedPn,
        sn: item.installedSn,
        tsn: item.installedTsn,
        tso: item.installedTso
      },
      maintenance_performed: item.maintenancePerformed
    }))
  }
});

const withEsn = (items, engineSerialNumber) => (
  items.map((item) => ({ ...item, engineSerialNumber }))
);

const copySamplePdf = (storedFileName) => {
  const source = path.join(__dirname, 'seed-data', 'SVR_660235_2026.pdf');
  const destinationDir = path.join(__dirname, '../uploads/svr-documents');
  const destination = path.join(destinationDir, storedFileName);

  if (!fs.existsSync(source)) {
    console.warn(`[SVR seed] Sample PDF not found: ${source}`);
    return;
  }

  fs.mkdirSync(destinationDir, { recursive: true });
  fs.copyFileSync(source, destination);
};

const seedExample = async (example) => {
  const engine = await prisma.engine.findUnique({
    where: { esn: example.engineSerialNumber },
    select: { id: true }
  });

  const existing = await prisma.shopVisitReport.findFirst({
    where: {
      engineSerialNumber: example.engineSerialNumber,
      originalFileName: example.originalFileName
    },
    select: { id: true }
  });

  const {
    id,
    configurationReport,
    llpStatus,
    sbStatus,
    adStatus,
    accessoriesList,
    ...header
  } = example;

  const relationalData = {
    configurationReport: withEsn(configurationReport, example.engineSerialNumber),
    llpStatus: withEsn(llpStatus, example.engineSerialNumber),
    sbStatus: withEsn(sbStatus, example.engineSerialNumber),
    adStatus: withEsn(adStatus, example.engineSerialNumber),
    accessoriesList: withEsn(accessoriesList, example.engineSerialNumber)
  };

  const commonData = {
    ...header,
    engineId: engine?.id ?? null,
    rawPayload: toRawPayload(example)
  };

  const record = existing
    ? await prisma.shopVisitReport.update({
        where: { id: existing.id },
        data: {
          ...commonData,
          configurationReport: {
            deleteMany: {},
            create: relationalData.configurationReport
          },
          llpStatus: {
            deleteMany: {},
            create: relationalData.llpStatus
          },
          sbStatus: {
            deleteMany: {},
            create: relationalData.sbStatus
          },
          adStatus: {
            deleteMany: {},
            create: relationalData.adStatus
          },
          accessoriesList: {
            deleteMany: {},
            create: relationalData.accessoriesList
          }
        }
      })
    : await prisma.shopVisitReport.create({
        data: {
          id,
          ...commonData,
          configurationReport: { create: relationalData.configurationReport },
          llpStatus: { create: relationalData.llpStatus },
          sbStatus: { create: relationalData.sbStatus },
          adStatus: { create: relationalData.adStatus },
          accessoriesList: { create: relationalData.accessoriesList }
        }
      });

  copySamplePdf(example.storedFileName);
  return { id: record.id, esn: record.engineSerialNumber, action: existing ? 'updated' : 'created' };
};

async function main() {
  console.log('Seeding 3 additive SVR examples...');

  const results = [];
  for (const example of examples) {
    results.push(await seedExample(example));
  }

  console.table(results);
  console.log('SVR seed completed without clearing unrelated database records.');
}

main()
  .catch((error) => {
    console.error('SVR seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
