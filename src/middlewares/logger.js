const fs = require('fs');
const path = require('path');

const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}
const logFile = path.join(logsDir, 'requests.log');
const stream = fs.createWriteStream(logFile, { flags: 'a' });

function logger(req, res, next) {
  const start = process.hrtime();
  res.on('finish', () => {
    const diff = process.hrtime(start);
    const ms = (diff[0] * 1e3) + (diff[1] / 1e6);
    const timestamp = new Date().toISOString();
    const status = res.statusCode;
    const result = status < 400 ? 'PASS' : 'FAIL';
    const ip = req.ip || req.headers['x-forwarded-for'] || (req.connection && req.connection.remoteAddress) || '-';
    const entry = `${timestamp} | ${ip} | ${req.method} ${req.originalUrl} | ${status} | ${result} | ${ms.toFixed(2)}ms\n`;
    stream.write(entry);
  });
  next();
}

module.exports = logger;
