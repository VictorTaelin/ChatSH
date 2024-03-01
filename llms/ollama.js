import { Ollama } from "ollama";
import { ChatSHLLMBackend } from "./base.js";

class OllamaChatSHBackend extends ChatSHLLMBackend {
  constructor(config) {
    super(config);
    this.api = new Ollama({
      host: config.host || "http://localhost:11434",
    });
  }

  sysMessage() {
    return {
      role: "system",
      content: this.systemMessage,
    };
  }

  async *_sendMessage(message) {
    const response = await this.api.chat({
      model: this.config.model,
      messages: [
        this.sysMessage(),
        ...this.chatHistory.slice(-4), // only send the last 4 messages some of these models get silly
        { role: "user", content: message },
      ],
      stream: true,
    });

    const id = crypto.randomUUID();

    for await (const part of response) {
      yield { ...part.message, id };
    }

    return { ...response.message, id };
  }
}

export { OllamaChatSHBackend };
