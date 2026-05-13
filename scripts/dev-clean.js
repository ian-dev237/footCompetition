// Tue les process Node orphelins (sauf moi-même), purge .next et le cache de
// node_modules, puis le caller (npm script) relance `next dev`. Utile sur Windows
// où les anciens dev servers verrouillent .next\trace (EPERM).
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const root = path.resolve(__dirname, '..');
const myPid = process.pid;

function rm(p) {
  try {
    fs.rmSync(path.join(root, p), { recursive: true, force: true });
    console.log(`✓ supprimé ${p}`);
  } catch (e) {
    console.log(`! ${p}: ${e.message}`);
  }
}

console.log('— Nettoyage du dev server —');

// 1. Kill all node processes except this one
if (os.platform() === 'win32') {
  try {
    // PowerShell: tous les node sauf moi
    const cmd = `Get-Process node -ErrorAction SilentlyContinue | Where-Object { $_.Id -ne ${myPid} } | Stop-Process -Force -ErrorAction SilentlyContinue`;
    execSync(`powershell.exe -NoProfile -Command "${cmd}"`, { stdio: 'inherit' });
    console.log('✓ node.exe zombies tués');
  } catch {
    console.log('! échec kill node (peut-être aucun n\'était en cours)');
  }
} else {
  try {
    execSync(`pgrep -f "next dev" | grep -v ${myPid} | xargs -r kill -9`, { stdio: 'ignore' });
    console.log('✓ next dev zombies tués');
  } catch { /* ignore */ }
}

// 2. Wait a moment for file handles to release
try {
  execSync(os.platform() === 'win32'
    ? 'powershell.exe -NoProfile -Command "Start-Sleep -Seconds 1"'
    : 'sleep 1',
  );
} catch { /* ignore */ }

// 3. Wipe caches
rm('.next');
rm('node_modules/.cache');

console.log('— Prêt, démarrage de Next.js —');
