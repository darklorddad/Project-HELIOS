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

          // Aider sends the Repo Map and instructions in the 'system' message.
          // We must combine the System prompt and the User prompt to ensure the Web UI sees the code context.
          const systemMessage = messages.find((m) => m.role === 'system')
          const lastUserMessage = messages
            .slice()
            .reverse()
            .find((m) => m.role === 'user')

          let prompt = ''

          if (systemMessage) {
            prompt += systemMessage.content + '\n\n'
          }

          if (lastUserMessage) {
            prompt += lastUserMessage.content
          }

          if (!mainWindow) {
            throw new Error('Window not ready')
          }

          if (mainWindow.isMinimized()) mainWindow.restore()
          mainWindow.show()

          const responseText = await mainWindow.webContents.executeJavaScript(
            `
            (async () => {
              const sleep = (ms) => new Promise(r => setTimeout(r, ms));

              // 1. Robust Input Finding and Injection
              const input = document.querySelector('textarea.textarea');
              if (!input) throw new Error("Input field not found");

              // Angular/React often requires focus and event dispatching to register changes
              input.focus();
              input.value = ${JSON.stringify(prompt)};
              input.dispatchEvent(new Event('input', { bubbles: true }));
              input.dispatchEvent(new Event('change', { bubbles: true }));
              
              await sleep(200); // Short pause for UI to update state

              // 2. Trigger Generation
              const runButton = document.querySelector('button.run-button');
              if (runButton && !runButton.disabled) {
                runButton.click();
              } else {
                // Fallback to Enter key if button is unavailable/disabled
                input.dispatchEvent(new KeyboardEvent('keydown', { 
                  key: 'Enter', code: 'Enter', which: 13, bubbles: true, ctrlKey: true 
                }));
              }

              // 3. Wait for Generation to Start (Run button changes state)
              // We wait briefly to ensure the UI enters "loading" state
              await sleep(1000);

              // 4. Wait for Generation to Complete
              // We poll the Run button AND check for text stability.
              // Sometimes the spinner stops but text is still streaming/rendering.
              
              const getModelText = () => {
                const modelTurns = document.querySelectorAll('[data-turn-role="Model"]');
                if (modelTurns.length === 0) return "";
                const lastTurn = modelTurns[modelTurns.length - 1];
                
                // Ensure the element is rendered in the DOM (handles virtual scrolling)
                lastTurn.scrollIntoView({ behavior: "instant", block: "end" });

                const textElement = lastTurn.querySelector('.turn-content');
                if (!textElement) return "";

                // Clone the node to clean up UI artifacts without affecting the page
                const clone = textElement.cloneNode(true);
                
                // Remove buttons (copy, edit, etc.) and icon ligatures
                const uiArtifacts = [
                  'button', 
                  '[role="button"]', 
                  '.material-icons', 
                  '.google-symbols',
                  'mat-icon'
                ];
                
                clone.querySelectorAll(uiArtifacts.join(',')).forEach(el => el.remove());

                // Remove elements containing specific UI text (ligatures/labels)
                // "code" and language names might be text nodes, so we leave them if they aren't in buttons
                // but "content_copy", "expand_less" are definitely noise.
                const noiseStrings = ["content_copy", "expand_less", "more_vert", "check", "download"];
                
                const walker = document.createTreeWalker(clone, NodeFilter.SHOW_ELEMENT);
                let currentNode = walker.nextNode();
                while (currentNode) {
                  if (noiseStrings.includes(currentNode.innerText.trim())) {
                    const toRemove = currentNode;
                    currentNode = walker.nextNode(); // Advance before removing
                    toRemove.remove();
                    continue;
                  }
                  currentNode = walker.nextNode();
                }

                return clone.innerText.trim();
              };

              let attempts = 0;
              let stableIterations = 0;
              let lastTextLength = 0;

              while (attempts < 240) { // 120 seconds timeout
                const btn = document.querySelector('button.run-button');
                const isSpinner = btn ? btn.querySelector('.stoppable-spinner') : null;
                const currentText = getModelText();
                
                // If spinner is active, we are definitely still generating.
                if (isSpinner) {
                  stableIterations = 0;
                  lastTextLength = currentText.length;
                  await sleep(500);
                  attempts++;
                  continue;
                }

                // If spinner is NOT active, we check if text is stable.
                if (currentText.length > 0 && currentText.length === lastTextLength) {
                   stableIterations++;
                } else {
                   stableIterations = 0;
                }

                lastTextLength = currentText.length;

                // If text has been stable for 3 iterations (1.5 seconds) and spinner is gone, we are done.
                if (stableIterations >= 3) {
                  break;
                }
                
                await sleep(500);
                attempts++;
              }

              // 5. Extract Response using specific Data Attributes
              const modelTurns = document.querySelectorAll('[data-turn-role="Model"]');
              if (modelTurns.length === 0) return "No response found.";

              const lastTurn = modelTurns[modelTurns.length - 1];
              
              // Extract text from the markdown nodes, ignoring hidden elements if necessary
              // The sample shows text resides in ms-cmark-node -> p -> span
              const textElement = lastTurn.querySelector('.turn-content');
              return textElement ? textElement.innerText.trim() : "Empty response.";
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
