import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DummyDataService } from '../../core/services/dummy-data.service';
import { BeverageSale, resolveCurrencySymbol } from '../../core/models/domain.models';
import { SaleReceiptViewComponent } from '../../shared/components/sale-receipt-view/sale-receipt-view.component';
import { TablePaginationComponent } from '../../shared/components/pagination/table-pagination.component';
import { AppDatePipe } from '../../shared/pipes/app-date.pipe';
import { AppAmountPipe } from '../../shared/pipes/app-amount.pipe';

/**
 * Componente Smart/Container dedicado al Historial de Ventas Emitidas (`/dashboard/sales-history`).
 *
 * @description Muestra las ventas registradas por el usuario autenticado actual con paginación de 15 por página,
 * permitiendo búsqueda por cliente o número de documento y apertura del comprobante fiscal detallado.
 *
 * @author Equipo de Arquitectura Frontend Senior
 * @version 2.0
 */
@Component({
  selector: 'app-sales-history',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, SaleReceiptViewComponent, TablePaginationComponent, AppDatePipe, AppAmountPipe],
  templateUrl: './sales-history.component.html',
  styleUrl: './sales-history.component.scss',
})
export class SalesHistoryComponent {
  private readonly dummyData = inject(DummyDataService);

  readonly businessInfo = this.dummyData.businessInfo;
  readonly assignedBranch = this.dummyData.assignedBranch;
  readonly currentSessionUser = this.dummyData.currentSessionUser;

  readonly currencySymbol = computed<string>(() => {
    const curr = this.businessInfo().defaultCurrency || this.businessInfo().currency || 'PEN';
    return resolveCurrencySymbol(curr);
  });

  readonly searchQuery = signal<string>('');
  readonly selectedReceipt = signal<BeverageSale | null>(null);
  readonly feedbackMessage = signal<string | null>(null);

  /** Tamaño de página estándar (15 registros) */
  readonly pageSize = 15;

  /** Página activa actual */
  readonly currentPage = signal<number>(1);

  constructor() {
    effect(() => {
      this.searchQuery();
      this.currentPage.set(1);
    });
  }

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

  /** Subconjunto de ventas paginadas a 15 registros */
  readonly pagedMySalesHistory = computed<BeverageSale[]>(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.filteredMySalesHistory().slice(start, start + this.pageSize);
  });

  readonly mySalesTotalAmount = computed(() =>
    +this.filteredMySalesHistory()
      .reduce((acc, sale) => acc + sale.total, 0)
      .toFixed(2)
  );
}
