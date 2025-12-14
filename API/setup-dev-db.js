import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prodDb = path.join(__dirname, 'database.db');
const devDb = path.join(__dirname, 'database-dev.db');

// Copy production database to dev if dev doesn't exist
if (!fs.existsSync(devDb)) {
  if (fs.existsSync(prodDb)) {
    console.log('Creating development database from production database...');
    fs.copyFileSync(prodDb, devDb);
    console.log('✓ Development database created:', devDb);
  } else {
    console.log('⚠ Production database not found. Development database will be created on first run.');
  }
} else {
  console.log('✓ Development database already exists:', devDb);
}

console.log('\nDatabase setup complete!');
console.log('Production DB:', prodDb);
console.log('Development DB:', devDb);
