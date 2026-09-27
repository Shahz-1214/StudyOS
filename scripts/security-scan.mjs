import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const roots = ['src', 'base44'];
const extensions = new Set(['.js', '.jsx', '.ts', '.tsx', '.json', '.jsonc', '.mjs', '.cjs']);
const ignored = new Set(['node_modules', 'dist', '.git']);
const findings = [];
const privateKeyRe = /-----BEGIN [A-Z0-9 -]*PRIVATE KEY-----/;
const awsKeyRe = /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/;
const githubTokenRe = /\bgh[pousr]_[A-Za-z0-9_]{20,}\b/;
const publicSecretEnvRe = /\b(?:NEXT_PUBLIC|REACT_APP|VITE)_[A-Z0-9_]*(?:SECRET|PASSWORD|PRIVATE|TOKEN|API_KEY)\b/i;
const consoleRe = /console\.(log|error|warn|debug|info)\s*\(/;

function scan(path) {
  const lines = readFileSync(path, 'utf8').split(/\r?\n/);
  lines.forEach((line, index) => {
    const n = index + 1;
    if (privateKeyRe.test(line)) findings.push([path,n,'PRIVATE_KEY','Possible private key material.']);
    if (awsKeyRe.test(line)) findings.push([path,n,'AWS_KEY_PATTERN','Possible AWS access key.']);
    if (githubTokenRe.test(line)) findings.push([path,n,'GITHUB_TOKEN_PATTERN','Possible GitHub token.']);
    if (publicSecretEnvRe.test(line)) findings.push([path,n,'PUBLIC_SECRET_ENV','Potential browser-exposed secret env variable.']);
    if (consoleRe.test(line)) findings.push([path,n,'CONSOLE_LOG','Review logging for user data or credentials.']);
  });
}

function walk(dir) {
  for (const name of readdirSync(dir)) {
    if (ignored.has(name)) continue;
    const path = join(dir, name);
    const stat = statSync(path);
    if (stat.isDirectory()) walk(path);
    else if (extensions.has(extname(name))) scan(path);
  }
}

for (const root of roots) walk(root);
if (findings.length) {
  console.error('StudyOS security scan found review items:');
  for (const [file,line,code,msg] of findings) console.error(file + ':' + line + ' [' + code + '] ' + msg);
  process.exitCode = 1;
} else {
  console.log('StudyOS security scan passed: no obvious private-key/AWS/GitHub-token/public-secret patterns or console logging found in application source.');
}