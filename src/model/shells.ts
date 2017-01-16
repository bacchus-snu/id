import { Client } from './utils';

interface Shell {
  shell: string;
}

interface StoredShell extends Shell {
  shellId: number;
}

class ShellModel implements StoredShell {

}

export function insert(client: Client, shell: Shell): Promise<void> {
  return null;
}

export function byShellId(client: Client, shellId: number): Promise<StoredShell> {
  return null;
}

export function list(client: Client): Promise<Array<StoredShell>> {
  return null;
}
