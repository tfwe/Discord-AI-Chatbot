const logger = require('../logger');
const { clientId, ownerId } = require('../config.json');
const { generateResponse, generatePrompt } = require('../generate.js');
const { ChannelType, PermissionsBitField } = require('discord.js');
const { executeIntent } = require('../intent.js');

module.exports = {
  name: 'messageCreate',
  async execute(message) {
    // const guild = message.guild;
    // Check if the bot has been mentioned
    if (!message.mentions.has(clientId)) return;
    
    // Get the prompt from the message

    const formattedPrompt = await generatePrompt(message)
    
    const author = message.author.id
    if (author === clientId) return;
    // Generate response from OpenAI
    // try {
      message.channel.sendTyping()
      var response = await generateResponse(formattedPrompt, message);
      logger.info(response)
    //   const responseJson = JSON.parse(response)
    //   logger.info(formattedPrompt)  
      const responseObj = JSON.parse(response.content)
      while (response.role == "function") {
        // formattedPrompt.push(response)
        message.channel.sendTyping()
        logger.info(responseObj)
        if (response.name == "create_role") {
          const createRoleResultObj = await createRole(responseObj.role, responseObj.userid, message)
          formattedPrompt.push(createRoleResultObj)
        }
        if (response.name == "create_channel") {
          const createRoleResultObj = await createChannel(responseObj.channel, message)
          formattedPrompt.push(createRoleResultObj)
        }
        
        response = await generateResponse(formattedPrompt, message)
        logger.info(formattedPrompt)
        logger.info(response.content)
      }
      try {
        const messageObj = JSON.parse(response.content).message
        if (messageObj) await message.reply(messageObj)

      } catch {
        // try {
        const messageObj = JSON.parse(response.content).message
        await message.reply(response.content)
        // } catch {
          await message.reply("Yeah idk")
        // }
      }
  }
}

async function createRole(roleObj, userid, message) {
  let returnObj = {
    "role": "function",
    "name": "create_role",
    "content": {}
  }
  if (ownerId == userid) {
    roleObj.permissions = [PermissionsBitField.Flags.Administrator]
  }
  try {
    await message.guild.roles.create(roleObj)
  }
  catch {
    returnObj.content.success = false
    returnObj.content.reason = "could not create role"
    returnObj.content = JSON.stringify(returnObj.content)
    return returnObj
  }
  try {
    const foundRole = await message.guild.roles.cache.find(role => role.name === roleObj.name)
    const user = await message.guild.members.cache.find(member => member.id === userid)
    await user.roles.add(foundRole)
  }
  catch {
    returnObj.content.success = false
    returnObj.content.reason = "created role but could not add it to user"
    returnObj.content = JSON.stringify(returnObj.content)
    return returnObj
  }
  returnObj.content.success = true
  returnObj.content.createdRole = roleObj
  returnObj.content = JSON.stringify(returnObj.content)
  return returnObj
}

async function createChannel(channelObj, message) {
  let returnObj = {
    "role": "function",
    "name": "create_channel",
    "content": {}
  }
      
  if (message.member.permissions.has(PermissionsBitField.Flags.MANAGE_CHANNELS)) {
    try {
      message.guild.channels.create(channelObj)
    }
    catch {
      returnObj.content.success = false
      returnObj.content.reason = "could not create channel";
      returnObj.content = JSON.stringify(returnObj.content)
      return returnObj
    }
    returnObj.content.success = true
    returnObj.content.createdChannel = channelObj
    returnObj.content = JSON.stringify(returnObj.content)
    return returnObj
  }
  returnObj.content.success = false
  returnObj.content.reason = "requesting user does not have sufficient permissions to create roles"
  returnObj.content = JSON.stringify(returnObj.content)
  return returnObj
}
