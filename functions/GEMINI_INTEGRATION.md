# Gemini AI Integration for Steam Data

This project now includes AI-powered summaries of Steam gaming activity using Google's Gemini API.

## Features

- **AI-Generated Gaming Summaries**: Automatically generates personalized summaries of your Steam gaming activity
- **Smart Analysis**: Analyzes recent games, playtime patterns, and gaming preferences
- **Natural Language**: Creates conversational, engaging summaries as if from a friend

## Setup

1. **Get a Gemini API Key**:
   - Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Create a new API key
   - Copy the key

2. **Add to Environment Variables**:
   ```bash
   # Add to your .runtimeconfig.json or environment
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

3. **Deploy the Function**:
   ```bash
   npm run deploy
   ```

## How It Works

The AI summary is generated during the Steam data sync process and includes:

- **Recent Activity**: Games played in the last 2 weeks
- **Top Games**: Most played games (100+ minutes total)
- **Gaming Patterns**: Analysis of playtime and preferences
- **Personal Touch**: Uses your Steam profile name for personalization

## Data Storage

The AI summary is stored in Firestore at:
```
/steam/ai-summary
```

Document structure:
```json
{
  "summary": "AI-generated text summary...",
  "generatedAt": "timestamp"
}
```

## Example Summary

The AI might generate summaries like:

> "Hey Chris! I've been looking at your Steam activity and you've been quite busy gaming lately. You've been diving deep into Cyberpunk 2077 with 120 minutes in the last two weeks, bringing your total playtime to 500 minutes. Elden Ring has also captured your attention with 90 minutes recently. Your most invested game is The Witcher 3 with an impressive 800 minutes total - clearly you enjoy immersive RPGs with rich storytelling. With 50 games in your library, you have quite the collection to explore!"

## Error Handling

- If the Gemini API is unavailable, the sync continues without the AI summary
- Errors are logged but don't break the main sync process
- The function gracefully handles missing or invalid data

## Testing

Run the tests with:
```bash
npm test -- generate-steam-summary.test.js
```

## API Usage

The AI summary is automatically generated during the Steam sync job. You can also call it directly:

```javascript
import generateSteamSummary from './api/gemini/generate-steam-summary.js'

const summary = await generateSteamSummary(steamData)
``` 