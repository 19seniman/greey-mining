const C = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
  blue: '\x1b[34m',
};

function timestamp() {
  return new Date().toLocaleString('id-ID', { hour12: false });
}

function printBanner() {
  console.log(`${C.magenta}${C.bright}`);
  console.log('   __  __ _                                   ');
  console.log('  |  \\/  (_)_ __   ___  __ _ _ __ __ _ _   _ ');
  console.log('  | |\\/| | | \'_ \\ / _ \\/ _` | \'__/ _` | | | |');
  console.log('  | |  | | | | | |  __/ (_| | | | (_| | |_| |');
  console.log('  |_|  |_|_|_| |_|\\___|\\__, |_|  \\__,_|\\__, |');
  console.log('                       |___/           |___/ ');
  console.log(`${C.reset}${C.cyan}${C.bright}        MINEGRAY AUTO-MINER  ·  1 AKUN PRIBADI${C.reset}`);
  console.log(`${C.dim}        from 19seniman${C.reset}`);
  console.log(`${C.yellow}${'─'.repeat(56)}${C.reset}\n`);
}

function info(msg) {
  console.log(`${C.dim}[${timestamp()}]${C.reset} ${C.cyan}ℹ${C.reset}  ${msg}`);
}

function success(msg) {
  console.log(`${C.dim}[${timestamp()}]${C.reset} ${C.green}✔${C.reset}  ${msg}`);
}

function warn(msg) {
  console.log(`${C.dim}[${timestamp()}]${C.reset} ${C.yellow}⚠${C.reset}  ${msg}`);
}

function error(msg) {
  console.log(`${C.dim}[${timestamp()}]${C.reset} ${C.red}✘${C.reset}  ${msg}`);
}

function section(title) {
  console.log(`\n${C.blue}${C.bright}▶ ${title}${C.reset}`);
}

function data(label, value) {
  console.log(`   ${C.dim}${label}:${C.reset} ${C.bright}${value}${C.reset}`);
}

module.exports = { printBanner, info, success, warn, error, section, data, C };
