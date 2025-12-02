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

const dataFolderName = 'helios-data'
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
    }\n\nDeveloped by DarkLordDad\nNot affiliated with Google.`,
    buttons: ['OK'],
    icon: path.join(__dirname, '../icon.png')
  })
}

function onQuit() {
  isQuitting = true
  app.quit()
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
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
          title: 'Choose Your Interface',
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
