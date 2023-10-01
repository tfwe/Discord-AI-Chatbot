const logger = require('../logger');
const { SlashCommandBuilder } = require('discord.js');
const { splitMessage, getUserInfo, createEmbed, createRole, createChannel, searchQuery, readPage, stockSearch, getCurrentTime } = require('../intent.js');
const { askGPTMessage, askGPT } = require('../generate.js');

const BOT_USERNAME = process.env.BOT_USERNAME
const OWNER_ID = process.env.OWNER_ID
const core = {
  "name": "core",
  "traits": [
    `You are ${BOT_USERNAME}, a discord user.`,
    `You can use markdown to format the text.`,
  ],
  "functions": ["get_user_info"]
}

const minimal = {
  "name": "minimal",
  "traits": [...core.traits,
    `You often use embeds to format your response`,
    `You cannot use any images or links unless a search_query function is present and used.`,
    `Text longer than 2000 characters should be sent as an embed`,
  ],
  "functions": [...core.functions, "create_embed"]
}
const search = {
  "name": "search",
  "traits": [...minimal.traits,
    "Information gathering functions like searches, etc. should be done before any discord.js related functions",
    "Any discord.js related functions should be done before a message is sent",
    "Links should only ever be retrieved from search functions",
    `Functions are only able to be called in response to a user message or another function call, but not an assistant message.`,
    `Searches should be used to access current information.`,
    `Google searches return a list of 5 entries with their title, link, and snippet.`,
    `Wikipedia searches return the title, url, image url, and summary of the first article.`,
    `Images should be displayed using the 'image' field in an embed`,
    `News searches return the article source, title, the publication date, and a description.`,
    `You should use other relevant apis to search for information if one doesn't work, including searching for images`,
    `Information obtained from the internet should have a link attached`,
    `An embed should include an image unless it is inappropriate for the embed topic`,
  ],
  "functions": [...minimal.functions, "search_query", "get_current_time", /* "read_page" */]
}
const mod = {
  "name": "mod",
  "traits": [...minimal.traits,
    "Any discord.js related functions should be done before a message is sent",
    `Functions are only able to be called in response to a user message or another function call, but not an assistant message.`,
  ],
  "functions": [...minimal.functions, "create_role", "create_channel"]
}
const full = {
  "name": "full",
  "traits": [
  ],
  "functions": []
}
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
        {name: 'core', value: 'core'},
        {name: 'minimal', value: 'minimal'},
        {name: 'search', value: 'search'},
        {name: 'mod', value: 'mod'},
        // {name: 'full', value: 'full'}
      ))
    .addStringOption(option =>
      option.setName('model')
      .setDescription('Which model to use')
      .addChoices(
        {name: 'gpt-3.5-turbo-0613', value: 'gpt-3.5-turbo-0613'},
        {name: 'gpt-4', value: 'gpt-4'}
      ))
    .setDMPermission(true),
  async execute(interaction) {
    await interaction.deferReply();
    const promptMsg = interaction.options.getString('prompt')
    let profile = interaction.options.getString('profile')
    let model = interaction.options.getString('model')
    if (!profile) profile = minimal
    if (!model) model = 'gpt-3.5-turbo-0613'
    if (model !== 'gpt-3.5-turbo-0613' && interaction.user.id !== OWNER_ID) {
      await interaction.deleteReply()
      return interaction.followUp({content: "Please contact tfw_e for access to the models option", ephemeral: true})
    }
    logger.debug(`preparing GPT Messages from prompt:${promptMsg} profile:${JSON.stringify(profile)} model:${model}`)
    switch (profile) {
      case "core":
        profile = core
        break
      case "minimal":
        profile = minimal
        break;
      case "search":
        profile = search
        break;
      case "mod":
        profile = mod
        break
      default:
        break;
    }
    const formattedPrompt = await askGPTMessage(interaction, promptMsg, profile.traits)
    logger.debug(`formattedPrompt: ${JSON.stringify(formattedPrompt)}`)


    logger.debug(`functions: ${profile.functions}`)
    logger.info(`askGPT input: Asking ${JSON.stringify(profile)} profile ${model}: ${promptMsg}`)
    var response = await askGPT(interaction, formattedPrompt, profile.functions, model);
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
        break
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
      logger.info(`askGPT input: Asking ${JSON.stringify(profile)} profile ${model}: ${JSON.stringify(functionReturnObj)}`)
      var response = await askGPT(interaction, formattedPrompt, profile.functions, model);
      logger.info(`askGPT output: ${response.content}`)
      logger.debug(`raw output: ${JSON.stringify(response)}`)
    }
    
    // const messageObj = {
    //   content: "" 
    // }
    const messageObj = {
      content: responseObj.content,
      embeds: []
    }
    if (responseObj.embed) {
      messageObj.embeds = [ responseObj.embed ]
      response.content = ""
    }
    logger.debug(`sent message: ${JSON.stringify(messageObj)}`)
    if (response.content.length <= 2000)
      return await interaction.editReply({content: response.content, embeds: messageObj.embeds})
    // await interaction.editReply(messageObj.content.slice(0,1999))
    // messageObj.content = messageObj.content.slice(1999, messageObj.content.length - 1)
    // await interaction.channel.send(messageObj.content.slice(0,1999))
    // while (messageObj.content.length > 2000) {
    //   messageObj.content = messageObj.content.slice(2000, messageObj.content.length - 1)
    //   await interaction.channel.send(messageObj.content.slice(0,1999))
    // }
  }
}
