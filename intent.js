const logger = require('../logger');
const { clientId } = require('../config.json');
const { generateResponse, generatePrompt } = require('../generate.js');
const { ChannelType, PermissionsBitField } = require('discord.js');

async function executeIntent(message, intent) {
  switch (intent) {
    case 'respond':
      await message.reply(responseJson.message)
      break;
    case 'createChannel':
      await message.reply(responseJson.message)
      await guild.channels.create({
        name: responseJson.channel.name
      })
      break;
    case 'createRole':
      await guild.roles.create({
        name: responseJson.role.name,
        color: responseJson.role.color
      })
      let role = guild.roles.cache.find(role => role.name === responseJson.role.name)
      await message.member.roles.add(role)
      await message.reply(responseJson.message)
      break;
    case 'sequence':
      internalPrompt = await generatePrompt(clientId, responseJson.steps) 
      break;
    case 'default':
      await message.reply("chill haha")
      break;
  }
}

module.exports = executeIntent;
