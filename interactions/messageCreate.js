const logger = require('../logger');
const fs = require('fs');
const { MAX_PREV_MESSAGES } = require('../config.json');
const { askGPTMessage, askGPT } = require('../generate.js');
const { ChannelType, PermissionsBitField } = require('discord.js');
const { getUserInfo, createEmbed, createRole, createChannel, searchQuery, readPage, stockSearch, getCurrentTime } = require('../intent.js');
const { axios } = require('axios')
const CLIENT_ID = process.env.CLIENT_ID
const OWNER_ID = process.env.OWNER_ID
// Importing necessary modules from discord.js
const { EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch');
module.exports = {
  name: 'messageCreate',
  async execute(message) {
    const channel = message.channel
    // Check if the bot has been mentioned
    if (!message.mentions.has(CLIENT_ID)) return;
    await message.channel.sendTyping();
    const promptMsg = message.content
    let profile = "core"
    // let model = "gpt-3.5-turbo"
    let model = "gpt-3.5-turbo"
    if (message.author.id == OWNER_ID && message.content.includes("gpt-4")) {
      model = "gpt-4o"
    }
    if (message.author.id == CLIENT_ID) {
      return await message.reply("Error, tried to talk to myself")
    }
    logger.debug(`preparing GPT Messages from prompt:${promptMsg} profile:${profile} model:${model}`)
    const formattedPrompt = await askGPTMessage(message, promptMsg, profile, messageNum=10)
    logger.debug(`formattedPrompt: ${JSON.stringify(formattedPrompt)}`)
    logger.debug(`profile: ${JSON.stringify(profile)}`)
    logger.info(`askGPT input: Asking ${profile} profile ${model}: ${promptMsg}`)
    // return await message.reply(`Please use \`/ask [prompt]\` instead`)
    var response = await askGPT(formattedPrompt, profile, model);
    logger.info(`askGPT output: ${response.content}`)
    logger.debug(`raw output: ${JSON.stringify(response)}`)
    var responseObj = {}
    while (response.role == "function") {
      logger.info(`running function ${response.name}..`)
      responseObj = JSON.parse(response.content)
      let functionReturnObj = {}
      if (response.name == "get_user_info") {
        functionReturnObj = await getUserInfo(message) 
        formattedPrompt.push(functionReturnObj)
      }
      if (response.name == "create_embed") {
        functionReturnObj = await createEmbed(responseObj.embed)
        formattedPrompt.push(functionReturnObj)
        logger.debug(`${response.name} return: ${JSON.stringify(functionReturnObj)}`)
        break // embeds count as message output
      }
      if (response.name == "create_role") {
        functionReturnObj = await createRole(responseObj.role, responseObj.userid, message)
        formattedPrompt.push(functionReturnObj)
      }
      if (response.name == "create_channel") {
        functionReturnObj = await createChannel(responseObj.channel, message)
        formattedPrompt.push(functionReturnObj)
      }
      if (response.name == "search_query") {
        functionReturnObj = await searchQuery(responseObj.query)
        formattedPrompt.push(functionReturnObj)
      }
      if (response.name == "read_page") {
        functionReturnObj = await readPage(responseObj.link)
        formattedPrompt.push(functionReturnObj)
      }
      if (response.name == "stock_search") {
        functionReturnObj = await stockSearch(responseObj.stock)
        formattedPrompt.push(functionReturnObj)
      }
      if (response.name == "get_current_time") {
        functionReturnObj = await getCurrentTime(responseObj.time)
        formattedPrompt.push(functionReturnObj)
      }
      if (response.name == "split_message") {
        functionReturnObj = await splitMessage(responseObj.message)
        formattedPrompt.push(functionReturnObj)
      }
      logger.debug(`${response.name} return: ${JSON.stringify(functionReturnObj)}`)
      logger.debug(`formattedPrompt: ${JSON.stringify(formattedPrompt)}`)
      logger.info(`askGPT input: Asking ${profile} profile ${model}: ${JSON.stringify(functionReturnObj)}`)
      var response = await askGPT(formattedPrompt, profile, model);
      logger.info(`askGPT output: ${response.content}`)
      logger.debug(`raw output: ${JSON.stringify(response)}`)
    }
    let messageObj = {
      content: response.content
    }
    if (responseObj.embed) {
      messageObj.embeds = [ responseObj.embed ]
      messageObj.content = ""
    }
    logger.debug(`sent message: ${JSON.stringify(messageObj)}`)
    // Function to write content to a text file
    const writeToFile = (content) => {
      fs.writeFileSync('output.txt', content);
    }

    // Check if the response content is longer than 2000 characters
    if (response.content.length > 2000) {
      // Write the content to a text file
      writeToFile(response.content);
      messageObj.files = ["output.txt"]
      messageObj.content = ""
    }
    try {
      await message.reply(messageObj);
    } catch (error) {
      await message.reply(`Unexpected error ocurred:\n\`\`\`${error}\`\`\``)      
    }
  }
}
