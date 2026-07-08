const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const { normalizeOcrPayload } = require('./eesService');
const serviceBulletinRepository = require('../repositories/serviceBulletinRepository');

/**
 * Extracts and maps evaluation items from Service Bulletin rawPayload.
 */
const extractPdfItems = (sb, dynamicEsnVal = '-') => {
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

  const esnVal = sb.generatedEes?.esn ? sb.generatedEes.esn : dynamicEsnVal;
  const globalRef = sb.generatedEes?.references || payload.references || '-';

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
      ref: item.ref || item.reference || globalRef,
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
  // Fetch matching ESNs based on applicability
  const applicabilityResults = await serviceBulletinRepository.checkApplicabilityForSb(sb);
  const applicableEsns = applicabilityResults
    .filter(r => r.isApplicable)
    .map(r => r.engine.esn)
    .join(', ');
  
  const dynamicEsnVal = applicableEsns || '-';

  const norm = sb.rawPayload ? normalizeOcrPayload(sb.rawPayload) : {
    eesNumber: sb.generatedEes?.eesNumber || `EES-${sb.sbNumber}`,
    bulletinNumber: sb.sbNumber
  };

  const eesNumber = norm.eesNumber;
  const sbNumber = norm.bulletinNumber;
  const items = extractPdfItems(sb, dynamicEsnVal);

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

  // Expand items based on \n\n in desc to split long paragraphs
  const expandedItems = [];
  items.forEach((item, index) => {
    const descs = item.desc ? item.desc.split('\n\n') : ['-'];
    const remarksArr = item.remarks ? item.remarks.split('\n\n') : ['-'];
    
    descs.forEach((d, i) => {
      expandedItems.push({
        ...item,
        no: String(index + 1), // Recalculate No based on group
        desc: d.trim(),
        remarks: remarksArr[i] ? remarksArr[i].trim() : (remarksArr[0] || '-'),
        isFirstInGroup: i === 0,
        groupLength: descs.length,
        isVeryFirstRow: expandedItems.length === 0
      });
    });
  });

  const totalRows = expandedItems.length;

  // Build the table rows HTML
  const tableRowsHtml = expandedItems.map((item, idx) => {
    let html = '<tr>';
    
    // Group merged columns
    if (item.isFirstInGroup) {
      html += `<td rowspan="${item.groupLength}">${item.no}</td>`;
      html += `<td rowspan="${item.groupLength}">${item.par}</td>`;
    }
    
    // Individual column
    html += `<td style="text-align: justify;">${item.desc}</td>`;
    
    // Group merged column
    if (item.isFirstInGroup) {
      html += `<td rowspan="${item.groupLength}">${item.taskType}</td>`;
    }

    // ALL merged column (Ref)
    if (item.isVeryFirstRow) {
      html += `<td rowspan="${totalRows}" style="text-align: justify;">${item.ref}</td>`;
    }

    // Group merged columns
    if (item.isFirstInGroup) {
      html += `<td rowspan="${item.groupLength}">${item.app}</td>`;
      html += `<td rowspan="${item.groupLength}">${item.adRelated}</td>`;
      html += `<td rowspan="${item.groupLength}">${item.warranty}</td>`;
      html += `<td rowspan="${item.groupLength}">${item.affectedAcEngine}</td>`;
      html += `<td rowspan="${item.groupLength}">${item.rep}</td>`;
      html += `<td rowspan="${item.groupLength}">${item.dueAt}</td>`;
    }
    
    // Individual column
    html += `<td style="text-align: justify;">${item.remarks}</td>`;
    
    html += '</tr>';
    return html;
  }).join('');

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

    const taskTypeClean = (sb.generatedEes?.taskType || sb.rawPayload?.task_type || '').toUpperCase();
    const isInsp = taskTypeClean.includes('INSP');
    const isMod = !isInsp && (taskTypeClean.includes('MOD') || taskTypeClean.includes('SOFTWARE_UPDATE') || taskTypeClean.includes('REP'));
    const checkMethod1 = isMod ? '✓' : '';
    const checkMethod2 = isInsp ? '✓' : '';
    const checkMethod3 = (!isMod && !isInsp) ? '✓' : '';

    const checkReason7 = '✓'; // Improve Reliability
    const checkReason8 = sb.sbType === 'ALERT' ? '✓' : ''; // Safety

    const compType = (sb.rawPayload?.compliance_time_type || '').toUpperCase();
    const checkMaint1 = compType === 'DATE' ? '✓' : '';
    const checkMaint2 = compType === 'HOUR_CYCLE' ? '✓' : '';
    const checkMaint3 = compType === 'SCHEDULED' || (sb.compliancePeriod && sb.compliancePeriod.toLowerCase().includes('scheduled')) ? '✓' : '';
    const checkMaint4 = (!checkMaint1 && !checkMaint2 && !checkMaint3) ? '✓' : '';

    const compliancePeriod = (sb.compliancePeriod || sb.rawPayload?.compliance_period || '').toLowerCase();
    const isRecurring = compliancePeriod.includes('every');
    const checkInsp1 = !isRecurring ? '✓' : '';
    const checkInsp2 = isRecurring ? '✓' : '';
    
    const componentType = (sb.rawPayload?.component_type || 'COMPONENT').toUpperCase();
    const checkComponent = componentType === 'COMPONENT' ? '✓' : '';
    const checkTool = componentType === 'TOOL' ? '✓' : '';
    const checkPart = componentType === 'PART' ? '✓' : '';

    const evaluationContent = ''; // Left blank for manual user input
    const sbDate = sb.issueDate ? new Date(sb.issueDate).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }) : '-';

    htmlContent = htmlContent
      .replace(/\{\{eesNumber\}\}/g, eesNumber)
      .replace(/\{\{sbNumber\}\}/g, sbNumber)
      .replace(/\{\{evaluationDate\}\}/g, today)
      .replace(/\{\{logoBase64\}\}/g, logoBase64)
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
      .replace(/\{\{checkTEA2\}\}/g, '✓')
      .replace(/\{\{checkTEA3\}\}/g, '')
      .replace(/\{\{checkTEA4\}\}/g, '')
      .replace(/\{\{checkTEA5\}\}/g, '')
      .replace(/\{\{checkComponent\}\}/g, checkComponent)
      .replace(/\{\{checkTool\}\}/g, checkTool)
      .replace(/\{\{checkPart\}\}/g, checkPart)
      .replace(/\{\{checkReason1\}\}/g, '')
      .replace(/\{\{checkReason2\}\}/g, '')
      .replace(/\{\{checkReason3\}\}/g, '')
      .replace(/\{\{checkReason4\}\}/g, '✓')
      .replace(/\{\{checkReason5\}\}/g, '')
      .replace(/\{\{checkReason6\}\}/g, '')
      .replace(/\{\{checkReason7\}\}/g, checkReason7)
      .replace(/\{\{checkReason8\}\}/g, checkReason8)
      .replace(/\{\{checkMaint1\}\}/g, checkMaint1)
      .replace(/\{\{checkMaint2\}\}/g, checkMaint2)
      .replace(/\{\{checkMaint3\}\}/g, checkMaint3)
      .replace(/\{\{checkMaint4\}\}/g, checkMaint4)
      .replace(/\{\{checkConseq1\}\}/g, checkConseq1)
      .replace(/\{\{checkConseq2\}\}/g, checkConseq2)
      .replace(/\{\{checkMethod1\}\}/g, checkMethod1)
      .replace(/\{\{checkMethod2\}\}/g, checkMethod2)
      .replace(/\{\{checkMethod3\}\}/g, checkMethod3)
      .replace(/\{\{checkInsp1\}\}/g, checkInsp1)
      .replace(/\{\{checkInsp2\}\}/g, checkInsp2)
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
