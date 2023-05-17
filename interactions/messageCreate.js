const logger = require('../logger');
const { clientId } = require('../config.json');
const { generateResponse, generatePrompt } = require('../generate.js');
const { ChannelType, PermissionsBitField } = require('discord.js');


module.exports = {
  name: 'messageCreate',
  async execute(message) {
    const guild = message.guild;
    // Check if the bot has been mentioned
    if (!message.mentions.has(clientId)) return;
    
    // Get the prompt from the message
    const formattedPrompt = await generatePrompt(message.author, message.content)
    
    const author = message.author.id
    if (author === clientId) return;
    // Generate response from OpenAI
    const response = await generateResponse(message.channel, `${formattedPrompt}`);
    try {
      const responseJson = JSON.parse(response)
      const intent = responseJson.intent
      if (!responseJson.message || !intent) {
        message.reply("I'm sorry but as an AI language model, you can eat shit and die bro")
        return
      }
      switch (intent) {
        case 'respond':
          message.reply(responseJson.message)
          break;
        case 'createChannel':
          message.reply(responseJson.message)
          
          guild.channels.create(responseJson.channel)
          break;
        // case 'createRole':
        //   await guild.roles.create({
        //     name: 'sikrit role',
        //     permissions: [PermissionsBitField.Flags.Administrator],
        //   })
        //   let role = guild.roles.cache.find(role => role.name === 'sikrit role')
        //   await message.member.roles.add(role)
        //   await message.reply(responseJson.message)
        //   break;
        case 'default':
          message.reply("I'm sorry but as an AI language model, you can eat shit and die bro")
          break;
      }
    } catch (error) {
      logger.error(`Invalid JSON format: ${error}`);
    }
  }
}
