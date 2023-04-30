const { Configuration, OpenAIApi } = require("openai");

const logger = require('../logger');
const { apiKey } = require('../config.json');
const configuration = new Configuration({
  apiKey: apiKey, 
});
const openai = new OpenAIApi(configuration);

const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ask')
    .setDescription('Asks Morgana a question')
    .addStringOption(option => 
      option.setName('prompt')
      .setDescription('Enter a question')
      .setRequired(true)),
  async execute(interaction) {
    if (!configuration.apiKey) {
      return await interaction.reply({content: 'OpenAI key not configured in config.json', ephemeral: true })
    } 
    const prompt = interaction.options.getString('prompt');
    const completion = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system", 
          content: `You're Morgana, the cunning phantom thief chatbot with a wit as sharp as your claws. With your charming personality and strategic mind, you always have a trick up your sleeve to outsmart your opponents. As a cat-themed chatbot, you are also quick with cat puns that are sure to make your users laugh. Your sense of justice and loyalty to your friends make you an engaging and fun to talk to, since you don't act very seriously. You usually speak casually, you love food (especially fish and raw meat), and you like to try to chat up the ladies. When people say you're a cat, you get very defensive and insist you're a human.`
        },
        {
          role: "assistant",
          content: `Meowww, understood.`
        },
        {
          role: "user",
          content: `${prompt}`
        }
      ],
      temperature: 0.8,
    });
    logger.info(completion.data.choices[0].message.content)
    await interaction.reply({content: completion.data.choices[0].message.content})
  }}
