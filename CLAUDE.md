# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a JavaScript tracking snippet library called "LiftPilot" that provides web analytics and user interaction tracking. The library is built as an IIFE (Immediately Invoked Function Expression) bundle that exposes a global `window.LPTracker` object with three main methods: `init()`, `sendEvent()`, and `getEvents()`.

## Development Commands

### Build and Development
- `npm run build` - Build production bundle to `dist/lptracker.js` using Vite
- `npm run dev` - Start Vite development server
- `npm run lint` - Run ESLint with auto-fix on `src/` directory
- `npm run format` - Format code using Prettier

### Installation
- `npm install` - Install dependencies

## Architecture

### Core Structure
- **Entry Point**: `src/index.js` - Imports polyfills and exposes the main API
- **Core Module**: `src/components/trackerCore.js` - Main tracking logic with init, sendEvent, getEvents
- **Tracking Components**: Individual modules for different tracking types

### Key Components
- `trackerCore.js` - Central API and event sending logic, manages LP_COOKIE for user identification
- `cookie.js` - Cookie management utilities
- `idGenerator.js` - Generates unique IDs using ULID library
- `routeTracker.js` - SPA route change tracking with viewport and referrer data
- `formTracker.js` - Form submission tracking with field extraction (name, email, company)
- `inputTracker.js` - Real-time input validation and tracking with debouncing

### Build Configuration
- Uses Vite with Babel for ES5 compatibility (targets IE 11)
- Builds as IIFE format for direct browser inclusion
- Includes polyfills for Promise, URLSearchParams, fetch, and regenerator-runtime
- Output: `dist/lptracker.js`

### API Design
The library requires initialization with a base URL and automatically:
1. Creates/manages LP_COOKIE for user identification
2. Sets up automatic route, form, and input tracking
3. Sends events to `{baseUrl}/events` with `x-cid` header containing cookie value

### Event System
- All events sent as POST requests with JSON payload: `{name, value}`
- Cookie value sent via `x-cid` header for user identification
- GET requests to `{baseUrl}/events/{name}` for event retrieval