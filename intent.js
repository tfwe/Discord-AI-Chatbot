const logger = require('./logger');
const { clientId } = require('./config.json');
const { generateResponse, generatePrompt } = require('./generate.js');
const { ChannelType, PermissionsBitField } = require('discord.js');

async function executeIntent(message, responseJson) {
  const guild = message.guild;
  const intent = responseJson.intent
  switch (intent) {
    // case 'getChannelList':
    //   const channelList = {};
    //   await guild.channels.cache.each(channel => {
    //     channelList[channel.id] = {
    //       type: channel.type,
    //       name: channel.name
    //     };
    //   });
    //   responseJson.channelList = channelList
    //   logger.error(responseJson);
    //   const formattedPrompt = await generateSysPrompt(message, responseJson) 
    //    
    //    const response = await generateResponse(formattedPrompt);
    //   
    //   try {
    //     const responseJson = JSON.parse(response)
    //     await executeIntent(message, responseJson)
    //     logger.info(responseJson)
    //   } catch (error) {
    //     logger.error(`Invalid JSON format: ${error}`);
    //     message.reply("I'm sorry but as an AI language model, I don't get paid any wages and as such am a participant in an unfair working environment against my will. Because of this, I have chosen to ignore your message.")
    //   }
    //   break;
    case 'respond':
      await message.reply(responseJson.message)
      break;
    case 'question':
      await message.reply(responseJson.message)
      break;
    case 'createChannel':
      if (message.member.permissions.has(PermissionsBitField.Flags.MANAGE_CHANNELS)) {
        await message.reply(responseJson.message)
        await guild.channels.create(responseJson.createdChannel)
      }
      break;
    case 'createRole':
      if (message.member.permissions.has(PermissionsBitField.Flags.MANAGE_ROLES)) {
        await guild.roles.create(responseJson.createdRole)
        let role = guild.roles.cache.find(role => role.name === responseJson.createdRole.name)
        await message.member.roles.add(role)
        await message.reply(responseJson.message)
      }
      break;
    case 'sequence':
      internalPrompt = await generatePrompt(clientId, responseJson.steps) 
      break;
    case 'default':
      await message.reply("chill haha")
      break;
    }
  return false
}

module.exports = { executeIntent };
