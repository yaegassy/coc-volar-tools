import { ExtensionContext } from 'coc.nvim';
import { getConfigVolarToolsEnable } from './config';

import * as splitEditors from './features/splitEditors';
import * as preview from './features/preview';

export async function activate(context: ExtensionContext): Promise<void> {
  if (!getConfigVolarToolsEnable()) return;

  splitEditors.activate(context);
  preview.activate(context);
}
