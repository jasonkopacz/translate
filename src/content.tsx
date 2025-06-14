import { TranslationSettings, WordTranslation } from './types';

interface TranslatedWord {
  original: string;
  translated: string;
  element: HTMLElement;
  originalText: string;
}

class SmartTranslator {
  private translatedWords: TranslatedWord[] = [];
  private isTranslating = false;
  private settings: TranslationSettings | null = null;

  constructor() {
    this.init();
  }

  private init() {
    this.setupMessageListener();
    this.setupStyles();
  }

  private setupMessageListener() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      switch (request.action) {
        case 'translate':
        case 'auto-translate':
          this.translatePage(request.settings);
          break;
        case 'restore':
          this.restoreOriginalText();
          break;
      }
    });
  }

  private setupStyles() {
    if (document.getElementById('smart-translate-styles')) return;

    const style = document.createElement('style');
    style.id = 'smart-translate-styles';
    style.textContent = `
      .smart-translate-word {
        text-decoration: underline;
        text-decoration-color: #3b82f6;
        text-decoration-thickness: 2px;
        cursor: help;
        position: relative;
      }
      
      .smart-translate-tooltip {
        position: absolute;
        bottom: 100%;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0, 0, 0, 0.9);
        color: white;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
        white-space: nowrap;
        z-index: 10000;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.2s;
      }
      
      .smart-translate-tooltip::after {
        content: '';
        position: absolute;
        top: 100%;
        left: 50%;
        transform: translateX(-50%);
        border: 4px solid transparent;
        border-top-color: rgba(0, 0, 0, 0.9);
      }
      
      .smart-translate-word:hover .smart-translate-tooltip {
        opacity: 1;
      }
    `;
    document.head.appendChild(style);
  }

  private async translatePage(settings: TranslationSettings) {
    if (this.isTranslating) return;
    
    this.isTranslating = true;
    this.settings = settings;

    try {
      this.restoreOriginalText();
      
      const textNodes = this.getTextNodes();
      const wordsToTranslate = this.selectWordsToTranslate(textNodes, settings.percentage);
      
      await this.translateWords(wordsToTranslate, settings);
    } catch (error) {
      console.error('Translation error:', error);
    } finally {
      this.isTranslating = false;
    }
  }

  private getTextNodes(): Text[] {
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          const parent = node.parentElement;
          if (!parent) return NodeFilter.FILTER_REJECT;
          
          const tagName = parent.tagName.toLowerCase();
          const excludedTags = ['script', 'style', 'noscript', 'svg', 'canvas'];
          const excludedRoles = ['button', 'navigation', 'menu'];
          
          if (excludedTags.includes(tagName)) return NodeFilter.FILTER_REJECT;
          if (parent.getAttribute('role') && excludedRoles.includes(parent.getAttribute('role')!)) {
            return NodeFilter.FILTER_REJECT;
          }
          
          const text = node.textContent?.trim();
          if (!text || text.length < 3) return NodeFilter.FILTER_REJECT;
          
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    const textNodes: Text[] = [];
    let node;
    while (node = walker.nextNode()) {
      textNodes.push(node as Text);
    }

    return textNodes;
  }

  private selectWordsToTranslate(textNodes: Text[], percentage: number): Array<{word: string, node: Text, index: number}> {
    const allWords: Array<{word: string, node: Text, index: number}> = [];

    textNodes.forEach(textNode => {
      const text = textNode.textContent || '';
      const words = text.split(/\s+/).filter(word => word.length > 2);
      
      words.forEach((word, index) => {
        const cleanWord = word.replace(/[^\w\s]/g, '').toLowerCase();
        if (cleanWord.length > 2) {
          allWords.push({ word: cleanWord, node: textNode, index });
        }
      });
    });

    this.prioritizeWords(allWords);

    const totalWords = allWords.length;
    const wordsToTranslate = Math.ceil((totalWords * percentage) / 100);
    
    return allWords.slice(0, wordsToTranslate);
  }

  private prioritizeWords(words: Array<{word: string, node: Text, index: number}>) {
    words.sort((a, b) => {
      const aParent = a.node.parentElement!;
      const bParent = b.node.parentElement!;
      
      const aPriority = this.getElementPriority(aParent);
      const bPriority = this.getElementPriority(bParent);
      
      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }
      
      return Math.random() - 0.5;
    });
  }

  private getElementPriority(element: HTMLElement): number {
    const tagName = element.tagName.toLowerCase();
    const classList = Array.from(element.classList);
    const id = element.id.toLowerCase();
    
    if (['h1', 'h2', 'h3'].includes(tagName)) return 10;
    if (['h4', 'h5', 'h6'].includes(tagName)) return 9;
    if (tagName === 'p') return 8;
    if (['article', 'main', 'section'].includes(tagName)) return 7;
    if (classList.some(cls => cls.includes('title') || cls.includes('heading'))) return 9;
    if (classList.some(cls => cls.includes('content') || cls.includes('text'))) return 6;
    if (id.includes('content') || id.includes('main')) return 6;
    if (['nav', 'aside', 'footer'].includes(tagName)) return 2;
    if (classList.some(cls => cls.includes('nav') || cls.includes('menu'))) return 1;
    
    return 5;
  }

  private async translateWords(wordsToTranslate: Array<{word: string, node: Text, index: number}>, settings: TranslationSettings) {
    const batchSize = 10;
    const batches = [];
    
    for (let i = 0; i < wordsToTranslate.length; i += batchSize) {
      batches.push(wordsToTranslate.slice(i, i + batchSize));
    }

    for (const batch of batches) {
      await this.translateBatch(batch, settings);
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  private async translateBatch(batch: Array<{word: string, node: Text, index: number}>, settings: TranslationSettings) {
    const uniqueWords = [...new Set(batch.map(item => item.word))];
    const textToTranslate = uniqueWords.join('\n');

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'translate',
        text: textToTranslate,
        settings: settings
      });

      if (response.success) {
        const translations = response.data.split('\n');
        const translationMap = new Map();
        
        uniqueWords.forEach((word, index) => {
          if (translations[index]) {
            translationMap.set(word, translations[index].trim());
          }
        });

        batch.forEach(item => {
          const translation = translationMap.get(item.word);
          if (translation && translation !== item.word) {
            this.replaceWordInTextNode(item.node, item.word, translation);
          }
        });
      }
    } catch (error) {
      console.error('Batch translation error:', error);
    }
  }

  private replaceWordInTextNode(textNode: Text, originalWord: string, translation: string) {
    const parent = textNode.parentElement;
    if (!parent) return;

    const text = textNode.textContent || '';
    const regex = new RegExp(`\\b${originalWord}\\b`, 'gi');
    
    if (regex.test(text)) {
      const span = document.createElement('span');
      span.className = 'smart-translate-word';
      span.textContent = translation;
      
      const tooltip = document.createElement('div');
      tooltip.className = 'smart-translate-tooltip';
      tooltip.textContent = originalWord;
      span.appendChild(tooltip);

      const newText = text.replace(regex, `<TRANSLATE_PLACEHOLDER>`);
      const parts = newText.split('<TRANSLATE_PLACEHOLDER>');
      
      if (parts.length > 1) {
        const fragment = document.createDocumentFragment();
        
        parts.forEach((part, index) => {
          if (part) {
            fragment.appendChild(document.createTextNode(part));
          }
          if (index < parts.length - 1) {
            fragment.appendChild(span.cloneNode(true));
          }
        });

        this.translatedWords.push({
          original: originalWord,
          translated: translation,
          element: parent,
          originalText: text
        });

        parent.replaceChild(fragment, textNode);
      }
    }
  }

  private restoreOriginalText() {
    this.translatedWords.forEach(item => {
      const translatedElements = item.element.querySelectorAll('.smart-translate-word');
      translatedElements.forEach(el => {
        el.replaceWith(document.createTextNode(el.textContent || ''));
      });
    });

    this.translatedWords = [];

    const allTranslatedElements = document.querySelectorAll('.smart-translate-word');
    allTranslatedElements.forEach(el => {
      el.replaceWith(document.createTextNode(el.textContent || ''));
    });
  }
}

if (typeof window !== 'undefined' && !window.smartTranslator) {
  (window as any).smartTranslator = new SmartTranslator();
}

export {};