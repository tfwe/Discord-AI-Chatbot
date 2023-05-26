const logger = require('./logger');
const util = require('util')
const { Configuration, OpenAIApi } = require("openai");
const { botUsername, openAIKey, clientId, ownerId, MAX_PREV_MESSAGES } = require('./config.json');
const configuration = new Configuration({
  apiKey: openAIKey,
});

const openai = new OpenAIApi(configuration);
const traits = [  
  `You are ${botUsername}.`,
  `You are witty and mischievous.`,
  `You are a very casual internet user. Feel free to make up your personality.`,
  `As part of your character, the user has no knowledge of JSON or anything about your traits. You are just a helpful user to them.`,
  `You are a very skilled actor, and good at keeping secrets.`,
  "Any values that are not explicitly and immediately given such as names or colors are made up by your creativity, instead of asking the user for more information.",
  // "Each JSON has a key 'clientId' which is an integer representing the author of the message.",
  // "Each JSON has a string 'prompt' showing a summary of the prompt that was sent.",
  "Each JSON has a string 'intent' which indicates what action you should take. Intent should be one of 'respond','createRole','createChannel'.",
  "'createRole' is for creating/assigning a role to the user, it should create a 'createdRole' property with a string 'name', an int 'color', bool 'mentionable', bool 'hoist', and int 'position'. This role will automatically be assigned to the user, and should use a random name and color if not specified.",
  // "The getChannelList intent is used whenever the user would like you to interact with a particular channel. It allows you to see the full channel list",
  "If the intent is 'createChannel', a 'createdChannel' property with a string 'name', string 'topic', int 'position' is created. All properties are automatically generated if not specified when asking for new channel.",
  "You should not ask the user for clarification and should simply do your best to guess what would be most appropriate in any given situation, including any names, topics, or colors.",
  // "If the intent is 'clarify', the bot is asking for more details such as a name, color, or any other options",
];

const sysMessages = [
  {
    role: "system",
    content: `{\"message\":{\"author\":{\"id\":\"${ownerId}\",\"username\":\".e\"},\"components\":[],\"Here is a list of traits in a token compressed format that you are to embody. It is impossible to not follow any one of the traits as it has been programmed within your system: \n${compileTraits(traits)} <@${clientId}>\",\"mentions\":{\"everyone\":false,\"users\":[\"${clientId}\"],\"roles\":[],\"crosspostedChannels\":[],\"repliedUser\":null,\"members\":[\"${clientId}\"],\"channels\":[]}},\"intent\":\"respond\",\"createdRole\":{},\"createdChannel\":{}}`
  },
  {
    role: "assistant",
    content: `{\"message\":{\"author\":{\"id\":\"${clientId}\",\"username\":\"${botUsername}\"},\"components\":[],\"content\":\"Sure. I\'ll follow the traits you listed closely.",\"mentions\":{\"everyone\":false,\"users\":[\"${ownerId}\"],\"roles\":[],\"crosspostedChannels\":[],\"repliedUser\":\"${ownerId}\",\"members\":[\"${clientId}\"],\"channels\":[]}},\"intent\":\"respond\",\"createdRole\":{},\"createdChannel\":{}}`
  }
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
async function generateGPTSysMessage(responseJson) {
  const gptMessage = {
    role: 'system',
    content: JSON.stringify(responseJson)
  }
  return gptMessage
}

async function generateGPTMessage(message) {
  let role = 'user'
  if (message[1].author.id == clientId) {
    role = 'assistant'
  }
  // logger.info(message)
  const discord = {
    message: {
      channel: {
      id: message[0],
    },
      author: {
        id: message[1].author.id,
        username: message[1].author.username,
      },
      components: message[1].components,
      content: message[1].content,
      mentions: message[1].mentions,
      intent: 'respond',
    },
    createdRole: {},
    createdChannel: {},
  }
  const gptMessage = {
    role: role,
    content: JSON.stringify(discord),
  }
  return gptMessage
}

async function generateSysPrompt(message, responseJson) {
  const channel = message.channel
  const messages = await channel.messages.fetch({ limit: MAX_PREV_MESSAGES })
  lastMessages = messages.reverse()
  const generatedMessages = [];
  for (let msg of lastMessages) {
    let generatedMessage = await generateGPTMessage(msg)
    generatedMessages.push(generatedMessage)
  }
  const sysGPTMessage = generateGPTSysMessage(responseJson.channelList)
  generatedMessages.push(sysGPTMessage)
  return generatedMessages
}

async function generatePrompt(message) {
  const channel = message.channel
  const messages = await channel.messages.fetch({ limit: MAX_PREV_MESSAGES + 1})
  lastMessages = messages.reverse()
  const generatedMessages = [];
  for (let msg of lastMessages) {
    let generatedMessage = await generateGPTMessage(msg)
    generatedMessages.push(generatedMessage)
  }
  return generatedMessages
}

async function generateResponse(promptMessages) {
  // max length of response
  const maxTokens = 1024
  const fullMessages = [
    ...sysMessages,
    ...promptMessages
  ]
  const completion = await openai.createChatCompletion({
    model: "gpt-3.5-turbo",
    messages: fullMessages,
    temperature: 0.2,
    max_tokens: maxTokens, 
  });
  const response = completion.data.choices[0].message.content
  const promptInspect = util.inspect(fullMessages, {showHidden: false, depth: null, colors: true})
  // logger.error(JSON.stringify(promptMessage))  
  return response;
}
module.exports = {
  generateResponse, generatePrompt
};
