const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const { normalizeOcrPayload } = require('./eesService');

/**
 * Extracts and maps evaluation items from Service Bulletin rawPayload.
 */
const extractPdfItems = (sb) => {
  const payload = sb.rawPayload || {};
  let rawItems = [];
  if (Array.isArray(payload.evaluations)) {
    rawItems = payload.evaluations;
  } else if (Array.isArray(payload.items)) {
    rawItems = payload.items;
  } else if (payload.items && typeof payload.items === 'object') {
    for (const key of Object.keys(payload.items)) {
      if (Array.isArray(payload.items[key])) {
        rawItems = rawItems.concat(payload.items[key]);
      }
    }
  }

  // Fallback to database evaluations if rawPayload is empty
  if (rawItems.length === 0 && sb.generatedEes && Array.isArray(sb.generatedEes.evaluations)) {
    rawItems = sb.generatedEes.evaluations;
  }

  const esnVal = sb.generatedEes?.esn || '-';

  return rawItems.map((item, index) => {
    const isApplicable = item.isApplicable !== undefined ? Boolean(item.isApplicable) : true;
    let warrantyVal = '-';
    if (item.warranty === true) warrantyVal = 'Y';
    else if (item.warranty === false) warrantyVal = 'N';
    
    return {
      no: item.itemNo !== undefined && item.itemNo !== null ? String(item.itemNo) : String(index + 1),
      par: item.paragraph || '-',
      desc: item.requirementDesc || '-',
      taskType: item.taskType || '-',
      ref: item.ref || '-',
      app: isApplicable ? 'Y' : 'N',
      adRelated: item.adRelated || '-',
      warranty: warrantyVal,
      affectedAcEngine: item.affectedAcEngine || esnVal,
      rep: item.rep || '-',
      dueAt: item.dueAt || '-',
      remarks: item.remarks || '-'
    };
  });
};

/**
 * Generates EES PDF document buffer using Puppeteer.
 */
