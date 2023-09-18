const logger = require('../logger');
const { clientId, ownerId } = require('../config.json');
const { generateResponse, generatePrompt } = require('../generate.js');
const { ChannelType, PermissionsBitField } = require('discord.js');
const { createRole, createChannel, searchQuery, searchPage } = require('../intent.js');
const { axios } = require('axios')

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
      logger.error("INPUT******************")
      logger.error(formattedPrompt)
      logger.error("INPUT******************")
      logger.error("OUTPUT******************")
      logger.error(response)
      logger.error("OUTPUT******************")
    //   const responseJson = JSON.parse(response)
    //   logger.info(formattedPrompt)  
      var responseObj = JSON.parse(response.content)
      while (response.role == "function") {
        // formattedPrompt.push(response)
        message.channel.sendTyping()
        if (response.name == "create_role") {
          const createRoleResultObj = await createRole(responseObj.role, responseObj.userid, message)
          formattedPrompt.push(createRoleResultObj)
        }
        if (response.name == "create_channel") {
          const createChannelResultObj = await createChannel(responseObj.channel, message)
          formattedPrompt.push(createChannelResultObj)
        }
        if (response.name == "search_query") {
          const searchQueryResultObj = await searchQuery(responseObj.query)
          formattedPrompt.push(searchQueryResultObj)
        }
        if (response.name == "search_page") {
          const searchPageResultObj = await searchPage(responseObj.link)
          formattedPrompt.push(searchPageResultObj)
        }
        response = await generateResponse(formattedPrompt, message)
        logger.error("INPUT******************")
        logger.error(formattedPrompt)
        logger.error("INPUT******************")
        logger.error("OUTPUT******************")
        logger.error(response)
        logger.error("OUTPUT******************")
        responseObj = JSON.parse(response.content)
      }
      try {
        const messageObj = JSON.parse(response.content).message
        if (messageObj) await message.reply(messageObj)

      } catch {
        let returnObj = {
          "role": "function",
          "name": "send_message",
          "content": {
            "success":false,
            "reason":"could not parse JSON",
            "data": response.content
          }
        }
        returnObj.content = JSON.stringify(returnObj.content)
        formattedPrompt.push(returnObj)
        response = await generateResponse(formattedPrompt, message)
        logger.error("INPUT******************")
        logger.error(formattedPrompt)
        logger.error("INPUT******************")
        logger.error("OUTPUT******************")
        logger.error(response)
        logger.error("OUTPUT******************")
        const messageObj = JSON.parse(response.content).message
        await message.reply(response.content)
        // } catch {
        // }
      }
  }
}
//
// async function createRole(roleObj, userid, message) {
//   let returnObj = {
//     "role": "function",
//     "name": "create_role",
//     "content": {}
//   }
//   if (ownerId == userid) {
//     roleObj.permissions = [PermissionsBitField.Flags.Administrator]
//   }
//   try {
//     await message.guild.roles.create(roleObj)
//   }
//   catch {
//     returnObj.content.success = false
//     returnObj.content.reason = "could not create role"
//     returnObj.content = JSON.stringify(returnObj.content)
//     return returnObj
//   }
//   try {
//     const foundRole = await message.guild.roles.cache.find(role => role.name === roleObj.name)
//     const user = await message.guild.members.cache.find(member => member.id === userid)
//     await user.roles.add(foundRole)
//   }
//   catch {
//     returnObj.content.success = false
//     returnObj.content.reason = "created role but could not add it to user"
//     returnObj.content = JSON.stringify(returnObj.content)
//     return returnObj
//   }
//   returnObj.content.success = true
//   returnObj.content.createdRole = roleObj
//   returnObj.content = JSON.stringify(returnObj.content)
//   return returnObj
// }
//
// async function createChannel(channelObj, message) {
//   let returnObj = {
//     "role": "function",
//     "name": "create_channel",
//     "content": {}
//   }
//       
//   if (message.member.permissions.has(PermissionsBitField.Flags.MANAGE_CHANNELS)) {
//     try {
//       message.guild.channels.create(channelObj)
//     }
//     catch {
//       returnObj.content.success = false
//       returnObj.content.reason = "could not create channel";
//       returnObj.content = JSON.stringify(returnObj.content)
//       return returnObj
//     }
//     returnObj.content.success = true
//     returnObj.content.createdChannel = channelObj
//     returnObj.content = JSON.stringify(returnObj.content)
//     return returnObj
//   }
//   returnObj.content.success = false
//   returnObj.content.reason = "requesting user does not have sufficient permissions to create roles"
//   returnObj.content = JSON.stringify(returnObj.content)
//   return returnObj
// }
//
// async function searchQuery(query) {
//   let returnObj = {
//     "role": "function",
//     "name": "search_query",
//     "content": {}
//   }
//   logger.info(query)
//   // const response = await axios.get(`https://www.googleapis.com/customsearch/v1&key=${googleKey}&cx=${googleCX}&q=${query.query}&callback=hndlr`)
//   const response = await axios(`https://reqres.in/api/users`)
//   logger.info(response)
//   returnObj.content.success = true
//   returnObj.content.data = response.data
//   returnObj.content = JSON.stringify(returnObj.content)
//   return returnObj
// }
