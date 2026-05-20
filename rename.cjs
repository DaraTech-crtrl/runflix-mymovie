const fs = require('fs');
const path = require('path');

function replaceInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // We want to replace "RUNFlix", "RunFlix", "Runflix" with "Runflix Entertainment"
  // but ONLY when it is not part of a URL (runflix.name.ng), email, or localstorage key (runflix-...)
  
  // A regex that matches the word, but checks negative lookbehinds/lookaheads to ensure it's not in a domain or ID.
  // (?<![a-zA-Z0-9-])(RUNFlix|RunFlix|Runflix)(?![a-zA-Z0-9-\.])
  
  const regex = /(?<![a-zA-Z0-9-])(RUNFlix|RunFlix|Runflix)(?![a-zA-Z0-9-\.])/g;
  
  const newContent = content.replace(regex, "Runflix Entertainment");
  
  // also handle uppercase RUNFLIX
  const newContent2 = newContent.replace(/(?<![a-zA-Z0-9-])RUNFLIX(?![a-zA-Z0-9-\.])/g, "Runflix Entertainment");
  
  if (content !== newContent2) {
    fs.writeFileSync(filePath, newContent2, 'utf8');
    console.log(`Updated ${filePath}`);
  }
}

function walkSync(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      walkSync(filePath);
    } else if (filePath.endsWith('.ts') || filePath.endsWith('.tsx') || filePath.endsWith('.html') || filePath.endsWith('.json')) {
      replaceInFile(filePath);
    }
  }
}

walkSync(path.join(__dirname, 'src'));
walkSync(path.join(__dirname, 'public'));
replaceInFile(path.join(__dirname, 'index.html'));
