import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DummyDataService } from '../../core/services/dummy-data.service';
import { BeverageSale } from '../../core/models/domain.models';
import { SaleReceiptViewComponent } from '../../shared/components/sale-receipt-view/sale-receipt-view.component';

/**
 * Componente dedicado al Historial de Ventas Emitidas (`/dashboard/sales-history`).
 *
 * Cumple la regla de negocio: muestra exclusivamente las ventas registradas
 * por el usuario autenticado actual y permite abrir la vista de Comprobante de Venta.
 */
@Component({
  selector: 'app-sales-history',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, SaleReceiptViewComponent],
  templateUrl: './sales-history.component.html',
  styleUrl: './sales-history.component.scss',
})
export class SalesHistoryComponent {
  private readonly dummyData = inject(DummyDataService);

  readonly businessInfo = this.dummyData.businessInfo;
  readonly assignedBranch = this.dummyData.assignedBranch;
  readonly currentSessionUser = this.dummyData.currentSessionUser;

  readonly searchQuery = signal<string>('');
  readonly selectedReceipt = signal<BeverageSale | null>(null);
  readonly feedbackMessage = signal<string | null>(null);

  readonly filteredMySalesHistory = computed<BeverageSale[]>(() => {
    const ownSales = this.dummyData.mySalesHistory();
    const q = this.searchQuery().trim().toLowerCase();
    if (!q) return ownSales;
    return ownSales.filter(
      sale =>
        sale.id.toLowerCase().includes(q) ||
        sale.clientName.toLowerCase().includes(q) ||
        sale.itemsSummary.toLowerCase().includes(q)
    );
  });

  readonly mySalesTotalAmount = computed(() =>
    +this.filteredMySalesHistory()
      .reduce((acc, sale) => acc + sale.total, 0)
      .toFixed(2)
  );
}
