#!/usr/bin/env node

import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import readline from 'readline';
import { ChatGPTAPI } from 'chatgpt';
import { exec } from 'child_process';
import { promisify } from 'util';
const execAsync = promisify(exec);

const TOKEN = await get_token();
const MODEL = await get_model();
const SHELL = await get_shell();

console.log("Welcome to ChatSH. Model: " + MODEL + "\n");

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

// initialize ChatGPT API with your API key
const api = new ChatGPTAPI({
  apiKey: TOKEN,
  maxModelTokens: 128000,
  systemMessage: SYSTEM,
  completionParams: {
    model: MODEL,
    stream: true,
    temperature: 0.5,
    max_tokens: 4096,
  }
});

// create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Yes most of this was written by GPT, how do you know?
async function main(last_command_result = "", parent_message_id = null) {
  rl.question('$ ', async (task) => {
    let lastTextLength = 0;
    console.log("\x1b[2m");
    const res = await api.sendMessage(last_command_result + task, {
      parentMessageId: parent_message_id,
      onProgress: (partialResponse) => {
        // Print only the new text added to the partial response
        const newText = partialResponse.text.slice(lastTextLength);
        process.stdout.write(newText);
        lastTextLength = partialResponse.text.length;
      }
    });
    parent_message_id = res.id;
    console.log("\x1b[0m");
    const msg = res.text.trim();
    console.log("");
    const cod = extract_code(msg);
    if (cod) {
      rl.question('\x1b[1mEXECUTE? [y/n]\x1b[0m ', async (answer) => {
        console.log("");
        if (answer.toLowerCase() === 'y' || answer === "") {
          exec(cod, (error, stdout, stderr) => {
            if (error) {
              console.error(`${error.message}`);
              last_command_result = "Command failed. Output:\n" + error.message + "\n";
            } else {
              if (stdout.length > 0) {
                console.log(`${stdout}`);
              }
              if (stderr.length > 0) {
                console.log(`${stderr}`);
              }
              last_command_result = "Command executed. Output:\n" + stdout + "\n" + stderr + "\n";
            }
            main(last_command_result, parent_message_id);
          });
        } else {
          last_command_result = "Command skipped.\n";
          main(last_command_result, parent_message_id);
        }
      });
    } else {
      last_command_result = "";
      main(last_command_result, parent_message_id);
    }
  });
}

function extract_code(res) {
  const match = res.match(/```sh([\s\S]*?)```/);
  return match ? match[1].trim() : null;
}

async function is_installed(cmd) {
  try {
    await execAsync('command -v '+cmd);
    return true;
  } catch (err) {
    return false;
  }
}

async function get_token() {
  const tokenPath = path.join(os.homedir(), '.config', 'openai.token');
  try {
    const token = (await fs.readFile(tokenPath, 'utf8')).trim();
    return token;
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.error('Error: openai.token file not found in ~/.config/');
      console.error('Please make sure the file exists and contains your OpenAI API token.');
    } else {
      console.error('Error reading openai.token file:', err.message);
    }
    process.exit(1);
  }
}

async function get_model() {
  return "gpt-4-0125-preview";
}

async function get_shell() {
  const shellInfo = (await execAsync('uname -a && $SHELL --version')).stdout.trim();
  return shellInfo;
}

main();
