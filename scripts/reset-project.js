#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const removablePaths = [
  '.expo',
  'dist',
  'web-build',
  'functions/lib',
  'node_modules/.cache',
];

for (const removablePath of removablePaths) {
  const absolutePath = path.join(projectRoot, removablePath);
  fs.rmSync(absolutePath, { force: true, recursive: true });
  console.log(`Cleared ${removablePath}`);
}

console.log('Project caches and generated build output cleared.');
