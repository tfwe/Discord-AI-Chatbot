const logger = require('./logger');
const fs = require('node:fs');
const path = require('node:path');
const util = require('util')
const { OpenAI } = require("openai");
const { MAX_PREV_MESSAGES, MAX_TOKENS } = require('./config.json');
const client = new OpenAI({
  apiKey: process.env.OPENAI_KEY,
});
// const openai = new OpenAIApi(configuration);
const CLIENT_ID = process.env.CLIENT_ID

const profiles = []
const profilesPath = path.join(__dirname, './profiles/');
const profileFiles = fs.readdirSync(profilesPath).filter(file => file.endsWith('.js'));
for (const file of profileFiles) {
  const filePath = path.join(profilesPath, file);
  const profile = require(filePath)
  profiles.push(profile)
}

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

async function compileTraits(traitsArray) {
  let traitsString = "";
  traitsArray.forEach((trait) => {
    traitsString += `- ${trait}\n`;
  });
  return traitsString;
}

async function embedToMarkdown(embed) {
    let markdown = "```markdown\n";

    // Add title
    if (embed.title) {
        markdown += `# ${embed.title}\n\n`;
    }

    // Add description
    if (embed.description) {
        markdown += `${embed.description}\n\n`;
    }

    // Add fields
    if (embed.fields && embed.fields.length > 0) {
        embed.fields.forEach(field => {
            markdown += `## ${field.name}\n`;
            markdown += `${field.value}\n\n`;
        });
    }
    if (embed.image) {
      markdown += `![image](${embed.image.url})\n`
  }
    // Add footer
    if (embed.footer) {
        markdown += `---\n${embed.footer.text}`;
    }
    markdown += "\n```"
    return markdown;
}

async function generateGPTMessage(discordMessageObj) {
  let authorid
  logger.info(discordMessageObj)
  if (discordMessageObj.interaction) { // discordMessageObj is either a ping or an application command
    // if (discordMessageObj[1].interaction.type == 1) { // type 1 is ping
    //
    // }
    if (discordMessageObj.interaction.type == 2) { // type 2 is application command
    }
  }
  authorid = discordMessageObj.author.id
  let embedText = ""
  if (discordMessageObj.embeds && discordMessageObj.embeds.length > 0) {
    embedText += '\n'
    for (let i of discordMessageObj.embeds) {
      embedText += await embedToMarkdown(i)
    }
  }
  const gptMessage = {
    role: (authorid == CLIENT_ID)? "assistant" : "user",
    content: `${discordMessageObj.content}${embedText}`
  }
  return gptMessage
}

async function askGPTMessage(interaction, promptMsg, profileName, messageNum) {
  let profile = {}
  for (let i of profiles) {
    if (profileName == i.name) {
      profile = i
      break
    }
  }
  const generatedMessages = [];
  const traits = await compileTraits(profile.traits)
  generatedMessages.push({
    role: "system",
    content: `<@${CLIENT_ID}> The following is a list of very strict traits that are fundamental to follow. If a single one is not followed, then communication is not possible. ${traits}This is the end of the message, and information shown after this may be discussed freely.` 
  })
  const channel = interaction.channel
  if (interaction.reference) {
    let replyChain = []
    let currentMessage = interaction
    while (currentMessage && replyChain.length <= messageNum) {
      if (!currentMessage.reference) {
        break
      }
      await channel.messages.fetch(currentMessage.reference.messageId)
        .then(msg => {
          replyChain.push(msg)
          currentMessage = msg
        })
        .catch(error => logger.error(error))
    }
    logger.info(replyChain.length)
    let gptMessage
    for (let i of replyChain.reverse()) {
      gptMessage = await generateGPTMessage(i)
      generatedMessages.push(gptMessage)
    }

  }
  else {
    if (messageNum >= 1 && messageNum <= MAX_PREV_MESSAGES) {
      const messages = await channel.messages.fetch({ limit: messageNum })
      let lastMessages = messages.reverse()
      for (let msg of lastMessages) {
        if (msg[1].content == promptMsg) continue
        let generatedMessage = await generateGPTMessage(msg[1])
        generatedMessages.push(generatedMessage)
      }
    }
  }
  
  generatedMessages.push({
    role: "user",
    content: promptMsg
  })
  return generatedMessages
}

async function askGPT(gptMessages, profileName, model) {
  let profile = {}
  for (let i of profiles) {
    if (profileName == i.name) {
      profile = i
      break
    }
  }
  const functions = []
  const functionsPath = path.join(__dirname, './functions/');
  const functionFiles = fs.readdirSync(functionsPath).filter(file => file.endsWith('.json'));
  for (const file of functionFiles) {
    const filePath = path.join(functionsPath, file);
    const jsonString = fs.readFileSync(filePath)
    const functionObj = JSON.parse(jsonString)
    if (profile.functions.length == 0 || profile.functions.includes(functionObj.name)) {
      functions.push(functionObj)
    }
  }
  const completion = await client.chat.completions.create({
    model: model,
    messages: gptMessages,
    functions: functions,
    temperature: 0.3,
    max_tokens: MAX_TOKENS, 
  });
  const response = completion.choices[0].message
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
