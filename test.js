const OpenAI = require('openai');

const client = new OpenAI({
  apiKey: 'sk-cursor-opus4-key',
  baseURL: 'http://localhost:3000/v1'
});

async function testProxy() {
  try {
    console.log('Testing models...');
    const models = await client.models.list();
    console.log('Models:', models.data.map(m => m.id));
    
    console.log('\nTesting chat completion...');
    const completion = await client.chat.completions.create({
      model: 'claude-opus-4',
      messages: [{ role: 'user', content: 'Hello! Tell me about yourself.' }]
      // No max_tokens needed - handled automatically!
    });
    
    console.log('Response:', completion.choices[0].message.content);
    
    console.log('\nTesting with tools...');
    const toolCompletion = await client.chat.completions.create({
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
    
    console.log('Tool response:', toolCompletion.choices[0]);
    
  } catch (error) {
    console.error('Test error:', error);
  }
}

if (require.main === module) {
  testProxy();
}

module.exports = { testProxy };
