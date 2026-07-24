const fs = require('fs');

// Clean PDF Generation Service
let pdf = fs.readFileSync('src/services/pdfGenerationService.js', 'utf8');
pdf = pdf.replace(/\s*adRelated: item\.adRelated \|\| '-',/g, '');
pdf = pdf.replace(/\s*html \+= <td rowspan="\$\{item\.groupLength\}">\$\{item\.adRelated\}<\/td>;/g, '');
// And any table headers with AD RELATED (though we probably can't see the exact HTML, let's leave headers alone unless breaking)
fs.writeFileSync('src/services/pdfGenerationService.js', pdf);

// Clean svrService
let svr = fs.readFileSync('src/services/svrService.js', 'utf8');
// Replace the whole AD block from line 39 to 110 approx
svr = svr.replace(/\s*\/\/ 1\. Process Airworthiness Directives[\s\S]*?\/\/ 2\. Process Service Bulletins/g, '\n  // 2. Process Service Bulletins');
svr = svr.replace(/\s*svrData\.adStatus = rawAds;?/g, '');
fs.writeFileSync('src/services/svrService.js', svr);

// Clean edsService
let eds = fs.readFileSync('src/services/edsService.js', 'utf8');
eds = eds.replace(/\s*\/\/ 1\. Process Airworthiness Directives[\s\S]*?\/\/ 2\. Process Service Bulletins/g, '\n  // 2. Process Service Bulletins');
eds = eds.replace(/\s*edsData\.adStatus = rawAds;?/g, '');
fs.writeFileSync('src/services/edsService.js', eds);

console.log('Cleaned services');
