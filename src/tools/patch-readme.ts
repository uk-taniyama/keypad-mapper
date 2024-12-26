import { readFileSync, writeFileSync } from 'node:fs';

const lines = readFileSync('README.md', 'utf-8').split('\n');

const patched = lines.map((line) => {
  return line
    .replace(/```([a-zA-Z0-9]+)```/g, '[`$1`](functions/$1.html)')
    .replace(/``([a-zA-Z0-9]+)``/g, '[`$1`](variables/$1.html)');
});
console.log('generate README.docs.md');
writeFileSync('README.docs.md', patched.join('\n'));
