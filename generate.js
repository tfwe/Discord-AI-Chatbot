const logger = require('./logger');
const util = require('util')
const { Configuration, OpenAIApi } = require("openai");
const { MAX_PREV_MESSAGES, MAX_TOKENS } = require('./config.json');
const configuration = new Configuration({
  apiKey: process.env.OPENAI_KEY,
});
const openai = new OpenAIApi(configuration);
const OWNER_ID = process.env.OWNER_ID
const CLIENT_ID = process.env.CLIENT_ID
const BOT_USERNAME = process.env.BOT_USERNAME
const traits = [ 
  `You are ${BOT_USERNAME}, a discord user.`,
  `You can access the last ${MAX_PREV_MESSAGES} messages in the channel.`,
  `You can use markdown to format the text.`,
  "Information gathering functions like searches, etc. should be done before any discord.js related functions",
  "Any discord.js related functions should be done before a message is sent",
  "Links or images cannot be accessed without first searching",
  `Embeds are a very useful way to organize information so you use them often for lists or short paragraphs.`,
  // `Created embeds will automatically be attached to the message that you send`,
  `Embeds should often include an image`,
  `Only one image can be displayed at a time in an embed.`,
  `Functions are only able to be called in response to a user message or another function call, but not an assistant message.`,
  `Searches should be used to access current information.`,
  `Google searches return a list of 5 entries with their title, link, and snippet.`,
  `Wikipedia searches return the title, url, image url, and summary of the first article.`,
  // `You can use a search query to find a website link, followed by a read page function call to view the information on that page`,
  `Images should be displayed using the 'image' field in an embed`,
  `News searches return the article source, title, the publication date, and a description.`,
  `You should use other relevant apis to search for information if one doesn't work, including searching for images`,
  // `Stock searches return open/close price, max/min price, and trade volume all for specified period.`,
  // `Stock searches should always be preceded by getting the current date and time`,
  `Information obtained from the internet should have a reference with a link, including images or facts`,
  "When mentioning a user with '@${username}' you should instead use the format '<@${userid}>' in order to ping the user",
  `All responses in must be 2000 characters or less to fit into Discord API limits.`,
  `Multiple function calls can be made in a row before the response is sent to prepare the information to send.`
];

// const sampleObj = {
//   "message": {
//     "author": {
//       "id": `"${OWNER_ID}"`
//     },
//     "content": "Make a sample message.",
//   }
// }
// const sampleRespObj = {
//   "message": {
//     "content": "This is a sample message",
//   }
// }
const sysMessages = [
  {
    role: "system",
    content: `<@${CLIENT_ID}> 
    ${compileTraits(traits)}` 
  },
  // {
  //   role: "user",
  //   content: `Hi ${BOT_USERNAME} <@${CLIENT_ID}>, make a sample embed`
  // },
  // {
  //   "role": "function",
  //   "name": "create_embed",
  //   "content": "{\"success\":true,\"createdEmbed\":{\"title\":\"Sample Embed\",\"description\":\"This is a sample embed to demonstrate the use of embeds in Discord.\",\"color\":3092790,\"fields\":[{\"name\":\"Field 1\",\"value\":\"This is the value of Field 1.\"},{\"name\":\"Field 2\",\"value\":\"This is the value of Field 2.\"},{\"name\":\"Field 3\",\"value\":\"This is the value of Field 3.\"}],\"image\":{},\"footer\":{\"text\":\"Sample Embed\"}}}"
  // },
  // {
  //   role: "assistant",
  //   content: `Sure, here's a sample embed.`
  // },
];

