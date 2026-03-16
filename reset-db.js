const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'database', 'app.sqlite');

try {
  if (fs.existsSync(dbPath)) {
    fs.rmSync(dbPath, { force: true });
    console.log(`Deleted existing database: ${dbPath}`);
  } else {
    console.log(`No database found at: ${dbPath}`);
  }
} catch (error) {
  console.error('Failed to delete database:', error.message);
  process.exit(1);
}
