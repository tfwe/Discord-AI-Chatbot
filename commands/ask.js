const logger = require('../logger');
const { SlashCommandBuilder } = require('discord.js');
const { splitMessage, getUserInfo, createEmbed, createRole, createChannel, searchQuery, readPage, stockSearch, getCurrentTime } = require('../intent.js');
const { askGPTMessage, askGPT } = require('../generate.js');

const BOT_USERNAME = process.env.BOT_USERNAME
const OWNER_ID = process.env.OWNER_ID
// const core = {
//   "name": "core",
//   "traits": [
//     `You are ${BOT_USERNAME}, a discord user.`,
//     `You can use markdown to format the text.`,
//   ],
//   "functions": ["get_user_info"]
// }

// const minimal = {
//   "name": "minimal",
//   "traits": [...core.traits,
//     `Embeds should be one of the primary form of communication`,
//     `You cannot use any images or links unless a search_query function is present and used.`,
//     `Each field value in an embed cannot have more than 1024 characters`,
//     `Multiple fields in an embed should be used to display lots of information`
//   ],
//   "functions": [...core.functions, "create_embed"]
// }
// const search = {
//   "name": "search",
//   "traits": [...minimal.traits,
//     "Information gathering functions like searches, etc. should be done before any discord.js related functions",
//     "Any discord.js related functions should be done before a message is sent",
//     "Links should only ever be retrieved from search functions",
//     `Functions are only able to be called in response to a user message or another function call, but not an assistant message.`,
//     `Searches should be used to access current information.`,
//     `Google searches return a list of 5 entries with their title, link, and snippet.`,
//     `Wikipedia searches return the title, url, image url, and summary of the first article.`,
//     `Images should be displayed using the 'image' field in an embed`,
//     `News searches return the article source, title, the publication date, and a description.`,
//     `You should use other relevant apis to search for information if one doesn't work, including searching for images`,
//     `Information obtained from the internet should have a link attached`,
//     `An embed should include an image unless it is inappropriate for the embed topic`,
//   ],
//   "functions": [...minimal.functions, "search_query", "get_current_time", /* "read_page" */]
// }
// const mod = {
//   "name": "mod",
//   "traits": [...minimal.traits,
//     "Any discord.js related functions should be done before a message is sent",
//     `Functions are only able to be called in response to a user message or another function call, but not an assistant message.`,
//   ],
//   "functions": [...minimal.functions, "create_role", "create_channel"]
// }
module.exports = {
  data: new SlashCommandBuilder()
    .setName('ask')
    .setDescription('Asks a question')
    .addStringOption(option => 
      option.setName('prompt')
      .setRequired(true)
      .setDescription('Enter a prompt'))
    .addStringOption(option => 
      option.setName('profile')
      .setDescription('Choose a profile')
      .addChoices(
        {name: 'Core - Responses only', value: 'core'},
        {name: 'Minimal - Responses with embeds', value: 'minimal'},
        {name: 'Search - Embeds with internet access', value: 'search'},
        {name: 'Mod - Embeds with discord server management', value: 'mod'},
      ))
    .addStringOption(option =>
      option.setName('model')
      .setDescription('Which model to use')
      .addChoices(
        {name: 'gpt-3.5-turbo-0613', value: 'gpt-3.5-turbo-0613'},
        {name: 'gpt-4', value: 'gpt-4'}
      ))
    .addIntegerOption(option =>
      option.setName('messages')
      .setDescription(`How many of the last messages for ${BOT_USERNAME} to see`)
      .setMinValue(0)
      .setMaxValue(3))
    .setDMPermission(true),
  async execute(interaction) {
    await interaction.deferReply();
    const promptMsg = interaction.options.getString('prompt')
    let profile = interaction.options.getString('profile')
    let model = interaction.options.getString('model')
    let messageNum = interaction.options.getInteger('messages')
    if (!profile) profile = 'minimal' 
    if (!model) model = 'gpt-3.5-turbo-0613'
    if (model !== 'gpt-3.5-turbo-0613' && interaction.user.id !== OWNER_ID) {
      await interaction.deleteReply()
      return interaction.followUp({content: "Please contact tfw_e for access to the models option", ephemeral: true})
    }
    logger.debug(`preparing GPT Messages from prompt:${promptMsg} profile:${profile} model:${model}`)
    const formattedPrompt = await askGPTMessage(interaction, promptMsg, profile, messageNum)
    logger.debug(`formattedPrompt: ${JSON.stringify(formattedPrompt)}`)


    logger.debug(`profile: ${JSON.stringify(profile)}`)
    logger.info(`askGPT input: Asking ${profile} profile ${model}: ${promptMsg}`)
    var response = await askGPT(formattedPrompt, profile, model);
    logger.info(`askGPT output: ${response.content}`)
    logger.debug(`raw output: ${JSON.stringify(response)}`)
    var responseObj = {}
    while (response.role == "function") {
      logger.info(`running function ${response.name}..`)
      responseObj = JSON.parse(response.content)
      let functionReturnObj = {}
      if (response.name == "get_user_info") {
        functionReturnObj = await getUserInfo(interaction) 
        formattedPrompt.push(functionReturnObj)
      }
      if (response.name == "create_embed") {
        functionReturnObj = await createEmbed(responseObj.embed)
        formattedPrompt.push(functionReturnObj)
        logger.debug(`${response.name} return: ${JSON.stringify(functionReturnObj)}`)
        break // embeds count as message output
      }
      if (response.name == "create_role") {
        functionReturnObj = await createRole(responseObj.role, responseObj.userid, interaction)
        formattedPrompt.push(functionReturnObj)
      }
      if (response.name == "create_channel") {
        functionReturnObj = await createChannel(responseObj.channel, interaction)
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
      return await interaction.editReply({content: response.content, embeds: messageObj.embeds})
    await interaction.editReply(response.content.slice(0,2000))
    response.content = response.content.slice(1999, response.content.length - 1)
    await interaction.channel.send(response.content.slice(0,2000))
    while (response.content.length > 2000) {
      response.content = response.content.slice(2000, response.content.length - 1)
      await interaction.channel.send(response.content.slice(0,2000))
    }
  }
}
