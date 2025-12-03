const getFirefoxUserAgent = () => {
  return 'Windows NT 10.0; Win64; x64'
}

const getChromeUserAgent = () => {
  return `Windows NT 10.0; Win64; x64`
}

const FIREFOX_USER_AGENT = `Mozilla/5.0 (${getFirefoxUserAgent()}; rv:145.0) Gecko/20100101 Firefox/145.0`
const CHROME_USER_AGENT = `Mozilla/5.0 (${getChromeUserAgent()}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36`

module.exports = {
  FIREFOX_USER_AGENT,
  CHROME_USER_AGENT
}
