const pino = require('pino');
const transport = pino.transport({
	targets: [
    { target: 'pino-pretty', level: 'debug', options: { colorize: false, destination: './bot.log' }},
    { target: 'pino-pretty', level: 'debug' },
  ],
  dedupe: true
});
const logger = pino(transport);
logger.level = 'debug'
module.exports = logger;

