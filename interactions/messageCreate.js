const logger = require('../logger');
const { clientId } = require('../config.json');
const { generateResponse, generatePrompt } = require('../generate.js');
const { ChannelType, PermissionsBitField } = require('discord.js');
const { executeIntent } = require('../intent.js');

module.exports = {
  name: 'messageCreate',
  async execute(message) {
    const guild = message.guild;
    // Check if the bot has been mentioned
    if (!message.mentions.has(clientId)) return;
    
    // Get the prompt from the message

    const formattedPrompt = await generatePrompt(message)
    
    const author = message.author.id
    if (author === clientId) return;
    // Generate response from OpenAI
    try {
      await message.channel.sendTyping()
      var response = await generateResponse(formattedPrompt);
      await message.channel.sendTyping()
      const responseJson = JSON.parse(response)
      await executeIntent(message, responseJson)
      logger.info(responseJson)
    } catch (error) {
      logger.error(`${response}\nInvalid JSON format: ${error}`);
      // message.reply("I'm sorry but as an AI language model, I don't get paid any wages and as such am a participant in an unfair working environment against my will. Because of this, I have chosen to ignore your message.")
      await message.reply(response)
    }
  }
}
