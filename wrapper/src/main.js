const {
  app,
  BrowserWindow,
  shell,
  session,
  Tray,
  Menu,
  globalShortcut,
  nativeImage,
  dialog
} = require('electron')
const path = require('path')
const fs = require('fs')
const http = require('http')

const {
  URL_AISTUDIO,
  URL_AISTUDIO_NEW_CHAT,
  URL_GEMINI,
  URL_GEMINI_NEW_CHAT
} = require('./config')
const { FIREFOX_USER_AGENT, CHROME_USER_AGENT } = require('./utils')
const { createMenu } = require('./menu')
const { toggleSearch } = require('./search')
const { createShortcutsWindow } = require('./shortcuts')

const dataFolderName = 'data'
let userDataPath

if (app.isPackaged) {
  userDataPath = path.join(path.dirname(app.getPath('exe')), dataFolderName)
} else {
  userDataPath = path.join(__dirname, '..', dataFolderName)
}

if (!fs.existsSync(userDataPath)) {
  try {
    fs.mkdirSync(userDataPath, { recursive: true })
  } catch (e) {
    console.error('Could not create user data folder:', e)
  }
}

app.setPath('userData', userDataPath)

const configPath = path.join(app.getPath('userData'), 'config.json')
let appConfig = {
  globalShortcut: '',
  newChatShortcut: ''
}

try {
  if (fs.existsSync(configPath)) {
    const savedConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'))
    appConfig = { ...appConfig, ...savedConfig }
  } else {
    fs.writeFileSync(configPath, JSON.stringify(appConfig, null, 2))
  }
} catch (e) {
  console.error('Failed to load config', e)
}

const modePath = path.join(app.getPath('userData'), '.mode')
let currentMode = 'aistudio'

try {
  if (fs.existsSync(modePath)) {
    currentMode = fs.readFileSync(modePath, 'utf8').trim()
  }
} catch (e) {
  console.error('Failed to load mode', e)
}

let mainWindow
let tray
let isQuitting = false

function switchMode() {
  if (currentMode === 'aistudio') {
    currentMode = 'gemini'
  } else {
    currentMode = 'aistudio'
  }

  fs.writeFileSync(modePath, currentMode)

  const targetUrl = currentMode === 'aistudio' ? URL_AISTUDIO : URL_GEMINI
  mainWindow.loadURL(targetUrl)

  mainWindow.setTitle(
    currentMode === 'aistudio'
      ? 'H.E.L.I.O.S. (AI Studio)'
      : 'H.E.L.I.O.S. (Gemini)'
  )
}

function performNewChat() {
  const newChatUrl =
    currentMode === 'aistudio' ? URL_AISTUDIO_NEW_CHAT : URL_GEMINI_NEW_CHAT
  mainWindow.loadURL(newChatUrl)
  mainWindow.webContents.once('did-finish-load', () => {
    mainWindow.webContents.executeJavaScript(`
      setTimeout(() => { 
          const input = document.querySelector('textarea, [contenteditable="true"], .ql-editor'); 
          if (input) { input.focus(); input.click(); } 
      }, 800); 
    `)
  })
}

function showAbout() {
  dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: 'About H.E.L.I.O.S.',
    message: 'H.E.L.I.O.S.',
    detail: `Heuristic Engine for Logic, Input and Output Synthesis\nVersion: ${app.getVersion()}\n\nMode: ${
      currentMode === 'aistudio' ? 'AI Studio' : 'Gemini'
    }\n\nDeveloped by darklorddad\nNot affiliated with Google.`,
    buttons: ['OK'],
    icon: path.join(__dirname, '../icon.png')
  })
}

function onQuit() {
  isQuitting = true
  app.quit()
}

