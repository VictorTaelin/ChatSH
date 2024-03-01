// read from config file
import fs from "fs";
import path from "path";

class ChatSHConfig {
  constructor(configFile) {
    if (configFile.backend !== "openai" && configFile.backend !== "ollama") {
      throw new Error(
        `Invalid backend: ${configFile.backend} must be either 'openai' or 'ollama'`
      );
    }
    this.backend = configFile.backend;
    this.config = configFile[configFile.backend] || {};
  }
}

const getConfig = () => {
  const configFile = path.join(process.env.HOME, ".config", "chatsh");
  let config = {};
  if (fs.existsSync(configFile)) {
    config = JSON.parse(fs.readFileSync(configFile, "utf8"));
  } else {
    console.log(
      `
Config file not found: ${configFile}
Please create a config file in the following format:
{
  "backend": "openai | ollama",
  "openai": { "apiKey", "model" }
  "ollama": { "model", "host" }
}

Example:

echo '{
  "backend": "ollama",
  "openai": {
    "model": "gemma:7b",
    "host": "http://localhost:11434"
  }
}' > ~/.config/chatsh
    `.trim()
    );
    process.exit(1);
  }
  return new ChatSHConfig(config);
};

export { getConfig };
