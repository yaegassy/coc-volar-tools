import * as preview from '@volar/preview';
import * as shared from '@volar/shared';
import { parse, SFCParseResult } from '@vue/compiler-sfc';
import * as coc from 'coc.nvim';
import * as fs from 'fs';
import * as path from 'path';

export async function activate(context: coc.ExtensionContext) {
  let ws: ReturnType<typeof preview.createPreviewWebSocket> | undefined;

  if (coc.window.terminals.some((terminal) => terminal.name.startsWith('volar-preview:'))) {
    ws = preview.createPreviewWebSocket({
      goToCode: handleGoToCode,
      getOpenFileUrl: (fileName, range) => 'vscode://files:/' + fileName,
    });
  }
  coc.window.onDidOpenTerminal((e) => {
    if (e.name.startsWith('volar-preview:')) {
      ws = preview.createPreviewWebSocket({
        goToCode: handleGoToCode,
        // TODO: same to line 19
        getOpenFileUrl: (fileName, range) => 'vscode://files:/' + fileName,
      });
    }
  });
  coc.window.onDidCloseTerminal((e) => {
    if (e.name.startsWith('volar-preview:')) {
      ws?.stop();
      ws = undefined;
    }
  });

  const sfcs = new WeakMap<coc.Document, { version: number; sfc: SFCParseResult }>();

  function getSfc(document: coc.Document) {
    let cache = sfcs.get(document);
    if (!cache || cache.version !== document.version) {
      cache = {
        version: document.version,
        sfc: parse(document.content, { sourceMap: false, ignoreEmpty: false }),
      };
      sfcs.set(document, cache);
    }
    return cache.sfc;
  }

  async function openPreview(fileName: string, mode: 'vite' | 'nuxt') {
    const configFile = await getConfigFile(fileName, mode);
    if (!configFile) return;

    let terminal = coc.window.terminals.find((terminal) => terminal.name.startsWith('volar-preview:'));
    let port: number;

    if (terminal) {
      port = Number(terminal.name.split(':')[1]);
    } else {
      const configDir = path.dirname(configFile);
      const server = await startPreviewServer(configDir, mode);
      terminal = server.terminal;
      port = server.port;
    }

    await terminal.show();

    await coc.workspace.nvim.command('stopinsert');
    await coc.workspace.nvim.command(`wincmd p`);

    coc.commands.executeCommand('vscode.open', `http://localhost:${port}`);
  }

  async function handleGoToCode(
    fileName: string,
    range: [number, number],
    cancleToken: { readonly isCancelled: boolean }
  ) {
    const doc = await coc.workspace.openTextDocument(fileName);

    if (cancleToken.isCancelled) return;

    // TODO: need to call show document after openTextDocument?
    ////await coc.window.showTextDocument(doc, coc.ViewColumn.One);

    if (cancleToken.isCancelled) return;

    const editor = coc.window.activeTextEditor;
    if (editor) {
      const sfc = getSfc(doc);
      const offset = sfc.descriptor.template?.loc.start.offset ?? 0;
      const start = doc.textDocument.positionAt(range[0] + offset);
      const end = doc.textDocument.positionAt(range[1] + offset);

      // TODO
      coc.workspace.jumpTo(doc.uri, start);
    }
  }

  async function startPreviewServer(viteDir: string, type: 'vite' | 'nuxt') {
    const port = await shared.getLocalHostAvaliablePort(
      coc.workspace.getConfiguration('volar').get('preview.port') ?? 3333
    );
    const terminal = await coc.window.createTerminal({ name: 'volar-preview:' + port });
    const viteProxyPath =
      type === 'vite'
        ? require.resolve('@volar/preview/bin/vite', { paths: [context.extensionPath] })
        : require.resolve('@volar/preview/bin/nuxi', { paths: [context.extensionPath] });

    terminal.sendText(`cd ${viteDir}`);

    if (type === 'vite') terminal.sendText(`node ${JSON.stringify(viteProxyPath)} --port=${port}`);
    else terminal.sendText(`node ${JSON.stringify(viteProxyPath)} dev --port ${port}`);

    return {
      port,
      terminal,
    };
  }

  async function getConfigFile(fileName: string, mode: 'vite' | 'nuxt') {
    let dir = path.dirname(fileName);
    let configFile: string | undefined;
    while (true) {
      const configTs = path.join(dir, mode + '.config.ts');
      const configJs = path.join(dir, mode + '.config.js');
      if (fs.existsSync(configTs)) {
        configFile = configTs;
        break;
      }
      if (fs.existsSync(configJs)) {
        configFile = configJs;
        break;
      }
      const upperDir = path.dirname(dir);
      if (upperDir === dir) {
        break;
      }
      dir = upperDir;
    }
    return configFile;
  }
}

function uriToFsPath(uri: string) {
  return coc.Uri.parse(uri).fsPath;
}
