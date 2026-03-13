# YouTube Comment Navigator 95

[![CI](https://github.com/baturkacamak/youtube-comment-navigator-95/actions/workflows/ci.yml/badge.svg)](https://github.com/baturkacamak/youtube-comment-navigator-95/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/version-1.10.0-blue.svg)](https://github.com/baturkacamak/youtube-comment-navigator-95/releases)

## Overview

YouTube Comment Navigator 95 is a Chrome extension designed to enhance your YouTube experience by improving the comments section. It makes it easier to search, filter, and navigate through comments, helping you find specific feedback, popular comments, or replies more efficiently.

## ✨ Features

- 🤖 **Local Intelligence**: Unlock deep insights with on-device AI. Generate executive summaries, analyze sentiment (Vibe Check), discover unanswered questions (Smart Q&A), and more—all running locally for privacy and speed.
- 🔍 **Real-time Comment Search**: Quickly find comments by typing keywords. The search is dynamic and updates results as you type.
- ⏬ **Load More Comments**: Effortlessly load more comments with a single click, ensuring you never miss out on any discussions.
- 🔎 **Filter Comments**: Apply various filters to view only the comments that matter to you, such as filtering by likes, replies, or specific keywords.
- 🌙 **Dark Mode Support**: Seamlessly integrates with YouTube's dark mode, providing a comfortable viewing experience in low-light environments.
- 📊 **Advanced Sorting**: Sort comments based on different criteria like likes, replies, date, and more, allowing you to prioritize the most relevant discussions.
- 🌐 **Multilingual Support**: Choose your preferred language from a wide range of options, making the extension accessible to a global audience.
- 🔄 **Randomize Order**: Randomize the order of comments for a fresh perspective, perfect for discovering new insights or opinions.
- 🧩 **Customizable Themes**: Switch between different themes to personalize your experience and match your aesthetic preferences.
- 📋 **Bookmark Comments**: Bookmark your favorite comments and view them later, ensuring you can easily return to important discussions.
- 🛠️ **Tooltips**: Get additional information and context with hover tooltips, enhancing your understanding of various features.
- 🕒 **Accurate Time Display**: View the accurate time when comments were published, even for bookmarked comments, which recalculates the relative time based on the current date.
- 📌 **Pin Comments**: Pin important comments to the top of the list for quick access.
- 🔔 **Notifications**: Receive notifications for new comments or replies, keeping you updated on ongoing discussions.
- 📁 **Export Comments**: Export comments to a file for offline reading or analysis.
- 🔗 **Link Sharing**: Easily share links to specific comments with friends or colleagues.
- 📈 **Analytics Dashboard**: View analytics on comment activity, such as the most active users or trending topics.
- 🔒 **Privacy Controls**: Manage your data with robust privacy controls, ensuring your information is secure.
- ⚙️ **Customizable Settings**: Adjust settings to tailor the extension to your needs, including notification preferences and display options.
- 🚀 **High Performance**: Built with **IndexedDB** for massive storage capacity and **Virtualization** (React Window) to render thousands of comments smoothly without lag.
- 🎥 **Video Transcripts**: Access and search the full video transcript with clickable timestamps to jump to specific moments.
- 💬 **Live Chat & Replay**: Fetch and browse live chat messages from past streams (Live Chat Replay), complete with search functionality.
- 🔡 **Typography Control**: Customize the font family and text size to ensure the most comfortable reading experience.
- 💾 **Universal Export**: Export not just comments, but also transcripts and live chat logs, with support for formats like SRT (for transcripts).
- 🚀 **Smart Loading**: Use the "Load All" feature to simultaneously fetch comments, transcripts, and live chat data for a comprehensive view.

## 🚀 Installation

### Prerequisites

- A Chromium-based browser (e.g., Google Chrome, Microsoft Edge, Brave, Opera)
- **Node.js** (v18 or higher)
- **Just** command runner (optional, for easier workflow)

### Steps to Install

1. **Download the Extension**

   [📥 Download the latest version here](#)

2. **Open Extensions Page**

   Open your browser and navigate to the extensions page (`chrome://extensions/` for Chrome and Edge, `brave://extensions/` for Brave, `opera://extensions/` for Opera).

3. **Enable Developer Mode**

   Toggle the "Developer mode" switch in the top right corner.

4. **Load Unpacked Extension**

   Click "Load unpacked" and select the folder where you extracted the extension.

## 💡 Usage

1. **Navigate to a YouTube Video**

   Open YouTube and play any video.

2. **Open the Extension**

   Click on the YouTube Comment Navigator 95 icon in the browser toolbar.

3. **Search and Filter Comments**

   Use the search bar and filters to find and organize comments as per your needs.

4. **Load More Comments**

   Click the "Load More Comments" button to fetch additional comments.

5. **Bookmark Comments**

   Bookmark your favorite comments by clicking the bookmark icon next to each comment. View bookmarked comments later from the bookmarks section.

6. **Accurate Time Display**

   View the accurate time when comments were published, even for bookmarked comments, which recalculates the relative time based on the current date.

## 🛠️ Support and Feedback

For any issues, suggestions, or feedback, please contact the author Batur Kacamak at [📧 hello@batur.info](mailto:hello@batur.info).

## 📜 License

This project is licensed under the MIT License. For more details, see the [LICENSE](LICENSE) file.

## 🙏 Acknowledgements

- ❤️ **React**
- ⚡ **Vite**
- 📦 **Redux Toolkit**
- 💅 **TailwindCSS**
- 🧪 **Vitest**
- 📝 **TypeScript**
- 💾 **Dexie.js** (IndexedDB wrapper)
- 🏎️ **React Window** (Virtualization)

I hope you enjoy using YouTube Comment Navigator 95 and that it enhances your YouTube browsing experience! 😊

## 🧑‍💻 Development Guide

### Setting Up

1.  **Install Dependencies:**

    ```bash
    npm install
    ```

2.  **Start Development Server (with Hot Module Replacement):**

    ```bash
    npm run dev
    ```

    - This starts Vite in watch mode.
    - Go to `chrome://extensions/` in your browser.
    - Enable **Developer mode**.
    - Click **Load unpacked** and select the `dist` folder in this project.
    - Any changes you make to `src/` will instantly update in the browser.

3.  **Build for Production:**

    ```bash
    npm run build
    # OR
    just package
    ```

    - Creates an optimized build in the `dist/` folder.
    - `just package` will creates a generic zip file for distribution.

4.  **Run Tests:**

    ```bash
    npm test
    ```

    - Runs the test suite using Vitest.

### Available Scripts

- **dev**: `vite` - Starts the development server with HMR.
- **build**: `tsc && vite build && npm run build:css` - Type-checks and builds the production version.
- **preview**: `vite preview` - Preview the build locally.
- **test**: `vitest` - Runs unit tests.
- **test:ui**: `vitest --ui` - Runs tests with a UI interface.
- **build:css**: Converts `rem` units to `em` in the build output for better scaling within the extension.
- **build:css:rtl**: Generates RTL CSS support.

### Release Workflow

We use `just` to simplify release tasks:

- **Update Version:**

  ```bash
  just bump        # Interactive menu
  just bump 1.10.0  # Direct update
  ```

  Updates `package.json` and `manifest.json`, creates a git commit and tag.

- **Package Extension:**
  ```bash
  just package
  ```
  Builds the project and creates a zip file (e.g., `youtube-comment-navigator-95_v1.10.0.zip`).

## 🛠️ Tech Stack

- ❤️ **React** (v18)
- ⚡ **Vite** (Build Tool & HMR)
- 🧩 **CRXJS** (Chrome Extension Integration)
- 🧪 **Vitest** (Testing)
- 📦 **Redux Toolkit** (State Management)
- 💅 **TailwindCSS** (Styling)
- 📝 **TypeScript** (Language)
- 💾 **Dexie.js** (IndexedDB)
- 🪟 **React Window** (List Virtualization)
