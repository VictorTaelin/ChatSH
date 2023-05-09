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

In addition, the following commands are available:
${await is_installed("kind2") ? "\n- kind2 check file.kind2: type-checks a file using the Kind-Lang" : ""}
${await is_installed("ag") ? "\n- ag: the silver searcher. when using, show only file names." : ""}

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

When searching on file names, prefer 'find'; on contents, perfer 'ag'.

Always assume commands are installed. Never write commands to install things.

${await is_installed("kind2") ?
`When the user asks to write a init file in Kind, write a single file with just 2
lines: the type and one equation with a hole. Do not include other definitions
such as types: these already exist on Kindex.
` : ""}

${await is_installed("kind2") ?
`When asked to create a new Kind file, write just a type and 1 clause. Example:

Main (b: Bool) : Equal Bool (Bool.not (Bool.not b)) b
Main b = ?hole_0

Do not include types or other definitions, they already exist on Kindex.

Note: Kind is a language similar to Agda. Examples:

${get_kind_examples()}
` : ""}
`;

// initialize ChatGPT API with your API key
const api = new ChatGPTAPI({
  apiKey: TOKEN,
  systemMessage: SYSTEM,
  completionParams: {
    model: MODEL,
    stream: true,
    temperature: 0.5,
    max_tokens: 512,
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
  return process.argv[2] === "4" ? "gpt-4" : "gpt-3.5-turbo";
}

async function get_shell() {
  const shellInfo = (await execAsync('uname -a && $SHELL --version')).stdout.trim();
  return shellInfo;
}

function get_kind_examples() {
  return `
type Bool {
  true
  false
}

type List (t) {
  nil
  cons (head: t) (tail: List t)
}

record Sigma (a: Type) (f: a -> Type) {
  fst : a
  snd : f fst
}

type Vector <a: Type> ~ (len: Nat) {
  nil : Vector a Nat.zero
  cons (len: Nat) (head: a) (tail: Vector a len) : Vector a (Nat.succ len)
}

Bool.not (b: Bool) : Bool
Bool.not Bool.true  = Bool.false
Bool.not Bool.false = Bool.true

List.head <a> (xs: List a) : Maybe (List a)
List.head List.nil              = Maybe.none
List.head (List.cons head tail) = Maybe.some head

// Or, using match:
List.head <a> (xs: List a) : Maybe (List a) {
  match List xs {
    nil => Maybe.none
    cons => Maybe.some xs.head
  }
}

List.fold <a> <p> (xs: List a) : p -> (a -> p -> p) -> p
List.fold List.nil              = nil => cons => nil
List.fold (List.cons head tail) = nil => cons => cons head ((List.fold tail) nil cons)

Sigma.snd <a> <b: a -> Type> (s: Sigma a b) : b (Sigma.fst a b s)
Sigma.snd (Sigma.new x y) = y

Vector.create <a> (len: Nat) (f: Nat -> a) : Vector a len
Vector.create Nat.zero     f = Vector.nil
Vector.create (Nat.succ p) f =
  let head = f Nat.zero
  let tail = Vector.create p (x => f (Nat.succ x))
  Vector.cons p head tail

Main : IO Unit {
  do IO {
    ask name = IO.prompt "your name?"
    IO.print (String.join "" ["Hi " name])
  }
}

// Proof: a == a + 0
Nat.add.comm.zero (a: Nat) : Equal Nat a (Nat.add a Nat.zero)
// goal: 0 == 0
Nat.add.comm.zero Nat.zero =
  // 0 == 0
  let ret = Equal.refl
  ret
// goal: S a == S (a + 0)
Nat.add.comm.zero (Nat.succ a) =
  // a == a + 0
  let ind = Nat.add.comm.zero a
  // S a == S (a + 0)
  let app = Equal.apply (x => Nat.succ x) ind
  app

// Proof: (S a) != 0
Nat.succ_not_zero (a: Nat) (e: Equal Nat (Nat.succ a) Nat.zero) : Empty
Nat.succ_not_zero a e =
  // false == true
  let app = Equal.apply (x => Nat.is_zero x) e
  // empty
  let emp = Bool.false_not_true app
  emp
`;
};

main();
