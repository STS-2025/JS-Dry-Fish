import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const appDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const apiPath = path.resolve(appDir, '..', 'backend', 'fish_shop_api.py');
const vitePath = path.resolve(appDir, 'node_modules', 'vite', 'bin', 'vite.js');
const children = [];
let stopping = false;

function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    if (child.exitCode === null) child.kill();
  }
  process.exitCode = code;
}

const api = spawn(process.env.PYTHON || 'python', [apiPath], {
  cwd: appDir,
  stdio: 'inherit',
  env: {
    ...process.env,
    FISH_SHOP_API_HOST: process.env.FISH_SHOP_API_HOST || '0.0.0.0'
  }
});
children.push(api);
api.on('error', error => {
  console.error(`Could not start the shop API: ${error.message}`);
  console.error('Install Python dependencies with: python -m pip install -r ..\\backend\\requirements.txt');
  stop(1);
});
api.on('exit', code => {
  if (!stopping) {
    console.error(`Shop API stopped${code ? ` with code ${code}` : ''}.`);
    stop(code || 1);
  }
});

const vite = spawn(process.execPath, [vitePath, '--host', '0.0.0.0', '--port', '3000', '--strictPort'], {
  cwd: appDir,
  stdio: 'inherit',
  env: process.env
});
children.push(vite);
vite.on('error', error => {
  console.error(`Could not start Vite: ${error.message}`);
  stop(1);
});
vite.on('exit', code => {
  if (!stopping) stop(code || 0);
});

process.on('SIGINT', () => stop(0));
process.on('SIGTERM', () => stop(0));
