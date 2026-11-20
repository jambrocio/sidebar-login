import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';

/**
 * @fileoverview Componente raíz (Root Component) de la aplicación Angular.
 * Aloja el `<router-outlet>` principal para el enrutamiento de Login y Dashboard.
 *
 * @author Equipo de Arquitectura Frontend
 * @version 1.0.0
 */

/**
 * Componente raíz de la aplicación web.
 */
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  /** Título interno de la aplicación */
  protected readonly title = signal<string>('futuristic-login');
}
