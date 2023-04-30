
const logger = require('../logger');


const { SlashCommandBuilder } = require('discord.js');
const { generateResponse, generatePrompt } = require('../generate.js');
module.exports = {
  data: new SlashCommandBuilder()
    .setName('ask')
    .setDescription('Asks Morgana a question')
    .addStringOption(option => 
      option.setName('prompt')
      .setDescription('Enter a question')
      .setRequired(true)),
  async execute(interaction) {
    await interaction.deferReply();
    const formattedPrompt = await generatePrompt(interaction.user, interaction.options.getString('prompt'))
    logger.info(interaction.user)
    const response = await generateResponse(interaction.channel, formattedPrompt);
    await interaction.editReply({content: response})
  }
}
