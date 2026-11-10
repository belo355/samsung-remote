import { DatePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { SamsungTvService } from '../services/samsung-tv.service';

@Component({
  selector: 'app-command-log',
  imports: [DatePipe],
  template: `
    <section class="card" aria-labelledby="log-title">
      <header>
        <h2 id="log-title">Registro</h2>
        <button type="button" (click)="tv.clearLog()" [disabled]="!tv.log().length">Limpar</button>
      </header>
      @if (tv.log().length === 0) {
        <p class="empty">Os comandos enviados aparecem aqui.</p>
      } @else {
        <ol>
          @for (e of tv.log(); track e.id) {
            <li [attr.data-kind]="e.kind">
              <time>{{ e.at | date: 'HH:mm:ss' }}</time>
              <span class="t">{{ e.text }}</span>
              @if (e.count > 1) {
                <b>×{{ e.count }}</b>
              }
            </li>
          }
        </ol>
      }
    </section>
  `,
  styles: `
    :host { display: block; }
    .card { background: var(--card); border: 1px solid var(--edge); border-radius: 22px; padding: 18px; }
    header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
    h2 { margin: 0; font-size: 15px; letter-spacing: .1em; text-transform: uppercase; color: var(--muted); }
    header button {
      all: unset; cursor: pointer; font-size: 12px; color: var(--accent); text-decoration: underline;
      &:disabled { opacity: .3; cursor: default; }
      &:focus-visible { outline: 2px solid var(--accent); }
    }
    .empty { margin: 0; font-size: 13px; color: var(--muted); }
    ol { list-style: none; margin: 0; padding: 0; max-height: 280px; overflow: auto; display: flex; flex-direction: column; gap: 2px;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; }
    li { display: flex; gap: 8px; padding: 4px 6px; border-radius: 6px; align-items: baseline; }
    li:hover { background: rgba(255, 255, 255, .04); }
    time { color: var(--muted); flex: none; }
    .t { flex: 1; word-break: break-word; }
    b { color: var(--muted); font-weight: 600; }
    li[data-kind='send'] .t { color: var(--ink); }
    li[data-kind='recv'] .t { color: var(--ok); }
    li[data-kind='info'] .t { color: var(--muted); }
    li[data-kind='error'] .t { color: var(--bad); }
  `,
})
export class CommandLog {
  protected readonly tv = inject(SamsungTvService);
}
