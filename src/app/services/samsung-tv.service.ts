import { Injectable, computed, effect, signal } from '@angular/core';
import { ConnState, LogEntry, LogKind, TvProfile } from '../models/tv.models';

const STORE_KEY = 'samsung-remote:v1';
const APP_NAME = 'Controle Angular';
const CONNECT_TIMEOUT_MS = 25_000;

interface Persisted {
  profiles: TvProfile[];
  activeId: string | null;
}

/**
 * Fala direto com a TV Samsung (Tizen, 2016+) via WebSocket — sem backend.
 *  - ws://IP:8001  → modelos mais antigos / sem token
 *  - wss://IP:8002 → modelos 2018+; a TV mostra um pedido de autorização e devolve um token
 */
@Injectable({ providedIn: 'root' })
export class SamsungTvService {
  readonly profiles = signal<TvProfile[]>([]);
  readonly activeId = signal<string | null>(null);
  readonly state = signal<ConnState>('disconnected');
  readonly statusText = signal('Desconectado');
  readonly log = signal<LogEntry[]>([]);
  readonly toast = signal<string | null>(null);

  readonly active = computed(() => this.profiles().find((p) => p.id === this.activeId()) ?? null);
  readonly connected = computed(() => this.state() === 'connected');
  readonly busy = computed(() => this.state() === 'connecting' || this.state() === 'awaiting');

  private ws?: WebSocket;
  private connectTimer?: ReturnType<typeof setTimeout>;
  private toastTimer?: ReturnType<typeof setTimeout>;
  private logSeq = 0;

  constructor() {
    this.load();
    effect(() => {
      this.save({ profiles: this.profiles(), activeId: this.activeId() });
    });
  }

  // ───────────────────────── perfis ─────────────────────────

  addProfile(data: Omit<TvProfile, 'id'>): TvProfile {
    const p: TvProfile = { ...data, id: crypto.randomUUID() };
    this.profiles.update((l) => [...l, p]);
    this.activeId.set(p.id);
    return p;
  }

  updateProfile(id: string, patch: Partial<Omit<TvProfile, 'id'>>): void {
    this.profiles.update((l) => l.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }

  removeProfile(id: string): void {
    if (this.activeId() === id) {
      this.disconnect();
      this.activeId.set(null);
    }
    this.profiles.update((l) => l.filter((p) => p.id !== id));
  }

  select(id: string | null): void {
    if (this.activeId() !== id) this.disconnect();
    this.activeId.set(id);
  }

  forgetToken(id: string): void {
    this.updateProfile(id, { token: undefined });
    this.addLog('info', 'Token removido — a TV pedirá autorização novamente.');
  }

  // ───────────────────────── conexão ─────────────────────────

  buildUrl(p: TvProfile): string {
    const proto = p.secure ? 'wss' : 'ws';
    const port = p.secure ? 8002 : 8001;
    const name = btoa(APP_NAME);
    const token = p.token ? `&token=${encodeURIComponent(p.token)}` : '';
    return `${proto}://${p.ip}:${port}/api/v2/channels/samsung.remote.api.v2?name=${name}${token}`;
  }

  connect(id: string): void {
    const p = this.profiles().find((x) => x.id === id);
    if (!p) return;
    this.closeSocket();
    this.activeId.set(id);

    if (p.demo) {
      this.setState('connected', 'Modo demonstração (nenhum comando sai do navegador)');
      this.addLog('info', 'Modo demonstração ativo.');
      return;
    }

    if (location.protocol === 'https:' && !p.secure) {
      this.fail(
        'Esta página está em HTTPS e o navegador bloqueia ws://. Use o modo seguro (wss, porta 8002) ou abra o app via http:// na sua rede.',
      );
      return;
    }

    const url = this.buildUrl(p);
    this.setState('connecting', `Conectando a ${p.ip}…`);
    this.addLog('info', `Abrindo ${url.replace(/token=[^&]+/, 'token=•••')}`);

    let ws: WebSocket;
    try {
      ws = new WebSocket(url);
    } catch (e) {
      this.fail(`URL inválida: ${(e as Error).message}`);
      return;
    }
    this.ws = ws;

    this.connectTimer = setTimeout(() => {
      if (this.ws === ws && !this.connected()) {
        this.fail(
          'Tempo esgotado. Confira o IP, se a TV está ligada na mesma rede e, no modo seguro, se o certificado foi aceito.',
        );
        this.closeSocket();
      }
    }, CONNECT_TIMEOUT_MS);

    ws.onopen = () => {
      if (this.ws !== ws || this.connected()) return;
      this.setState('awaiting', 'Aceite o pedido de conexão na tela da TV…');
    };

    ws.onmessage = (ev) => {
      if (this.ws === ws) this.handleMessage(id, String(ev.data));
    };

    ws.onerror = () => {
      if (this.ws !== ws || this.connected()) return;
      this.fail(
        p.secure
          ? 'Não foi possível abrir o WebSocket seguro. Abra o endereço da TV (botão abaixo) e aceite o certificado; depois tente de novo.'
          : 'Não foi possível conectar na porta 8001. Se a TV é de 2018 ou mais nova, use o modo seguro (wss:8002).',
      );
    };

    ws.onclose = () => {
      if (this.ws !== ws) return;
      this.clearTimer();
      this.ws = undefined;
      if (this.state() === 'connected') {
        this.setState('disconnected', 'Conexão encerrada pela TV.');
        this.addLog('info', 'Conexão encerrada.');
      } else if (this.state() !== 'error') {
        this.setState('disconnected', 'Desconectado');
      }
    };
  }

  disconnect(): void {
    const was = this.state() !== 'disconnected';
    this.closeSocket();
    this.setState('disconnected', 'Desconectado');
    if (was) this.addLog('info', 'Desconectado.');
  }

  // ───────────────────────── comandos ─────────────────────────

  sendKey(key: string): void {
    this.dispatch(
      {
        method: 'ms.remote.control',
        params: { Cmd: 'Click', DataOfCmd: key, Option: 'false', TypeOfRemote: 'SendRemoteKey' },
      },
      key,
    );
    navigator.vibrate?.(8);
  }

  launchApp(appId: string, name?: string, type: 'DEEP_LINK' | 'NATIVE_LAUNCH' = 'DEEP_LINK'): void {
    this.dispatch(
      {
        method: 'ms.channel.emit',
        params: { event: 'ed.apps.launch', to: 'host', data: { action_type: type, appId } },
      },
      `abrir ${name ?? appId}`,
    );
    navigator.vibrate?.(8);
  }

  sendText(text: string): void {
    if (!text) return;
    const b64 = btoa(String.fromCharCode(...new TextEncoder().encode(text)));
    this.dispatch(
      {
        method: 'ms.remote.control',
        params: { Cmd: b64, DataOfCmd: 'base64', Option: 'false', TypeOfRemote: 'SendInputString' },
      },
      `texto “${text}”`,
    );
  }

  clearLog(): void {
    this.log.set([]);
  }

  showToast(msg: string): void {
    this.toast.set(msg);
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.toast.set(null), 2600);
  }

