import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DummyDataService } from '../../core/services/dummy-data.service';

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

  readonly businessInfo = this.dummyData.businessInfo;
  readonly assignedBranch = this.dummyData.assignedBranch;
  readonly reports = this.dummyData.reports;
  readonly feedbackMessage = signal<string | null>(null);
}
