const logger = require('../logger');
const { MAX_PREV_MESSAGES } = require('../config.json');
const { askGPTMessage, askGPT } = require('../generate.js');
const { ChannelType, PermissionsBitField } = require('discord.js');
const { getUserInfo, createEmbed, createRole, createChannel, searchQuery, readPage, stockSearch, getCurrentTime } = require('../intent.js');
const { axios } = require('axios')
const CLIENT_ID = process.env.CLIENT_ID
const OWNER_ID = process.env.OWNER_ID
async function getReplyChain(message) {
  const replyChain = [];
  let currentMessage = message;

  while (currentMessage.reference && replyChain.length < 2) {
    replyChain.push({
      author: currentMessage.author,
      content: currentMessage.content
    })
    // const user = await message.guild.members.cache.find(member => member.id === userid)
    currentMessage = await currentMessage.channel.messages.fetch(currentMessage.reference.messageID)
    if (!currentMessage) break
  }
  return replyChain;
}
module.exports = {
  name: 'messageCreate',
  async execute(message) {
    const channel = message.channel
    // Check if the bot has been mentioned
    if (!message.mentions.has(CLIENT_ID)) return;
    await message.channel.sendTyping();
    const promptMsg = message.content
    let profile = "minimal"
    // let model = "gpt-3.5-turbo"
    let model = "gpt-3.5-turbo"
    if (message.author.id == OWNER_ID && message.content.includes("gpt-4")) {
      model = "gpt-4-turbo-preview"
    }
    let messageNum = 1
    logger.debug(`preparing GPT Messages from prompt:${promptMsg} profile:${profile} model:${model}`)
    const formattedPrompt = await askGPTMessage(message, promptMsg, profile, messageNum)
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
    let messageObj = {}
    if (responseObj.embed) {
      messageObj.embeds = [ responseObj.embed ]
      response.content = ""
    }
    logger.debug(`sent message: ${JSON.stringify(messageObj)}`)
    if (response.content.length <= 2000)
      return await message.reply({content: response.content, embeds: messageObj.embeds})
    await message.reply(response.content.slice(0,2000))
    response.content = response.content.slice(2000, response.content.length - 1)
    await message.channel.send(response.content.slice(0,2000))
    while (response.content.length > 2000) {
      response.content = response.content.slice(2000, response.content.length - 1)
      await message.channel.send(response.content.slice(0,2000))
    }
  }
}
