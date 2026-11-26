import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { DummyDataService } from '../../core/services/dummy-data.service';
import { TablePaginationComponent } from '../../shared/components/pagination/table-pagination.component';
import { AppDatePipe } from '../../shared/pipes/app-date.pipe';

/**
 * @fileoverview Tablero de bienvenida e inicio general del sistema (Dashboard Overview).
 * Renderiza los KPIs operativos principales, locales activos y la bitácora de actividad reciente con paginación.
 *
 * @author Equipo de Arquitectura Frontend
 * @version 2.0.0
 */

/**
 * Componente de la vista Inicio (`/dashboard/inicio`).
 * Muestra los indicadores clave (KPIs) del Negocio Matriz, sus locales asociados
 * y la bitácora de auditoría en tiempo real.
 */
@Component({
  selector: 'app-home-view',
  standalone: true,
  imports: [CommonModule, RouterLink, TablePaginationComponent, AppDatePipe],
  templateUrl: './home-view.component.html',
  styleUrl: './home-view.component.scss',
})
export class HomeViewComponent {
  private readonly dummyData = inject(DummyDataService);

  /** Perfil del Negocio Matriz */
  readonly businessInfo = this.dummyData.businessInfo;

  /** Locales comerciales y sucursales activas */
  readonly activeBusinessBranches = this.dummyData.activeBusinessBranches;

  /** Local asignado a la sesión actual */
  readonly assignedBranch = this.dummyData.assignedBranch;

  /** Usuario actualmente autenticado */
  readonly currentSessionUser = this.dummyData.currentSessionUser;

  /** Indicadores clave de rendimiento comercial (KPIs) */
  readonly kpis = this.dummyData.kpis;

  /** Bitácora de actividades y eventos recientes */
  readonly recentActivities = this.dummyData.recentActivities;

  /** Tamaño de página estándar (15 registros) */
  readonly pageSize = 15;

  /** Página activa actual */
  readonly currentPage = signal<number>(1);

  /** Actividades paginadas a 15 por página */
  readonly pagedRecentActivities = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.recentActivities().slice(start, start + this.pageSize);
  });
}
