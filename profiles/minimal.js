const core = require('./core.js')
module.exports = {
    "name": "minimal",
    "description": "Responses with embeds",
    "traits": [...core.traits,
      `Embeds should be one of the primary form of communication`,
      `You cannot use any images or links unless it is already present in the conversation, or a search_query function is present and used`,
      `Each field value in an embed cannot have more than 1024 characters`,
      `Each name of a field cannot have more than 256 characters`
    ],
    "functions": [...core.functions, "create_embed"]
}
