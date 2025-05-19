const DEEPL_API_KEY = "38f111fa-8e1c-41b8-9b32-47226891dd6f:fx";
const DEEPL_API_URL = "https://api-free.deepl.com/v2/translate";

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "translate") {
    const { text, targetLang, sourceLang } = request.payload;

    if (!text || !targetLang) {
      console.error("Missing text or targetLang in translation request");
      sendResponse({ success: false, error: "Invalid request payload" });
      return false;
    }

    fetch(DEEPL_API_URL, {
      method: "POST",
      headers: {
        Authorization: `DeepL-Auth-Key ${DEEPL_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        text: [text],
        target_lang: targetLang,
        ...(sourceLang && { source_lang: sourceLang })
      })
    })
      .then((response) => {
        if (!response.ok) {
          console.error(
            `DeepL API Error: ${response.status} ${response.statusText}`
          );
          return response
            .json()
            .then((err) => {
              if (response.status === 429) {
                console.warn(
                  "DeepL rate limit likely exceeded. Implement exponential backoff."
                );
              }
              return Promise.reject({
                status: response.status,
                message: err.message || response.statusText
              });
            })
            .catch(() => {
              return Promise.reject({
                status: response.status,
                message: response.statusText
              });
            });
        }
        return response.json();
      })
      .then((data) => {
        if (
          data.translations &&
          data.translations.length > 0 &&
          data.translations.text
        ) {
          sendResponse({
            success: true,
            translatedText: data.translations.text
          });
        } else {
          console.error("No translation received in DeepL response:", data);
          sendResponse({
            success: false,
            error: "No translation received from API"
          });
        }
      })
      .catch((error) => {
        console.error("Error during DeepL API call:", error);
        sendResponse({
          success: false,
          error: error.message || "API call failed",
          status: error.status
        });
      });
    return true;
  }
});

chrome.runtime.onInstalled.addListener(() => {
  console.log("Language Learning Extension Installed/Updated");
});
