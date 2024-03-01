#!/usr/bin/env node
import readline from "readline";
import { exec } from "child_process";
import { promisify } from "util";
import { OpenAIChatSHBackend } from "./llms/openai.js";
import { OllamaChatSHBackend } from "./llms/ollama.js";
const execAsync = promisify(exec);

import { getConfig } from "./utils.js";

const CONFIG = getConfig();

console.log("Welcome to ChatSH. Backend: " + CONFIG.backend + "\n");

let api;

if (CONFIG.backend === "openai") {
  api = new OpenAIChatSHBackend(CONFIG.config);
} else if (CONFIG.backend === "ollama") {
  api = new OllamaChatSHBackend(CONFIG.config);
} else {
  throw new Error("Invalid backend: " + CONFIG.backend);
}

// create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Yes most of this was written by GPT, how do you know?
async function main(last_command_result = "") {
  await api.init();
  rl.question("$ ", async (task) => {
    console.log("\x1b[2m");

    const res = await api.sendMessage(last_command_result + task);

    // parent_message_id = res.id;
    console.log("\x1b[0m");
    const msg = res.content.trim();
    console.log("");
    const cod = extract_code(msg);
    if (cod) {
      rl.question("\x1b[1mEXECUTE? [y/n]\x1b[0m ", async (answer) => {
        console.log("");
        if (answer.toLowerCase() === "y" || answer === "") {
          exec(cod, (error, stdout, stderr) => {
            if (error) {
              console.error(`${error.message}`);
              last_command_result =
                "Command failed. Output:\n" + error.message + "\n";
            } else {
              if (stdout.length > 0) {
                console.log(`${stdout}`);
              }
              if (stderr.length > 0) {
                console.log(`${stderr}`);
              }
              last_command_result =
                "Command executed. Output:\n" + stdout + "\n" + stderr + "\n";
            }
            main(last_command_result);
          });
        } else {
          last_command_result = "Command skipped.\n";
          main(last_command_result);
        }
      });
    } else {
      last_command_result = "";
      main(last_command_result);
    }
  });
}

function extract_code(res) {
  const match = res.match(/```sh([\s\S]*?)```/);
  return match ? match[1].trim() : null;
}

async function is_installed(cmd) {
  try {
    await execAsync("command -v " + cmd);
    return true;
  } catch (err) {
    return false;
  }
}

main();
