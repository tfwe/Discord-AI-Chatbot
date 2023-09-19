// module.exports = async function deployCommands() {
  const { REST, Routes } = require('discord.js');
  // const { clientId, guildIds, token } = require('./config.json');
  const fs = require('node:fs');
  const logger = require('./logger.js')

  const commands = [];
  // Grab all the command files from the commands directory you created earlier
  const commandFiles = fs.readdirSync('./commands/').filter(file => file.endsWith('.js'));

  // Grab the SlashCommandBuilder#toJSON() output of each command's data for deployment
  for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    commands.push(command.data.toJSON());
  }

  // Construct and prepare an instance of the REST module
  const rest = new REST({ version: '10' }).setToken(token);

  // and deploy your commands!
  (async () => {
    logger.info(`Started refreshing ${commands.length} application (/) commands.`);

    // The put method is used to fully refresh all commands in the guild with the current set
    if (!clientId)
    return logger.error('Missing clientId')
    let count = 0;
    for (i of guildIds) {
      try {
      const data = await rest.put(
        Routes.applicationGuildCommands(clientId, i),
        { body: commands },
      );
        count = count + 1
        logger.info(`[deploy-commands] Successfully reloaded ${data.length} application (/) commands for ${i}`);
      }
      catch (error) {
        // And of course, make sure you catch and log any errors!
        logger.error(`[WARN] while deploying commands some guild's commands failed to deploy ${error}, GuildID: ${i}`);
      } 	
    }
    logger.info(`[deploy-commands] Commands reloaded for ${count} guilds successfully.`)

  })();
// };
