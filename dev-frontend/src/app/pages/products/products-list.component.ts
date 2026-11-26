import { Component, OnInit, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DummyDataService } from '../../core/services/dummy-data.service';
import { BeverageProduct, BeveragePurchase } from '../../core/models/domain.models';
import { TablePaginationComponent } from '../../shared/components/pagination/table-pagination.component';
import { AppAmountPipe } from '../../shared/pipes/app-amount.pipe';

/**
 * Registro de una línea de venta asociada históricamente a un producto.
 */
export interface ProductSaleHistoryEntry {
  saleId: string;
  date: string;
  documentType: string;
  clientName: string;
  modality: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  totalSale: number;
  sellerUser: string;
  branchName: string;
  paymentMethod: string;
}

/**
 * @fileoverview Componente de Catálogo e Inventario Maestro de Bebidas.
 * Permite la búsqueda reactiva, filtrado por empresa/negocio, visualización
 * detallada del stock y precios por local con paginación de 15 registros.
 *
 * @author Equipo de Arquitectura Frontend
 * @version 2.0.0
 */

/**
 * Componente dedicado al Inventario Maestro de Bebidas (`/dashboard/products/list`).
 * Implementa filtrado reactivo mediante Angular Signals, paginación estricta y restricción por rol.
 */
@Component({
  selector: 'app-products-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, TablePaginationComponent, AppAmountPipe],
  templateUrl: './products-list.component.html',
  styleUrl: './products-list.component.scss',
})
export class ProductsListComponent implements OnInit {
  private readonly dummyData = inject(DummyDataService);

  /** Información del Negocio actual activo */
  readonly businessInfo = this.dummyData.businessInfo;

  /** Catálogo de Negocios disponibles para filtro de Superusuario */
  readonly businesses = this.dummyData.businesses;

  /** Local asignado al usuario activo */
  readonly assignedBranch = this.dummyData.assignedBranch;

  /** Perfil del usuario actualmente autenticado */
  readonly currentUserProfile = this.dummyData.currentUserProfile;

  /** Señal computada que indica si el usuario posee privilegios de Administrador General */
  readonly isGeneralAdmin = this.dummyData.isGeneralAdmin;

  /** Catálogo global reactivo de productos de bebidas */
  readonly products = this.dummyData.products;

  /** Término de búsqueda textual ingresado por el usuario */
  readonly searchQuery = signal<string>('');

  /** Código del negocio seleccionado para filtrar ('ALL' para todos) */
  readonly filterBusinessCode = signal<string>(this.businessInfo().id || 'ALL');

  /** Tamaño de página establecido por estándar corporativo */
  readonly pageSize = 15;

  /** Página activa actual */
  readonly currentPage = signal<number>(1);

  /** Historial de compras globales del sistema */
  readonly purchasesList = this.dummyData.purchasesList;

  /** Historial de ventas globales del sistema */
  readonly salesList = this.dummyData.salesList;

  /** Producto seleccionado actualmente para ver su histórico en vista completa */
  readonly selectedProductForHistory = signal<BeverageProduct | null>(null);

  /** Pestaña activa dentro de la vista completa de histórico ('all' | 'purchases' | 'sales') */
  readonly historyActiveTab = signal<'all' | 'purchases' | 'sales'>('all');

  /** Búsqueda interna dentro del histórico de compras y ventas */
  readonly historySearchQuery = signal<string>('');

  /** Compras y abastecimiento asociadas al producto seleccionado */
  readonly productPurchases = computed<BeveragePurchase[]>(() => {
    const prod = this.selectedProductForHistory();
    if (!prod) return [];
    const prodName = (prod.name || '').trim().toLowerCase();
    const prodSku = (prod.sku || '').trim().toLowerCase();

    return this.purchasesList().filter(p => {
      const detail = (p.productDetail || '').toLowerCase();
      const matchesName = prodName.length > 2 && (detail.includes(prodName) || prodName.includes(detail));
      const matchesSku = prodSku.length >= 3 && detail.includes(prodSku);
      return matchesName || matchesSku;
    });
  });