  // ───────────────────────── internos ─────────────────────────

  private dispatch(payload: unknown, label: string): void {
    if (!this.connected()) {
      this.showToast('Conecte-se a uma TV primeiro.');
      return;
    }
    const p = this.active();
    if (!p?.demo) {
      if (this.ws?.readyState !== WebSocket.OPEN) {
        this.showToast('Conexão perdida — reconecte.');
        return;
      }
      this.ws.send(JSON.stringify(payload));
    }
    this.addLog('send', label);
  }

  private handleMessage(id: string, raw: string): void {
    let msg: { event?: string; data?: { token?: string | number; message?: string } };
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }
    switch (msg.event) {
      case 'ms.channel.connect': {
        const token = msg.data?.token;
        if (token !== undefined && token !== null) this.updateProfile(id, { token: String(token) });
        this.clearTimer();
        this.setState('connected', `Conectado a ${this.active()?.name ?? 'TV'}`);
        this.addLog('recv', token ? 'Autorizado — token salvo neste navegador.' : 'Autorizado.');
        break;
      }
      case 'ms.channel.unauthorized':
        this.fail(
          'A TV negou o acesso. Em Configurações › Geral › Gerenciador de dispositivos externos, verifique “Notificação de acesso” e a lista de dispositivos.',
        );
        this.closeSocket();
        break;
      case 'ms.channel.timeOut':
        this.fail('O pedido de autorização expirou na TV. Tente conectar de novo e aceite rapidamente.');
        this.closeSocket();
        break;
      case 'ms.error':
        this.addLog('error', msg.data?.message ?? 'Erro retornado pela TV.');
        break;
      default:
        if (msg.event) this.addLog('recv', msg.event);
    }
  }

  private closeSocket(): void {
    this.clearTimer();
    const ws = this.ws;
    this.ws = undefined;
    if (ws) {
      ws.onopen = ws.onmessage = ws.onerror = ws.onclose = null;
      try {
        ws.close();
      } catch {
        /* ignore */
      }
    }
  }

  private clearTimer(): void {
    clearTimeout(this.connectTimer);
    this.connectTimer = undefined;
  }

  private setState(s: ConnState, text: string): void {
    this.state.set(s);
    this.statusText.set(text);
  }

  private fail(text: string): void {
    this.clearTimer();
    this.setState('error', text);
    this.addLog('error', text);
  }

  private addLog(kind: LogKind, text: string): void {
    const now = Date.now();
    this.log.update((l) => {
      const last = l[0];
      if (last && last.kind === kind && last.text === text && now - last.at < 2000) {
        return [{ ...last, at: now, count: last.count + 1 }, ...l.slice(1)];
      }
      return [{ id: ++this.logSeq, at: now, kind, text, count: 1 }, ...l].slice(0, 60);
    });
  }

  private load(): void {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw) as Persisted;
      this.profiles.set(Array.isArray(data.profiles) ? data.profiles : []);
      this.activeId.set(data.activeId ?? null);
    } catch {
      /* armazenamento indisponível ou corrompido */
    }
  }

  private save(data: Persisted): void {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(data));
    } catch {
      /* ignore */
    }
  }
}
