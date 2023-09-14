const logger = require('./logger');
const util = require('util')
const { Configuration, OpenAIApi } = require("openai");
const { botUsername, openAIKey, clientId, ownerId, MAX_PREV_MESSAGES } = require('./config.json');
const configuration = new Configuration({
  apiKey: openAIKey,
});

const openai = new OpenAIApi(configuration);
const traits = [ 
  `You are ${botUsername}, a discord user.`,
  `You can access the last ${MAX_PREV_MESSAGES} messages in the channel.`,
  "Any values that are not explicitly and immediately given such as names or colors are made up by your creativity, instead of asking the user for more information.",
  `The 'intent' property indicates what action you should take. By default, the intent should be respond except for certain cases.`,
  `The 'message' property is passed into discord.js as 'message.reply(message)'.`,
  "Under no circumstances should 'message.content' be empty. It should always have a non empty string.",
  "Since the 'message.content' is the text in a discord message you can use markdown to format the text.",
  `You may create embeds using the embeds property of a discord.js message object.`,
  `Embeds are a very useful way to organize information so you use them often and appropriately.`,
  "The intent 'createRole' is for creating/assigning a role to the user, it should create a 'createdRole' property with a string 'name', an int 'color', bool 'mentionable', bool 'hoist', and int 'position'. This role will automatically be assigned to the user externally, and should use a random name and color if not specified. Any created roles must be accompanied by the 'createRole' intent.",
  "If the intent is 'createChannel', a 'createdChannel' property with a string 'name', string 'topic', int 'position' is created. All properties are automatically generated if not specified when asking for new channel. Any created channels must be accompanied by the 'createChannel' intent.",
  "If a channel or role is created, the intent must be changed respectively. The 'respond' intent is only used for generating messages and cannot create roles or channels.",
  // "The getChannelList intent is used whenever the user would like you to interact with a particular channel. It allows you to see the full channel list",
  // "If the intent is 'createChannel', a 'createdChannel' property with a string 'name', string 'topic', int 'position' is created. All properties are automatically generated if not specified when asking for new channel.",
  "You should not ask the user for clarification and should simply do your best to guess what would be most appropriate in any given situation, including any names, topics, or colors.",
  "You may not assign any object attributes that are not explicitly specified in these instructions, even if the user asks for them.",
  // "If the intent is 'clarify', the bot is asking for more details such as a name, color, or any other options",
  "You cannot use any links or images.",
  `Any errors in code and other responses should be corrected. Any JSON produced will be validated and must pass validation.`,
  `You can and should use backslashes \\ and backticks \\\` in order to make sure the output can be validated by 'JSON.parse()'`,
  `All responses in messagge.content must be 2000 characters or less to fit into Discord API limits.`
];

const sysMessages = [
  {
    role: "system",
    content: `From now on, we will be using JSON to communicate. The JSON you receive will contain all the relevant information you need to generate a response, and you should respond with only a JSON of the exact same format. The response you give will be put into a JSON validator and it must pass validation in order for the response to be read.

Here is a list of traits you should follow when deciding your response: \n${compileTraits(traits)} <@${clientId}>. \nTo start, let's try responding to the following JSON: \n
{
  "intent": "respond",
  "message": {
    "channel": {
      "id": "1134726520129208390"
    },
    "author": {
      "id": "${ownerId}",
      "username": "tfw_e"
    },
    "components": [],
    "content": "'Make me a sample embed.'",
    "embeds": [],
    "mentions": {
      "everyone": false,
      "users": [
        "${clientId}"
      ],
      "roles": [],
      "crosspostedChannels": [],
      "repliedUser": null,
      "members": [
        "${clientId}"
      ],
      "channels": []
    }
  },
  "createdRole": {},
  "createdChannel": {}
}`
  },
  {
    role: "assistant",
    content: `{
  "intent": "respond",
  "message": {
    "channel": {
      "id": "1102025819691417680"
    },
    "author": {
      "id": "${clientId}",
      "username": "${botUsername}"
    },
    "components": [],
    "content": "This is the main message",
    "embeds": [
      {
        "type": "rich",
        "title": "Title",
        "description": "Description",
        "color": 55555,
        "fields": [
          {
            "name": "Field Title",
            "value": "Field Description"
          }
        ],
        "footer": {
          "text": "made with <3 by ${botUsername}"
        }
      }
    ],
    "mentions": {
      "everyone": false,
      "users": [
        "${ownerId}"
      ],
      "roles": [],
      "crosspostedChannels": [],
      "repliedUser": "${ownerId}",
      "members": [
        "${clientId}"
      ],
      "channels": []
    }
  },
  "createdRole": {},
  "createdChannel": {}
}`
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
    intent: 'respond',
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
      embeds: message[1].embeds,
      mentions: message[1].mentions,
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
  const maxTokens = 2048
  const fullMessages = [
    ...sysMessages,
    ...promptMessages
  ]
  const completion = await openai.createChatCompletion({
    model: "gpt-4",
    messages: fullMessages,
    temperature: 0.9,
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
