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

> Chris Vogt's Steam activity reveals a diverse gaming history spanning numerous genres, with a particular fondness for expansive RPGs and open-world experiences. Recently, Chris has been enjoying Starfield (54 hours played overall, 15 minutes in the last two weeks) and The Outer Worlds: Spacer's Choice Edition (761 minutes total, 89 minutes in the last two weeks). His extensive playtime suggests a preference for immersive, long-term gameplay. His top played games consistently demonstrate this trend, including significant time invested in Cities: Skylines (75.7 hours), ARK: Survival Evolved (27.8 hours), and Fallout 4 (12 hours). Chris's library also indicates an interest in other genres like survival games (Conan Exiles, Rust) and simulation games (X-Plane 11, Jurassic World Evolution).

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
