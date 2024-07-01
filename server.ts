import { JSDOM } from "jsdom"
import express from "express"
import cors from "cors"
import fetch from "node-fetch"

const app = express()
const port = 3000
const corsOptions = {
  origin: "http://localhost:5173",
  methods: ["GET"],
  optionsSuccessStatus: 200,
}

interface QueryParams {
  url: string
}

type CompanyInfo = {
  html: string
  name: string | null
}

type LogoResponse = {
  content: ArrayBuffer
  contentType: string
}

const extractCompanyNameFromURL = (url: string) => {
  const regex = /(?:https?:\/\/)?(?:www\.)?([^\.]+)\./i
  const match = url.match(regex)
  return match ? match[1] : null
}

const crawlHTMLContentFromUrl = async (
  url: string
): Promise<CompanyInfo | null> => {
  try {
    // Simulate browser visit
    const headers = {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/39.0.2171.95 Safari/537.36",
      Accept: "text/html",
    }
    const response = await fetch(url, { headers: headers })
    const companyName = extractCompanyNameFromURL(url)

    if (response.status === 200) {
      const template = await response.text()
      return { html: template, name: companyName }
    } else {
      throw new Error(`Error: ${response.status}`)
    }
  } catch (exception) {
    console.error("Something went wrong", exception)
    return null
  }
}

const extractLogoFromUrl = async ({
  html,
  name,
  url,
}: {
  html: string
  name: string | null
  url: string
}): Promise<LogoResponse | null> => {
  const dom = new JSDOM(html)
  const document = dom.window.document

  let selectors = [
    // Explicit logo references in SVGs and Images
    'svg[id*="logo"]',
    'svg[class*="logo"]',
    'img[src*="logo"][src$=".svg"]',
    'object[data*="logo"][data$=".svg"]',
    'embed[src*="logo"][src$=".svg"]',
    'img[class*="logo"]',
    'img[src*="logo"]',
    'img[alt*="logo"]',
    'img[id*="logo"]',
    // Favicons, touch icons
    'link[rel="apple-touch-icon"]',
    'link[rel="icon"]',
    'link[rel="shortcut icon"]',
    // social media images
    'meta[property="og:image"]',
    'meta[name="twitter:image"]',
    // accessibility logo options
    '*[aria-label*="logo"]',
    '*[role="img"][aria-label*="logo"]',
    '*[aria-label*="logo"][class*="logo"]',
    '*[aria-label*="logo"][id*="logo"]',
  ]

  if (name) {
    selectors = [
      ...selectors,
      `img[alt*=${name}]`,
      `img[class*=${name}]`,
      `img[src*=${name}]`,
      `svg[alt*=${name}]`,
      `svg[class*=${name}]`,
    ]
  }

  const logo = await findLogoBySelectors({ selectors, html, url })
  return logo
}

const findLogoBySelectors = async ({
  selectors,
  html,
  url,
}: {
  selectors: string[]
  html: string
  url: string
}): Promise<LogoResponse | null> => {
  const dom = new JSDOM(html)
  const document = dom.window.document

  for (const selector of selectors) {
    const logoElement = document.querySelector(selector)
    if (logoElement) {
      /*
      if (selector.includes("svg") && logoElement.outerHTML) {
        // <svg>...</svg>, response <svg>..</svg>, header Content-Type: application/svg+xml
        return {
          contentType: "application/svg+xml",
          content: logoElement.outerHTML,
        }
      }
      */

      if (
        selector.includes("img") ||
        selector.includes("object") ||
        selector.includes("meta") ||
        selector.includes("link")
      ) {
        let imageUrl =
          logoElement.getAttribute("src") ??
          logoElement.getAttribute("href") ??
          logoElement.getAttribute("content") ??
          logoElement.getAttribute("data")
        if (!imageUrl) {
          return null
        }

        if (imageUrl.startsWith("/")) {
          const baseUrl = new URL(url)
          imageUrl = baseUrl.origin + imageUrl
        }
        const response = await fetch(imageUrl)
        if (!response.ok)
          throw new Error(`Failed to fetch ${imageUrl}: ${response.statusText}`)
        const contentType =
          response.headers.get("content-type") || "application/octet-stream"
        const buffer = await response.arrayBuffer()
        return {
          contentType,
          content: Buffer.from(buffer),
        }
      }
    }
  }
  return null
}

const customHandler: express.RequestHandler<{}, {}, {}, QueryParams> = async (
  req,
  res
) => {
  const url = req.query.url

  if (!url) {
    res.status(400).send("Invalid Url to extract logo")
    return
  }

  const content = await crawlHTMLContentFromUrl(url)

  if (!content) {
    console.error("Error fetching or sending image:")
    res.status(500).send("Error fetching or sending image")
    return
  }

  const { html, name } = content
  const logo = await extractLogoFromUrl({ html, name, url })

  if (!logo) {
    res.status(400).send("Logo couldn't be extracted")
    return
  }

  // If content is a string, send it directly (for SVG or already base64-encoded images).
  // Ensure to set the correct content type.
  res.setHeader("Content-Type", logo.contentType)
  res.status(200).send(logo.content)
}

// endpoints
app.use(cors(corsOptions))
app.get("/logo", customHandler)

app.listen(port, () => {
  console.log(`Server listening on port ${port}`)
})
