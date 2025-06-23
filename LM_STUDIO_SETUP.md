# LM Studio Setup for Structured Output

## Overview
This application supports structured thinking model responses using LM Studio's **Structured Output** feature. This allows the AI to separate its reasoning process from the final answer, providing better transparency and organization.

## Setup Instructions

### 1. Enable Structured Output in LM Studio
1. Open LM Studio
2. Load your preferred model (e.g., DeepSeek R1, Qwen, etc.)
3. Start the Local Server
4. In the **Inference** tab, locate the **"Structured Output"** section
5. ✅ **Check the "Structured Output" checkbox**

### 2. Add the JSON Schema
Copy and paste this JSON schema into the text area:

```json
{
  "type": "object",
  "properties": {
    "thinking": {
      "type": "string",
      "description": "Your step-by-step reasoning process and analysis"
    },
    "answer": {
      "type": "string", 
      "description": "Your final, complete answer to the user's question"
    }
  },
  "required": ["thinking", "answer"]
}
```

### 3. Verify Setup
- The schema forces the model to output responses in this format:
  ```json
  {
    "thinking": "Let me analyze this question about emergency stops...",
    "answer": "Based on EN 60204-1:2018, emergency stops must..."
  }
  ```

## How It Works

### Frontend Processing
- The app automatically detects JSON responses
- Separates thinking from answer content
- Falls back to natural language detection if JSON parsing fails
- Creates collapsible thinking sections in the UI

### Benefits
- ✅ **Complete responses** - No truncation issues
- ✅ **Perfect separation** - Clear thinking vs. answer organization  
- ✅ **Better context** - Higher limits allow more document chunks
- ✅ **Transparency** - See the model's reasoning process
- ✅ **Reliability** - Consistent structured output

## Troubleshooting

### If responses aren't structured:
1. Verify "Structured Output" is checked ✅
2. Ensure the JSON schema is pasted correctly
3. Check the browser console for parsing messages
4. Try restarting LM Studio Local Server

### If responses are incomplete:
- The structured format should resolve truncation issues
- Check that max_tokens is set appropriately in LM Studio
- Monitor console logs for context limit messages

## Technical Details

### Response Format
The app expects this exact JSON structure:
- `thinking`: Contains the model's reasoning process
- `answer`: Contains the final response to the user

### Fallback Behavior
If JSON parsing fails, the app automatically falls back to:
1. Natural language pattern detection
2. Paragraph-based separation
3. Regular response display (no thinking section)

### Debug Information
Enable browser console to see:
- `✅ Successfully parsed JSON response`
- `❌ Not valid JSON, trying natural language detection...`
- Processing details and response lengths

## Model Compatibility

### Recommended Models
- **DeepSeek R1** - Excellent reasoning capabilities
- **Qwen series** - Good structured output support
- **Llama models** - Reliable JSON generation

### Performance Notes
- Structured output may be slightly slower than free-form generation
- The improved organization and completeness typically outweigh the small performance cost
- Higher context limits (20,000 chars) allow more comprehensive responses

## Support

If you encounter issues:
1. Check the browser console for error messages
2. Verify LM Studio Local Server is running on port 1234
3. Ensure the JSON schema is exactly as specified above
4. Try different models if one doesn't support structured output well

---

**Last Updated**: January 2025  
**Compatible with**: LM Studio v0.2.9+ 