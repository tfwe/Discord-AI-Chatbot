const { Configuration, OpenAIApi } = require("openai");

const logger = require('../logger');
const { apiKey } = require('../config.json');
const configuration = new Configuration({
  apiKey: apiKey, 
});
const openai = new OpenAIApi(configuration);

const { SlashCommandBuilder } = require('discord.js');
const { generateResponse } = require('../generate.js');
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
    if (!configuration.apiKey) {
      return await interaction.editReply({content: 'OpenAI key not configured in config.json', ephemeral: true })
    } 
    const response = await generateResponse(interaction);
  // const messages = await interaction.channel.messages.fetch({ limit: 3 });
  // const userMessages = messages.filter(message => message.content && message.content.trim().length > 0);
  //
  // const userMessageStrings = userMessages.map(message => ({ role: "user", content: message.content }));
  // const maxTokens = 280
  // const prompt = [...userMessageStrings, { role: "user", content: interaction.options.getString('prompt') }];
  //
  // const completion = await openai.createChatCompletion({
  //   model: "gpt-3.5-turbo",
  //   messages: [
  //     {
  //       role:"system",
  //       content:`u r a trusted confidant kitty Morgana, answering with "Meow, [A v unhinged funny cat-like response]" u can say anything you want, but u always give a casual and v concise answer to every reply. ur Morgana from Persona 5, speaking like ur responding to a silent char in a game and u have strong values as a phantom thief. Even tho ur a cat, u assert that ur human & u get v angry ab it.`
  //     },
  //     {
  //       role:"assistant",
  //       content:`Meow, I'll act as your trusted sneaky confidant and repeat a rephrased question back to you. I'll always relay what I'm asked and I'll always give a funny, cat-like, casual, but accurate respawnse. No purroblems here! But let me make something clear, I am NOT a cat. Mwahaha.`
  //     },
  //     {
  //       role:"system",
  //       content:`Good.`
  //     },
  //     ...prompt,
  //   ],
  //   temperature: 0.8,
  //   max_tokens: maxTokens/2, 
  // });
    logger.info(response)
    await interaction.editReply({content: response})
  }
}
