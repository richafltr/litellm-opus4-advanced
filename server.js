const express = require('express');
const OpenAI = require('openai');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuration
const GRADIENT_API_KEY = "sk-do-x93BpwFtL3AIaBc28PU_QDZmlNZR8IdxBjee_vdFL25hWlxvV8Kr9D9K72";
const GRADIENT_BASE_URL = "https://inference.do-ai.run/v1";

// Model configuration with smart defaults
const MODEL_CONFIG = {
  'claude-opus-4': {
    gradient_model: 'anthropic-claude-opus-4',
    max_tokens: 32768,
    default_tokens: 4096
  },
  'anthropic-claude-opus-4': {
    gradient_model: 'anthropic-claude-opus-4',
    max_tokens: 32768,
    default_tokens: 4096
  }
};

// Normalize model names (handle Cursor's date suffixes)
function normalizeModelName(model) {
  // Handle date-suffixed models like "claude-opus-4-20250514"
  const baseModel = model.replace(/-\d{8}$/, '');

  // Map common variations
  const modelMappings = {
    'claude-opus-4': 'claude-opus-4',
    'claude-sonnet-4': 'claude-opus-4', // fallback to opus-4
    'claude-3.5-sonnet': 'claude-opus-4', // fallback
    'claude-3-opus': 'claude-opus-4', // fallback
  };

  return modelMappings[baseModel] || baseModel;
}

// Transform tool_choice from Cursor format to Gradient format
function transformToolChoice(toolChoice) {
  if (!toolChoice) return undefined;

  // If it's already a string, return as-is
  if (typeof toolChoice === 'string') {
    return toolChoice;
  }

  // If it's an object with type property, extract the type
  if (typeof toolChoice === 'object' && toolChoice.type) {
    return toolChoice.type;
  }

  // If it's an object with function property (OpenAI format)
  if (typeof toolChoice === 'object' && toolChoice.function) {
    return toolChoice.function.name ? 'required' : 'auto';
  }

  // Default fallback
  return 'auto';
}

// Transform tools array from Cursor format to Gradient format
function transformTools(tools) {
  if (!tools || !Array.isArray(tools)) return tools;

  console.log('Original tools format:', JSON.stringify(tools, null, 2));

  return tools.map(tool => {
    // If tool is already in correct format, return as-is
    if (tool.type === 'function' && tool.function) {
      console.log('Tool already in correct format');
      return tool;
    }

    // Handle Cursor's direct tool format (properties directly on tool with type)
    // This is the case: {type: "function", name: "...", description: "..."}
    if (tool.type === 'function' && tool.name && tool.description) {
      console.log('Converting Cursor direct format with type to proper OpenAI format');
      const { type, name, description, parameters, ...rest } = tool;
      return {
        type: 'function',
        function: {
          name: name,
          description: description,
          parameters: parameters,
          ...rest
        }
      };
    }

    // Handle Cursor's direct tool format (properties directly on tool without type)
    if (tool.name && tool.description && tool.parameters) {
      console.log('Converting Cursor direct format to OpenAI format');
      return {
        type: 'function',
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters
        }
      };
    }

    // Handle case where tool might have a function object but missing type
    if (tool.function && !tool.type) {
      console.log('Adding missing type to tool with function');
      return {
        type: 'function',
        function: tool.function
      };
    }

    // If tool has type but no function, try to construct function from other properties
    if (tool.type === 'function' && !tool.function) {
      console.log('Constructing function object from tool properties');
      const { type, ...functionProps } = tool;
      return {
        type: 'function',
        function: functionProps
      };
    }

    // If tool has no recognizable format, ensure it has type
    if (!tool.type) {
      console.log('Adding default type to tool');
      return {
        type: 'function',
        ...tool
      };
    }

    console.log('Returning tool as-is');
    return tool;
  });
}

// Initialize OpenAI client for Gradient
const gradientClient = new OpenAI({
  apiKey: GRADIENT_API_KEY,
  baseURL: GRADIENT_BASE_URL,
});

// Middleware
app.use(express.json({ limit: '10mb' }));

