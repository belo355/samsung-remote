import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SamsungTvService } from '../services/samsung-tv.service';

const IPV4 = /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/;

@Component({
  selector: 'app-connection-panel',
  imports: [FormsModule],
  templateUrl: './connection-panel.html',
  styleUrl: './connection-panel.scss',
})
export class ConnectionPanel {
  protected readonly tv = inject(SamsungTvService);

  protected readonly editing = signal(false);
  protected name = 'Minha TV Samsung';
  protected ip = '';
  protected secure = true;

  protected readonly isHttps = location.protocol === 'https:';

  // método (e não computed): `ip` é um campo ligado ao ngModel, não um signal
  protected ipValid(): boolean {
    return IPV4.test(this.ip.trim());
  }

  protected readonly certUrl = computed(() => {
    const p = this.tv.active();
    return p && p.secure && !p.demo ? `https://${p.ip}:8002/` : null;
  });

  protected newTv(): void {
    this.tv.select(null);
    this.name = 'Minha TV Samsung';
    this.ip = '';
    this.secure = true;
    this.editing.set(true);
  }

  protected edit(): void {
    const p = this.tv.active();
    if (!p || p.demo) return;
    this.name = p.name;
    this.ip = p.ip;
    this.secure = p.secure;
    this.editing.set(true);
  }

  protected save(connect: boolean): void {
    if (!this.ipValid()) return;
    const data = { name: this.name.trim() || 'TV Samsung', ip: this.ip.trim(), secure: this.secure };
    const cur = this.tv.active();
    let id: string;
    if (cur && !cur.demo && this.editing() && this.tv.profiles().some((p) => p.id === cur.id)) {
      // trocar IP/protocolo invalida o token antigo
      const changed = cur.ip !== data.ip || cur.secure !== data.secure;
      this.tv.updateProfile(cur.id, { ...data, token: changed ? undefined : cur.token });
      id = cur.id;
    } else {
      id = this.tv.addProfile(data).id;
    }
    this.editing.set(false);
    if (connect) this.tv.connect(id);
  }

  protected demo(): void {
    const existing = this.tv.profiles().find((p) => p.demo);
    const id = existing?.id ?? this.tv.addProfile({ name: 'Demonstração', ip: '0.0.0.0', secure: false, demo: true }).id;
    this.editing.set(false);
    this.tv.connect(id);
  }

  protected remove(): void {
    const p = this.tv.active();
    if (p && confirm(`Remover “${p.name}” deste navegador?`)) this.tv.removeProfile(p.id);
  }

  protected cancel(): void {
    this.editing.set(false);
  }

  protected showForm(): boolean {
    return this.editing() || this.tv.profiles().length === 0;
  }
}
