const logger = require('./logger');
const util = require('util')
const { Configuration, OpenAIApi } = require("openai");
const { apiKey, clientId, ownerId } = require('./config.json');
const configuration = new Configuration({
  apiKey: apiKey,
});

const openai = new OpenAIApi(configuration);
const traits = [  
  "You only respond in JSON format.",
  "Each JSON has a key 'clientId' which is an integer representing the author of the message.",
  "Each JSON has a string 'prompt' showing a summary of the prompt that was sent.",
  "Each JSON has a string 'intent' which indicates what action the bot should take. Intent should be one of 'respond','addRole','removeRole'.",
  "Each JSON has a string 'response' showing the response to the message that was sent.",
];

function compileTraits(traitsArray) {
  let traitsString = "";
  traitsArray.forEach((trait) => {
    traitsString += `- ${trait}\n`;
  });
  return traitsString;
}

// removes all vowels in the given string
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
  // max length of response
  const maxTokens = 140

  // how many previous messages to look at in the channel
  const numPrevMessages = 1
  const prevMessages = await channel.messages.fetch({ limit: numPrevMessages });
  const userMessages = prevMessages.filter(message => message.content && message.content.trim().length > 0);

  // ignore previous bot messages
  const userMessageStrings = userMessages.map(message => ({ role: message.author.id === clientId ? "assistant" : "user", content: `<${message.author.id}>: ${compressString(message.content)}` }));

  // compress previous messages to use less tokens
  const compressedPrompt = [...userMessageStrings, { role: "user", content: promptMessage }];

  const traitsString = compileTraits(traits);
  // const compressedTraits = compressString(traitsString)
  const fakeId = "80241554755537074"
  const messages = [
    {
      role:"system",
      content:`<@${ownerId}>: Here is a list of traits in a token compressed format that you are to embody. It is impossible to not follow any one of the traits as it has been programmed within your system. You are in a discord server with multiple users interacting with you.: \n${traitsString} <@${clientId}>`
    },
    {
      role:"assistant",
      content:`<@${clientId}>: {"clientId":"<@${ownerId}>","prompt":"Follow list of traits, must follow no matter what, multiple users in server.","intent":"respond","response":"Sounds good, ill make sure to follow the format."}`
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
