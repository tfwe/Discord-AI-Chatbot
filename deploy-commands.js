// module.exports = async function deployCommands() {
const { REST, Routes } = require('discord.js');
require('dotenv').config()
const fs = require('node:fs');
const logger = require('./logger.js')
const TOKEN = process.env.TOKEN
const CLIENT_ID = process.env.CLIENT_ID

const commands = [];
// Grab all the command files from the commands directory you created earlier
const commandFiles = fs.readdirSync('./commands/').filter(file => file.endsWith('.js'));

// Grab the SlashCommandBuilder#toJSON() output of each command's data for deployment
for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  commands.push(command.data.toJSON());
}

// Construct and prepare an instance of the REST module
const rest = new REST({ version: '10' }).setToken(TOKEN);

// and deploy your commands!
(async () => {
  logger.info(`[deploy-commands] Started refreshing ${commands.length} application (/) commands.`);

  // The put method is used to fully refresh all commands in the guild with the current set
  if (!CLIENT_ID)
  return logger.error('Missing CLIENT_ID')
  let count = 0;
    try {
    const data = await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, '1102321826597703861'),
      { body: commands },
    );
      logger.info(`[deploy-commands] Successfully reloaded ${data.length} application (/) commands`);
    }
    catch (error) {
      logger.error(`[WARN] while deploying commands ${error}`);
    } 	
  logger.info(`[deploy-commands] Commands reloaded successfully.`)

})();
// };
