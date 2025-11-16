const { spawn } = require('child_process');
const { exec } = require('child_process');

// Start backend server
console.log('Starting backend server...');
const backend = spawn('node', ['backend/server.js'], {
  stdio: 'inherit',
  shell: true
});

// Wait a moment for backend to start, then start frontend
setTimeout(() => {
  console.log('Starting frontend server...');
  const frontend = spawn('npm', ['run', 'frontend'], {
    stdio: 'inherit',
    shell: true
  });

  // Wait a moment for frontend to start, then open browser
  setTimeout(() => {
    const url = 'http://localhost:8080';
    const command = process.platform === 'win32' 
      ? `start ${url}`
      : process.platform === 'darwin'
      ? `open ${url}`
      : `xdg-open ${url}`;
    
    exec(command, (error) => {
      if (error) {
        console.log(`Frontend running at ${url}`);
        console.log(`Backend running at http://localhost:3001`);
        console.log('Please open the URLs manually in your browser');
      }
    });
  }, 3000);

  // Handle process termination
  process.on('SIGINT', () => {
    frontend.kill();
    backend.kill();
    process.exit();
  });

  process.on('SIGTERM', () => {
    frontend.kill();
    backend.kill();
    process.exit();
  });
}, 1000);

// Handle backend errors
backend.on('error', (err) => {
  console.error('Failed to start backend:', err);
});
