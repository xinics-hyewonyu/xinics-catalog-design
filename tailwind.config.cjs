/**
 * Tailwind config — XDS preset bridge for Tailwind v4 (loaded via @config in globals.css).
 * App theme tokens come from /design-system/tailwind.preset.cjs (read-only).
 */
const xdsPreset = require("./design-system/tailwind.preset.cjs");

/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [xdsPreset],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
};