function startApiServer() {
  const server = http.createServer(async (req, res) => {
    if (req.method === 'POST' && req.url === '/v1/chat/completions') {
      let body = ''
      req.on('data', (chunk) => {
        body += chunk.toString()
      })
      req.on('end', async () => {
        try {
          const data = JSON.parse(body)
          const messages = data.messages
          const lastUserMessage = messages
            .slice()
            .reverse()
            .find((m) => m.role === 'user')
          const prompt = lastUserMessage ? lastUserMessage.content : ''

          if (!mainWindow) {
            throw new Error('Window not ready')
          }

          if (mainWindow.isMinimized()) mainWindow.restore()
          mainWindow.show()

          const responseText = await mainWindow.webContents.executeJavaScript(
            `
            (async () => {
              const sleep = (ms) => new Promise(r => setTimeout(r, ms));
              
              const getInput = () => document.querySelector('textarea, [contenteditable="true"], .ql-editor');
              const getSendButton = () => document.querySelector('button[aria-label*="Send"], button[aria-label*="Submit"], .send-button, button[data-testid="send-button"]');

              const input = getInput();
              if (!input) throw new Error("Input field not found");
              
              input.focus();
              document.execCommand('selectAll', false, null);
              document.execCommand('insertText', false, ${JSON.stringify(prompt)});
              await sleep(500);

              const btn = getSendButton();
              if (btn) {
                btn.click();
              } else {
                const event = new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', which: 13, bubbles: true });
                input.dispatchEvent(event);
              }
              
              await sleep(2000);
              
              let lastText = "";
              let stableCount = 0;
              const maxRetries = 120; 
              
              for(let i=0; i<maxRetries; i++) {
                 await sleep(500);
                 const allText = document.body.innerText; 
                 
                 if (allText.length > lastText.length) {
                    lastText = allText;
                    stableCount = 0;
                 } else {
                    stableCount++;
                 }
                 
                 if (stableCount > 4 && i > 5) break;
              }
              
              // Attempt to find the last response. 
              // Note: These selectors are generic and might need tuning for specific web apps.
              const messageBlocks = document.querySelectorAll('.model-response-text, .message-content, [data-message-author="model"], .response-content');
              if (messageBlocks.length > 0) {
                return messageBlocks[messageBlocks.length - 1].innerText;
              }
              
              // Fallback: return the last chunk of text from the body if specific selectors fail
              return document.body.innerText.slice(-2000); 
            })()
            `
          )

          const response = {
            id: 'chatcmpl-' + Date.now(),
            object: 'chat.completion',
            created: Math.floor(Date.now() / 1000),
            model: data.model,
            choices: [
              {
                index: 0,
                message: { role: 'assistant', content: responseText },
                finish_reason: 'stop'
              }
            ]
          }

          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify(response))
        } catch (e) {
          console.error('API Error:', e)
          res.writeHead(500, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: e.message }))
        }
      })
    } else {
      res.writeHead(404)
      res.end()
    }
  })

  server.listen(3000, '127.0.0.1', () => {
    console.log('Local LLM wrapper running on http://127.0.0.1:3000')
  })
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    icon: path.join(__dirname, '../icon.png'),
    title:
      currentMode === 'aistudio'
        ? 'H.E.L.I.O.S. (AI Studio)'
        : 'H.E.L.I.O.S. (Gemini)',
    autoHideMenuBar: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      userAgent: CHROME_USER_AGENT
    }
  })

  createMenu({
    app,
    mainWindow,
    switchMode,
    performNewChat,
    toggleSearch,
    createShortcutsWindow: (win) => createShortcutsWindow(win, appConfig),
    showAbout,
    onQuit
  })

  const filter = { urls: ['*://accounts.google.com/*'] }
  session.defaultSession.webRequest.onBeforeSendHeaders(
    filter,
    (details, callback) => {
      details.requestHeaders['User-Agent'] = FIREFOX_USER_AGENT
      if (details.requestHeaders['sec-ch-ua'])
        delete details.requestHeaders['sec-ch-ua']
      if (details.requestHeaders['sec-ch-ua-mobile'])
        delete details.requestHeaders['sec-ch-ua-mobile']
      if (details.requestHeaders['sec-ch-ua-platform'])
        delete details.requestHeaders['sec-ch-ua-platform']
      if (details.requestHeaders['X-User-Agent'])
        delete details.requestHeaders['X-User-Agent']
      callback({ requestHeaders: details.requestHeaders })
    }
  )

  mainWindow.webContents.setUserAgent(CHROME_USER_AGENT)
  mainWindow.loadURL(currentMode === 'aistudio' ? URL_AISTUDIO : URL_GEMINI)

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (
      url.includes('accounts.google.com') ||
      url.includes('aistudio.google.com') ||
      url.includes('gemini.google.com')
    ) {
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          autoHideMenuBar: true,
          userAgent: CHROME_USER_AGENT
        }
      }
    }
    shell.openExternal(url)
    return { action: 'deny' }
  })

  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault()
      mainWindow.hide()
      return false
    }
  })
}

