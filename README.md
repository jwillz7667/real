# Voice Agent Console

AI-powered voice calling application using OpenAI Realtime API and Twilio Programmable Voice.

## Features

- **Voice Calling**: Inbound and outbound calls via Twilio
- **AI Configuration**: Full control over Realtime API parameters
- **Turn Detection**: Support for both VAD and Semantic VAD modes
- **Voice Selection**: All available OpenAI voices including marin/cedar
- **WebSocket Logging**: Real-time display of all WebSocket events
- **Call Recording**: Record, store, and playback call recordings
- **Call History**: Complete history of all calls with metadata
- **Prompt Library**: Save, edit, and reuse instruction prompts

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **State Management**: Zustand
- **Database**: PostgreSQL with Prisma ORM
- **External Services**: OpenAI Realtime API, Twilio Voice

## Prerequisites

- Node.js 20+
- PostgreSQL database (Railway, Neon, or local)
- OpenAI API key with Realtime API access
- Twilio account with a phone number

## Quick Start

### 1. Clone and Install

```bash
cd voice-agent
npm install
```

### 2. Environment Setup

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

Required environment variables:

```env
# Database (Railway PostgreSQL)
DATABASE_URL="postgresql://..."

# OpenAI
OPENAI_API_KEY="sk-..."

# Twilio
TWILIO_ACCOUNT_SID="AC..."
TWILIO_AUTH_TOKEN="..."
TWILIO_PHONE_NUMBER="+1..."

# Application URLs
NEXT_PUBLIC_APP_URL="https://your-app.railway.app"
NEXT_PUBLIC_WS_URL="wss://your-ws-server.railway.app"
```

### 3. Database Setup

```bash
# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push

# Seed default prompts (optional)
npm run db:seed
```

### 4. Run Development

```bash
# Run both Next.js and WebSocket server
npm run dev

# Or run separately
npm run dev:next    # Next.js on port 3000
npm run dev:ws      # WebSocket server on port 3001
```

## Railway Deployment

### Deploy to Railway

1. Create two services in Railway:
   - **Web App**: Next.js frontend/API
   - **WebSocket Server**: Real-time media streaming

2. Add PostgreSQL database in Railway

3. Set environment variables for both services

4. Connect your repository

### Railway Configuration

**Web App** uses `railway.json`:
- Start command: `npm run start`

**WebSocket Server** uses `railway-ws.json` or `Dockerfile.websocket`:
- Start command: `npm run start:ws`

## Twilio Configuration

1. Go to Twilio Console > Phone Numbers
2. Select your phone number
3. Set Voice Configuration:
   - **A Call Comes In**: Webhook
   - **URL**: `https://your-app.railway.app/api/twilio/voice`
   - **HTTP Method**: POST

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Browser UI    │────▶│   Next.js API   │────▶│   PostgreSQL    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                               │
                               ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Phone Caller   │────▶│  Twilio Voice   │────▶│  WebSocket      │
└─────────────────┘     └─────────────────┘     │  Server         │
                                                └────────┬────────┘
                                                         │
                                                         ▼
                                                ┌─────────────────┐
                                                │ OpenAI Realtime │
                                                │     API         │
                                                └─────────────────┘
```

## API Endpoints

### Calls

- `POST /api/calls/outbound` - Initiate outbound call
- `POST /api/calls/hangup` - End active call
- `GET /api/calls/history` - Paginated call history
- `GET /api/calls/[id]` - Single call with events

### Prompts

- `GET /api/prompts` - List all prompts
- `POST /api/prompts` - Create prompt
- `PUT /api/prompts/[id]` - Update prompt
- `DELETE /api/prompts/[id]` - Delete prompt

### Twilio Webhooks

- `POST /api/twilio/voice` - Inbound call handler
- `POST /api/calls/status` - Call status callback

## WebSocket Events

The WebSocket server handles real-time communication:

- `/media-stream` - Twilio Media Streams connection
- `/events` - Frontend event stream for UI updates

## License

MIT
