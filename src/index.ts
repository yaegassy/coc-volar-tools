import { ExtensionContext } from 'coc.nvim';
import { getConfigVolarToolsEnable } from './config';

import * as preview from './features/preview';
import * as splitEditors from './features/splitEditors';

export async function activate(context: ExtensionContext): Promise<void> {
  if (!getConfigVolarToolsEnable()) return;

  splitEditors.activate(context);
  preview.activate(context);
}
