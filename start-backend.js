const path = require('path');
const fs = require('fs');

const backendServer = path.resolve(__dirname, 'Backend', 'src', 'server.js');

if (!fs.existsSync(backendServer)) {
  console.error('Backend server file not found at', backendServer);
  process.exit(1);
}

require(backendServer);
