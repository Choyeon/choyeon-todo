// 生成 electron-updater 所需 latest.yml
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const outDir = process.argv[2] || 'C:/choyeon-todo/3.0.1';
const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
const version = pkg.version;

const setupName = `Choyeon-To-Do-Setup-${version}.exe`;
const blockmapName = `${setupName}.blockmap`;
const portableName = `Choyeon-To-Do-Portable-${version}.exe`;

const sha512Of = (file) => {
  const buf = fs.readFileSync(file);
  return crypto.createHash('sha512').update(buf).digest('base64');
};
const sizeOf = (file) => fs.statSync(file).size;

const setupPath = path.join(outDir, setupName);
const blockmapPath = path.join(outDir, blockmapName);
const portablePath = path.join(outDir, portableName);

const setupSha = sha512Of(setupPath);
const setupSize = sizeOf(setupPath);
const blockmapSha = sha512Of(blockmapPath);
const blockmapSize = sizeOf(blockmapPath);
const portableSha = sha512Of(portablePath);
const portableSize = sizeOf(portablePath);

const yml = `version: ${version}
files:
  - url: ${setupName}
    sha512: ${setupSha}
    size: ${setupSize}
  - url: ${blockmapName}
    sha512: ${blockmapSha}
    size: ${blockmapSize}
  - url: ${portableName}
    sha512: ${portableSha}
    size: ${portableSize}
path: ${setupName}
sha512: ${setupSha}
releaseDate: ${new Date().toISOString()}
`;

fs.writeFileSync(path.join(outDir, 'latest.yml'), yml, 'utf8');
console.log('[OK] latest.yml generated');
console.log(yml);
