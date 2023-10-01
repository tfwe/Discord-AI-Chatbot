const logger = require('./logger');
const fs = require('node:fs');
const path = require('node:path');
const util = require('util')
const { Configuration, OpenAIApi } = require("openai");
const { MAX_PREV_MESSAGES, MAX_TOKENS } = require('./config.json');
const configuration = new Configuration({
  apiKey: process.env.OPENAI_KEY,
});
const openai = new OpenAIApi(configuration);
const CLIENT_ID = process.env.CLIENT_ID

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

async function splitMessageReq(message){
  return JSON.stringify({
    "message": {
      "content": message.content
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


async function askGPTMessage(interaction, promptMsg, traits) {
  const generatedMessages = [];
  generatedMessages.push({
    role: "system",
    content: `<@${CLIENT_ID}> The following is a list of very strict traits that are fundamental to follow. If a single one is not followed, then communication is not possible. ${compileTraits(traits)}` 
  })
  const channel = interaction.channel
  if (MAX_PREV_MESSAGES >= 1) {
    const messages = await channel.messages.fetch({ limit: MAX_PREV_MESSAGES })
    let lastMessages = messages.reverse()
    for (let msg of lastMessages) {
      let generatedMessage = await generateGPTMessage(msg)
      generatedMessages.push(generatedMessage)
    }
  }
  generatedMessages.push({
    role: "user",
    content: promptMsg
  })
  return generatedMessages
}

async function askGPT(interaction, gptMessages, functionsList, model) {
  const functions = []
  const functionsPath = path.join(__dirname, './functions/');
  const functionFiles = fs.readdirSync(functionsPath).filter(file => file.endsWith('.json'));
  for (const file of functionFiles) {
    const filePath = path.join(functionsPath, file);
    const jsonString = fs.readFileSync(filePath)
    const functionObj = JSON.parse(jsonString)
    if (functionsList.length == 0 || functionsList.includes(functionObj.name)) {
      functions.push(functionObj)
    }
  }
  const completion = await openai.createChatCompletion({
    model: model,
    messages: gptMessages,
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
      get_current_time: getCurrentTimeReq,
    }
    const functionName = response.function_call.name
    const functionToCall = availableFunctions[functionName]
    // try {
      let functionArgs = JSON.parse(response.function_call.arguments)
      var functionResponse = await functionToCall(functionArgs)
    // }
    // catch (error) {
    //   return {
    //     "role": "function",
    //     "name": functionName,
    //     "content": error.message,
    //   }
    // }
    return {
      "role": "function",
      "name": functionName,
      "content": functionResponse,
    }
  }
  // const inputInspect = util.inspect(gptMessages, {showHidden: false, depth: null, colors: true})
  // const outputInspect = util.inspect(response.content, {showHidden: false, depth: null, colors: true})
  // const secondInspect = util.inspect(secondResponse, {showHidden: false, depth: null, colors: true})

  // logger.info(inputInspect)
  // logger.info(outputInspect)
  return response;
}

module.exports = {
  askGPTMessage, askGPT
};
