const fs = require('fs');

const files = [
  'src/repositories/svrRepository.js',
  'src/repositories/edsRepository.js',
  'src/repositories/iq03Repository.js'
];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  
  // Remove includeRelations parts
  content = content.replace(/\s*adStatus:\s*true,?\n?/g, '\n');
  content = content.replace(/\s*ad:\s*true,?\n?/g, '\n');
  
  // Remove adStatus from destructured header
  content = content.replace(/, adStatus,/g, ',');
  
  // Remove mappedAds block
  content = content.replace(/\s*const mappedAds = \(adStatus \|\| \[\]\)\.map\(item => \(\{\s*\.\.\.item,\s*engineSerialNumber: headerData\.engineSerialNumber\s*\}\)\);\n?/g, '\n');
  
  // Remove adStatus create block
  content = content.replace(/\s*adStatus: \{\s*create: mappedAds\s*\},?\n?/g, '\n');
  
  fs.writeFileSync(file, content);
});

console.log('Repositories cleaned.');
