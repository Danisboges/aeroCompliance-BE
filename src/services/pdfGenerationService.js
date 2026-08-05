const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const { normalizeAdRelated, normalizeOcrPayload } = require('./eesService');
const { createBrowserLaunchOptions } = require('../config/runtimeConfig');
const serviceBulletinRepository = require('../repositories/serviceBulletinRepository');
const prisma = require('../db');

const getPayloadData = (sb) => {
  let payload = sb.ocrResult?.rawPayload || sb.rawPayload || {};
  if (payload && payload.provider && payload.payload) {
    payload = payload.payload;
  }
  if (payload && payload.mro_schema) {
    if (payload.mro_schema.mro_schema) {
      payload = payload.mro_schema.mro_schema;
    } else {
      payload = payload.mro_schema;
    }
  }
  return payload;
};


/**
 * Extracts and maps evaluation items from Service Bulletin rawPayload.
 */
const extractPdfItems = (sb, dynamicEsnVal = '-') => {
  const payload = getPayloadData(sb);
  let rawItems = Array.isArray(sb.generatedEes?.evaluations)
    ? sb.generatedEes.evaluations
    : [];

  // The generated EES is the canonical source after a user edit. Fall back to
  // normalized OCR data only when an EES has not been persisted yet.
  if (rawItems.length === 0 && Object.keys(payload).length > 0) {
    try {
      rawItems = normalizeOcrPayload(payload).evaluations;
    } catch {
      rawItems = [];
    }
  }

  const esnVal = sb.generatedEes?.esn ? sb.generatedEes.esn : dynamicEsnVal;
  let globalRef = sb.generatedEes?.references || payload.references || '-';
  if (Array.isArray(globalRef) && globalRef.length === 0) {
    globalRef = '-';
  }

  return rawItems.map((item, index) => {
    const isApplicable = item.isApplicable !== undefined ? Boolean(item.isApplicable) : true;
    let warrantyVal = '-';
    const itemWarranty = item.warranty !== undefined && item.warranty !== null ? item.warranty : payload.warranty;
    if (itemWarranty === true || itemWarranty === 'true' || itemWarranty === 'Yes' || itemWarranty === 'Y') warrantyVal = 'Y';
    else if (itemWarranty === false || itemWarranty === 'false' || itemWarranty === 'No' || itemWarranty === 'N') warrantyVal = 'N';
    
    let finalRef = item.ref || item.reference || item.references;
    if (Array.isArray(finalRef) && finalRef.length === 0) {
      finalRef = null;
    }
    finalRef = finalRef || globalRef;
    
    if (Array.isArray(finalRef)) {
      if (finalRef.length === 0) {
        finalRef = '-';
      } else {
        finalRef = finalRef.map(r => `- ${r}`).join('<br/>');
      }
    } else if (typeof finalRef === 'string') {
      finalRef = finalRef.replace(/\n/g, '<br/>');
    }

    return {
      no: item.itemNo !== undefined && item.itemNo !== null ? String(item.itemNo) : String(index + 1),
      par: item.paragraph || '-',
      desc: item.requirementDesc || '-',
      taskType: item.taskType || '-',
      ref: finalRef || '-',
      app: isApplicable ? 'Y' : 'N',
      adRelated: normalizeAdRelated(
        item.adRelated ??
        item.ad_related ??
        payload.adRelated ??
        payload.ad_related
      ) || '-',
      warranty: warrantyVal,
      affectedAcEngine: item.affectedAcEngine || payload.esn || esnVal || '-',
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

  const payload = getPayloadData(sb);
  const norm = sb.ocrResult?.rawPayload || sb.rawPayload ? normalizeOcrPayload(sb.ocrResult?.rawPayload || sb.rawPayload) : {
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

  // Handle Signatures for Garuda
  let preparedBySigBase64 = '';
  let checkedBySigBase64 = '';
  let approvedBySigBase64 = '';

  if (templateType.toUpperCase() !== 'CITILINK') {
    const uploadDir = path.join(__dirname, '../../uploads/signatures');
    const getSigBase64 = (fileName) => {
      if (!fileName) return '';
      const p = path.join(uploadDir, fileName);
      if (fs.existsSync(p)) {
        const b = fs.readFileSync(p);
        return `data:image/png;base64,${b.toString('base64')}`;
      }
      return '';
    };

    const eesId = sb.generatedEes?.id;
    if (eesId) {
      const allReviews = await prisma.reviewAction.findMany({
        where: { eesId },
        orderBy: { createdAt: 'desc' }
      });
      
      const preparedReview = allReviews.find(r => r.action === 'PENDING' && r.signaturePath);
      if (preparedReview) preparedBySigBase64 = getSigBase64(preparedReview.signaturePath);
      
      const checkedReview = allReviews.find(r => r.action === 'APPROVED' && r.actorRole === 'ENGINEER' && r.signaturePath);
      if (checkedReview) checkedBySigBase64 = getSigBase64(checkedReview.signaturePath);
      
      const approvedReview = allReviews.find(r => r.action === 'APPROVED' && r.actorRole === 'MANAGER' && r.signaturePath);
      if (approvedReview) approvedBySigBase64 = getSigBase64(approvedReview.signaturePath);
    }
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

  // Pre-calculate Ref groups based on expandedItems to merge identical refs
  let currentRef = null;
  let currentRefStartIndex = 0;
  let currentRefSpan = 0;

  expandedItems.forEach((item, i) => {
    if (i === 0) {
      currentRef = item.ref;
      currentRefStartIndex = 0;
      currentRefSpan = 1;
      item.isFirstInRefGroup = true;
    } else {
      if (item.ref === currentRef) {
        currentRefSpan++;
        item.isFirstInRefGroup = false;
        expandedItems[currentRefStartIndex].refGroupLength = currentRefSpan;
      } else {
        currentRef = item.ref;
        currentRefStartIndex = i;
        currentRefSpan = 1;
        item.isFirstInRefGroup = true;
        item.refGroupLength = 1;
      }
    }
  });
  if (expandedItems.length > 0 && expandedItems[0].refGroupLength === undefined) {
      expandedItems[0].refGroupLength = currentRefSpan;
  }

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
    
    // Ref column merged independently
    if (item.isFirstInRefGroup) {
      html += `<td rowspan="${item.refGroupLength || 1}" style="text-align: left; vertical-align: top;">${item.ref || '-'}</td>`;
    }

    if (item.isFirstInGroup) {
      html += `<td rowspan="${item.groupLength}">${item.app}</td>`;
      html += `<td rowspan="${item.groupLength}">${item.adRelated}</td>`;
      html += `<td rowspan="${item.groupLength}">${item.warranty}</td>`;
      html += `<td rowspan="${item.groupLength}">${item.affectedAcEngine}</td>`;
      html += `<td rowspan="${item.groupLength}">${item.rep}</td>`;
      html += `<td rowspan="${item.groupLength}">${item.dueAt}</td>`;
    }
    
    // Individual column
    html += `<td style="text-align: left;">${item.remarks}</td>`;
    
    html += '</tr>';
    return html;
  }).join('');

  // Interpolate placeholders
  const today = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });

  if (templateType.toUpperCase() === 'CITILINK') {
    const ea = payload.engineeringAction || [];
    let recAction = (sb.generatedEes?.recommendedAction || payload.recommendedAction || payload.recommended_action || '').toUpperCase();
    if (ea.includes('Yes')) recAction = 'COMPLY';
    if (ea.includes('No')) recAction = 'NA';
    if (ea.includes('Hold/Postpone')) recAction = 'DEFER';
    const isComply = recAction === 'COMPLY';
    const isDefer = recAction === 'DEFER';
    const isNA = recAction === 'NA';

    const checkActionYes = isComply ? 'X' : '';
    const checkActionNo = isNA ? 'X' : '';
    const checkActionHold = isDefer ? 'X' : '';

    const isConseqAffected = isComply || isDefer;
    const checkConseq1 = isConseqAffected ? 'X' : '';
    const checkConseq2 = !isConseqAffected ? 'X' : '';

    const am = payload.accomplishmentMethod || [];
    let taskTypeClean = (sb.generatedEes?.taskType || payload.task_type || '').toUpperCase();
    if (am.includes('Modification')) taskTypeClean = 'MOD';
    if (am.includes('Inspection')) taskTypeClean = 'INSP';
    if (am.includes('Other')) taskTypeClean = 'OTHER';
    const isInsp = taskTypeClean.includes('INSP');
    const isMod = !isInsp && (taskTypeClean.includes('MOD') || taskTypeClean.includes('SOFTWARE_UPDATE') || taskTypeClean.includes('REP'));
    const checkMethod1 = isMod ? 'X' : '';
    const checkMethod2 = isInsp ? 'X' : '';
    const checkMethod3 = (!isMod && !isInsp) ? 'X' : '';

    const checkReason7 = 'X'; // Improve Reliability (default)
    const checkReason8 = ''; // Safety

    // Unit Concern
    const uc = payload.unitConcern || [];
    const checkTEA1 = uc.includes('TEA-1') ? 'X' : '';
    const checkTEA2 = uc.includes('TEA-2') ? 'X' : '';
    const checkTEA3 = uc.includes('TEA-3') ? 'X' : '';
    const checkTEA4 = uc.includes('TEA-4') ? 'X' : '';
    const checkTEA5 = uc.includes('TEA-5') ? 'X' : '';
    const checkTEA6 = uc.includes('TEA-6') ? 'X' : '';

    // Reason of Evaluation
    const roe = payload.reasonOfEvaluation || [];
    const checkReason1 = roe.includes('Affects A/C Operation') ? 'X' : '';
    const checkReason2 = roe.includes('To Meet Company policy') ? 'X' : '';
    const checkReason3 = roe.includes('Improve A/C Performance') ? 'X' : '';
    const checkReason4 = roe.includes('Regulatory') || roe.includes('To Comply with Government/ Authority Regulatory Requirement.') ? 'X' : '';
    const checkReason5 = roe.includes('Pax or Crew Satisfaction') ? 'X' : '';
    const checkReason6 = roe.includes('Improve Maintainability') ? 'X' : '';

    // Further Implementation
    const fi = payload.furtherImplementation || [];
    const checkImpl1 = fi.includes('Technical Order') ? 'X' : '';
    const checkImpl2 = fi.includes('Engineering Information') ? 'X' : '';
    const checkImpl3 = fi.includes('M.S. Revision') ? 'X' : '';
    const checkImpl4 = fi.includes('Manual revision') ? 'X' : '';
    const checkImpl5 = fi.includes('Others') || fi.includes('Others (shop visit)') ? 'X' : '';

    // Management Approval
    const ma = payload.managementApproval || [];
    const checkApproval1 = ma.includes('TEA') ? 'X' : '';
    const checkApproval2 = ma.includes('WQR') ? 'X' : '';
    const checkApproval3 = ma.includes('DE') ? 'X' : '';

    const ml = payload.maintenanceLevel || [];
    let compType = (sb.generatedEes?.complianceTimeType || payload.compliance_time_type || '').toUpperCase();
    if (ml.includes('To be performed prior to certain date')) compType = 'DATE';
    if (ml.includes('To be performed prior to certain hours/cycles')) compType = 'HOUR_CYCLE';
    if (ml.includes('To be performed at next maint. Scheduled')) compType = 'SCHEDULED';
    if (ml.includes('To be performed at attrition basis')) compType = 'ATTRITION';
    const checkMaint1 = compType === 'DATE' ? 'X' : '';
    const checkMaint2 = compType === 'HOUR_CYCLE' ? 'X' : '';
    const checkMaint3 = compType === 'SCHEDULED' || (sb.compliancePeriod && sb.compliancePeriod.toLowerCase().includes('scheduled')) ? 'X' : '';
    const checkMaint4 = (!checkMaint1 && !checkMaint2 && !checkMaint3) ? 'X' : '';

    const isRecurring = sb.generatedEes?.isRepetitive ?? (sb.compliancePeriod || payload.compliance_period || '').toLowerCase().includes('every');
    const checkInsp1 = !isRecurring ? 'X' : '';
    const checkInsp2 = isRecurring ? 'X' : '';
    
    const pc = payload.partClassification || [];
    let componentType = (sb.generatedEes?.componentType || payload.component_type || 'COMPONENT').toUpperCase();
    if (pc.includes('Tool and Equipment')) componentType = 'TOOL';
    if (pc.includes('Part')) componentType = 'PART';
    if (pc.includes('Component')) componentType = 'COMPONENT';
    const checkComponent = componentType === 'COMPONENT' ? 'X' : '';
    const checkTool = componentType === 'TOOL' ? 'X' : '';
    const checkPart = componentType === 'PART' ? 'X' : '';

    const evaluationContent = ''; // Left blank for manual user input
    const sbDate = sb.issueDate ? new Date(sb.issueDate).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }) : '-';

    let ata = '';
    let subAta = '';
    const ataMatch = sbNumber.match(/(?:^|-| )(\d{2})-(\d{2})(?:-|$)/);
    if (ataMatch) {
      ata = ataMatch[1];
      subAta = ataMatch[2];
    } else {
      const ataMatch2 = sbNumber.match(/(?:^|-| )(\d{2})-(\d{3,4})(?:-|$)/);
      if (ataMatch2) {
        ata = ataMatch2[1];
      }
    }

    htmlContent = htmlContent
      .replace(/\{\{eesNumber\}\}/g, eesNumber)
      .replace(/\{\{sbNumber\}\}/g, sbNumber)
      .replace(/\{\{bullType\}\}/g, 'SB')
      .replace(/\{\{ata\}\}/g, ata)
      .replace(/\{\{subAta\}\}/g, subAta)
      .replace(/\{\{evaluationDate\}\}/g, today)
      .replace(/\{\{logoBase64\}\}/g, logoBase64)
      .replace(/\{\{manufacturer\}\}/g, sb.issuer || '-')
      .replace(/\{\{sbIssuedDate\}\}/g, sbDate)
      .replace(/\{\{subject\}\}/g, sb.title || '-')
      .replace(/\{\{otherRef\}\}/g, sb.generatedEes?.references || '-')
      .replace(/\{\{aircraftType\}\}/g, sb.effectivityType || '-')
      .replace(/\{\{partNumber\}\}/g, norm.partNumber || '-')
      .replace(/\{\{note\}\}/g, payload.note || '-')
      .replace(/\{\{effectivity\}\}/g, sb.effectivityRange || '-')
      .replace(/\{\{warrantyType\}\}/g, payload.warranty === true || payload.warranty === 'true' ? 'Yes' : (payload.warranty === false || payload.warranty === 'false' ? 'No' : (payload.warranty || '-')))
      .replace(/\{\{warrantyDueDate\}\}/g, payload.warranty_due_date || '-')
      .replace(/\{\{warrantyNote\}\}/g, payload.warranty_note || '-')
      .replace(/\{\{evaluationContent\}\}/g, evaluationContent)
      .replace(/\{\{evaluatorName\}\}/g, evaluatorName || sb.updatedBy?.username || sb.createdBy?.username || 'M Badruz Zaman')
      .replace(/\\{\\{checkTEA1\\}\\}/g, checkTEA1)
      .replace(/\\{\\{checkTEA2\\}\\}/g, checkTEA2)
      .replace(/\\{\\{checkTEA3\\}\\}/g, checkTEA3)
      .replace(/\\{\\{checkTEA4\\}\\}/g, checkTEA4)
      .replace(/\\{\\{checkTEA5\\}\\}/g, checkTEA5)
      .replace(/\\{\\{checkTEA6\\}\\}/g, checkTEA6)
      .replace(/\{\{checkComponent\}\}/g, checkComponent)
      .replace(/\{\{checkTool\}\}/g, checkTool)
      .replace(/\{\{checkPart\}\}/g, checkPart)
      .replace(/\\{\\{checkReason1\\}\\}/g, checkReason1)
      .replace(/\\{\\{checkReason2\\}\\}/g, checkReason2)
      .replace(/\\{\\{checkReason3\\}\\}/g, checkReason3)
      .replace(/\\{\\{checkReason4\\}\\}/g, checkReason4)
      .replace(/\\{\\{checkReason5\\}\\}/g, checkReason5)
      .replace(/\\{\\{checkReason6\\}\\}/g, checkReason6)
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
      .replace(/\\{\\{checkImpl1\\}\\}/g, checkImpl1)
      .replace(/\\{\\{checkImpl2\\}\\}/g, checkImpl2)
      .replace(/\\{\\{checkImpl3\\}\\}/g, checkImpl3)
      .replace(/\\{\\{checkImpl4\\}\\}/g, checkImpl4)
      .replace(/\\{\\{checkImpl5\\}\\}/g, checkImpl5)
      .replace(/\\{\\{checkApproval1\\}\\}/g, checkApproval1)
      .replace(/\\{\\{checkApproval2\\}\\}/g, checkApproval2)
      .replace(/\\{\\{checkApproval3\\}\\}/g, checkApproval3);
  } else {
    htmlContent = htmlContent
      .replace(/\{\{eesNumber\}\}/g, eesNumber)
      .replace(/\{\{sbNumber\}\}/g, sbNumber)
      .replace(/\{\{logoBase64\}\}/g, logoBase64)
      .replace(/\{\{evaluationDate\}\}/g, today)
      .replace(/\{\{tableRows\}\}/g, tableRowsHtml)
      .replace(/\{\{preparedBySigBase64\}\}/g, preparedBySigBase64 ? `<img src="${preparedBySigBase64}" style="max-height: 50px; max-width: 150px;"/>` : '')
      .replace(/\{\{checkedBySigBase64\}\}/g, checkedBySigBase64 ? `<img src="${checkedBySigBase64}" style="max-height: 50px; max-width: 150px;"/>` : '')
      .replace(/\{\{approvedBySigBase64\}\}/g, approvedBySigBase64 ? `<img src="${approvedBySigBase64}" style="max-height: 50px; max-width: 150px;"/>` : '');
  }

  // Launch Puppeteer headless browser
  const browser = await puppeteer.launch(createBrowserLaunchOptions(puppeteer));

  try {
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

    // Print to PDF (Citilink is A4 Portrait, Garuda is A3 Landscape)
    const isCitilink = templateType.toUpperCase() === 'CITILINK';
    const isLandscape = !isCitilink;
    const paperFormat = isCitilink ? 'A4' : 'A3';

    const pdfBuffer = await page.pdf({
      format: paperFormat,
      landscape: isLandscape,
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

const finalizeGarudaPdf = async (eesId) => {
  const eesDocument = await prisma.eesDocument.findUnique({
    where: { id: eesId },
    include: { sourceSb: true }
  });

  if (!eesDocument) return;

  const pdfBuffer = await generateEesPdf({ sb: { ...eesDocument.sourceSb, generatedEes: eesDocument }, templateType: 'GARUDA' });
  
  const uploadDir = path.join(__dirname, '../../uploads/ees-documents');
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

  const finalPdfName = `EES_FINAL_${eesId}.pdf`;
  const finalPdfPath = path.join(uploadDir, finalPdfName);
  
  fs.writeFileSync(finalPdfPath, pdfBuffer);

  await prisma.eesDocument.update({
    where: { id: eesId },
    data: { storedGarudaPdfPath: finalPdfName }
  });

  // Delete signatures
  const sigDir = path.join(__dirname, '../../uploads/signatures');
  const filesToDelete = [
    path.join(sigDir, `prepared_by_${eesId}.png`),
    path.join(sigDir, `checked_by_${eesId}.png`),
    path.join(sigDir, `approved_by_${eesId}.png`)
  ];

  for (const f of filesToDelete) {
    if (fs.existsSync(f)) {
      fs.unlinkSync(f);
    }
  }
};

module.exports = {
  generateEesPdf,
  extractPdfItems,
  finalizeGarudaPdf
};
