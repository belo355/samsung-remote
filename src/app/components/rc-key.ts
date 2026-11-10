import { Component, OnDestroy, computed, inject, input } from '@angular/core';
import { SamsungTvService } from '../services/samsung-tv.service';

/** Botão do controle. Mantido pressionado, repete o comando (volume, canais, setas). */
@Component({
  selector: 'rc-key',
  template: `
    <button
      type="button"
      [class]="'k ' + variant()"
      [disabled]="!tv.connected()"
      [attr.aria-label]="aria() || label()"
      [title]="hint()"
      (mousedown)="$event.preventDefault()"
      (pointerdown)="down($event)"
      (pointerup)="stop()"
      (pointerleave)="stop()"
      (pointercancel)="stop()"
      (click)="click($event)"
      (contextmenu)="$event.preventDefault()"
    >
      <span class="g">{{ label() }}</span>
      @if (sub()) {
        <span class="s">{{ sub() }}</span>
      }
    </button>
  `,
  styles: `
    :host { display: flex; min-width: 0; }
    .k {
      all: unset; box-sizing: border-box; flex: 1; width: 100%; cursor: pointer; user-select: none; touch-action: manipulation;
      display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1px;
      min-height: 46px; padding: 6px 8px; border-radius: 14px; text-align: center;
      background: var(--key); color: var(--ink); font-weight: 600; font-size: 15px; line-height: 1.1;
      border: 1px solid var(--edge); box-shadow: 0 2px 0 rgba(0,0,0,.35);
      transition: transform .06s, background .15s, filter .15s;
      -webkit-tap-highlight-color: transparent;
    }
    .k:hover:not(:disabled) { background: var(--key-hover); }
    .k:active:not(:disabled) { transform: translateY(2px); box-shadow: none; filter: brightness(1.2); }
    .k:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
    .k:disabled { opacity: .35; cursor: not-allowed; }
    .g { font-size: 1.15em; }
    .s { font-size: 10px; font-weight: 500; color: var(--muted); letter-spacing: .04em; text-transform: uppercase; }
    .power { background: #5a1d24; border-color: #8c2c38; color: #ffd9dd; }
    .power:hover:not(:disabled) { background: #74252f; }
    .accent { background: var(--accent); border-color: transparent; color: #04141a; }
    .accent:hover:not(:disabled) { filter: brightness(1.1); background: var(--accent); }
    .ghost { background: transparent; box-shadow: none; }
    .round { border-radius: 999px; }
    .red { background: #c62f3d; border-color: transparent; color: #fff; min-height: 30px; }
    .green { background: #2a9d57; border-color: transparent; color: #fff; min-height: 30px; }
    .yellow { background: #d9a520; border-color: transparent; color: #1c1500; min-height: 30px; }
    .blue { background: #2f73d6; border-color: transparent; color: #fff; min-height: 30px; }
    .app { min-height: 64px; border-radius: 16px; border-color: transparent; color: #fff; }
    .app .g { font-size: 1.5em; font-weight: 800; }
    .app .s { color: rgba(255,255,255,.85); }
  `,
})
export class RcKey implements OnDestroy {
  readonly key = input.required<string>();
  readonly label = input.required<string>();
  readonly sub = input<string>('');
  readonly aria = input<string>('');
  readonly variant = input<string>('');
  readonly repeat = input(false);

  protected readonly tv = inject(SamsungTvService);
  protected readonly hint = computed(() => this.aria() || this.sub() || this.label());

  private holdTimer?: ReturnType<typeof setTimeout>;
  private repeatTimer?: ReturnType<typeof setInterval>;
  private pointerFired = false;

  protected down(ev: PointerEvent): void {
    if (ev.button !== 0) return;
    this.pointerFired = true;
    this.tv.sendKey(this.key());
    if (this.repeat()) {
      this.holdTimer = setTimeout(() => {
        this.repeatTimer = setInterval(() => this.tv.sendKey(this.key()), 130);
      }, 420);
    }
  }

  /** Ativação por teclado (Enter/Space) chega como click sem pointerdown. */
  protected click(ev: MouseEvent): void {
    if (this.pointerFired) {
      this.pointerFired = false;
      return;
    }
    if (ev.detail === 0) this.tv.sendKey(this.key());
  }

  protected stop(): void {
    clearTimeout(this.holdTimer);
    clearInterval(this.repeatTimer);
    this.holdTimer = this.repeatTimer = undefined;
  }

  ngOnDestroy(): void {
    this.stop();
  }
}
