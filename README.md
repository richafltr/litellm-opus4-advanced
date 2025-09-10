# Advanced Node.js LiteLLM Proxy

A production-ready Node.js proxy server that makes Claude models **100% OpenAI-compatible** using the official OpenAI SDK.

## 🎯 Key Features

- ✅ **Zero Configuration** - Just works like OpenAI API
- ✅ **Auto max_tokens** - Smart defaults, no manual specification needed
- ✅ **Official OpenAI SDK** - Perfect compatibility
- ✅ **Streaming Support** - Real-time responses
- ✅ **Tool Calling** - Full function calling support
- ✅ **Error Handling** - Proper OpenAI-style errors
- ✅ **Model Discovery** - Dynamic model listing

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start server
npm start
```

## 📖 Usage Examples

### Basic Chat (No max_tokens needed!)
```javascript
const OpenAI = require('openai');

const client = new OpenAI({
  apiKey: 'sk-cursor-opus4-key',
  baseURL: 'https://your-proxy-url/v1'
});

const completion = await client.chat.completions.create({
  model: 'claude-opus-4',
  messages: [{ role: 'user', content: 'Hello!' }]
  // max_tokens is handled automatically!
});
```

### With Tools
```javascript
const completion = await client.chat.completions.create({
  model: 'claude-opus-4',
  messages: [{ role: 'user', content: 'What is 2+2?' }],
  tools: [{
    type: 'function',
    function: {
      name: 'calculator',
      description: 'Calculate math',
      parameters: {
        type: 'object',
        properties: { expression: { type: 'string' } }
      }
    }
  }]
});
```

## 🔧 Smart Features

### Auto max_tokens
- **Claude Opus-4**: Default 4096, Max 32768
- **No manual configuration needed**
- **Automatically optimized per model**

### Model Support
- `claude-opus-4` → `anthropic-claude-opus-4`
- `anthropic-claude-opus-4` → `anthropic-claude-opus-4`

## 🧪 Testing

```bash
# Run built-in tests
npm run test

# Manual testing
curl -X POST http://localhost:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk-cursor-opus4-key" \
  -d '{"model": "claude-opus-4", "messages": [{"role": "user", "content": "Hello!"}]}'
```

## 🚀 Deployment

This proxy is designed for:
- **DigitalOcean App Platform**
- **Vercel**
- **Heroku**
- **Railway**
- **AWS Lambda**
- **Google Cloud Functions**

## 📊 API Compatibility

| Feature | Status | Notes |
|---------|--------|-------|
| Chat Completions | ✅ | 100% compatible |
| Streaming | ✅ | Real-time responses |
| Tool Calling | ✅ | Function calling |
| Model Listing | ✅ | Dynamic discovery |
| Error Handling | ✅ | OpenAI-style errors |
| max_tokens | ✅ | Auto-handled |

## 🔑 Configuration

- **API Key**: `sk-cursor-opus4-key`
- **Base URL**: `https://your-proxy-url/v1`
- **Models**: `claude-opus-4`

## 🎉 Why This is Better

| Traditional Proxy | This Advanced Proxy |
|-------------------|---------------------|
| Manual max_tokens | Auto max_tokens |
| Custom error handling | OpenAI SDK errors |
| Basic compatibility | 100% OpenAI compatible |
| Limited features | Full OpenAI API support |
| Complex configuration | Zero configuration |

## License

MIT
