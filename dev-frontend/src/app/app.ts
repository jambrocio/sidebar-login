import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { AppVersionService } from './core/services/app-version.service';
import { AuthApiService } from './core/services/auth-api.service';
import { AppDialogService } from './core/services/app-dialog.service';

/**
 * @fileoverview Componente raíz (Root Component) de la aplicación Angular.
 * Aloja el `<router-outlet>` principal para el enrutamiento de Login y Dashboard
 * y supervisa las actualizaciones automáticas de versión en vivo.
 *
 * @author Equipo de Arquitectura Frontend
 * @version 2.4.1
 */

/**
 * Componente raíz de la aplicación web.
 */
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  /** Servicio centralizado de versión y auto-actualización */
  readonly versionService = inject(AppVersionService);

  /** Servicio de autenticación para control de sesión y confirmaciones */
  readonly authApi = inject(AuthApiService);

  /** Servicio universal de diálogos y confirmaciones temáticas */
  readonly dialogService = inject(AppDialogService);

  /** Título interno de la aplicación */
  protected readonly title = signal<string>('futuristic-login');
}
