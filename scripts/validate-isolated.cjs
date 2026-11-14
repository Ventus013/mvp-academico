// Windows-only validation utility. Starts only processes and data created by this run.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const net = require('node:net');
const { randomUUID, randomBytes } = require('node:crypto');
const { spawn, spawnSync } = require('node:child_process');
const { once } = require('node:events');
const { Pool } = require('pg');

const root = path.resolve(__dirname, '..');
process.chdir(root);
assert.equal(require('../package.json').name, 'academic-production-catalog');
if (process.platform !== 'win32') throw new Error('Use Docker Compose e test:postgres fora do Windows.');
const native = path.join(root, '.validation-tools/node_modules/@embedded-postgres/windows-x64/native/bin');
if (!fs.existsSync(path.join(native, 'initdb.exe'))) throw new Error('Instale os binários temporários conforme docs/TESTE-MANUAL.md.');
const runDir = path.join(root, '.validation-data', randomUUID());
const data = path.join(runDir, 'postgres');
fs.mkdirSync(runDir, { recursive: true });
const password = randomBytes(24).toString('hex');
const passwordFile = path.join(runDir, 'password.txt');
fs.writeFileSync(passwordFile, password);
const evidence = [];
const serve = process.argv.includes('--serve');
// Explicit environment: no inherited database, application or dotenv settings.
const env = {};
for (const key of ['PATH', 'Path', 'SystemRoot', 'SYSTEMROOT', 'WINDIR', 'COMSPEC', 'TEMP', 'TMP', 'PATHEXT', 'USERPROFILE', 'APPDATA', 'LOCALAPPDATA', 'SystemDrive']) {
  if (process.env[key]) env[key] = process.env[key];
}
env.DOTENV_CONFIG_PATH = path.join(runDir, 'unused.env');
env.NO_COLOR = '1';
let app;
let databaseStarted = false;
function binary(name, args) {
  const result = spawnSync(path.join(native, `${name}.exe`), args, { cwd: root, env, encoding: 'utf8', windowsHide: true, timeout: 30000 });
  if (result.status !== 0) throw new Error(`${name} falhou: ${result.error?.message ?? result.stderr ?? ''}`);
}
function node(args, label) {
  const result = spawnSync(process.execPath, args, { cwd: root, env, encoding: 'utf8', windowsHide: true, timeout: 60000 });
  console.log(result.stdout);
  if (result.status !== 0) throw new Error(`${label} falhou: ${result.error?.message ?? result.stderr}`);
  evidence.push({ check: label, passed: true });
}
async function freePort() {
  const server = net.createServer();
  await new Promise((resolve, reject) => server.once('error', reject).listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  await new Promise(resolve => server.close(resolve));
  return port;
}
async function stopApp() {
  if (app && app.exitCode === null && app.signalCode === null) {
    const ended = once(app, 'exit');
    app.kill();
    await ended;
  }
}
async function main() {
  const pgPort = await freePort();
  let httpPort = serve ? 3100 : await freePort();
  while (httpPort === pgPort) httpPort = await freePort();
  env.PORT = String(httpPort);
  env.HOST = '127.0.0.1';
  env.DATABASE_URL = `postgresql://academic_validation:${password}@127.0.0.1:${pgPort}/academic_validation_test`;
  env.TEST_DATABASE_URL = env.DATABASE_URL;
  binary('initdb', ['-D', data, '-U', 'academic_validation', '--encoding=UTF8', '--locale=C', '--auth-host=scram-sha-256', '--auth-local=scram-sha-256', `--pwfile=${passwordFile}`]);
  binary('pg_ctl', ['-D', data, '-l', path.join(runDir, 'postgres.log'), '-o', `-h 127.0.0.1 -p ${pgPort}`, '-w', 'start']);
  databaseStarted = true;
  const admin = new Pool({ connectionString: env.DATABASE_URL.replace('/academic_validation_test', '/postgres'), connectionTimeoutMillis: 5000 });
  try { await admin.query('CREATE DATABASE academic_validation_test'); } finally { await admin.end(); }
  const database = new Pool({ connectionString: env.DATABASE_URL, connectionTimeoutMillis: 5000 });
  try {
    evidence.push({ check: 'PostgreSQL real isolado', version: (await database.query('SHOW server_version')).rows[0].server_version, passed: true });
  } finally { await database.end(); }
  node(['node_modules/ts-node/dist/bin.js', 'scripts/migrate.ts'], 'migração inicial');
  node(['node_modules/ts-node/dist/bin.js', 'scripts/migrate.ts'], 'migração repetida');
  node(['node_modules/ts-node/dist/bin.js', 'scripts/seed.ts'], 'seed inicial');
  node(['node_modules/ts-node/dist/bin.js', 'scripts/seed.ts'], 'seed repetido');
  if (!serve) node(['node_modules/jest/bin/jest.js', '--runInBand'], 'Jest com PostgreSQL real');
  const base = `http://127.0.0.1:${httpPort}/api`;
  async function startApp() {
    app = spawn(process.execPath, ['dist/main.js'], { cwd: root, env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    const stream = fs.createWriteStream(path.join(runDir, 'app.log'), { flags: 'a' });
    app.stdout.pipe(stream, { end: false }); app.stderr.pipe(stream, { end: false });
    app.once('exit', () => stream.end());
    let spawnError;
    app.once('error', error => { spawnError = error; });
    for (let attempt = 0; attempt < 80; attempt++) {
      if (spawnError) throw spawnError;
      if (app.exitCode !== null) throw new Error('Aplicação encerrou antes de ficar pronta.');
      try { const response = await fetch(`${base}/products`, { signal: AbortSignal.timeout(1000) }); if (response.ok) return; } catch {}
      await new Promise(resolve => setTimeout(resolve, 150));
    }
    throw new Error('Aplicação não respondeu dentro do tempo limite.');
  }
  async function http(method, route, expected, body) {
    const response = await fetch(base + route, { method, headers: { 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(5000) });
    const text = await response.text();
    const value = text ? JSON.parse(text) : null;
    assert.equal(response.status, expected, `${method} ${route}: ${text}`);
    evidence.push({ method, route: '/api' + route, status: response.status, request: body, response: value });
    return value;
  }
  await startApp();
  if (serve) {
    console.log(`\nFRONTEND PRONTO: http://127.0.0.1:${httpPort}\nBanco acadêmico temporário. Ctrl+C encerra a demonstração.\n`);
    await new Promise(resolve => {
      process.once('SIGINT', resolve); process.once('SIGTERM', resolve);
      app.once('exit', resolve);
    });
    return;
  }
  const seed = await http('GET', '/products', 200);
  const healthResponse = await fetch(`http://127.0.0.1:${httpPort}/health`, { signal: AbortSignal.timeout(5000) });
  assert.equal(healthResponse.status, 200);
  assert.deepEqual(await healthResponse.json(), { status: 'ok', database: 'up' });
  evidence.push({ check: 'GET /health com PostgreSQL real', passed: true });
  assert.equal(seed.length, 1, 'Seed repetido não deve duplicar produtos.');
  assert.equal((await http('GET', '/processes', 200)).length, 2);
  const product = await http('POST', '/products', 201, { sku: 'E2E-CUBE', name: 'Cubo demonstrativo', description: 'Dado ficticio' });
  const step = await http('POST', '/processes', 201, { code: 'E2E-REVIEW', name: 'Revisao demonstrativa' });
  await http('GET', `/products/${product.id}`, 200);
  await http('GET', `/processes/${step.id}`, 200);
  await http('POST', `/products/${product.id}/processes/${step.id}`, 201, { position: 1 });
  const linked = await http('GET', `/products/${product.id}/processes`, 200);
  assert.equal(linked[0].code, 'E2E-REVIEW');
  await http('POST', '/products', 409, { sku: 'E2E-CUBE', name: 'Duplicado' });
  await http('POST', '/products', 400, { sku: '', name: 'Invalido' });
  await http('GET', '/products/not-a-uuid', 400);
  await http('GET', `/products/${randomUUID()}`, 404);
  await stopApp();
  await startApp();
  const persisted = await http('GET', `/products/${product.id}/processes`, 200);
  assert.equal(persisted.length, 1, 'Associação deve persistir após reiniciar o processo da API.');
  evidence.push({ check: 'persistência após reiniciar aplicação compilada', passed: true });
  await http('DELETE', `/products/${product.id}/processes/${step.id}`, 204);
  assert.deepEqual(await http('GET', `/products/${product.id}/processes`, 200), []);
  await http('GET', `/products/${product.id}`, 200);
  await http('GET', `/processes/${step.id}`, 200);
  await http('DELETE', `/products/${product.id}/processes/${step.id}`, 404);
  if (process.argv.includes('--browser')) {
    env.ACADEMIC_URL = `http://127.0.0.1:${httpPort}`;
    node(['node_modules/playwright/cli.js', 'test'], 'Frontend em navegador real');
  }
  fs.writeFileSync(path.join(root, 'docs/EVIDENCIAS-HTTP.json'), JSON.stringify({ scope: 'academic-production-catalog only', database: 'temporary isolated PostgreSQL; generated credentials omitted', checks: evidence }, null, 2) + '\n');
  console.log('VALIDAÇÃO COMPLETA: PostgreSQL real, Jest, aplicação compilada, rotas e persistência aprovados.');
}
main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(async () => {
  await stopApp();
  if (databaseStarted) binary('pg_ctl', ['-D', data, '-m', 'fast', '-w', 'stop']);
  if (fs.existsSync(passwordFile)) fs.unlinkSync(passwordFile);
  console.log('Processos da validação encerrados. Dados temporários permanecem na pasta ignorada .validation-data.');
});
