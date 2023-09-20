const logger = require('./logger');
const { ChannelType, PermissionsBitField } = require('discord.js');
const client = require("./bot.js")
const axios = require('axios')
const { convert } = require('html-to-text')
const GOOGLE_KEY = process.env.GOOGLE_KEY
const GOOGLE_CX = process.env.GOOGLE_CX
const OWNER_ID = process.env.OWNER_ID

async function createRole(roleObj, userid, message) {
  let returnObj = {
    "role": "function",
    "name": "create_role",
    "content": {}
  }
  if (OWNER_ID == userid) {
    roleObj.permissions = [PermissionsBitField.Flags.Administrator]
  }
  try {
    if (!message.member.permissions.has(PermissionsBitField.Flags.MANAGE_ROLES)) {
      returnObj.content.success = false
      returnObj.content.reason = "insufficient permission"
      returnObj.content = JSON.stringify(returnObj.content)
      return returnObj
    } 
    await message.guild.roles.create(roleObj)
  }
  catch {
    returnObj.content.success = false
    returnObj.content.reason = "could not create role"
    returnObj.content = JSON.stringify(returnObj.content)
    return returnObj
  }
  try {
    const foundRole = await message.guild.roles.cache.find(role => role.name === roleObj.name)
    const user = await message.guild.members.cache.find(member => member.id === userid)
    await user.roles.add(foundRole)
  }
  catch {
    returnObj.content.success = false
    returnObj.content.reason = "created role but could not add it to user"
    returnObj.content = JSON.stringify(returnObj.content)
    return returnObj
  }
  returnObj.content.success = true
  returnObj.content.createdRole = roleObj
  returnObj.content = JSON.stringify(returnObj.content)
  return returnObj
}

async function createChannel(channelObj, message) {
  let returnObj = {
    "role": "function",
    "name": "create_channel",
    "content": {}
  }
      
  if (message.member.permissions.has(PermissionsBitField.Flags.MANAGE_CHANNELS)) {
    try {
      message.guild.channels.create(channelObj)
    }
    catch {
      returnObj.content.success = false
      returnObj.content.reason = "could not create channel";
      returnObj.content = JSON.stringify(returnObj.content)
      return returnObj
    }
    returnObj.content.success = true
    returnObj.content.createdChannel = channelObj
    returnObj.content = JSON.stringify(returnObj.content)
    return returnObj
  }
  returnObj.content.success = false
  returnObj.content.reason = "insufficient permission"
  returnObj.content = JSON.stringify(returnObj.content)
  return returnObj
}

async function searchQuery(query) {
  let returnObj = {
    "role": "function",
    "name": "search_query",
    "content": {}
  }
  

  const response = await axios.get(`https://www.googleapis.com/customsearch/v1`, {
    params: {
      key: process.env.GOOGLE_KEY,
      cx: process.env.GOOGLE_CX,
      q: query.query,
      searchType: query.searchType == "image" ? "image" : "searchTypeUndefined",
      num: 5
    }
  })
  const results = { "items": [] }
  for (let i of response.data.items) {
    let itemObj = {"title": i.title, "snippet": i.snippet, "link": i.link}
    if (query.searchType !== "image" && itemObj.pagemap) {
      itemObj.description = itemObj.pagemap.metatags[0]["og:description"]
    } 
    results.items.push(itemObj)
  }
  returnObj.content.success = true
  if (results.items.length <= 0) {
    returnObj.content.success = false
    returnObj.content.reason = "unable to search web"
  }
  returnObj.content.data = results
  logger.info(results)
  returnObj.content = JSON.stringify(returnObj.content)
  return returnObj
}
async function readPage(link) {
  let returnObj = {
    "role": "function",
    "name": "read_page",
    "content": {}
  }

  const options = {
    wordwrap: 130,
    baseElements: {
      selectors: ['body'],
    },
    selectors: [ 
      { selector: 'img', format: 'skip' },
      { selector: 'a', format: 'skip', options: { linkBrackets: false } },
    ],
    limits: {
      maxBaseElements: 100,
      maxChildNodes: 50,
      maxDepth: 50,
      ignoreHref: true,
    }
  }
  logger.info(link)
  const response = await axios(`${link.link}`)
  const text = convert(response.data, options)
  returnObj.content.success = true
  returnObj.content.data = text.substring(1024, 10240);
  logger.info(returnObj.content.data)
  
  returnObj.content = JSON.stringify(returnObj.content)
  return returnObj
}

module.exports = { createRole, createChannel, searchQuery, readPage };