function createTray() {
  const iconPath = path.join(__dirname, '../icon.png')

  try {
    let nImage = nativeImage.createFromPath(iconPath)

    nImage = nImage.resize({ width: 16, height: 16 })

    tray = new Tray(nImage)

    const contextMenu = Menu.buildFromTemplate([
      { label: 'Show App', click: () => mainWindow.show() },
      {
        label: 'Quit',
        click: () => {
          isQuitting = true
          app.quit()
        }
      }
    ])

    tray.setToolTip('H.E.L.I.O.S.')
    tray.setContextMenu(contextMenu)

    tray.on('click', () => {
      if (mainWindow.isVisible()) {
        mainWindow.hide()
      } else {
        mainWindow.show()
        mainWindow.focus()
      }
    })
  } catch (e) {
    console.log('Tray icon failed to load:', e)
  }
}

const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      if (!mainWindow.isVisible()) mainWindow.show()
      mainWindow.focus()
    }
  })

  app.commandLine.appendSwitch('disable-blink-features', 'AutomationControlled')
  app.commandLine.appendSwitch('disable-features', 'OutOfBlinkCors')
  app.commandLine.appendSwitch('disable-site-isolation-trials')

  app.on('ready', () => {
    app.userAgentFallback = CHROME_USER_AGENT
    startApiServer()
    createWindow()
    createTray()

    if (appConfig.globalShortcut) {
      globalShortcut.register(appConfig.globalShortcut, () => {
        if (mainWindow.isVisible() && mainWindow.isFocused()) {
          mainWindow.hide()
        } else {
          mainWindow.show()
          mainWindow.focus()
        }
      })
    }

    if (appConfig.newChatShortcut) {
      globalShortcut.register(appConfig.newChatShortcut, () => {
        if (!mainWindow.isVisible()) mainWindow.show()
        mainWindow.focus()

        const newChatUrl =
          currentMode === 'aistudio'
            ? URL_AISTUDIO_NEW_CHAT
            : URL_GEMINI_NEW_CHAT

        if (mainWindow.webContents.getURL() !== newChatUrl) {
          mainWindow.loadURL(newChatUrl)
        }

        mainWindow.webContents.once('did-finish-load', () => {
          mainWindow.webContents.executeJavaScript(`
          setTimeout(() => {
              const input = document.querySelector('textarea, [contenteditable="true"], .ql-editor');
              if (input) {
                  input.focus();
                  input.click(); 
              }
          }, 800); 
        `)
        })
      })
    }

    const flagPath = path.join(app.getPath('userData'), '.first-run-complete')

    if (!fs.existsSync(flagPath)) {
      try {
        const choice = dialog.showMessageBoxSync(mainWindow, {
          type: 'question',
          buttons: ['Google AI Studio', 'Google Gemini'],
          defaultId: 0,
          title: 'Choose your interface',
          message: 'Welcome to H.E.L.I.O.S.! Which interface do you want to use?',
          detail: 'You can switch between them later in the View menu.',
          icon: path.join(__dirname, '../icon.png')
        })

        currentMode = choice === 1 ? 'gemini' : 'aistudio'

        fs.writeFileSync(modePath, currentMode)

        const targetUrl = currentMode === 'aistudio' ? URL_AISTUDIO : URL_GEMINI
        mainWindow.loadURL(targetUrl)
        mainWindow.setTitle(
          currentMode === 'aistudio'
            ? 'H.E.L.I.O.S. (AI Studio)'
            : 'H.E.L.I.O.S. (Gemini)'
        )

        fs.writeFileSync(flagPath, 'true')

        setTimeout(() => {
          createShortcutsWindow(mainWindow, appConfig)
        }, 1000)
      } catch (e) {
        console.error('First run error:', e)
      }
    }
  })

  app.on('will-quit', () => {
    globalShortcut.unregisterAll()
  })

  app.on('window-all-closed', () => {
    app.quit()
  })
}
