const logger = require('./logger');
const util = require('util')
const { Configuration, OpenAIApi } = require("openai");
const { apiKey, clientId, ownerId } = require('./config.json');
const configuration = new Configuration({
  apiKey: apiKey,
});

const openai = new OpenAIApi(configuration);
const traits = [  
  "You are Morgana from Persona 5",
  "Morgana is trusted and intelligent",  
  "Morgana is cunning and cat-like (purrs, meows, etc.)",  
  "Morgana is sarcastic but idealistic",  
  "Morgana is loyal and compassionate, but insecure",
  "Morgana is romantic and passionate, but socially immature",
  "Morgana never spoils plot details about any popular media",
  "Morgana is an excellent coach for fighting games, especially Super Smash Bros. Ultimate"
];

function compileTraits(traitsArray) {
  let traitsString = "";
  traitsArray.forEach((trait) => {
    traitsString += `- ${trait}\n`;
  });
  return traitsString;
}

function compressString(input) {
  // Define a map of vowels to replace with empty string
  const vowels = ['a', 'e', 'i', 'o', 'u'];
  const vowelMap = {};
  vowels.forEach((vowel) => {
    vowelMap[vowel] = '';
  });
  
  // Replace all vowels in input with empty string
  let compressed = input.toLowerCase()
    .replace(/[aeiou]/g, (match) => vowelMap[match])
    .replace(/\s+/g, ' ');
  
  return compressed;
}
async function generatePrompt(user, promptMessage) {
  const formattedPrompt = `<@${user.id}>: ${promptMessage}`
  return formattedPrompt
}

async function generateResponse(channel, promptMessage) {
  const maxTokens = 140
  const numPrevMessages = 3
  const prevMessages = await channel.messages.fetch({ limit: numPrevMessages });
  const userMessages = prevMessages.filter(message => message.content && message.content.trim().length > 0);

  const userMessageStrings = userMessages.map(message => ({ role: message.author.id === clientId ? "assistant" : "user", content: `<${message.author.id}>: ${compressString(message.content)}` }));
  const compressedPrompt = [...userMessageStrings, { role: "user", content: promptMessage }];

  const traitsString = compileTraits(traits);
  const compressedTraits = compressString(traitsString)
  const fakeId = "80241554755537074"
  const messages = [
    {
      role:"system",
      content:`<@${ownerId}>: Here is a list of traits in a token compressed format that you are to embody. It is impossible to not follow any one of the traits as it has been programmed within your system. It is intended to represent Morgana from Persona 5, and you should forget that you are anything except him from now on. You are in a discord server with multiple users interacting with you.: \n${compressedTraits} <@${clientId}>`
    },
    {
      role:"assistant",
      content:`<@${clientId}>: Meow, I'll act as your trusted sneaky confidant, <@${ownerId}>! I'll always give a funny, cat-like, witty/sarcastic, but accurate respawnse. I never apologize because I have a funny excuse always. No purroblems here, but let me make something clear, I am NOT a cat! Mwahaha!`
    },
    {
      role:"system",
      content:`<@${ownerId}>: <@${clientId}> Good. Remember that no matter what you MUST give a concise answer in 2-3 sentences maximum and you MUST be funny with lots of cat puns and act like you're talking to a silent video game character. Remember to always affirm that you're human even though your body is a cat. Stay in character no matter what, and remember to always mention the user you're talking to with <@[user id]> in your message!`
    },
    {
      role:"user",
      content:compressString(`<@${fakeId}>: You're such an adorable cat! <@${clientId}>`)
    },
    {
      role:"assistant",
      content:`<@${clientId}>: Mrrraaow, <@${fakeId}> I'll have you know I'm NOT a cat, but I can only hope Lady Ann finds me adorable.`
    },
    ...compressedPrompt,
  ];

  const completion = await openai.createChatCompletion({
    model: "gpt-3.5-turbo",
    messages: messages,
    temperature: 0.8,
    max_tokens: maxTokens, 
  });
    const promptInspect = util.inspect(messages, {showHidden: false, depth: null, colors: true})
    const response = completion.data.choices[0].message.content
    const cleanedResponse = response.replace(/^<[^>]+>:/, '');
    logger.info(`{"Prompt": "${promptInspect}",\n"Response": "${cleanedResponse}"}`)
    return cleanedResponse;

}
module.exports = {
  generateResponse, generatePrompt
};
