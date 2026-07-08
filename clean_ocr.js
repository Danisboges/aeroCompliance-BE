const prisma = require('./src/db/index');

async function cleanRawOcrContent() {
  console.log('Starting database cleanup for raw_ocr_content...');
  
  const sbs = await prisma.serviceBulletin.findMany({
    where: {
      rawPayload: {
        not: null
      }
    }
  });

  let updatedCount = 0;

  for (const sb of sbs) {
    if (sb.rawPayload && typeof sb.rawPayload === 'object' && 'raw_ocr_content' in sb.rawPayload) {
      // Clone the payload and remove raw_ocr_content
      const payloadObj = sb.rawPayload;
      delete payloadObj.raw_ocr_content;
      
      await prisma.serviceBulletin.update({
        where: { id: sb.id },
        data: { rawPayload: payloadObj }
      });
      
      updatedCount++;
      console.log(`Cleaned raw_ocr_content from SB: ${sb.sbNumber}`);
    }
  }

  console.log(`Cleanup complete! Successfully updated ${updatedCount} records.`);
  await prisma.$disconnect();
}

cleanRawOcrContent().catch(e => {
  console.error(e);
  process.exit(1);
});
