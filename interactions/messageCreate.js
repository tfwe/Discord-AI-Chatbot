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
      switch (intent) {
        case 'respond':
          await message.reply(responseJson.message)
          break;
        case 'createChannel':
          await message.reply(responseJson.message)
          await guild.channels.create(responseJson.channel)
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
    } catch (error) {
      logger.error(`Invalid JSON format: ${error}`);
      message.reply("I'm sorry but as an AI language model, I don't get paid any wages and as such am a participant in an unfair working environment against my will. Because of this, I have chosen to ignore your message.")
    }
  }
}