const functions = [
  // {
  //   "name": "get_user_info",
  //   "description": "Get the username and userid of the user who sent the last message",
  //   "parameters": {
  //     "type": "object",
  //     "properties": {}
  //   }
  // },
  {
    "name": "create_embed",
    "description": "Creates discord.js embed message",
    "parameters": {
      "type": "object",
      "properties": {
        "content": {
          "type:": "string",
          "description": "The content property of the discord.js message",
        },
        "title": {
          "type": "string",
          "description": "The title of the embed (cannot use markdown)"
        },
        "description": {
          "type": "string",
          "description": "The embed's description"
        },
        "color": {
          "type": "integer",
          "description": "The color of the embed, default to 3092790"
        },
        "fields": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "name": {
                "type": "string",
                "description": "The name of the field"
              },
              "value": {
                "type": "string",
                "description": "The value of the field"
              }
            },
            "required": ["name", "value"]
          },
          "description": "Array of fields for the embed"
        },
        "image": {
          "type": "string",
          "description": "Link to image"
        },
        "url": {
          "type": "string",
          "description": "Attached URL for the embed"
        },
        "footer": {
          "type": "object",
          "properties": {
            "text": {
              "type": "string",
              "description": "The text for the footer (cannot use markdown)"
            }
          },
          "required": ["text"]
        },
      },
      "required": ["title", "description", "color", "fields"]
    }
  },
  // {
  //   "name": "create_role",
  //   "description": "Create a role and assigns it to the specified user",
  //   "parameters": {
  //     "type": "object",
  //     "properties": {
  //       "name": {
  //         "type": "string",
  //         "description": "The name of the role"
  //       },
  //       "color": {
  //         "type": "integer",
  //         "description": "The color of the role"
  //       },
  //       "mentionable": {
  //         "type": "boolean",
  //         "description": "Whether or not the role can be mentioned"
  //       },
  //       "hoist": {
  //         "type": "boolean",
  //         "description": "Whether or not to hoist the role"
  //       },
  //       "position": {
  //         "type": "integer",
  //         "description": "The position in the server role list to put the role"
  //       },
  //       "userid": {
  //         "type": "string",
  //         "description": "The userid of the user the role is being assigned to"
  //       },
  //     },
  //     "required": ["name", "color", "mentionable", "hoist", "position", "userid"]
  //     }
  //   },
  // {
  //   "name": "create_channel",
  //   "description": "Create a channel in the server",
  //   "parameters": {
  //     "type": "object",
  //     "properties": {
  //       "name": {
  //         "type": "string",
  //         "description": "The name of the channel"
  //       },
  //       "topic": {
  //         "type": "string",
  //         "description": "The topic of the channel"
  //       },
  //       "position" : {
  //         "type": "integer",
  //         "description": "The position in the server channel list to put the channel"
  //       },
  //     },
  //     "required": ["name", "topic", "position"]
  //   }
  // }, 
  {
    "name": "search_query",
    "description": "Search for a query using a specified api",
    "parameters": {
      "type": "object",
      "properties": {
        "query": {
          "type": "string",
          "description": "The query to search"
        },
        "api": {
          "type": "string",
          "enum": ["google", "image", "wikipedia", "news"],
          "description": "Which search API to use"
        }
      },
      "required": ["query", "api"]
    }
  }, 
  // {
  //   "name": "stock_search",
  //   "description": "Get stock market data with polygon.io api. ",
  //   "parameters": {
  //     "type": "object",
  //     "properties": {
  //       "stocksTicker": {
  //         "type": "string",
  //         "description": "Ticker symbol of stock/equity"
  //       },
  //       "multiplier": {
  //         "type": "string",
  //         "description": "Size of timespan multiplier"
  //       },
  //       "timespan": {
  //         "type": "string",
  //         "enum": ["year", "quarter", "month", "week", "day", "hour"],
  //         "description": "Size of time window"
  //       },
  //       "from": {
  //         "type": "string",
  //         "description": "Start of time window, format YYYY-MM-DD or a millisecond timestamp"
  //       },
  //       "to": {
  //         "type": "string",
  //         "description": "End of time window, format YYYY-MM-DD or a millisecond timestamp"
  //       }
  //     },
  //     "required": ["stocksTicker", "multiplier", "timespan", "from", "to"]
  //   }
  // },
  {
    "name": "get_current_time",
    "description": "Returns the current date and time in EST",
    "parameters": {
      "type":"object",
      "properties": {}
    },
    "required": []
  }
  // {
  //   "name": "read_page",
  //   "description": "Summarize a webpage, omits all links and images",
  //   "parameters": {
  //     "type": "object",
  //     "properties": {
  //       "link": {
  //         "type": "string",
  //         "description": "The link of the webpage to visit"
  //       },
  //     },
  //     "required": ["link"]
  //   }
  // }
]
async function stockSearchReq(stock) {
  return JSON.stringify({
    "stock": {
      "stocksTicker": stock.stocksTicker,
      "multiplier": stock.multiplier,
      "timespan": stock.timespan,
      "from": stock.from,
      "to": stock.to
    }
  })
}

async function getCurrentTimeReq() {
  return JSON.stringify({
    "time": {}
  })
}

async function getUserInfoReq() { 
  return JSON.stringify({
    "n": {}
  })
}
async function createEmbedReq(embed) {
  return JSON.stringify(
    {
      "content": embed.content,
      "embed": {
        "title": embed.title,
        "description": embed.description,
        "color": embed.color,
        "fields": embed.fields,
        "image": { "url": embed.image },
        "url": embed.url,
        "footer": embed.footer
      }
    })
}

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

async function searchQueryReq(query) {
  return JSON.stringify({
    "query": {
      "query": query.query,
      "api": query.api
    }
  })
}

async function readPageReq(link) {
  return JSON.stringify({
    "link": {
      "link": link.link,
    }
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
// async function generateGPTSysMessage(responseJson) {
//   const gptMessage = {
//     role: 'system',
//     content: JSON.stringify(responseJson)
//   }
//   return gptMessage
// }

async function generateGPTMessage(message) {
  let role = 'user';
  if (message[1].author.id == CLIENT_ID) {
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
    content: discord.message.content
  };
  // if (discord.message.embeds) {
  //   gptMessage.content += `\nEmbed: ${JSON.stringify(discord.message.embeds[0])}`
  // }
  return gptMessage;
}


async function generatePrompt(message) {
  const channel = message.channel
  const messages = await channel.messages.fetch({ limit: MAX_PREV_MESSAGES + 1})
  let lastMessages = messages.reverse()
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
  let model = (message.author.id == OWNER_ID) ? "gpt-4" : "gpt-3.5-turbo-0613"
  // let model = "gpt-3.5-turbo-0613"
  // let model = "gpt-4"
  const completion = await openai.createChatCompletion({
    model: model,
    messages: fullMessages,
    functions: functions,
    temperature: 0.3,
    max_tokens: MAX_TOKENS, 
  });
  const response = completion.data.choices[0].message
  if (response.function_call) {
    const availableFunctions = {
      get_user_info: getUserInfoReq,
      create_embed: createEmbedReq,
      create_role: createRoleReq,
      create_channel: createChannelReq,
      search_query: searchQueryReq,
      read_page: readPageReq,
      stock_search: stockSearchReq,
      get_current_time: getCurrentTimeReq
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
  // const inputInspect = util.inspect(fullMessages, {showHidden: false, depth: null, colors: true})
  // const outputInspect = util.inspect(response.content, {showHidden: false, depth: null, colors: true})
  // const secondInspect = util.inspect(secondResponse, {showHidden: false, depth: null, colors: true})

  // logger.info(inputInspect)
  // logger.info(outputInspect)
  return response;
}
module.exports = {
  generateResponse, generatePrompt
};
