export type ConnState = 'disconnected' | 'connecting' | 'awaiting' | 'connected' | 'error';

export interface TvProfile {
  id: string;
  name: string;
  ip: string;
  /** true = wss://IP:8002 (TVs 2018+, exige token) · false = ws://IP:8001 (TVs mais antigas) */
  secure: boolean;
  /** token devolvido pela TV após o usuário aceitar o pedido de conexão */
  token?: string;
  /** perfil simulado: não abre socket, só registra os comandos */
  demo?: boolean;
}

export type LogKind = 'info' | 'send' | 'recv' | 'error';

export interface LogEntry {
  id: number;
  at: number;
  kind: LogKind;
  text: string;
  count: number;
}

export interface TvApp {
  name: string;
  appId: string;
  color: string;
  glyph: string;
}

export const TV_APPS: TvApp[] = [
  { name: 'Netflix', appId: '11101200001', color: '#e50914', glyph: 'N' },
  { name: 'YouTube', appId: '111299001912', color: '#ff0000', glyph: '▶' },
  { name: 'Prime Video', appId: '3201910019365', color: '#00a8e1', glyph: 'P' },
  { name: 'Disney+', appId: '3201901017640', color: '#113ccf', glyph: 'D+' },
  { name: 'Spotify', appId: '3201606009684', color: '#1db954', glyph: '♪' },
  { name: 'Apple TV', appId: '3201807016597', color: '#555b66', glyph: 'tv' },
];

/** Teclas do protocolo Samsung Smart Remote (Tizen). */
export const K = {
  POWER: 'KEY_POWER',
  SOURCE: 'KEY_SOURCE',
  MUTE: 'KEY_MUTE',
  VOL_UP: 'KEY_VOLUP',
  VOL_DOWN: 'KEY_VOLDOWN',
  CH_UP: 'KEY_CHUP',
  CH_DOWN: 'KEY_CHDOWN',
  CH_LIST: 'KEY_CH_LIST',
  PRE_CH: 'KEY_PRECH',
  UP: 'KEY_UP',
  DOWN: 'KEY_DOWN',
  LEFT: 'KEY_LEFT',
  RIGHT: 'KEY_RIGHT',
  ENTER: 'KEY_ENTER',
  RETURN: 'KEY_RETURN',
  HOME: 'KEY_HOME',
  MENU: 'KEY_MENU',
  INFO: 'KEY_INFO',
  GUIDE: 'KEY_GUIDE',
  TOOLS: 'KEY_TOOLS',
  EXIT: 'KEY_EXIT',
  RED: 'KEY_RED',
  GREEN: 'KEY_GREEN',
  YELLOW: 'KEY_YELLOW',
  BLUE: 'KEY_CYAN',
  PLAY: 'KEY_PLAY',
  PAUSE: 'KEY_PAUSE',
  STOP: 'KEY_STOP',
  REWIND: 'KEY_REWIND',
  FF: 'KEY_FF',
  REC: 'KEY_REC',
  SUBTITLE: 'KEY_SUB_TITLE',
} as const;
