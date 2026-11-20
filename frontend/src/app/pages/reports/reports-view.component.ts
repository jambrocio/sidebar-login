import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DummyDataService } from '../../core/services/dummy-data.service';

/**
 * @fileoverview Vista de Reportes Comerciales y de Auditoría.
 * Permite visualizar métricas consolidadas de ventas, inventario y rendimiento por local.
 *
 * @author Equipo de Arquitectura Frontend
 * @version 1.0.0
 */

/**
 * Componente dedicado a los Reportes Comerciales y de Auditoría (`/dashboard/reports`).
 */
@Component({
  selector: 'app-reports-view',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './reports-view.component.html',
  styleUrl: './reports-view.component.scss',
})
export class ReportsViewComponent {
  private readonly dummyData = inject(DummyDataService);

  /** Información institucional del Negocio Matriz */
  readonly businessInfo = this.dummyData.businessInfo;

  /** Local asignado al usuario activo */
  readonly assignedBranch = this.dummyData.assignedBranch;

  /** Catálogo de reportes disponibles y parametrizables */
  readonly reports = this.dummyData.reports;

  /** Mensaje de retroalimentación ante descargas o exportaciones */
  readonly feedbackMessage = signal<string | null>(null);
}
