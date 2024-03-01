import { ChatGPTAPI } from "chatgpt";
import { ChatSHLLMBackend } from "./base.js";
import { EventIterator } from "event-iterator";

class OpenAIChatSHBackend extends ChatSHLLMBackend {
  constructor(config) {
    super(config);

    const defaultModel = "gpt-3.5-turbo";

    if (!config.apiKey)
      throw new Error(
        `API key is required ex config: {"backend":"openai", "openai": {"apiKey": "sk-..."}}`
      );
    if (!config.model)
      console.warn(`OpenAI Model is not set, using default: ${defaultModel}`);
    // initialize ChatGPT API with your API key
    this.api = new ChatGPTAPI({
      apiKey: config.apiKey,
      maxModelTokens: 128000,
      systemMessage: this.systemMessage,
      completionParams: {
        model: config.model || defaultModel,
        stream: true,
        temperature: 0.5,
        max_tokens: 4096,
      },
    });
  }

  async *_sendMessage(message, parent_message_id) {
    try {
      const ee = new EventIterator(({ push, stop }) => {
        let lastTextLength = 0;
        this.api
          .sendMessage(message, {
            parentMessageId: parent_message_id,
            onProgress: function (partialResponse) {
              const newText = partialResponse.text.slice(lastTextLength);
              lastTextLength = partialResponse.text.length;
              push({
                content: newText,
                role: partialResponse.role,
                id: partialResponse.id,
              });
            },
          })
          .then(stop);

        // Signal end of stream
        return () => {};
      });

      for await (const res of ee) {
        yield res;
      }
    } catch {}
    // Return any final value if needed
    // return { content: res.text, role: partialResponse.role, id: res.id };
  }
}

export { OpenAIChatSHBackend };
