import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastOutlet } from './shared/components/toast-outlet/toast-outlet';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ToastOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})

export class App {}
