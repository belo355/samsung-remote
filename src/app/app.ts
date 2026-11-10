import { Component, inject } from '@angular/core';
import { CommandLog } from './components/command-log';
import { ConnectionPanel } from './components/connection-panel';
import { RemoteControl } from './components/remote-control';
import { SamsungTvService } from './services/samsung-tv.service';

@Component({
  selector: 'app-root',
  imports: [ConnectionPanel, RemoteControl, CommandLog],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly tv = inject(SamsungTvService);
}
