const fs = require("fs-extra");
const path = require("path");
const esbuild = require("esbuild");
const dotenv = require("dotenv");
dotenv.config();

// Ensure the build directory exists
const buildDir = path.join(__dirname, "build");

// Copy manifest.json to build directory
fs.copySync(
  path.join(__dirname, "public", "manifest.json"),
  path.join(buildDir, "manifest.json")
);

// Copy any other static assets from public
fs.copySync(path.join(__dirname, "public"), buildDir, {
  filter: (src) => {
    // Don't copy index.html as it's not needed for the extension
    return !src.endsWith("index.html");
  }
});

// Compile popup script with injected env variable
esbuild.buildSync({
  entryPoints: ["src/popup-entry.tsx"],
  bundle: true,
  outfile: path.join(buildDir, "popup.js"),
  format: "iife",
  target: "es2015",
  external: ["chrome"],
  define: {
    "process.env.NODE_ENV": '"production"',
    "process.env.REACT_APP_DEEPL_API_KEY": JSON.stringify(
      process.env.REACT_APP_DEEPL_API_KEY || ""
    )
  }
});

// Create popup.html for the extension popup
const popupHtml = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Smart Translate</title>
  </head>
  <body>
    <div id="root"></div>
    <script src="popup.js"></script>
  </body>
</html>
`;

fs.writeFileSync(path.join(buildDir, "popup.html"), popupHtml);

// Update manifest.json to use popup.html
const manifestPath = path.join(buildDir, "manifest.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
manifest.action.default_popup = "popup.html";
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

// Compile content script
esbuild.buildSync({
  entryPoints: ["src/content.tsx"],
  bundle: true,
  outfile: path.join(buildDir, "content.js"),
  format: "iife",
  target: "es2015",
  external: ["chrome"],
  define: {
    "process.env.NODE_ENV": '"production"'
  }
});

// Compile background script
esbuild.buildSync({
  entryPoints: ["src/background.tsx"],
  bundle: true,
  outfile: path.join(buildDir, "background.js"),
  format: "iife",
  target: "es2015",
  external: ["chrome"],
  define: {
    "process.env.NODE_ENV": '"production"'
  }
});

console.log("Chrome extension build completed successfully!");
