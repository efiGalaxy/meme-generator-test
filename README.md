# Meme Social - Full Stack Meme App

A full-stack social meme application built with vanilla JavaScript and InstantDB. Users can create memes with a powerful editor, share them with the community, and upvote their favorites.

## Features

- **User Authentication**: Passwordless magic code authentication via email (powered by InstantDB)
- **Meme Editor**: 
  - Choose from pre-loaded templates or upload your own images
  - Add customizable text with drag-and-drop positioning
  - Adjust font size, text color, and stroke color
  - Real-time preview
  - Double-click to add text at specific positions
- **Social Feed**:
  - Gallery grid view and vertical feed view
  - Sort by most recent or most popular
  - Real-time updates when new memes are posted
- **Upvoting System**: Like your favorite memes with instant feedback
- **Responsive Design**: Works on desktop, tablet, and mobile

## Tech Stack

- **Frontend**: Vanilla JavaScript (ES6 modules), HTML5 Canvas, CSS3
- **Backend/Database**: InstantDB (real-time database with built-in auth)
- **Architecture**: Modular JavaScript with separate concerns

## Project Structure

```
├── index.html          # Main HTML file with app structure
├── script.js           # Main app logic and meme editor
├── auth.js             # Authentication manager
├── feed.js             # Feed and gallery view manager
├── database.js         # InstantDB initialization
├── styles.css          # All styles for the app
├── templates/          # Pre-loaded meme templates
└── package.json        # Dependencies and scripts
```

## Getting Started

### Prerequisites

- Node.js and npm installed
- Modern web browser with ES6 module support

### Installation

1. Clone or download this repository

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to:
```
http://localhost:3000
```

### First Time Setup

1. Enter a username (2-20 characters)
2. Click "Get Started"
3. You'll be instantly logged in and redirected to the feed
4. Your session persists across browser refreshes!

## Usage

### Creating a Meme

1. Click the "Create Meme" button in the header
2. Select a template from the sidebar or upload your own image
3. Add text by:
   - Typing in the text input and clicking "Add"
   - Double-clicking anywhere on the canvas
4. Customize your text:
   - Drag text to reposition
   - Use resize handles to adjust font size
   - Change text and stroke colors
   - Click the X button to delete text
5. Optionally add a title for your meme
6. Click "Post Meme" to share with the community

### Viewing Memes

- **Gallery View**: Grid layout showing all memes
- **Feed View**: Vertical feed with larger images
- Toggle between views using the buttons in the header
- Sort by "Most Recent" or "Most Popular"

### Upvoting

- Click the heart icon on any meme to upvote
- Click again to remove your upvote
- Upvote counts update in real-time

## Database Schema

The app uses InstantDB with the following schema:

### Users
- `id`: Auto-generated user ID
- `email`: User email
- `username`: Display name
- `createdAt`: Timestamp

### Memes
- `id`: Auto-generated meme ID
- `imageData`: Base64 encoded PNG
- `title`: Optional meme title
- `userId`: Reference to user
- `username`: Cached username for display
- `createdAt`: Timestamp
- `upvoteCount`: Number of upvotes

### Votes
- `id`: Auto-generated vote ID
- `memeId`: Reference to meme
- `userId`: Reference to user
- `createdAt`: Timestamp

## Real-time Features

Thanks to InstantDB's real-time capabilities:
- New memes appear automatically in the feed
- Upvote counts update instantly
- No page refresh needed

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers with ES6 module support

## Development

The app is built with vanilla JavaScript using ES6 modules. No build step required!

### File Organization

- **database.js**: InstantDB client initialization
- **auth.js**: Authentication logic (signup, login, logout)
- **feed.js**: Feed rendering and upvote functionality
- **script.js**: Meme editor and main app orchestration
- **styles.css**: All CSS in one file for simplicity

## Troubleshooting

### Memes not loading
- Check browser console for errors
- Ensure you're logged in
- Verify InstantDB app ID is correct

### Can't post memes
- Make sure you've added text to your meme
- Check that you're authenticated
- Verify canvas is properly initialized

### Authentication issues
- Clear browser cache and cookies
- Try a different browser
- Check network connection

## License

ISC

## Credits

Built with [InstantDB](https://instantdb.com) - A real-time database with built-in auth
