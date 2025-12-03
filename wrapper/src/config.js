const path = require('path')
const { app } = require('electron')

const URL_AISTUDIO = 'https://aistudio.google.com'
const URL_AISTUDIO_NEW_CHAT = `${URL_AISTUDIO}/prompts/new_chat`
const URL_GEMINI = 'https://gemini.google.com'
const URL_GEMINI_NEW_CHAT = `${URL_GEMINI}/app`

module.exports = {
  URL_AISTUDIO,
  URL_AISTUDIO_NEW_CHAT,
  URL_GEMINI,
  URL_GEMINI_NEW_CHAT
}