  /** Ventas emitidas asociadas al producto seleccionado */
  readonly productSales = computed<ProductSaleHistoryEntry[]>(() => {
    const prod = this.selectedProductForHistory();
    if (!prod) return [];
    const prodName = (prod.name || '').trim().toLowerCase();
    const prodSku = (prod.sku || '').trim().toLowerCase();

    const entries: ProductSaleHistoryEntry[] = [];
    for (const sale of this.salesList()) {
      for (const it of sale.items || []) {
        const itName = (it.productName || '').trim().toLowerCase();
        const itSku = (it.sku || '').trim().toLowerCase();
        const matchSku = prodSku.length >= 3 && itSku.length >= 3 && itSku === prodSku;
        const matchName = prodName.length > 2 && itName.length > 2 && (itName === prodName || itName.includes(prodName) || prodName.includes(itName));

        if (matchSku || matchName) {
          entries.push({
            saleId: sale.id,
            date: sale.date,
            documentType: sale.documentType,
            clientName: sale.clientName,
            modality: it.modality || sale.modality,
            quantity: it.quantity,
            unitPrice: it.unitPrice,
            subtotal: it.lineSubtotal ?? (it.unitPrice * it.quantity),
            totalSale: sale.total,
            sellerUser: sale.sellerUser,
            branchName: sale.branchName,
            paymentMethod: sale.paymentMethod,
          });
        }
      }
    }
    return entries;
  });

  /** Total de cajas compradas registradas para el producto */
  readonly totalPurchasedBoxes = computed<number>(() => {
    return this.productPurchases().reduce((acc, p) => acc + (p.boxesQty || 0), 0);
  });

  /** Costo acumulado de compras */
  readonly totalPurchasedCost = computed<number>(() => {
    return this.productPurchases().reduce((acc, p) => acc + (p.totalCost || 0), 0);
  });

  /** Total de cajas vendidas estimadas */
  readonly totalSoldBoxes = computed<number>(() => {
    return this.productSales().reduce((acc, s) => {
      const isWholesale = s.modality === 'Por Mayor' || s.modality === 'Mayorista';
      return acc + (isWholesale ? s.quantity : Math.floor(s.quantity / 12));
    }, 0);
  });

  /** Total de unidades vendidas acumuladas */
  readonly totalSoldUnits = computed<number>(() => {
    return this.productSales().reduce((acc, s) => {
      const isWholesale = s.modality === 'Por Mayor' || s.modality === 'Mayorista';
      return acc + (isWholesale ? s.quantity * 12 : s.quantity);
    }, 0);
  });

  /** Ingreso total acumulado por ventas de este producto */
  readonly totalSalesIncome = computed<number>(() => {
    return this.productSales().reduce((acc, s) => acc + (s.subtotal || 0), 0);
  });

