# 🎉 YouTube Comment Navigator 95 🎉

## Overview

YouTube Comment Navigator 95 is a Chrome extension designed to enhance your YouTube experience by improving the comments section. It makes it easier to search, filter, and navigate through comments, helping you find specific feedback, popular comments, or replies more efficiently.

## ✨ Features

- 🔍 **Real-time Comment Search**: Quickly find comments by typing keywords.
- ⏬ **Load More Comments**: Effortlessly load more comments with a single click.
- 🔎 **Filter Comments**: Apply various filters to view only the comments that matter to you.
- 🌙 **Dark Mode Support**: Seamlessly integrates with YouTube's dark mode.
- 📊 **Advanced Sorting**: Sort comments based on different criteria like likes, replies, and more.
- 🌐 **Multilingual Support**: Choose your preferred language from a wide range of options.
- 🔄 **Randomize Order**: Randomize the order of comments for a fresh perspective.
- 🧩 **Customizable Themes**: Switch between different themes to personalize your experience.
- 📋 **Bookmark Comments**: Bookmark your favorite comments and view them later.
- 🛠️ **Tooltips**: Get additional information and context with hover tooltips.
- 🕒 **Accurate Time Display**: View the accurate time when comments were published, even for bookmarked comments.

## 🚀 Installation

### Prerequisites

- A Chromium-based browser (e.g., Google Chrome, Microsoft Edge, Brave, Opera)

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
- 📦 **Redux**
- 💅 **TailwindCSS**
- 🔧 **Webpack**
- ⚙️ **Babel**
- 📝 **TypeScript**

I hope you enjoy using YouTube Comment Navigator 95 and that it enhances your YouTube browsing experience! 😊

## 📜 Scripts

The following scripts are available in the `package.json` to help with development and building:

### General Scripts
- **start**: `react-scripts start` - Starts the development server.
- **build**: `npm test && react-scripts build && npm run build:css` - Runs tests and builds the project.
- **build:css**: `sed -i 's/rem/em/g' build/static/css/main.*.css` - Converts CSS units from rem to em.
- **build:css:rtl**: `rtlcss input.css output-rtl.css` - Converts CSS for right-to-left languages.
- **test**: `jest` - Runs the test suite.
- **eject**: `react-scripts eject` - Ejects the create-react-app configuration.

### Webpack Scripts
- **webpack-start**: `webpack serve --config webpack.dev.js` - Starts the webpack development server.
- **webpack-build**: `webpack --config webpack.prod.js && node generate-asset-manifest.js dist production && sed -i 's/rem/em/g' dist/static/css/main.css` - Builds the production version.
- **webpack-build:local**: `webpack --config webpack.local.js && node generate-asset-manifest.js dist-local && sed -i 's/rem/em/g' dist-local/static/css/main.css` - Builds the local version.
- **webpack-watch**: `webpack --config webpack.dev.js --watch` - Watches for changes and rebuilds.
- **webpack-watch:local**: `webpack --config webpack.local.js --watch` - Watches for changes in the local build.
- **webpack-watch:prod**: `webpack --config webpack.prod.js --watch` - Watches for changes in the production build.

### Chrome Extension Scripts
- **chrome-build**: `npm run webpack-build && cd dist && zip -r ../chrome-extension.zip *` - Builds and zips the production extension.
- **chrome-build:local**: `npm run webpack-build:local && cd dist-local && zip -r ../chrome-extension-local.zip *` - Builds and zips the local extension.
