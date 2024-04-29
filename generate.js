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
const { AttachmentBuilder } = require('discord.js'); // Ensure AttachmentBuilder is imported for handling image attachments

/**
 * Fetches a chain of reply messages, including handling text files and images.
 * @param {Message} initialMessage - The initial message to start fetching replies from.
 * @param {TextChannel} channel - The channel where the messages are located.
 * @param {number} messageNum - The maximum number of messages to fetch in the chain.
 * @returns {Promise<Array>} - A promise that resolves to an array of messages with additional properties for files and images.
 */
async function getReplyChain(initialMessage, channel, messageNum) {
  let replyChain = [];
  let currentMessage = initialMessage;
  while (currentMessage && replyChain.length < messageNum) {
    try {

      if (currentMessage != initialMessage) {
        replyChain.push({
          ...currentMessage, // Spread the current message object
        });
      }
      if (currentMessage.reference == null) {
        break
      }
      currentMessage = await channel.messages.fetch(currentMessage.reference.messageId);
    } catch (error) {
      logger.error(error); // Log any errors encountered during fetching
      break; // Exit the loop on error
    }
  }

  return replyChain.reverse();
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
  let fileText = ""
  let fileContents = ""
  if (discordMessageObj.attachments) {
    if (discordMessageObj.attachments != []) {
      for (let attachment of discordMessageObj.attachments) { // Adjusted to use values() for Map compatibility
        fileContents = ""
        attachment = attachment[1]
        if (attachment.contentType && attachment.contentType.includes('text')) {
          // Fetching text file content
          const response = await fetch(attachment.attachment);
          const text = await response.text();
          fileContents += `\n\n---File: ${attachment.name}---\n${text}\n---EOF---\n`;
        }
        fileText += fileContents 
      }
    }
  }
  const gptMessage = {
    role: (authorid == CLIENT_ID)? "assistant" : "user",
    content: [
      {
        type: "text",
        text: `${discordMessageObj.content}${embedText}${fileText}`
      },
    ]
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
    content: `<@${CLIENT_ID}> The following is a list of very strict traits that are fundamental to follow. If a single one is not followed, then communication is not possible. \n${traits} \nThe message directly after this one is considered to be the 1st message in the conversation. \nThis is the end of the message, and information shown after this may be discussed freely.` 
  })
  const channel = interaction.channel
  const replyChain = await getReplyChain(interaction, interaction.channel, messageNum);
  let gptMessage;
  for (let message of replyChain) {
    gptMessage = await generateGPTMessage(message); // Assuming generateGPTMessage can handle the modified message structure
    generatedMessages.push(gptMessage);
  }
  gptMessage = await generateGPTMessage(interaction); // Assuming generateGPTMessage can handle the modified message structure
  generatedMessages.push(gptMessage);
  return generatedMessages
}

async function askGPT(gptMessages, profileName, model) {
  let profile = {}
  // Assuming 'profiles' is an array available in the scope. Error handling for undefined 'profiles' is not shown here.
  for (let i of profiles) {
    if (profileName == i.name) {
      profile = i
      break
    }
  }
  const functions = []
  const functionsPath = path.join(__dirname, './functions/');
  // Ensure 'fs' and 'path' modules are imported to use 'fs.readdirSync' and 'path.join'
  const functionFiles = fs.readdirSync(functionsPath).filter(file => file.endsWith('.json'));
  for (const file of functionFiles) {
    const filePath = path.join(functionsPath, file);
    const jsonString = fs.readFileSync(filePath)
    const functionObj = JSON.parse(jsonString)
    if (profile.functions.length == 0 || profile.functions.includes(functionObj.name)) {
      functions.push(functionObj)
    }
  }
  try {
    // Assuming 'client' is an instance of the GPT client. Error handling for undefined 'client' is not shown here.
    const completion = await client.chat.completions.create({
      model: model,
      messages: gptMessages,
      functions: functions,
      temperature: 0.3,
      max_tokens: MAX_TOKENS, // Ensure MAX_TOKENS is defined
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
      if (!functionToCall) {
        throw new Error(`Function ${functionName} is not defined.`);
      }
      let functionArgs = JSON.parse(response.function_call.arguments)
      var functionResponse = await functionToCall(functionArgs)
      return {
        "role": "function",
        "name": functionName,
        "content": functionResponse,
      }
    }
    return response;
  } catch (error) {
    // Handle errors from the GPT completion or function calls
    logger.error("Error during GPT completion or function execution:", error);
    // Consider returning a meaningful error message or handling the error based on your application's needs
    return {
      "role": "error",
      "content": `Error during GPT completion or function execution:" \n\`\`\`${error}\`\`\``
    };
  }
}

module.exports = {
  askGPTMessage, askGPT
};
