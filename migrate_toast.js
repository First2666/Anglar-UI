const fs = require('fs');
const path = require('path');

const appDir = path.resolve('src/app');

// Files already handled
const skipFiles = new Set([
  path.resolve('src/app/app.ts'),
  path.resolve('src/app/services/toast.service.ts'),
  path.resolve('src/app/services/alert.service.ts'),
  path.resolve('src/app/shared/components/snackbar-alert/snackbar-alert.ts'),
]);

function relativeToastPath(fromFile) {
  const toastDir = path.resolve('src/app/services');
  let rel = path.relative(path.dirname(fromFile), toastDir).replace(/\\/g, '/');
  if (!rel.startsWith('.')) rel = './' + rel;
  return rel + '/toast.service';
}

function processFile(filePath) {
  if (skipFiles.has(filePath)) return;
  
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  // Skip if already uses ToastService
  if (content.includes('ToastService') || content.includes('toast.service')) return;

  // Only process files that use MatSnackBar injection
  if (!content.includes('inject(MatSnackBar)') && !content.includes('MatSnackBar)') && !content.includes('snack.open(')) return;

  const toastPath = relativeToastPath(filePath);

  // 1. Add ToastService import after MatSnackBar import or at top of imports
  if (content.includes('MatSnackBar')) {
    // Remove MatSnackBar from @angular/material/snack-bar import  
    content = content.replace(
      /import\s*\{([^}]*MatSnackBar[^}]*)\}\s*from\s*'@angular\/material\/snack-bar';?\n?/g,
      (match, group) => {
        const parts = group.split(',').map(s => s.trim()).filter(s => s && s !== 'MatSnackBar' && s !== 'MatSnackBarModule');
        const remaining = parts.join(', ');
        const newImport = remaining ? `import { ${remaining} } from '@angular/material/snack-bar';\n` : '';
        return newImport;
      }
    );

    // Add ToastService import
    if (!content.includes("from '" + toastPath + "'")) {
      // Insert after last import block
      content = content.replace(
        /(import\s+.*;\n)(?!import)/,
        `$1import { ToastService } from '${toastPath}';\n`
      );
    }

    changed = true;
  }

  // 2. Replace inject(MatSnackBar) 
  if (content.includes('inject(MatSnackBar)')) {
    content = content.replace(/inject\(MatSnackBar\)/g, 'inject(ToastService)');
    changed = true;
  }

  // 3. Replace private field type annotation
  content = content.replace(/(\w+)\s*=\s*inject\(MatSnackBar\)/g, '$1 = inject(ToastService)');

  // 4. Rename the field variable if it's called `snack`
  // Replace this.snack.open( => this.toast.open( (keep name if it's already toast)
  if (content.includes('inject(ToastService)')) {
    // Find which variable name was used
    const fieldMatch = content.match(/(?:private |readonly |private readonly )?(\w+)\s*=\s*inject\(ToastService\)/);
    if (fieldMatch) {
      const varName = fieldMatch[1];
      if (varName !== 'toast') {
        // Rename to toast
        const re = new RegExp(`this\\.${varName}\\.`, 'g');
        content = content.replace(re, 'this.toast.');
        content = content.replace(new RegExp(`(private(?:\\s+readonly)?\\s+)${varName}\\s*=\\s*inject\\(ToastService\\)`, 'g'), '$1toast = inject(ToastService)');
        changed = true;
      }
    }
  }

  // 5. Remove MatSnackBarModule from imports array
  content = content.replace(/,?\s*MatSnackBarModule/g, '');
  content = content.replace(/MatSnackBarModule,?\s*/g, '');

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✓ Migrated: ${filePath.replace(path.resolve('.'), '')}`);
  }
}

function walkDir(dir) {
  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      walkDir(full);
    } else if (full.endsWith('.ts') && !full.endsWith('.spec.ts')) {
      processFile(full);
    }
  }
}

console.log('Migrating MatSnackBar → ToastService...\n');
walkDir(appDir);
console.log('\nDone!');
