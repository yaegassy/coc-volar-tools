# coc-volar-tools

## What' coc-volar-tools?

This [coc.nvim](https://github.com/neoclide/coc.nvim) extension provides feature split from [coc-volar](https://github.com/yaegassy/coc-volar). split into a separate coc-extension due to the large package size used, etc.

## Install

**CocInstall**:

```vim
:CocInstall @yaegassy/coc-volar-tools
```

> scoped packages

**vim-plug**:

```vim
Plug 'yaegassy/coc-volar-tools', {'do': 'yarn install --frozen-lockfile'}
```

## Configuration options

- `volar-tools.enable`: Enable coc-volar-tools extension, default: `true`

## Commands

- `volar.action.splitEditors`: Split `<script>`, `<template>`, `<style>` Editors

## License

MIT

---

> This extension is built with [create-coc-extension](https://github.com/fannheyward/create-coc-extension)
