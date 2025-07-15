import React, { useState, useEffect } from "react";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "./components/ui/select";
import { TranslationSettings, SUPPORTED_LANGUAGES } from "./types";
import { RotateCcw, Settings, Globe } from "lucide-react";

declare const process: { env: { [key: string]: string | undefined } };

const Popup: React.FC = () => {
  const [settings, setSettings] = useState<TranslationSettings>({
    fromLanguage: "auto",
    toLanguage: "EN",
    percentage: 25,
    isEnabled: true
  });
  const [isLoading, setIsLoading] = useState(false);
  const [hasTranslated, setHasTranslated] = useState(false);

  useEffect(() => {
    loadSettings();
    // Store API key in chrome.storage.sync if not already set
    if (typeof chrome !== "undefined" && chrome.storage) {
      const apiKey = process.env.REACT_APP_DEEPL_API_KEY;
      if (apiKey && apiKey !== "your_deepl_api_key_here") {
        chrome.storage.sync.get(["deeplApiKey"], (result) => {
          if (!result.deeplApiKey) {
            chrome.storage.sync.set({ deeplApiKey: apiKey });
          }
        });
      }
    }
  }, []);

  const loadSettings = async () => {
    try {
      if (typeof chrome !== "undefined" && chrome.storage) {
        const result = await chrome.storage.sync.get(["translationSettings"]);
        if (result.translationSettings) {
          setSettings(result.translationSettings);
        }
      }
    } catch (error) {
      console.error("Error loading settings:", error);
    }
  };

  const saveSettings = async (newSettings: TranslationSettings) => {
    try {
      if (typeof chrome !== "undefined" && chrome.storage) {
        await chrome.storage.sync.set({ translationSettings: newSettings });
      }
      setSettings(newSettings);
    } catch (error) {
      console.error("Error saving settings:", error);
    }
  };

  const handlePercentageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Math.max(1, Math.min(100, parseInt(e.target.value) || 25));
    const newSettings = { ...settings, percentage: value };
    saveSettings(newSettings);
  };

  const handleLanguageChange = (
    field: "fromLanguage" | "toLanguage",
    value: string
  ) => {
    const newSettings = { ...settings, [field]: value };
    saveSettings(newSettings);
  };

  const handleTranslateNow = async () => {
    console.log("handleTranslateNow", settings);
    if (!settings.isEnabled) return;

    console.log("handleTranslateNow", settings);
    setIsLoading(true);
    try {
      if (typeof chrome !== "undefined" && chrome.tabs) {
        const [tab] = await chrome.tabs.query({
          active: true,
          currentWindow: true
        });
        if (tab.id) {
          await chrome.tabs.sendMessage(tab.id, {
            action: "translate",
            settings: settings
          });
          setHasTranslated(true);
        }
      }
    } catch (error) {
      console.error("Error sending translate message:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestoreOriginal = async () => {
    setIsLoading(true);
    try {
      if (typeof chrome !== "undefined" && chrome.tabs) {
        const [tab] = await chrome.tabs.query({
          active: true,
          currentWindow: true
        });
        if (tab.id) {
          await chrome.tabs.sendMessage(tab.id, {
            action: "restore"
          });
          setHasTranslated(false);
        }
      }
    } catch (error) {
      console.error("Error sending restore message:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleEnabled = () => {
    const newSettings = { ...settings, isEnabled: !settings.isEnabled };
    saveSettings(newSettings);
  };

  return (
    <div className="w-80 p-6 bg-background text-foreground">
      <div className="flex items-center gap-2 mb-6">
        <Globe className="h-5 w-5 text-primary" />
        <h1 className="text-lg font-semibold">Smart Translate</h1>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Enable Translation</Label>
          <Button
            variant={settings.isEnabled ? "default" : "outline"}
            size="sm"
            onClick={toggleEnabled}
          >
            {settings.isEnabled ? "ON" : "OFF"}
          </Button>
        </div>

        <div className="space-y-2">
          <Label htmlFor="from-language">From Language</Label>
          <Select
            value={settings.fromLanguage}
            onValueChange={(value) =>
              handleLanguageChange("fromLanguage", value)
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select source language" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">Auto-detect</SelectItem>
              {SUPPORTED_LANGUAGES.map((lang) => (
                <SelectItem key={lang.code} value={lang.code}>
                  {lang.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="to-language">To Language</Label>
          <Select
            value={settings.toLanguage}
            onValueChange={(value) => handleLanguageChange("toLanguage", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select target language" />
            </SelectTrigger>
            <SelectContent>
              {SUPPORTED_LANGUAGES.map((lang) => (
                <SelectItem key={lang.code} value={lang.code}>
                  {lang.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="percentage">Translation Percentage</Label>
          <div className="flex items-center gap-2">
            <Input
              id="percentage"
              type="number"
              min="1"
              max="100"
              value={settings.percentage}
              onChange={handlePercentageChange}
              className="w-20"
            />
            <span className="text-sm text-muted-foreground">%</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Percentage of words to translate on each page
          </p>
        </div>

        <div className="flex gap-2 pt-4">
          <Button
            onClick={handleTranslateNow}
            disabled={!settings.isEnabled || isLoading}
            className="flex-1"
          >
            {isLoading ? (
              <Settings className="h-4 w-4 animate-spin" />
            ) : (
              "Translate Now"
            )}
          </Button>

          {hasTranslated && (
            <Button
              variant="outline"
              onClick={handleRestoreOriginal}
              disabled={isLoading}
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          )}
        </div>

        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground text-center">
            Powered by DeepL API
          </p>
        </div>
      </div>
    </div>
  );
};

export default Popup;
