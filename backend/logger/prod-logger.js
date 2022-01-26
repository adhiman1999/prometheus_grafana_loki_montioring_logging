var appRoot = require('app-root-path');
const { format, createLogger, transports } = require('winston');
const { timestamp, combine, errors, json} = format;


const buildProdLogger = () => {
    const file = {
        filename: `${appRoot}/logs/prod.log`,
    }
    return createLogger({
        format: combine(
            errors({stack:true}),
            timestamp(),
            json(),
        ),
        transports: [
            new transports.File(file),
            new transports.Console()
        ],

    })
}

module.exports = buildProdLogger;