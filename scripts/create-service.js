#!/usr/bin/env node

/**
 * Create a new service from template
 * 
 * Usage:
 *   node scripts/create-service.js api my-api
 *   node scripts/create-service.js agent my-agent
 *   node scripts/create-service.js web my-web
 */

const fs = require('fs');
const path = require('path');

const TEMPLATES = {
  api: 'service-api',
  agent: 'service-agent',
  web: 'service-web',
};

function copyDirectory(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function updatePackageJson(filePath, name) {
  const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  content.name = `@framework/${name}`;
  fs.writeFileSync(filePath, JSON.stringify(content, null, 2));
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.log('Usage: create-service <type> [name]');
    console.log('Types: api, agent, web');
    console.log('Example: create-service api my-api');
    process.exit(1);
  }

  const type = args[0];
  const name = args[1] || type;

  if (!TEMPLATES[type]) {
    console.error(`Unknown service type: ${type}`);
    console.log('Available types:', Object.keys(TEMPLATES).join(', '));
    process.exit(1);
  }

  const templateDir = path.join(__dirname, '..', 'templates', TEMPLATES[type]);
  const targetDir = path.join(__dirname, '..', 'apps', name);

  if (!fs.existsSync(templateDir)) {
    console.error(`Template not found: ${templateDir}`);
    process.exit(1);
  }

  if (fs.existsSync(targetDir)) {
    console.error(`Directory already exists: ${targetDir}`);
    process.exit(1);
  }

  console.log(`Creating ${type} service: ${name}`);
  console.log(`Template: ${templateDir}`);
  console.log(`Target: ${targetDir}`);

  // Copy template
  copyDirectory(templateDir, targetDir);

  // Update package.json name
  const packageJsonPath = path.join(targetDir, 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    updatePackageJson(packageJsonPath, name);
  }

  console.log('\n✅ Service created successfully!');
  console.log('\nNext steps:');
  console.log(`  cd apps/${name}`);
  console.log('  pnpm install');
  console.log('  pnpm dev');
}

main().catch(console.error);
