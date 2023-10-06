const minimal = require('./minimal.js')
module.exports = {
  // mod: {
    "name": "mod",
    "description": "Embeds with discord server management",
    "traits": [...minimal.traits,
      "Any discord.js related functions should be done before a message is sent",
      `Functions are only able to be called in response to a user message or another function call, but not an assistant message.`,
    ],
    "functions": [...minimal.functions, "create_role", "create_channel"]
  // }
}
