import { DeepLTranslationRequestPayload } from "./types";

const TRANSLATED_WORD_CLASS = "ll-translated-word";
const ORIGINAL_WORD_DATA_ATTR = "data-original-word";

function isRelevantTextNode(node: Node): boolean {
  if (node.nodeType !== Node.TEXT_NODE) {
    return false;
  }
  if (!node.textContent?.trim()) {
    return false;
  }
  let parent = node.parentElement;
  while (parent) {
    const tagName = parent.tagName.toLowerCase();
    if (
      tagName === "script" ||
      tagName === "style" ||
      parent.isContentEditable
    ) {
      return false;
    }
    parent = parent.parentElement;
  }
  return true;
}

function getWordsFromText(text: string): string[] {
  return text.split(/\s+/).filter((word) => word.length > 0);
}

function wrapWordInSpan(
  textNode: Text,
  word: string,
  wordIndexInNode: number
): HTMLSpanElement | null {
  try {
    const span = document.createElement("span");
    span.className = TRANSLATED_WORD_CLASS;
    span.setAttribute(ORIGINAL_WORD_DATA_ATTR, word);
    const startIndex = textNode.textContent?.indexOf(word, wordIndexInNode);

    if (startIndex === undefined || startIndex === -1) {
      console.warn(
        `Word "${word}" not found at expected position in node:`,
        textNode.textContent
      );
      return null;
    }

    const endIndex = startIndex + word.length;
    const range = document.createRange();
    range.setStart(textNode, startIndex);
    range.setEnd(textNode, endIndex);
    range.surroundContents(span);

    return span;
  } catch (error) {
    console.error(
      "Error wrapping word in span:",
      error,
      "Word:",
      word,
      "Node:",
      textNode.textContent
    );
    return null;
  }
}

async function processNode(node: Node) {
  console.log("Processing node:", node);

  let settings: {
    targetLang?: string;
    sourceLang?: string;
    percentage?: number;
  } = {};
  try {
    settings = await chrome.storage.sync.get([
      "targetLang",
      "sourceLang",
      "percentage"
    ]);
  } catch (error) {
    console.error("Error retrieving settings:", error);
    return;
  }

  const targetLang = settings.targetLang;
  const sourceLang = settings.sourceLang;
  const percentage = settings.percentage ?? 0;

  if (!targetLang || percentage <= 0) {
    console.log(
      "Translation disabled or not configured (TargetLang/Percentage missing or 0)."
    );
    return;
  }

  const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) => {
      if (isRelevantTextNode(node)) {
        if (node.parentElement?.classList.contains(TRANSLATED_WORD_CLASS)) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
      return NodeFilter.FILTER_REJECT;
    }
  });

  const nodesToProcess: Text[] = [];
  let currentNode: Node | null;
  while ((currentNode = walker.nextNode())) {
    nodesToProcess.push(currentNode as Text);
  }

  if (nodesToProcess.length === 0) {
    console.log("No relevant text nodes found in:", node);
    return;
  }

  const wordsToTranslate: {
    textNode: Text;
    word: string;
    wordIndexInNode: number;
  }[] = [];
  let totalWordsFound = 0;

  nodesToProcess.forEach((textNode) => {
    totalWordsFound += getWordsFromText(textNode.textContent || "").length;
  });

  const targetTranslationCount = Math.ceil(
    totalWordsFound * (percentage / 100)
  );
  let translatedCount = 0;
  const shuffledNodes = nodesToProcess.sort(() => 0.5 - Math.random());

  for (const textNode of shuffledNodes) {
    if (translatedCount >= targetTranslationCount) break;

    const words = getWordsFromText(textNode.textContent || "");
    const indices = words.map((_, i) => i);
    const shuffledIndices = indices.sort(() => 0.5 - Math.random());

    let currentSearchIndex = 0;

    for (const index of shuffledIndices) {
      if (translatedCount >= targetTranslationCount) break;

      const word = words[index];
      const wordStartIndex = textNode.textContent?.indexOf(
        word,
        currentSearchIndex
      );

      if (wordStartIndex !== -1 && wordStartIndex !== undefined) {
        wordsToTranslate.push({
          textNode,
          word,
          wordIndexInNode: wordStartIndex
        });
        translatedCount++;
        currentSearchIndex = wordStartIndex + word.length;
      } else {
        console.warn(
          `Could not find word "${word}" at index ${index} in node:`,
          textNode.textContent
        );
        currentSearchIndex = 0;
      }
    }
  }

  for (const item of wordsToTranslate) {
    const spanElement = wrapWordInSpan(
      item.textNode,
      item.word,
      item.wordIndexInNode
    );

    if (spanElement) {
      const payload: DeepLTranslationRequestPayload = {
        text: item.word,
        targetLang: targetLang,
        ...(sourceLang && sourceLang !== "auto" && { sourceLang: sourceLang })
      };

      console.log("Sending to background:", payload);

      chrome.runtime.sendMessage(
        { action: "translate", payload },
        (response) => {
          if (chrome.runtime.lastError) {
            console.error(
              "Error sending message:",
              chrome.runtime.lastError.message
            );

            spanElement.textContent = `[Error: ${item.word}]`;
            spanElement.style.color = "red";
            return;
          }

          if (response?.success) {
            console.log(
              `Translation received for "${item.word}":`,
              response.translatedText
            );
            spanElement.textContent = response.translatedText;
          } else {
            console.error(
              `Translation failed for "${item.word}":`,
              response?.error
            );

            spanElement.textContent = `[${item.word}]`;
            spanElement.style.fontStyle = "italic";
            spanElement.style.color = "gray";
          }
        }
      );
    }
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () =>
    processNode(document.body)
  );
} else {
  processNode(document.body);
}

const observer = new MutationObserver((mutationsList) => {
  let nodesWereAdded = false;
  for (const mutation of mutationsList) {
    if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
      nodesWereAdded = true;

      mutation.addedNodes.forEach((newNode) => {
        if (
          newNode.nodeType === Node.ELEMENT_NODE &&
          (newNode as Element).classList.contains(TRANSLATED_WORD_CLASS)
        ) {
          return;
        }

        if (
          newNode.nodeType === Node.ELEMENT_NODE ||
          newNode.nodeType === Node.TEXT_NODE
        ) {
          processNode(newNode);
        }
      });
    }
  }
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});

console.log(
  "Language Learning Extension: Content script loaded and observer started."
);

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "reprocessPage") {
    console.log("Reprocessing page on request from background.");
    processNode(document.body);
    sendResponse({ success: true });
  }
});
