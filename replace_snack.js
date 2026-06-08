const fs = require('fs');
const path = require('path');

function processDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            processDir(fullPath);
        } else if (fullPath.endsWith('.ts') && !fullPath.includes('alert.service.ts')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            if (content.includes('inject(MatSnackBar)') || content.includes(': MatSnackBar')) {
                // Calculate relative path to alert.service
                const alertServiceDir = path.resolve('c:/ag/pet-clinic/src/app/services');
                let relPath = path.relative(path.dirname(fullPath), alertServiceDir).replace(/\\/g, '/');
                if (!relPath.startsWith('.')) relPath = './' + relPath;
                relPath += '/alert.service';
                
                // Add import if not present
                if (!content.includes('AlertService')) {
                    content = content.replace(/import {.*?MatSnackBar.*?}.*?;/, (match) => {
                        return match + `\nimport { AlertService } from '${relPath}';`;
                    });
                }
                
                // Replace inject
                content = content.replace(/inject\(MatSnackBar\)/g, 'inject(AlertService)');
                
                // Replace constructor injection
                content = content.replace(/(\w+):\s*MatSnackBar/g, '$1: AlertService');
                
                fs.writeFileSync(fullPath, content);
                console.log(`Updated ${fullPath}`);
            }
        }
    }
}

processDir('c:/ag/pet-clinic/src/app');
