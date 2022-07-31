import * as preview from '@volar/preview';
import * as shared from '@volar/shared';
import { parse, SFCParseResult } from '@vue/compiler-sfc';
import * as coc from 'coc.nvim';
import * as fs from 'fs';
import * as path from 'path';

export async function activate(context: coc.ExtensionContext) {
  let ws: ReturnType<typeof preview.createPreviewConnection> | undefined;
  let highlightDomElements = true;

  if (coc.window.terminals.some((terminal) => terminal.name.startsWith('volar-preview:'))) {
    ws = preview.createPreviewConnection({
      onGotoCode: handleGoToCode,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      getFileHref: (fileName, range) => 'vscode://files:/' + fileName,
    });
  }
  coc.window.onDidOpenTerminal((e) => {
    if (e.name.startsWith('volar-preview:')) {
      ws = preview.createPreviewConnection({
        onGotoCode: handleGoToCode,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        getFileHref: (fileName, range) => 'vscode://files:/' + fileName,
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

  context.subscriptions.push(
    coc.commands.registerCommand('volar.action.vite', async () => {
      const editor = coc.window.activeTextEditor;
      if (editor) {
        openPreview(uriToFsPath(editor.document.uri), 'vite');
      }
    })
  );

  context.subscriptions.push(
    coc.commands.registerCommand('volar.action.nuxt', async () => {
      const editor = coc.window.activeTextEditor;
      if (editor) {
        openPreview(uriToFsPath(editor.document.uri), 'nuxt');
      }
    })
  );

  coc.events.on(
    'CursorMoved',
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async (e) => {
      const mode = (await coc.workspace.nvim.call('mode')) as string;
      if (coc.window.activeTextEditor && mode === 'v') {
        updateSelectionHighlights(coc.window.activeTextEditor);
      }
    },
    null,
    context.subscriptions
  );

  context.subscriptions.push(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    coc.workspace.onDidChangeTextDocument((e) => {
      if (coc.window.activeTextEditor) {
        updateSelectionHighlights(coc.window.activeTextEditor);
      }
    })
  );
  context.subscriptions.push(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    coc.workspace.onDidSaveTextDocument((e) => {
      if (coc.window.activeTextEditor) {
        updateSelectionHighlights(coc.window.activeTextEditor);
      }
    })
  );

  coc.commands.registerCommand('volar.action.previewToggleHighlightDomElements', () => {
    highlightDomElements = !highlightDomElements;
    if (coc.window.activeTextEditor) {
      updateSelectionHighlights(coc.window.activeTextEditor);
      coc.window.showInformationMessage(`previewToggleHighlightDomElements: ${highlightDomElements}`);
    }
  });

  function updateSelectionHighlights(textEditor: coc.TextEditor) {
    if (ws && textEditor.document.languageId === 'vue' && highlightDomElements) {
      const sfc = getSfc(textEditor.document);
      const offset = sfc.descriptor.template?.loc.start.offset ?? 0;
      const selections = textEditor.visibleRanges;
      ws?.highlight(
        uriToFsPath(textEditor.document.uri),
        selections.map((selection) => ({
          start: textEditor.document.getOffset(selection.start.line, selection.start.character) - offset,
          end: textEditor.document.getOffset(selection.end.line, selection.end.character) - offset,
        })),
        textEditor.document.dirty
      );
    } else {
      ws?.unhighlight();
    }
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

    const editor = coc.window.activeTextEditor;
    if (editor) {
      const sfc = getSfc(doc);
      const offset = sfc.descriptor.template?.loc.start.offset ?? 0;
      const start = doc.textDocument.positionAt(range[0] + offset);
      const end = doc.textDocument.positionAt(range[1] + offset);

      coc.workspace.nvim.call('cursor', [start.line + 1, start.character + 1]);
      coc.workspace.nvim.command('normal! v');
      coc.workspace.nvim.call('cursor', [end.line + 1, end.character + 1]);
    }
  }

  async function startPreviewServer(viteDir: string, type: 'vite' | 'nuxt') {
    const port = await shared.getLocalHostAvaliablePort(
      coc.workspace.getConfiguration('volar').get('preview.port') ?? 3334
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