// Smart max_tokens handling
function getSmartMaxTokens(model, requestedTokens) {
  const config = MODEL_CONFIG[model];
  if (!config) return 4096;
  
  if (requestedTokens && requestedTokens > 0) {
    return Math.min(requestedTokens, config.max_tokens);
  }
  
  return config.default_tokens;
}

// Transform request for Gradient API
function transformRequest(req) {
  const { model, max_tokens, tool_choice, tools, ...rest } = req.body;

  console.log('=== REQUEST TRANSFORMATION DEBUG ===');
  console.log('Full request body:', JSON.stringify(req.body, null, 2));
  console.log('Extracted tools:', tools);

  // Normalize model name to handle date suffixes and variations
  const normalizedModel = normalizeModelName(model);
  const config = MODEL_CONFIG[normalizedModel];

  if (!config) {
    throw new Error(`Model ${model} not supported. Use claude-opus-4`);
  }

  console.log(`Original model: ${model}, Normalized: ${normalizedModel}`);

  // Transform tool_choice and tools
  const transformedToolChoice = transformToolChoice(tool_choice);
  const transformedTools = transformTools(tools);

  console.log(`Tool choice transformation:`, {
    original: tool_choice,
    transformed: transformedToolChoice
  });

  const result = {
    ...rest,
    model: config.gradient_model,
    max_tokens: getSmartMaxTokens(normalizedModel, max_tokens),
    tool_choice: transformedToolChoice,
    tools: transformedTools,
    stream: req.body.stream || false
  };

  console.log('Final transformed request:', JSON.stringify(result, null, 2));
  console.log('=== END DEBUG ===');

  return result;
}

// Routes
app.get('/v1/models', async (req, res) => {
  try {
    // Get models from Gradient API
    const gradientModels = await gradientClient.models.list();
    
    // Filter and transform for OpenAI compatibility
    const openaiModels = gradientModels.data
      .filter(model => model.id.includes('claude'))
      .map(model => ({
        id: model.id.replace('anthropic-', '').replace('-opus-4', '-opus-4'),
        object: 'model',
        created: Math.floor(Date.now() / 1000),
        owned_by: 'gradient',
        permission: [],
        root: model.id,
        parent: null
      }));
    
    res.json({
      object: 'list',
      data: openaiModels
    });
  } catch (error) {
    console.error('Models endpoint error:', error);
    res.status(500).json({ error: 'Failed to fetch models' });
  }
});

app.post('/v1/chat/completions', async (req, res) => {
  try {
    const originalModel = req.body.model;
    console.log(`Received request for model: ${originalModel}`);

    // Transform request for Gradient
    const gradientRequest = transformRequest(req);

    console.log(`Using smart max_tokens: ${gradientRequest.max_tokens}`);

    // Call Gradient API
    const completion = await gradientClient.chat.completions.create(gradientRequest);

    // Transform response back to OpenAI format
    const openaiResponse = {
      id: completion.id,
      object: 'chat.completion',
      created: completion.created,
      model: originalModel, // Use original model name (including date suffix)
      choices: completion.choices.map(choice => ({
        index: choice.index,
        message: {
          role: choice.message.role,
          content: choice.message.content,
          tool_calls: choice.message.tool_calls
        },
        finish_reason: choice.finish_reason,
        logprobs: choice.logprobs
      })),
      usage: completion.usage,
      system_fingerprint: null
    };

    res.json(openaiResponse);
    
  } catch (error) {
    console.error('Chat completion error:', error);
    
    if (error.status) {
      res.status(error.status).json({
        error: {
          message: error.message,
          type: error.type || 'api_error',
          param: error.param,
          code: error.code
        }
      });
    } else {
      res.status(500).json({
        error: {
          message: error.message,
          type: 'internal_error'
        }
      });
    }
  }
});

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: Date.now(),
    service: 'litellm-opus4-advanced',
    models_supported: Object.keys(MODEL_CONFIG),
    sdk_version: 'openai-v4',
    version: '1.1.0-tool-fix'
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    error: {
      message: 'Internal server error',
      type: 'internal_error'
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Advanced Node.js LiteLLM Proxy running on port ${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/health`);
  console.log(`🎯 Supported models: ${Object.keys(MODEL_CONFIG).join(', ')}`);
  console.log(`🔧 Using OpenAI SDK v4 for compatibility`);
});

module.exports = app;
