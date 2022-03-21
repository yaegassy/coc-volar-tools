import { workspace } from 'coc.nvim';

export function getConfigVolarToolsEnable() {
  return workspace.getConfiguration('volar-tools').get<boolean>('enable');
}
