import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { DummyDataService } from '../../core/services/dummy-data.service';

/**
 * Componente de la vista Inicio (`/dashboard/inicio`).
 * Muestra los indicadores clave (KPIs) del Negocio Matriz, sus locales asociados
 * y la bitácora de auditoría cargada desde `json/dashboard-overview.json`.
 */
@Component({
  selector: 'app-home-view',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './home-view.component.html',
  styleUrl: './home-view.component.scss',
})
export class HomeViewComponent {
  private readonly dummyData = inject(DummyDataService);

  readonly businessInfo = this.dummyData.businessInfo;
  readonly activeBusinessBranches = this.dummyData.activeBusinessBranches;
  readonly assignedBranch = this.dummyData.assignedBranch;
  readonly currentSessionUser = this.dummyData.currentSessionUser;
  readonly kpis = this.dummyData.kpis;
  readonly recentActivities = this.dummyData.recentActivities;
}
