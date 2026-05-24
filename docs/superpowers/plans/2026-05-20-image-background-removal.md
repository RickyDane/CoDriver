# Image Background Removal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a "Remove Background" feature in the image edit modal that uses Gemini AI to create transparent PNG cutouts.

**Architecture:** Add a new tab to the image edit modal in the frontend (JS) that calls a new Tauri command in the backend (Rust). The backend will communicate with the Gemini 3.1 Flash Image model to perform the background removal.

**Tech Stack:** Rust (Tauri, reqwest, serde_json, base64), JavaScript (jQuery-like DOM manipulation in `main_logic.js`).

---

### Task 1: Backend Implementation

**Files:**
- Modify: `src-tauri/src/main.rs`

- [ ] **Step 1: Add `remove_background` command**
- [ ] **Step 2: Register command in `generate_handler!`**
- [ ] **Step 3: Verify compilation**
- [ ] **Step 4: Commit**

### Task 2: Frontend UI - Tab and View

**Files:**
- Modify: `ui/main_logic.js`

- [ ] **Step 1: Add tab button to HTML template**
- [ ] **Step 2: Add tab view to HTML template**
- [ ] **Step 3: Add footer button to HTML template**
- [ ] **Step 4: Commit**

### Task 3: Frontend Logic - Tab Switching and Initialization

**Files:**
- Modify: `ui/main_logic.js`

- [ ] **Step 1: Initialize default filename**
- [ ] **Step 2: Update tab switching logic**
- [ ] **Step 3: Add input focus listeners**
- [ ] **Step 4: Commit**

### Task 4: Frontend Logic - Execution

**Files:**
- Modify: `ui/main_logic.js`

- [ ] **Step 1: Add click listener for `bg-remove-item-button`**
- [ ] **Step 2: Add Enter key listener**
- [ ] **Step 3: Final verification of `showImageEditPopup`**
- [ ] **Step 4: Commit**
