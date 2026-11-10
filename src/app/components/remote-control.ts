import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { K, TV_APPS } from '../models/tv.models';
import { SamsungTvService } from '../services/samsung-tv.service';
import { RcKey } from './rc-key';

type Tab = 'main' | 'numbers' | 'media' | 'text';

const SHORTCUTS: Record<string, string> = {
  ArrowUp: K.UP,
  ArrowDown: K.DOWN,
  ArrowLeft: K.LEFT,
  ArrowRight: K.RIGHT,
  Enter: K.ENTER,
  Escape: K.RETURN,
  Backspace: K.RETURN,
  '+': K.VOL_UP,
  '=': K.VOL_UP,
  '-': K.VOL_DOWN,
  _: K.VOL_DOWN,
  m: K.MUTE,
  PageUp: K.CH_UP,
  PageDown: K.CH_DOWN,
  h: K.HOME,
  i: K.INFO,
};

@Component({
  selector: 'app-remote-control',
  imports: [RcKey, FormsModule],
  host: { '(document:keydown)': 'onKeydown($event)' },
  templateUrl: './remote-control.html',
  styleUrl: './remote-control.scss',
})
export class RemoteControl {
  protected readonly tv = inject(SamsungTvService);
  protected readonly K = K;
  protected readonly apps = TV_APPS;
  protected readonly digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

  protected readonly tab = signal<Tab>('main');
  protected readonly tabs: { id: Tab; label: string }[] = [
    { id: 'main', label: 'Controle' },
    { id: 'numbers', label: 'Números' },
    { id: 'media', label: 'Mídia & apps' },
    { id: 'text', label: 'Texto' },
  ];

  protected text = '';
  protected customAppId = '';

  protected launchCustom(): void {
    const id = this.customAppId.trim();
    if (id) this.tv.launchApp(id);
  }

  protected sendText(): void {
    this.tv.sendText(this.text);
    this.text = '';
  }

  protected onKeydown(ev: KeyboardEvent): void {
    if (!this.tv.connected() || ev.ctrlKey || ev.metaKey || ev.altKey) return;
    const t = ev.target as HTMLElement | null;
    if (t && (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(t.tagName))) {
      // botões focados tratam Enter/Espaço sozinhos
      if (t.tagName !== 'BUTTON' || ev.key === 'Enter' || ev.key === ' ') return;
    }
    const key = /^[0-9]$/.test(ev.key) ? `KEY_${ev.key}` : SHORTCUTS[ev.key];
    if (!key) return;
    ev.preventDefault();
    this.tv.sendKey(key);
  }
}
