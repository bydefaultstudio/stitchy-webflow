---
title: "JavaScript"
subtitle: "JavaScript coding standards and organization guidelines"
description: "Guide defining how JavaScript should be structured and organized."
author: "Studio"
section: "Docs"
layer: "app"
subsection: "Code Standards"
order: 1
status: "published"
access: "team"
client: "internal"
---

## Overview

This structure ensures readable, modular, and maintainable JavaScript with clear organization.

---

## File Structure

Every JavaScript file should follow this organizational pattern:

```js
/**
 * Script Purpose: [Brief description]
 * Author: [Your Name]
 * Created: [Date]
 * Version: [Latest Version]
 * Last Updated: [Date]
 */

console.log("Script Name v1.0.0");

//
//------- Utility Functions -------//
//

// Function Name
function utilityFunction() {
  // ... implementation
}

//
//------- Main Functions -------//
//

// Initialize Component
function initComponent() {
  // ... implementation
}

//
//------- Event Listeners -------//
//

// Setup Event Listeners
function setupEventListeners() {
  // ... implementation
}

//
//------- Initialize -------//
//

document.addEventListener("DOMContentLoaded", () => {
  initComponent();
  setupEventListeners();
});
```

---

## Section Organization

1. **File Header** - Comment block with purpose, author, dates, version
2. **Console Log** - ONE `console.log()` at the top to confirm script loaded
3. **Utility Functions** - Reusable helper functions grouped together
4. **Main Functions** - Primary functionality grouped together
5. **Event Listeners** - Event handling functions grouped together
6. **Initialize** - All setup calls within `DOMContentLoaded` listener at the end

---

## Section Dividers

Use clear headers when grouping similar functions:

```js
//
//------- Section Name -------//
//
```

For standalone functions, use simple comments:

```js
// Function Name
function doSomething() {
  // ... implementation
}
```

---

## Naming Conventions

| Type | Example | Rule |
|------|---------|------|
| Functions | `initSlider()`, `handleClick()` | Use **lower camelCase**, short & descriptive |
| Variables | `mainElement`, `scrollPos` | Contextual and readable |
| File Names | `slider.js`, `utils.js` | Use lowercase kebab-case |
| Constants | `MAX_ITEMS`, `API_URL` | Use UPPER_SNAKE_CASE |

---

## Initialization Pattern

1. Define **utility functions** first
2. Define **main functions** grouped by section
3. Define **event listeners** separately
4. Call everything within a single `DOMContentLoaded` listener **at the end**

---

## Console Logging

**Each script should include ONE `console.log()` at the top** to confirm the script has loaded. Don't add excessive console logs throughout your code.

---

## Rules to Follow

### Organization

- ✅ Group related functions together
- ✅ Use section dividers for major groupings
- ✅ Place initialization at the end
- ✅ Keep utility functions separate from main functions

### Commenting

- ✅ Include file header with metadata
- ✅ Comment each function with its purpose
- ✅ Use section dividers for major groupings

### Code Quality

- ✅ Use descriptive function names
- ✅ Follow naming conventions consistently
- ✅ Place initialization in `DOMContentLoaded` listener

### What to Avoid

- ❌ Scattering related functions across the file
- ❌ Mixing utility functions with main functions
- ❌ Multiple initialization points
- ❌ Excessive console logging
