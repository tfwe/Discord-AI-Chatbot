const logger = require('../logger');
const { MAX_PREV_MESSAGES } = require('../config.json');
const { generateResponse, generatePrompt } = require('../generate.js');
const { ChannelType, PermissionsBitField } = require('discord.js');
const { getUserInfo, createEmbed, createRole, createChannel, searchQuery, readPage, stockSearch, getCurrentTime } = require('../intent.js');
const { axios } = require('axios')
const CLIENT_ID = process.env.CLIENT_ID
const OWNER_ID = process.env.OWNER_ID
module.exports = {
  name: 'messageCreate',
  async execute(message) {
    const channel = message.channel

    // const guild = message.guild;
    // Check if the bot has been mentioned
    if (!message.mentions.has(CLIENT_ID)) return;
    return await message.reply(`Please use \`/ask [prompt]\` instead`)
    
    // Get the prompt from the message

    const formattedPrompt = await generatePrompt(message)
    
    const author = message.author.id
    if (author === CLIENT_ID) return;
    // if (author === OWNER_ID) {
    // }
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
      var responseObj = {}
      while (response.role == "function") {
        responseObj = JSON.parse(response.content)
        // formattedPrompt.push(response)
        message.channel.sendTyping()
        if (response.name == "get_user_info") {
          const getUserInfoResultObj = await getUserInfo(message) 
          formattedPrompt.push(getUserInfoResultObj)
        }
        if (response.name == "create_embed") {
          const createEmbedResultObj = await createEmbed(responseObj.embed)
          formattedPrompt.push(createEmbedResultObj)
          break
        }
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
        if (response.name == "read_page") {
          const readPageResultObj = await readPage(responseObj.link)
          formattedPrompt.push(readPageResultObj)
        }
        if (response.name == "stock_search") {
          const stockSearchResultObj = await stockSearch(responseObj.stock)
          formattedPrompt.push(stockSearchResultObj)
        }
        if (response.name == "get_current_time") {
          const getCurrentTimeResultObj = await getCurrentTime(responseObj.time)
          formattedPrompt.push(getCurrentTimeResultObj)
        }
        response = await generateResponse(formattedPrompt, message)
        logger.error("INPUT******************")
        logger.error(formattedPrompt)
        logger.error("INPUT******************")
        logger.error("OUTPUT******************")
        logger.error(response)
        logger.error("OUTPUT******************")
        // responseObj = JSON.parse(response.content)
      }
      // try {
        const messageObj = {
          content: response.content 
        }
        if (responseObj.embed) {
          messageObj.embeds = [ responseObj.embed ]
          messageObj.content = responseObj.content
        }
        logger.error(messageObj)
        if (messageObj) await message.reply(messageObj)
      //
      // } catch {
      //   let returnObj = {
      //     "role": "function",
      //     "name": "send_message",
      //     "content": {
      //       "success":false,
      //       "reason":"could not parse JSON",
      //       "data": response.content
      //     }
      //   }
        // returnObj.content = JSON.stringify(returnObj.content)
        // formattedPrompt.push(returnObj)
        // response = await generateResponse(formattedPrompt, message)
        // logger.error("INPUT******************")
        // logger.error(formattedPrompt)
        // logger.error("INPUT******************")
        // logger.error("OUTPUT******************")
        // logger.error(response)
        // logger.error("OUTPUT******************")
        // const messageObj = JSON.parse(response.content).message
        // await message.reply(response.content)

      }
  }
