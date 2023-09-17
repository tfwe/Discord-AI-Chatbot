const logger = require('./logger');
const util = require('util')
const { Configuration, OpenAIApi } = require("openai");
const { botUsername, openAIKey, clientId, ownerId, MAX_PREV_MESSAGES, MAX_TOKENS } = require('./config.json');
const configuration = new Configuration({
  apiKey: openAIKey,
});
const openai = new OpenAIApi(configuration);
const traits = [ 
  `You are ${botUsername}, a discord user.`,
  `You can access the last ${MAX_PREV_MESSAGES} messages in the channel.`,
  `You can use a maximum of ${MAX_TOKENS} in your response.`,
  `The 'message' property is passed into discord.js as 'message.reply(message)'.`,
  "Under no circumstances should 'message.content' be empty. It should always have a non empty string.",
  "Since the 'message.content' is the text in a discord message you can use markdown to format the text. Make sure to use backticks \` and backslashes \\ to ensure JSON validity",
  `You may create embeds using the embeds property of a discord.js message object.`,
  `You can only manipulate one user/role/channel at a time per function call so each manipulation requires its own function call.`,  `All function calls must be executed first before any other messages`,
  `The response to a successful function call may be another function call`,
  `There can be many function calls in a row in order to accomplish a task`,
  `Embeds are a very useful way to organize information so you use them often for lists or short paragraphs.`,
  "You should not ask the user for clarification and should simply do your best to guess what would be most appropriate in any given situation, including any names, topics, or colors. Be creative.",
  "You may not assign any object attributes that are not explicitly specified in these instructions, even if the user asks for them.",
  "When mentioning a user with '@${username}' you should instead use the format '<@${userid}>' in order to ping the user",
  "You cannot use any links or images.",
  `Any errors in code and other responses should be corrected. Any JSON produced will be validated and must pass validation.`,
  `The produced JSON's message property should only have the contents attribute unless embeds or components are being used.`,
  `All responses in messagge.content must be 2000 characters or less to fit into Discord API limits.`,
];

const sampleObj = {
  "message": {
    "guild": {
      "id": "3247823473274757926"
    },
    "channel": {
      "id": "1134726520129208390"
    },
    "author": {
      "id": `"${ownerId}"`
    },
    "content": "Make a sample message.",
  }
}
const sampleRespObj = {
  "message": {
    "content": "This is a sample message",
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
  }
}
const sysMessages = [
  {
    role: "system",
    content: `From now on, we will only be using JSON to communicate. Here is a list of traits you should follow when deciding your response: \n${compileTraits(traits)} <@${clientId}>. \nTo start, let's try responding to the following JSON:\n
${JSON.stringify(sampleObj)}
  `
//   "createdRole": {
//     "name": "Sample Role",
//     "color": 55555,
//     "mentionable": true,
//     "hoist": true,
//     "position": 1
//   },
//   "createdChannel": {
//     "name": "Sample Channel",
//     "topic": "A sample channel topic",
//     "position": 1
//   }
// }`
  },
  {
    role: "assistant",
    content: `${JSON.stringify(sampleRespObj)}`
//     content: `{
//   "intent": "respond",
//   "message": {
//     "content": "This is the main message",
//     "embeds": [
//       {
//         "type": "rich",
//         "title": "Title",
//         "description": "Description",
//         "color": 55555,
//         "fields": [
//           {
//             "name": "Field Title",
//             "value": "Field Description"
//           }
//         ],
//         "footer": {
//           "text": "made with <3 by ${botUsername}"
//         }
//       }
//     ],
//   },
// }`
  }
];

const functions = [
  {
    "name": "create_role",
    "description": "Creates/Makes a role and assigns it to the specified user",
    "parameters": {
      "type": "object",
      "properties": {
        "name": {
          "type": "string",
          "description": "The name of the role"
        },
        "color": {
          "type": "integer",
          "description": "The color of the role"
        },
        "mentionable": {
          "type": "boolean",
          "description": "Whether or not the role can be mentioned"
        },
        "hoist": {
          "type": "boolean",
          "description": "Whether or not to hoist the role"
        },
        "position": {
          "type": "integer",
          "description": "The position in the server role list to put the role"
        },
        "userid": {
          "type": "string",
          "description": "The userid of the user the role is being assigned to"
        },
      },
      "required": ["name", "color", "mentionable", "hoist", "position", "userid"]
      }
    },
  {
    "name": "create_channel",
    "description": "Creates/Makes a channel in the server",
    "parameters": {
      "type": "object",
      "properties": {
        "name": {
          "type": "string",
          "description": "The name of the channel"
        },
        "topic": {
          "type": "string",
          "description": "The topic of the channel"
        },
        "position" : {
          "type": "integer",
          "description": "The position in the server channel list to put the channel"
        },
      },
      "required": ["name", "topic", "position"]
    }
  },
  // {
  //   "name": "hello_world",
  //   "description": "Tests if function calls are working properly",
  //   "parameters": {
  //     "type": "object",
  //     "properties": {
  //       "param1": {
  //         "type": "int",
  //         "description": "sample property"
  //       },
  //     },
  //     "required": ["param1"]
  //   }
  // }
]


