import { TranslationSettings, TranslationResponse } from "./types";

const DEEPL_API_URL = "https://api-free.deepl.com/v2/translate";

if (typeof chrome !== "undefined" && chrome.runtime) {
  chrome.runtime.onInstalled.addListener(() => {
    console.log("Smart Translate extension installed");

    const defaultSettings: TranslationSettings = {
      fromLanguage: "auto",
      toLanguage: "EN",
      percentage: 25,
      isEnabled: true
    };

    chrome.storage.sync.set({ translationSettings: defaultSettings });
  });
}

if (typeof chrome !== "undefined" && chrome.runtime) {
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "translate") {
      translateText(request.text, request.settings)
        .then((result) => sendResponse({ success: true, data: result }))
        .catch((error) =>
          sendResponse({ success: false, error: error.message })
        );
      return true;
    }
  });
}

async function translateText(
  text: string,
  settings: TranslationSettings
): Promise<string> {
  const apiKey = await new Promise<string | undefined>((resolve) => {
    chrome.storage.sync.get(["deeplApiKey"], (result) => {
      resolve(result.deeplApiKey);
    });
  });

  if (!apiKey || apiKey === "your_deepl_api_key_here") {
    throw new Error("DeepL API key not configured");
  }

  console.log("translateText", text);
  console.log("settings", settings);

  const body = new URLSearchParams({
    auth_key: apiKey,
    text: text,
    target_lang: settings.toLanguage,
    ...(settings.fromLanguage !== "auto" && {
      source_lang: settings.fromLanguage
    })
  });

  try {
    const response = await fetch(DEEPL_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: body.toString()
    });

    if (!response.ok) {
      throw new Error(`DeepL API error: ${response.status}`);
    }

    const data: TranslationResponse = await response.json();

    if (data.translations && data.translations.length > 0) {
      return data.translations[0].text;
    } else {
      throw new Error("No translation received from DeepL API");
    }
  } catch (error) {
    console.error("Translation error:", error);
    throw error;
  }
}

if (typeof chrome !== "undefined" && chrome.storage) {
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === "sync" && changes.translationSettings) {
      console.log(
        "Translation settings updated:",
        changes.translationSettings.newValue
      );
    }
  });
}

if (typeof chrome !== "undefined" && chrome.tabs) {
  chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (
      changeInfo.status === "complete" &&
      tab.url &&
      !tab.url.startsWith("chrome://")
    ) {
      try {
        const result = await chrome.storage.sync.get(["translationSettings"]);
        const settings: TranslationSettings = result.translationSettings;

        if (settings && settings.isEnabled) {
          chrome.tabs
            .sendMessage(tabId, {
              action: "auto-translate",
              settings: settings
            })
            .catch((error) => {
              console.log("Could not send message to content script:", error);
            });
        }
      } catch (error) {
        console.error("Error checking auto-translate settings:", error);
      }
    }
  });
}

export {};
