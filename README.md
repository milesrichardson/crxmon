# crxmon - WIP!

This is a WIP repository for researching the (in)security of Chrome extensions.
The first goal is to setup infrastructure for monitoring changes to Chrome
extensions by checking their code into a GitHub repository and tracking the
changes as diffs. The second goal is to add some runtime instrumentation tooling
for surfacing dangerous code paths through methods like taint analysis of
postMessage flows into potentially dangerous sinks like `eval` or `setTimeout`.
Other goals include static analysis, and dumping the results of it into a
database that's checked in along with the code. It would also be cool to use
some LLM magic to ask the databse questions about the corpus of extensions.

There are about 130,000 Chrome extensions. The unpacked, prettified source files
of the top 10 extensions seem to occupy roughly 220mb. For the top 100
extensions, the disk usage is roughly 1.5gb. The heaviest extension is LastPass,
because of course it is, at 187mb. That's twice as big as the second biggest
extension which is Screencastify.

Right now this repo is just a collection of a few scripts:

```bash
# Download (and unpack) the extension to extensions/<extensionId>
yarn zx scripts/download-extension.ts [--overwrite] [--prettify] <extensionId>

# Prettify the source files inside extensions/<extensionId>
yarn zx scripts/prettify-extension.ts <extensionId>

# Download the top 100 extensions and prettify the source files of each of them
yarn zx scripts/download-top-extensions.ts

# Generate the top-extensions.json file, assuming extensions-2021.json exists
# Get it here: https://github.com/DebugBear/chrome-extension-list
yarn zx scripts/generate-top-extensions.ts

# Print the top extensions, and the path to their downloaded manifest file
# To print only the extensions that are not downloaded, pass --missing
yarn zx scripts/print-extensions.ts --missing
```

This repo uses Node v20 and Yarn v4.

```
nvm use $(cat .nvmrc)
corepack enable
yarn install --immutable

yarn typecheck

# (there aren't any)
yarn test
```

If using `@crxmon/runtime`, need to install playwright browsers

```bash
yarn runtime playwright install chromium

# or --help to see all options (this is just a wrapper command)
yarn runtime playwright --help

# or for help with just the install command
yarn runtime playwright help install
```
