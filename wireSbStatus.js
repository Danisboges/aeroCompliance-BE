const fs = require('fs');

const repos = [
  'src/repositories/svrRepository.js',
  'src/repositories/edsRepository.js',
  'src/repositories/iq03Repository.js'
];

repos.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/llpStatus:\s*true,/g, 'llpStatus: true,\n  sbStatus: true,');
  content = content.replace(/\{ configurationReport, llpStatus, \.\.\.headerData \}/g, '{ configurationReport, llpStatus, sbStatus, ...headerData }');
  
  const mappedSbs = 
  const mappedSbs = (sbStatus || []).map(item => ({
    ...item,
    engineSerialNumber: headerData.engineSerialNumber
  }));
;
  content = content.replace(/return prisma\.(shopVisitReport|engineDataSubmittal|iq03Report)\.create\(\{/g, mappedSbs + '\n  return prisma..create({');
  
  content = content.replace(/llpStatus:\s*\{\s*create:\s*mappedLlps\s*\}/g, 'llpStatus: { create: mappedLlps },\n      sbStatus: { create: mappedSbs }');
  
  fs.writeFileSync(file, content);
});

const services = [
  'src/services/svrService.js',
  'src/services/edsService.js'
];

services.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  // Re-add loop for SBs
  const loopStr = 
  for (const sbItem of (svr.sbStatus || svr.adStatus || [])) {
    const sbNumClean = cleanIdentifier(sbItem.sbNumber || sbItem.adNumber || sbItem.referenceSb);
    if (!sbNumClean) continue;
    
    let status = 'COMPLIED';
    const remarksLower = (sbItem.remarks || '').toLowerCase();
    const mocLower = (sbItem.methodOfCompliance || '').toLowerCase();
    if (remarksLower.includes('not applicable') || mocLower.includes('not applicable')) {
      status = 'NOT_APPLICABLE';
    } else if (remarksLower.includes('not performed') || mocLower.includes('not performed')) {
      status = 'OPEN';
    }
;
  
  // Actually, I can just restore the sbStatus assignment at the bottom of the files first
  content = content.replace(/const rawAds = \(/g, 'const rawSbs = (');
  content = content.replace(/svrData\.adStatus = rawAds;/g, 'svrData.sbStatus = rawSbs;');
  content = content.replace(/edsData\.adStatus = rawAds;/g, 'edsData.sbStatus = rawSbs;');
  
  // Fix the loop at the top
  content = content.replace(/\/\/ 2\. Process Service Bulletins\n\s*let matchedSb = null;/g, loopStr + '\n    let matchedSb = null;');
  
  // Close the loop after the existing SB block
  content = content.replace(/currentDocDate\n\s*\}\n\s*\)\;\n\s*\}\n\s*\}/g, 'currentDocDate\n          }\n        });\n      }\n    }\n  }');
  
  fs.writeFileSync(file, content);
});

console.log('Repos and Services updated for sbStatus');
