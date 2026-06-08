const fs = require('fs');
const path = require('path');

const pagesDir = path.join(__dirname, 'src', 'app', 'pages');

function fixFile(filePath) {
    if (!fs.existsSync(filePath)) return;
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Ensure top-level imports exist
    if (!content.includes("import { NgClass }") && !content.includes("NgClass } from '@angular/common'")) {
        content = "import { NgClass } from '@angular/common';\n" + content;
    }
    if (!content.includes("import { MatTooltipModule }")) {
        content = "import { MatTooltipModule } from '@angular/material/tooltip';\n" + content;
    }
    if (!content.includes("import { MatButtonModule }")) {
        content = "import { MatButtonModule } from '@angular/material/button';\n" + content;
    }
    
    // Clean up any weird leftover
    content = content.replace(/angular\/common'; from '@a\n/, '');

    fs.writeFileSync(filePath, content);
}

const folders = fs.readdirSync(pagesDir);
for (const folder of folders) {
    const tsFile = path.join(pagesDir, folder, folder + '.ts');
    fixFile(tsFile);
}
console.log('Fixed imports again');