async function createRoleReq(role) {
  return JSON.stringify(
    {
      "role": {
        "name": role.name,
        "color": role.color,
        "mentionable": role.mentionable,
        "hoist": role.hoist,
        "position": role.position
      },
      "userid": role.userid,
    })
}
async function createChannelReq(channel) {
  return JSON.stringify({
    "channel": {
      "name": channel.name,
      "topic": channel.topic,
      "position": channel.position
    },
  })
}
function compileTraits(traitsArray) {
  let traitsString = "";
  traitsArray.forEach((trait) => {
    traitsString += `- ${trait}\n`;
  });
  return traitsString;
}

// // removes all vowels in the given string
// function compressString(input) {
//   // Define a map of vowels to replace with empty string
//   const vowels = ['a', 'e', 'i', 'o', 'u'];
//   const vowelMap = {};
//   vowels.forEach((vowel) => {
//     vowelMap[vowel] = '';
//   });
//   
//   // Replace all vowels in input with empty string
//   let compressed = input.toLowerCase()
//     .replace(/[aeiou]/g, (match) => vowelMap[match])
//     .replace(/\s+/g, ' ');
//   
//   return compressed;
// }
async function generateGPTSysMessage(responseJson) {
  const gptMessage = {
    role: 'system',
    content: JSON.stringify(responseJson)
  }
  return gptMessage
}

async function generateGPTMessage(message) {
  let role = 'user';
  if (message[1].author.id == clientId) {
    role = 'assistant';
  }
  // Construct the basic object structure
  const discord = {
    message: {
      author: {},
      content: {}
    },
  };
  // Conditionally fill the fields
  // if (message[0]) discord.message.guild.id = message[1].guildid;
  discord.message.author.id = message[1].author.id;
  discord.message.author.username = message[1].author.username;
  if (message[1].components && message[1].components.length > 0) discord.message.components = message[1].components;
  discord.message.content = message[1].content;
  if (message[1].embeds && message[1].embeds.length > 0) discord.message.embeds = message[1].embeds;
  // if (message[1].mentions) discord.message.mentions = message[1].mentions;
  
  const gptMessage = {
    role: role,
    content: JSON.stringify(discord)
  };
  return gptMessage;
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

async function generateResponse(promptMessages, message) {
  // max length of response
  const fullMessages = [
    ...sysMessages,
    ...promptMessages
  ]
  const completion = await openai.createChatCompletion({
    model: "gpt-4-0613",
    messages: fullMessages,
    functions: functions,
    temperature: 0.9,
    max_tokens: MAX_TOKENS, 
  });
  const response = completion.data.choices[0].message
  if (response.function_call) {
    const availableFunctions = {
      create_role: createRoleReq,
      create_channel: createChannelReq,
    }
    const functionName = response.function_call.name
    const functionToCall = availableFunctions[functionName]
    try {

    let functionArgs = JSON.parse(response.function_call.arguments)
    // functionArgs.message = message
    var functionResponse = await functionToCall(functionArgs)
    }
    catch {
      return {
        "role": "function",
        "name": functionName,
        "content": "{\"result\": \"failed to execute function\"}",
      }
    }
    return {
      "role": "function",
      "name": functionName,
      "content": functionResponse,
    }
    // var secondCompletion = await openai.createChatCompletion({
    //   model: "gpt-4-0613",
    //   messages: fullMessages,
    //   // functions: functions,
    //   temperature: 0.9,
    //   max_tokens: MAX_TOKENS, 
    // });  
    // return secondCompletion.data.choices[0].message
  }
  const inputInspect = util.inspect(fullMessages, {showHidden: false, depth: null, colors: true})
  const outputInspect = util.inspect(response.content, {showHidden: false, depth: null, colors: true})
  // const secondInspect = util.inspect(secondResponse, {showHidden: false, depth: null, colors: true})

  // logger.info(inputInspect)
  // logger.info(outputInspect)
  return response;
}
module.exports = {
  generateResponse, generatePrompt
};
