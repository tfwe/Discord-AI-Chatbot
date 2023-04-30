const pino = require('pino');
const transport = pino.transport({
	targets: [
    { target: 'pino-pretty', level: 'debug', options: { colorize: false, destination: './morgana.log' }},
    { target: 'pino-pretty', level: 'debug' },
  ],
  dedupe: true
});
const logger = pino(transport);
module.exports = logger;

