import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DummyDataService } from '../../core/services/dummy-data.service';
import { TablePaginationComponent } from '../../shared/components/pagination/table-pagination.component';
import { AppDatePipe } from '../../shared/pipes/app-date.pipe';

/**
 * @fileoverview Vista de Reportes Comerciales y de Auditoría.
 * Permite visualizar métricas consolidadas de ventas, inventario y rendimiento por local con paginación.
 *
 * @author Equipo de Arquitectura Frontend
 * @version 2.0.0
 */

/**
 * Componente dedicado a los Reportes Comerciales y de Auditoría (`/dashboard/reports`).
 */
@Component({
  selector: 'app-reports-view',
  standalone: true,
  imports: [CommonModule, TablePaginationComponent, AppDatePipe],
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

  /** Tamaño de página estándar (15 registros) */
  readonly pageSize = 15;

  /** Página activa actual */
  readonly currentPage = signal<number>(1);

  /** Reportes paginados a 15 por página */
  readonly pagedReports = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.reports().slice(start, start + this.pageSize);
  });
}
