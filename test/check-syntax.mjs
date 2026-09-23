import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

const folders = ['.', 'tools', 'worker/src'];
const files = folders.flatMap(folder => readdirSync(folder)
  .filter(name => name.endsWith('.js') || name.endsWith('.mjs'))
  .map(name => join(folder, name)));

for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], { stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status || 1);
}

console.log(`all ${files.length} modules parse`);
