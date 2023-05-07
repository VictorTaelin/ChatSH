# ChatSH

Chat with GPT from the terminal, and let it execute shell scripts and perform tasks for you. Because what could go wrong?


## Example

![](example.gif)

## Why?

The reason I'm publishing this is that it is extremely useful to me, so I
decided to share. Tools like AutoGPT are too heavy and autonomous, and copying
contents from ChatGPT web into the command line is cumbersome. ChatSH lets you
use ChatGPT directly from the terminal and execute commands suggested by it,
making it an extremely powerful productivity tool.


## Usage

1. Install with `npm`:

```bash
npm install -g ChatSH
```

2. Add your OpenAI Token to `~/.config/openai.token`:

```bash
echo "YOUR_OPENAI_TOKEN" > ~/.config/openai.token
```

3. Call ChatSH:

```bash
chatsh   # using gpt-3.5-turbo
chatsh 4 # using gpt-4
```

4. Ask it to do something:

```sh
v@v ~/vic/dev/kindex$ chatsh 4
Welcome to ChatSH. Model: gpt-4

$ list all files below this directory that include Nat on its name

# Find all files below the current directory that include "Nat" in their name
find . -type f -iname "*Nat*"

EXECUTE? [y/n]y
./Fin/to_nat.kind2
./Parser/alternative.kind2
./U60/to_nat.kind2
./Bits/to_nat.kind2
./U120/to_nat.kind2
```

## Warning

I think this should be obvious but since I've published it - always read carefully
before executing a command. There is a reason there is a confirmation message. GPT
could output anything, including commands that do serious harm to your system by
accident. You're responsible for checking your commands. You've been warned!