const generateEesPdf = async ({ sb, templateType = 'GARUDA', evaluatorName }) => {
  const norm = sb.rawPayload ? normalizeOcrPayload(sb.rawPayload) : {
    eesNumber: sb.generatedEes?.eesNumber || `EES-${sb.sbNumber}`,
    bulletinNumber: sb.sbNumber
  };

  const eesNumber = norm.eesNumber;
  const sbNumber = norm.bulletinNumber;
  const items = extractPdfItems(sb);

  // Load the correct template file
  const templateFileName = templateType.toUpperCase() === 'CITILINK' 
    ? 'eesCitilinkTemplate.html' 
    : 'eesGarudaTemplate.html';
  
  const templatePath = path.join(__dirname, '../templates', templateFileName);
  if (!fs.existsSync(templatePath)) {
    throw new Error(`Validation Error: Template file for ${templateType} was not found`);
  }

  let htmlContent = fs.readFileSync(templatePath, 'utf8');

  // Convert logo to Base64 data URL
  let logoBase64 = '';
  try {
    const logoName = templateType.toUpperCase() === 'CITILINK'
      ? 'citilink logo.png'
      : 'logo_garuda-removebg-preview.png';
    const logoPath = path.resolve(__dirname, '../../public/image', logoName);
    if (fs.existsSync(logoPath)) {
      const logoBuffer = fs.readFileSync(logoPath);
      logoBase64 = `data:image/png;base64,${logoBuffer.toString('base64')}`;
    }
  } catch (err) {
    console.error('Failed to encode logo to base64:', err);
  }

  // Build the table rows HTML
  const tableRowsHtml = items.map(item => `
    <tr>
      <td>${item.no}</td>
      <td>${item.par}</td>
      <td class="align-left">${item.desc}</td>
      <td>${item.taskType}</td>
      <td>${item.ref}</td>
      <td>${item.app}</td>
      <td>${item.adRelated}</td>
      <td>${item.warranty}</td>
      <td>${item.affectedAcEngine}</td>
      <td>${item.rep}</td>
      <td>${item.dueAt}</td>
      <td>${item.remarks}</td>
    </tr>
  `).join('');

  // Interpolate placeholders
  const today = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });

  if (templateType.toUpperCase() === 'CITILINK') {
    const engRec = sb.engineeringRec || {};
    const isComply = engRec.recommendedAction === 'COMPLY';
    const isDefer = engRec.recommendedAction === 'DEFER';
    const isNA = engRec.recommendedAction === 'NA';

    const checkActionYes = isComply ? '✓' : '';
    const checkActionNo = isNA ? '✓' : '';
    const checkActionHold = isDefer ? '✓' : '';

    const isConseqAffected = isComply || isDefer;
    const checkConseq1 = isConseqAffected ? '✓' : '';
    const checkConseq2 = !isConseqAffected ? '✓' : '';

    const taskTypeClean = (sb.generatedEes?.taskType || '').toUpperCase();
    const isMod = taskTypeClean.includes('MOD') || taskTypeClean.includes('SOFTWARE_UPDATE') || taskTypeClean.includes('REP');
    const isInsp = taskTypeClean.includes('INSP');
    const checkMethod1 = isMod ? '✓' : '';
    const checkMethod2 = isInsp ? '✓' : '';
    const checkMethod3 = (!isMod && !isInsp) ? '✓' : '';

    const checkReason7 = '✓'; // Improve Reliability
    const checkReason8 = sb.sbType === 'ALERT' ? '✓' : ''; // Safety

    const checkMaint3 = (sb.compliancePeriod && sb.compliancePeriod.toLowerCase().includes('scheduled')) ? '✓' : '';
    const checkMaint4 = (!checkMaint3) ? '✓' : '';

    const evaluationHtml = items.map(item => `<li>${item.desc} (Task Type: ${item.taskType}, Ref: ${item.ref})</li>`).join('');
    const evaluationContent = `<ul>${evaluationHtml || '<li>No specific items listed</li>'}</ul>`;
    const sbDate = sb.issueDate ? new Date(sb.issueDate).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }) : '-';

    htmlContent = htmlContent
      .replace(/\{\{eesNumber\}\}/g, eesNumber)
      .replace(/\{\{sbNumber\}\}/g, sbNumber)
      .replace(/\{\{evaluationDate\}\}/g, today)
      .replace(/\{\{manufacturer\}\}/g, sb.issuer || '-')
      .replace(/\{\{sbIssuedDate\}\}/g, sbDate)
      .replace(/\{\{subject\}\}/g, sb.title || '-')
      .replace(/\{\{otherRef\}\}/g, sb.generatedEes?.references || '-')
      .replace(/\{\{aircraftType\}\}/g, sb.effectivityType || '-')
      .replace(/\{\{partNumber\}\}/g, '-')
      .replace(/\{\{note\}\}/g, '-')
      .replace(/\{\{effectivity\}\}/g, sb.effectivityRange || '-')
      .replace(/\{\{warrantyType\}\}/g, '-')
      .replace(/\{\{warrantyDueDate\}\}/g, '-')
      .replace(/\{\{warrantyNote\}\}/g, '-')
      .replace(/\{\{evaluationContent\}\}/g, evaluationContent)
      .replace(/\{\{evaluatorName\}\}/g, evaluatorName || sb.updatedBy?.username || sb.createdBy?.username || 'M Badruz Zaman')
      .replace(/\{\{checkTEA1\}\}/g, '')
      .replace(/\{\{checkTEA2\}\}/g, '')
      .replace(/\{\{checkTEA3\}\}/g, '✓')
      .replace(/\{\{checkTEA4\}\}/g, '')
      .replace(/\{\{checkTEA5\}\}/g, '')
      .replace(/\{\{checkComponent\}\}/g, '✓')
      .replace(/\{\{checkTool\}\}/g, '')
      .replace(/\{\{checkPart\}\}/g, '')
      .replace(/\{\{checkReason1\}\}/g, '')
      .replace(/\{\{checkReason2\}\}/g, '')
      .replace(/\{\{checkReason3\}\}/g, '')
      .replace(/\{\{checkReason4\}\}/g, '✓')
      .replace(/\{\{checkReason5\}\}/g, '')
      .replace(/\{\{checkReason6\}\}/g, '')
      .replace(/\{\{checkReason7\}\}/g, checkReason7)
      .replace(/\{\{checkReason8\}\}/g, checkReason8)
      .replace(/\{\{checkMaint1\}\}/g, '')
      .replace(/\{\{checkMaint2\}\}/g, '')
      .replace(/\{\{checkMaint3\}\}/g, checkMaint3)
      .replace(/\{\{checkMaint4\}\}/g, checkMaint4)
      .replace(/\{\{checkConseq1\}\}/g, checkConseq1)
      .replace(/\{\{checkConseq2\}\}/g, checkConseq2)
      .replace(/\{\{checkMethod1\}\}/g, checkMethod1)
      .replace(/\{\{checkMethod2\}\}/g, checkMethod2)
      .replace(/\{\{checkMethod3\}\}/g, checkMethod3)
      .replace(/\{\{checkInsp1\}\}/g, '')
      .replace(/\{\{checkInsp2\}\}/g, '✓')
      .replace(/\{\{checkInsp3\}\}/g, '')
      .replace(/\{\{checkActionYes\}\}/g, checkActionYes)
      .replace(/\{\{checkActionNo\}\}/g, checkActionNo)
      .replace(/\{\{checkActionHold\}\}/g, checkActionHold)
      .replace(/\{\{checkImpl1\}\}/g, '')
      .replace(/\{\{checkImpl2\}\}/g, '')
      .replace(/\{\{checkImpl3\}\}/g, '')
      .replace(/\{\{checkImpl4\}\}/g, '')
      .replace(/\{\{checkImpl5\}\}/g, '✓')
      .replace(/\{\{checkApproval1\}\}/g, '✓')
      .replace(/\{\{checkApproval2\}\}/g, '')
      .replace(/\{\{checkApproval3\}\}/g, '');
  } else {
    htmlContent = htmlContent
      .replace(/\{\{eesNumber\}\}/g, eesNumber)
      .replace(/\{\{sbNumber\}\}/g, sbNumber)
      .replace(/\{\{logoBase64\}\}/g, logoBase64)
      .replace(/\{\{evaluationDate\}\}/g, today)
      .replace(/\{\{tableRows\}\}/g, tableRowsHtml);
  }

  // Launch Puppeteer headless browser
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

    // Print to A4 landscape PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      landscape: true,
      margin: {
        top: '10mm',
        right: '10mm',
        bottom: '10mm',
        left: '10mm'
      },
      printBackground: true
    });

    return pdfBuffer;

  } finally {
    await browser.close();
  }
};

module.exports = {
  generateEesPdf,
  extractPdfItems,
};
