const http = require('http');
const { spawn } = require('child_process');
const { exec } = require('child_process');

// Start http-server
const server = spawn('npx', ['http-server', 'frontend', '-p', '8080', '-s'], {
  stdio: 'inherit',
  shell: true
});

// Wait a moment for server to start, then open browser
setTimeout(() => {
  const url = 'http://localhost:8080/index.html';
  const command = process.platform === 'win32' 
    ? `start ${url}`
    : process.platform === 'darwin'
    ? `open ${url}`
    : `xdg-open ${url}`;
  
  exec(command, (error) => {
    if (error) {
      console.log(`Server running at ${url}`);
      console.log('Please open the URL manually in your browser');
    }
  });
}, 1000);

// Handle process termination
process.on('SIGINT', () => {
  server.kill();
  process.exit();
});

process.on('SIGTERM', () => {
  server.kill();
  process.exit();
});

