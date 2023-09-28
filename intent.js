const logger = require('./logger');
const { PermissionsBitField } = require('discord.js');
// const { MAX_PREV_MESSAGES } = require('./config.json')
const axios = require('axios')
const { convert } = require('html-to-text')
const GOOGLE_KEY = process.env.GOOGLE_KEY
const GOOGLE_CX = process.env.GOOGLE_CX
const XRAPID_KEY = process.env.XRAPID_KEY
const NEWSAPI_KEY = process.env.NEWSAPI_KEY
const POLYGON_KEY = process.env.POLYGON_KEY
const OWNER_ID = process.env.OWNER_ID

async function getUserInfo(message) {
  let returnObj = {
    "role": "function",
    "name": "get_user_info",
    "content": {}
  }
  // if (n.n >= MAX_PREV_MESSAGES || n.n <= 0) {
  //   returnObj.content.success = false;
  //   returnObj.content.reason = 'index out of bounds'
  //   returnObj.content = JSON.stringify(returnObj.content)
  //   return returnObj
  // }
  returnObj.content.success = true
  returnObj.content.author = {
    "username": message.author.username,
    "id": `${message.author.id}`
  }
  returnObj.content = JSON.stringify(returnObj.content)
  return returnObj
}

async function createEmbed(embedObj) {
  let returnObj = {
    "role": "function",
    "name": "create_embed",
    "content": {}
  }
  returnObj.content.success = true
  // returnObj.content.createdEmbed = embedObj
  returnObj.content = JSON.stringify(returnObj.content)
  return returnObj
}

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
  let options = {}
  let responseObj = {}
  switch (query.api) {
    case "google":
      responseObj = await axios.get(`https://www.googleapis.com/customsearch/v1`, {
        params: {
          key: GOOGLE_KEY,
          cx: GOOGLE_CX,
          q: query.query,
          searchType: "searchTypeUndefined",
          num: 5
        }
      })
      break;
    case "image":
      responseObj = await axios.get(`https://www.googleapis.com/customsearch/v1`, {
        params: {
          key: GOOGLE_KEY,
          cx: GOOGLE_CX,
          q: query.query,
          searchType: "image",
          num: 5
        }
      })
      break;
    case "wikipedia":
      options = {
        method: 'GET',
        url: 'https://wiki-briefs.p.rapidapi.com/search',
        params: {
          q: query.query,
          topk: '5'
        },
        headers: {
          'X-RapidAPI-Key': XRAPID_KEY,
          'X-RapidAPI-Host': 'wiki-briefs.p.rapidapi.com'
        }
      }
      responseObj = await axios.request(options)
      break;
    case "news":
      responseObj = await axios.get(`https://newsapi.org/v2/everything`, {
        params: {
          apiKey: NEWSAPI_KEY,
          q: query.query,
          pageSize: 5,
        }
      })
    default:
      break;
  }


  if (!responseObj.data) {
    returnObj.content.success = false
    returnObj.content.reason = "unable to search"
    returnObj.content = JSON.stringify(returnObj.content)
    return returnObj
  }
  if (query.api == "google" || query.api == "image") {
    const results = { "items": [] }
    for (let i of responseObj.data.items) {
      let itemObj = {"title": i.title, "snippet": i.snippet, "link": i.link}
      if (query.api !== "image" && itemObj.pagemap) {
        itemObj.description = itemObj.pagemap.metatags[0]["og:description"]
      } 
      results.items.push(itemObj)
    }
    if (results.items.length <= 0) {
      returnObj.content.success = false
      returnObj.content.reason = "search returned 0 results"
      returnObj.content = JSON.stringify(returnObj.content)
      return returnObj
    }
    returnObj.content.success = true
    returnObj.content.data = results
    logger.info(results)
    returnObj.content = JSON.stringify(returnObj.content)
    return returnObj
  }
  else if (query.api == "wikipedia") {
    returnObj.content.success = true
    returnObj.content.data = {
      title: responseObj.data.title,
      url: responseObj.data.url,
      imageURL: responseObj.data.image,
      summary: responseObj.data.summary
    }
    logger.info(returnObj.content.data)
    returnObj.content = JSON.stringify(returnObj.content)
    return returnObj
  }
  else if (query.api == "news") {
    let articles = []
    returnObj.content.success = true
    for (let i of responseObj.data.articles) {
      articles.push({
        source: i.source.name,
        author: i.author,
        publishedAt: i.publishedAt,
        title: i.title,
        description: i.description,
        url: i.url,
      })
    }
    logger.info(returnObj.content.data)
    returnObj.content.data = articles
    returnObj.content = JSON.stringify(returnObj.content)
    return returnObj
  }
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
  returnObj.content.data = text.substring(4096, 8192);
  logger.info(returnObj.content.data)
  
  returnObj.content = JSON.stringify(returnObj.content)
  return returnObj
}

async function stockSearch(stock) {
  let returnObj = {
    "role": "function",
    "name": "stock_search",
    "content": {}
  }
  responseObj = await axios.get(`https://api.polygon.io/v2/aggs/ticker/`, {
    params: {
      apiKey: POLYGON_KEY,
      stocksTicker: stock.stocksTicker,
      multiplier: stock.multiplier,
      timespan: stock.timespan,
      from: stock.from,
      to: stock.to,
      limit: 20,
    }
  })
  returnObj.content.success = true
  // returnObj.content.stock = {
  //
  // }
  return returnObj

}
async function getCurrentTime(time) {
  let returnObj = {
    "role": "function",
    "name": "get_current_time",
    "content": {}
  }
  responseObj = await axios.get(`https://www.timeapi.io/api/Time/current/zone`, {
    params: {
      timeZone: "America/Toronto",
    }
  })
  returnObj.content.success = true
  returnObj.content.time = {
    dateTime: responseObj.data.dateTime
  }
  returnObj.content = JSON.stringify(returnObj.content)
  return returnObj
}

module.exports = { getUserInfo, createEmbed, createRole, createChannel, searchQuery, readPage, stockSearch, getCurrentTime };
