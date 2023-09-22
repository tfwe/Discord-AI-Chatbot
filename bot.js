const fs = require('node:fs');
const util = require('util')
const path = require('node:path');
require('dotenv').config()
const logger = require('./logger');
const { Client, Events, GatewayIntentBits, Collection, ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, StringSelectMenuBuilder, TextInputBuilder, TextInputStyle, } = require('discord.js');
const TOKEN = process.env.TOKEN
const OPENAI_KEY = process.env.OPENAI_KEY

const client = new Client({ intents: [
  GatewayIntentBits.Guilds,
  GatewayIntentBits.GuildMessages,
  GatewayIntentBits.MessageContent,
  GatewayIntentBits.GuildMembers,
] });
client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

const interactionsPath = path.join(__dirname, 'interactions');
const interactionFiles = fs.readdirSync(interactionsPath).filter(file => file.endsWith('.js'));

//JSON.stringify complains when running into a BigInt for some reason, this happens when JSON.toString() is called on interaction object
BigInt.prototype.toJSON = function() { return this.toString() }
for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  // Set a new item in the Collection with the key as the command name and the value as the exported module
  if ('data' in command && 'execute' in command) {
    client.commands.set(command.data.name, command);
  } else {
    logger.error(`[WARN] The command at ${filePath} is missing a required "data" or "execute" property.`);
  }
}

// When the client is ready, run this code (only once)
client.once(Events.ClientReady, () => {
  if (!OPENAI_KEY) {
    return logger.error('OpenAI key not configured in .env');
  }
  logger.info(`Logged in as ${client.user.tag}!`);
  client.user.setActivity('Mention me, reply to one of my messages, or type /ask to talk to me!');
  client.application.commands.set([])
});

// client.on("guildCreate", guild => {
//   if (!guildIds.includes(guild.id)) {
//     const deployCommands = require('./deploy-commands.js');
//     guildIds.push(guild.id);
//     fs.writeFile('./config.json', JSON.stringify({ token, guildIds, clientId, apiKey, ownerId }), (err) => {
//       if (err) logger.error(err);
//     });
//     deployCommands();
//     logger.info(`[guildCreate] Bot was added to new guild ${guild.id}`)
//   }
// });
//
for (const file of interactionFiles) {
  const filePath = path.join(interactionsPath, file);
  const event = require(filePath);
  logger.info(`loading ${file}...`)
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args));
  } else {
    client.on(event.name, (...args) => event.execute(...args));
  }
}

client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;
  const command = client.commands.get(interaction.commandName);
  if (!command) return;
  try {
    logger.info(`[chatCommand] ${interaction.member.user.tag} used ${interaction}`)
    await command.execute(interaction);
  } catch (error) {
    await interaction.channel.send({content: `Something went wrong` + `\n\`\`\`${error}\`\`\``})
    const interactionInspect = util.inspect(interaction, {showHidden: false, depth: null, colors: true})
    logger.error(`[WARN] ${error} from ${interaction.member.user.tag} on message ${interaction.customId} ${interactionInspect}`);
    return
  }
});

client.on(Events.Debug, m => logger.debug(m));
client.on(Events.Warn, m => logger.warn(m));
client.on(Events.Error, m => logger.error(m));
client.login(TOKEN);
