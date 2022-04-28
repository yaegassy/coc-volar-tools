# coc-volar-tools

## What's coc-volar-tools?

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

## DEMO (mp4)

### "volar.action.splitEditors" command

https://user-images.githubusercontent.com/188642/165208266-c21ed952-b930-46d1-8ab2-a0ce7bcef97d.mp4

### "volar.action.vite" command

Press `Alt` to use go to code in Browser

https://user-images.githubusercontent.com/188642/165452459-2bf6787c-ccfc-4ed6-9042-6e36e39cfb58.mp4

The `volar.action.nuxt` command has the same behavior.

## Configuration options

- `volar-tools.enable`: Enable coc-volar-tools extension, default: `true`
- `volar.preview.port`: Default port for preview server, default: `3333`

## Commands

- `volar.action.splitEditors`: Split `<script>`, `<template>`, `<style>` Editors
- `volar.action.vite`: Experimental Features for Vite
- `volar.action.nuxt`: Experimental Features for Nuxt
- `volar.action.previewToggleHighlightDomElements`: Toggle preview highlighting enable/disable

## Thanks

- [johnsoncodehk/volar](https://github.com/johnsoncodehk/volar)

## License

MIT

---

> This extension is built with [create-coc-extension](https://github.com/fannheyward/create-coc-extension)
