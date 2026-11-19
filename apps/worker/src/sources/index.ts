import type { HttpClient } from '../http/client.js';
import { GithubVagasSource } from './github-vagas.js';
import { ProgramathorSource } from './programathor.js';
import { RemoteOkSource } from './remoteok.js';
import type { JobSource } from './types.js';

export function createSource(name: string, http: HttpClient): JobSource {
  switch (name) {
    case 'programathor':
      return new ProgramathorSource(http);
    case 'remoteok':
      return new RemoteOkSource(http);
    case 'github':
      return new GithubVagasSource(http);
    default:
      throw new Error(`fonte desconhecida: ${name} (use programathor, remoteok ou github)`);
  }
}

export { GithubVagasSource, ProgramathorSource, RemoteOkSource };
export type { JobSource, RawJob } from './types.js';