  /** Compras y abastecimiento filtradas por búsqueda interna */
  readonly filteredProductPurchases = computed<BeveragePurchase[]>(() => {
    const list = this.productPurchases();
    const q = this.historySearchQuery().trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      p =>
        (p.id && p.id.toLowerCase().includes(q)) ||
        (p.supplier && p.supplier.toLowerCase().includes(q)) ||
        (p.branchName && p.branchName.toLowerCase().includes(q)) ||
        (p.buyerUser && p.buyerUser.toLowerCase().includes(q)) ||
        (p.date && p.date.toLowerCase().includes(q))
    );
  });

  /** Ventas emitidas filtradas por búsqueda interna */
  readonly filteredProductSales = computed<ProductSaleHistoryEntry[]>(() => {
    const list = this.productSales();
    const q = this.historySearchQuery().trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      s =>
        (s.saleId && s.saleId.toLowerCase().includes(q)) ||
        (s.clientName && s.clientName.toLowerCase().includes(q)) ||
        (s.documentType && s.documentType.toLowerCase().includes(q)) ||
        (s.sellerUser && s.sellerUser.toLowerCase().includes(q)) ||
        (s.date && s.date.toLowerCase().includes(q))
    );
  });

  /** Tamaño de página estándar para las tablas del histórico */
  readonly historyPageSize = 15;

  /** Página activa de Compras (Entradas) en el Histórico */
  readonly purchasesCurrentPage = signal<number>(1);

  /** Página activa de Ventas (Salidas) en el Histórico */
  readonly salesCurrentPage = signal<number>(1);

  /** Compras y abastecimiento paginadas bajo el estándar corporativo */
  readonly paginatedProductPurchases = computed<BeveragePurchase[]>(() => {
    const list = this.filteredProductPurchases();
    const page = this.purchasesCurrentPage();
    const start = (page - 1) * this.historyPageSize;
    return list.slice(start, start + this.historyPageSize);
  });

  /** Ventas emitidas paginadas bajo el estándar corporativo */
  readonly paginatedProductSales = computed<ProductSaleHistoryEntry[]>(() => {
    const list = this.filteredProductSales();
    const page = this.salesCurrentPage();
    const start = (page - 1) * this.historyPageSize;
    return list.slice(start, start + this.historyPageSize);
  });

  /**
   * Abre la vista completa de histórico para el producto seleccionado y refresca datos.
   */
  openProductHistory(prod: BeverageProduct): void {
    this.selectedProductForHistory.set(prod);
    this.historyActiveTab.set('all');
    this.historySearchQuery.set('');
    this.purchasesCurrentPage.set(1);
    this.salesCurrentPage.set(1);
    this.dummyData.loadAllFromBackend();
  }

  /**
   * Cierra la vista de histórico y regresa al inventario maestro.
   */
  closeProductHistory(): void {
    this.selectedProductForHistory.set(null);
    this.historySearchQuery.set('');
    this.purchasesCurrentPage.set(1);
    this.salesCurrentPage.set(1);
  }

  /**
   * Refresca los datos del catálogo e histórico desde la capa de datos.
   */
  refreshData(): void {
    this.dummyData.loadAllFromBackend();
  }

  constructor() {
    // Sincronizar automáticamente el filtro con el negocio activo seleccionado en navbar
    effect(() => {
      const activeBiz = this.businessInfo().id;
      if (activeBiz && this.isGeneralAdmin()) {
        this.filterBusinessCode.set(activeBiz);
        this.currentPage.set(1);
      }
    });

    // Resetear a página 1 cuando cambie la búsqueda
    effect(() => {
      this.searchQuery();
      this.currentPage.set(1);
    });

    // Resetear a página 1 en el histórico cuando cambie la búsqueda interna o pestaña
    effect(() => {
      this.historySearchQuery();
      this.historyActiveTab();
      this.purchasesCurrentPage.set(1);
      this.salesCurrentPage.set(1);
    });
  }

  ngOnInit(): void {
    this.dummyData.loadAllFromBackend();
  }

  /**
   * Obtiene el símbolo monetario según la moneda configurada para el negocio del producto.
   */
  getCurrencySymbol(businessCode?: string): string {
    const code = (businessCode || this.businessInfo().id || '').trim().toUpperCase();
    const biz = this.businesses().find(b => b.id?.toUpperCase() === code);
    const curr = (biz?.currency || (code === 'BIZ-003' ? 'PEN' : this.businessInfo().currency) || 'PEN').toUpperCase();
    if (curr.includes('PEN') || curr.includes('SOL')) return 'S/';
    if (curr.includes('EUR') || curr.includes('€')) return '€';
    return '$';
  }

  /**
   * Lista computada de productos filtrados según:
   * 1. Alcance de rol (Restricción por Negocio asignado si no es Administrador General).
   * 2. Filtro de negocio seleccionado (si es Administrador General).
   * 3. Búsqueda por nombre, SKU o categoría.
   */
  readonly filteredProducts = computed<BeverageProduct[]>(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const filterBiz = this.filterBusinessCode();
    let list: BeverageProduct[] = this.products();

    if (!this.isGeneralAdmin()) {
      const myBiz = (this.businessInfo().id || this.currentUserProfile().assignedBusinessId || 'BIZ-001').toUpperCase();
      list = list.filter(p => {
        const bCode = (p.businessCode || '').toUpperCase();
        const bId = (p.businessId || '').toUpperCase();
        return !p.businessCode || bCode === myBiz || bId === myBiz;
      });
    } else if (filterBiz && filterBiz !== 'ALL') {
      const target = filterBiz.toUpperCase();
      list = list.filter(p => {
        const bCode = (p.businessCode || '').toUpperCase();
        const bId = (p.businessId || '').toUpperCase();
        return bCode === target || bId === target;
      });
    }

    if (!q) {
      return list;
    }

    return list.filter(
      p =>
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.sku && p.sku.toLowerCase().includes(q)) ||
        (p.category && p.category.toLowerCase().includes(q))
    );
  });

  /**
   * Subconjunto de productos paginados a 15 registros por página.
   */
  readonly pagedProducts = computed<BeverageProduct[]>(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.filteredProducts().slice(start, start + this.pageSize);
  });
}
