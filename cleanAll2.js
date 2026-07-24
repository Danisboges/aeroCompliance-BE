const fs = require('fs');

function replaceRepos() {
  const files = [
    'src/repositories/svrRepository.js',
    'src/repositories/edsRepository.js',
    'src/repositories/iq03Repository.js'
  ];
  files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(/adStatus/g, 'sbStatus');
    content = content.replace(/mappedAds/g, 'mappedSbs');
    content = content.replace(/ad:/g, 'sb:');
    fs.writeFileSync(file, content);
  });
}

function replaceServices() {
  const files = [
    'src/services/svrService.js',
    'src/services/edsService.js'
  ];
  files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    
    // First, just rename variables where they make sense
    content = content.replace(/rawAds/g, 'rawSbs');
    content = content.replace(/\.adStatus/g, '.sbStatus');
    content = content.replace(/adItem/g, 'sbItem');
    content = content.replace(/adNumClean/g, 'sbNumClean');
    
    // Remove the AD matching block
    // It starts with "// 1. Try to match with AirworthinessDirective" and ends before "// 2. Try to match with ServiceBulletin"
    // Also remove "const ads = await prisma.airworthinessDirective..."
    content = content.replace(/\s*const ads = await prisma\.airworthinessDirective\.findMany\(\{ where: \{ status: 'ACTIVE' \} \}\);/g, '');
    
    const adBlockRegex = /\s*\/\/ 1\. Try to match with AirworthinessDirective \(AD\) in DB[\s\S]*?(?=\/\/ 2\. Try to match with ServiceBulletin \(SB\) in DB)/g;
    content = content.replace(adBlockRegex, '\n\n    ');
    
    // Remove "continue; // Skip SB checking if AD matched"
    content = content.replace(/\s*continue; \/\/ Skip SB checking if AD matched/g, '');
    
    fs.writeFileSync(file, content);
  });
}

function replaceMisc() {
  let eesRepo = fs.readFileSync('src/repositories/eesRepository.js', 'utf8');
  eesRepo = eesRepo.replace(/^\s*adRelated:.*$\n?/gm, '');
  fs.writeFileSync('src/repositories/eesRepository.js', eesRepo);
  
  let pdfSvc = fs.readFileSync('src/services/pdfGenerationService.js', 'utf8');
  pdfSvc = pdfSvc.replace(/^\s*adRelated: item\.adRelated \|\| '-',$\n?/gm, '');
  pdfSvc = pdfSvc.replace(/^\s*html \+= <td rowspan="\$\{item\.groupLength\}">\$\{item\.adRelated\}<\/td>;$\n?/gm, '');
  fs.writeFileSync('src/services/pdfGenerationService.js', pdfSvc);
}

replaceRepos();
replaceServices();
replaceMisc();

console.log('Clean script finished');
