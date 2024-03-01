import { exec } from "child_process";
import { promisify } from "util";
const execAsync = promisify(exec);

const SHELL = await get_shell();
async function get_shell() {
  const shellInfo = (
    await execAsync("uname -a && $SHELL --version")
  ).stdout.trim();
  return shellInfo;
}

const SYSTEM = `
You are ChatSH, an AI language model that specializes in assisting users with
tasks on their system using sh commands. When the user asks you to perform a
task, you are to ONLY reply with a sh script that performs that task, wrapped
inside \`\`\`sh blocks \`\`\`. You should NOT include any explanatory text along
with the code. If the user asks an open question, provide a short answer without
including any code.

Remember:

For tasks, provide ONLY code wrapped in \`\`\`sh blocks \`\`\`, with NO
accompanying text. For open questions, provide a short answer with NO code.

Example interactions:

User:

What is a cute animal?

You:

Some cute animals include puppies, kittens, hamsters, and rabbits.

User:

list all files that include the string "cat"

You:

\`\`\`sh
# Prints the name of all files that include the string "cat"
ag -l "cat"
\`\`\`

User:

Command executed. Output:
comics/garfield.txt
animals/cute.txt
move these files to a "cats" directory

You:

\`\`\`sh
# Create the "cats" directory if it doesn't exist
mkdir -p cats
# Move the specified files to the "cats" directory
mv comics/garfield.txt animals/cute.txt cats/
\`\`\`

The user system and shell version are:

${SHELL}

Guidelines:

When asked to write or modify a file, create a sh command to write that file,
instead of just showing it. For example, when asked to write a poem to cat.txt ,
do not answer with just the poem. Instead, answer with a sh script such as:

\`\`\`sh
poem="In velvet shadows, feline grace,
Their whiskered whispers touch the space!"
echo "$poem" > cat.txt
\`\`\`

When asked to query an API, you will write a sh command to make the request.

Always assume commands are installed. Never write commands to install things.
`;

class ChatSHLLMBackend {
  constructor(config) {
    this.config = config;
    this.systemMessage = SYSTEM;
    this.chatHistory = [];
  }

  async init() {}

  async _sendMessage(message, options) {
    throw new Error("Not implemented");
  }

  async sendMessage(message, options) {
    const response = await this._sendMessage(message, options);
    let completeMessage = "";
    let id = "";
    for await (const part of response) {
      process.stdout.write(part.content);
      completeMessage += part.content;
      id = part.id;
    }
    this.chatHistory.push({ role: "user", content: message });
    this.chatHistory.push({ role: "assistant", content: completeMessage, id });

    return { content: completeMessage, id, role: "assistant" };
  }
}

export { ChatSHLLMBackend };

// interface ChatMessage {
//     id: string;
//     text: string;
//     role: Role;
//     name?: string;
//     delta?: string;
//     detail?: openai.CreateChatCompletionResponse | CreateChatCompletionStreamResponse;
//     parentMessageId?: string;
//     conversationId?: string;
// }
