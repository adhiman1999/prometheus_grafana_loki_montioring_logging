const buildDevLogger = require('./dev-logger');
const buildProdLogger = require('./prod-logger');

let logger = null;
const NODE_ENV = 'development'
if (NODE_ENV === 'development') {
    logger = buildDevLogger();
} else {
    logger = buildProdLogger();
}

module.exports = logger;