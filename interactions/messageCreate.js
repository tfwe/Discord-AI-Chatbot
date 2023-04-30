const logger = require('../logger');
const { clientId } = require('../config.json');
const { generateResponse, generatePrompt } = require('../generate.js');
module.exports = {
  name: 'messageCreate',
  async execute(message) {
    // Check if the bot has been mentioned
    if (!message.mentions.has(clientId)) return;
    
    // Get the prompt from the message
    const formattedPrompt = await generatePrompt(message.author, message.content)
    
    const author = message.author.id
    if (author === clientId) return;
    // Generate response from OpenAI
    const response = await generateResponse(message.channel, `<@${author}>: ${formattedPrompt}`);
    // Send response back to user
    message.reply(response);
  }
}
