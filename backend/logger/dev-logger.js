var appRoot = require('app-root-path');
const { format, createLogger, transports } = require('winston');
const { combine, timestamp, label, printf, colorize, errors } = format;

const buildDevLogger = () => {
    const logFormat = printf(({ level, message, timestamp, stack }) => {
          return `${timestamp} ${level}: ${stack || message}`;
      })
    const file = {
        filename: `${appRoot}/logs/dev.log`
    }
    return createLogger({
        format: combine(
            errors({stack:true}), 
            colorize(), 
            timestamp({format: 'YYYY-MM-DD HH:mm:ss'}), 
            logFormat
            ),
    transports: [
        new transports.File(file),
        new transports.Console()
    ],
    exitOnError: false,
});
}

module.exports = buildDevLogger;