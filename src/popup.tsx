// src/popup/Popup.tsx

import React, { useState, useEffect, useCallback } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import * as popupStyles from "./popup.css";
interface ExtensionSettings {
  sourceLang?: string;
  targetLang?: string;
  percentage?: number;
}

const languageOptions: object[] = {};

const targetLanguageOptions = languageOptions.filter(
  (lang) => lang["label"] !== "auto"
);

function Popup() {
  const [sourceLang, setSourceLang] = useState<string>("auto");
  const [targetLang, setTargetLang] = useState<string>("ES");
  const [percentage, setPercentage] = useState<number>(10);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    chrome.storage.sync.get(
      ["sourceLang", "targetLang", "percentage"],
      (result: ExtensionSettings) => {
        if (chrome.runtime.lastError) {
          console.error("Error loading settings:", chrome.runtime.lastError);
          setIsLoading(false);
          return;
        }
        console.log("Settings loaded:", result);
        if (result.sourceLang) {
          setSourceLang(result.sourceLang);
        }
        if (result.targetLang) {
          setTargetLang(result.targetLang);
        }
        if (result.percentage !== undefined) {
          setPercentage(result.percentage);
        }
        setIsLoading(false);
      }
    );
  });

  const handleSourceLangChange = useCallback((value: string) => {
    setSourceLang(value);
    chrome.storage.sync.set({ sourceLang: value }, () => {
      if (chrome.runtime.lastError) {
        console.error("Error saving sourceLang:", chrome.runtime.lastError);
      } else {
        console.log("Source language saved:", value);
      }
    });
  }, []);

  const handleTargetLangChange = useCallback((value: string) => {
    setTargetLang(value);
    chrome.storage.sync.set({ targetLang: value }, () => {
      if (chrome.runtime.lastError) {
        console.error("Error saving targetLang:", chrome.runtime.lastError);
      } else {
        console.log("Target language saved:", value); // Debug log
      }
    });
  }, []);

  const handlePercentageChange = useCallback((value: number) => {
    const newPercentage = value;
    setPercentage(newPercentage);
    chrome.storage.sync.set({ percentage: newPercentage }, () => {
      if (chrome.runtime.lastError) {
        console.error("Error saving percentage:", chrome.runtime.lastError);
      } else {
        console.log("Percentage saved:", newPercentage);
      }
    });
  }, []);

  if (isLoading) {
    return <div className="popup-container loading">Loading...</div>;
  }

  return (
    <div className="popup-container">
      <h2>Language Settings</h2>

      <div className="setting-group">
        <Label htmlFor="source-lang-select">Translate From:</Label>
        <Select value={sourceLang} onValueChange={handleSourceLangChange}>
          <SelectTrigger id="source-lang-select" className="w-full">
            <SelectValue placeholder="Select source language" />
          </SelectTrigger>
          <SelectContent>
            {languageOptions.map((lang) => (
              <SelectItem key={lang["label"]} value={lang["value"]}>
                {lang.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="setting-group">
        <Label htmlFor="target-lang-select">Translate To:</Label>
        <Select value={targetLang} onValueChange={handleTargetLangChange}>
          <SelectTrigger id="target-lang-select" className="w-full">
            <SelectValue placeholder="Select target language" />
          </SelectTrigger>
          <SelectContent>
            {targetLanguageOptions.map((lang) => (
              <SelectItem key={lang.value} value={lang.value}>
                {lang.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="setting-group">
        <div className="slider-label">
          <Label htmlFor="percentage-slider">Translate Percentage:</Label>
          <span>{percentage}%</span>
        </div>
        <Slider
          id="percentage-slider"
          defaultValue={[percentage]} // Initial value
          value={[percentage]} // Controlled value
          max={100}
          step={5} // Adjust step as needed (e.g., 1, 5, 10)
          className="w-full"
          onValueChange={handlePercentageChange} // Use onValueChange for slider [5]
        />
      </div>

      {/* Optional Save Button - uncomment if you prefer explicit saving
      <div className="setting-group button-group">
        <Button onClick={handleSaveSettings} className="w-full">Save Settings</Button>
      </div>
      */}
    </div>
  );
}

export default Popup;
