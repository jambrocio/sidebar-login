import { Component, OnInit, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DummyDataService } from '../../core/services/dummy-data.service';
import { BeverageProduct, CommercialSupplier, FeedbackNotification, resolveCurrencySymbol } from '../../core/models/domain.models';
import { TablePaginationComponent } from '../../shared/components/pagination/table-pagination.component';
import { AppDatePipe } from '../../shared/pipes/app-date.pipe';
import { AppAmountPipe } from '../../shared/pipes/app-amount.pipe';
import { formatAmount, formatCurrentDateTime } from '../../core/utils/formatters';

/**
 * Componente Smart/Container dedicado a Compras y Abastecimiento de Mercadería (`/dashboard/purchases`).
 *
 * @description Permite a los supervisores de abastecimiento registrar órdenes de compra a proveedores oficiales
 * del negocio, seleccionando categorías y productos registrados exclusivamente para el negocio activo,
 * calculando costos totales, ingresando lotes de cajas al stock y vinculando la operación al local activo
 * con paginación de 15 registros por página.
 *
 * @author Equipo de Arquitectura Frontend Senior
 * @version 3.0
 */
@Component({
  selector: 'app-purchases-view',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, TablePaginationComponent, AppDatePipe, AppAmountPipe],
  templateUrl: './purchases-view.component.html',
  styleUrl: './purchases-view.component.scss',
})
export class PurchasesViewComponent implements OnInit {
  private readonly dummyData = inject(DummyDataService);

  readonly businessInfo = this.dummyData.businessInfo;
  readonly assignedBranch = this.dummyData.assignedBranch;
  readonly currentSessionUser = this.dummyData.currentSessionUser;
  readonly currentUserProfile = this.dummyData.currentUserProfile;
  readonly purchasesList = this.dummyData.purchasesList;
  readonly categories = this.dummyData.categories;
  readonly products = this.dummyData.products;
  readonly suppliers = this.dummyData.suppliers;
  readonly feedbackMessage = signal<FeedbackNotification | null>(null);
  readonly formSubmitted = signal<boolean>(false);

  /** Código del negocio activo en sesión */
  readonly activeBusinessCode = computed<string>(() => {
    return (this.businessInfo().id || this.currentUserProfile().assignedBusinessId || 'BIZ-001').trim().toUpperCase();
  });

  /** Moneda configurada por defecto para el negocio en sesión */
  readonly defaultBusinessCurrency = computed<string>(() => {
    return this.businessInfo().defaultCurrency || this.businessInfo().currency || 'PEN';
  });

  /** Monedas admitidas por el negocio en sesión */
  readonly availableCurrencies = computed<string[]>(() => {
    if (this.businessInfo().supportedCurrencies && this.businessInfo().supportedCurrencies!.length > 0) {
      return this.businessInfo().supportedCurrencies!;
    }
    const def = this.defaultBusinessCurrency();
    return [def, def === 'PEN' ? 'USD' : 'PEN'];
  });

  /** Moneda seleccionada para la compra */
  readonly selectedPurchaseCurrency = signal<string>('PEN');

  /** Símbolo monetario dinámico según la divisa seleccionada */
  readonly currencySymbol = computed<string>(() => {
    return resolveCurrencySymbol(this.selectedPurchaseCurrency());
  });

  /**
   * Categorías registradas exclusivamente para el negocio activo.
   */
  readonly availableCategoriesForBusiness = computed<string[]>(() => {
    const biz = this.activeBusinessCode();
    const list = this.categories().filter(c => {
      const bCode = (c.businessCode || '').trim().toUpperCase();
      const bId = (c.businessId || '').trim().toUpperCase();
      const matches = !bCode && !bId || bCode === biz || bId === biz;
      return matches && c.active !== false;
    });

    const uniqueNames = new Set(list.map(c => c.name));
    return Array.from(uniqueNames);
  });

  /**
   * Catálogo de productos registrados para el negocio activo.
   */
  readonly availableProductsForBusiness = computed<BeverageProduct[]>(() => {
    const biz = this.activeBusinessCode();
    return this.products().filter(p => {
      const bCode = (p.businessCode || '').trim().toUpperCase();
      const bId = (p.businessId || '').trim().toUpperCase();
      return !bCode && !bId || bCode === biz || bId === biz;
    });
  });

  /**
   * Productos registrados filtrados por la categoría seleccionada (o todos del negocio si no hay filtro).
   */
  readonly filteredProductsForPurchase = computed<BeverageProduct[]>(() => {
    const allBizProducts = this.availableProductsForBusiness();
    const currentCat = (this.newPurchase.category || '').trim().toLowerCase();
    if (!currentCat) {
      return allBizProducts;
    }
    return allBizProducts.filter(p => (p.category || '').trim().toLowerCase() === currentCat);
  });

  /**
   * Proveedores comerciales registrados y activos exclusivamente para el negocio en sesión.
   */
  readonly availableSuppliersForBusiness = computed<CommercialSupplier[]>(() => {
    const biz = this.activeBusinessCode();
    return this.suppliers().filter(s => {
      const bCode = (s.businessCode || '').trim().toUpperCase();
      const matchesBiz = !bCode || bCode === biz;
      return matchesBiz && s.active !== false;
    });
  });

  /** SKU o nombre del producto seleccionado en el dropdown de existentes */
  readonly selectedProductKey = signal<string>('');

  /** Producto seleccionado en el catálogo */
  readonly selectedProduct = computed<BeverageProduct | undefined>(() => {
    const key = this.selectedProductKey()?.trim().toUpperCase();
    if (!key) return undefined;
    return this.availableProductsForBusiness().find(
      p => (p.sku && p.sku.toUpperCase() === key) || p.name.toUpperCase() === key
    );
  });

  /** Stock actual en almacén del producto seleccionado */
  readonly currentStockBoxes = computed<number>(() => {
    return this.selectedProduct()?.stockBoxes ?? 0;
  });

  /** Stock final proyectado tras la compra */
  readonly projectedStockBoxes = computed<number>(() => {
    const current = this.currentStockBoxes();
    const adding = Number(this.newPurchase.boxesQty) || 0;
    return current + adding;
  });

  /** Tamaño de página estándar (15 registros) */
  readonly pageSize = 15;

  /** Página activa actual */
  readonly currentPage = signal<number>(1);

  /** Compras paginadas a 15 por página */
  readonly pagedPurchases = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.purchasesList().slice(start, start + this.pageSize);
  });

  newPurchase = {
    supplier: '',
    category: '',
    productDetail: '',
    boxesQty: null as any,
    boxCost: null as any,
  };

  constructor() {
    // Sincronizar moneda por defecto reactivamente
    effect(() => {
      this.selectedPurchaseCurrency.set(this.defaultBusinessCurrency());
    });
  }

  ngOnInit(): void {
    this.resetPurchaseForm();
    this.dummyData.loadAllFromBackend();
  }

  resetPurchaseForm(): void {
    this.formSubmitted.set(false);
    this.newPurchase = {
      supplier: '',
      category: '',
      productDetail: '',
      boxesQty: null as any,
      boxCost: null as any,
    };
    this.selectedProductKey.set('');
  }

  /**
   * Manejador al seleccionar un producto existente del catálogo del negocio.
   * Auto-completa la categoría, detalle del producto y costo sugerido por caja.
   */
  onProductSelected(prodKey: string): void {
    this.selectedProductKey.set(prodKey);
    if (!prodKey) return;

    const targetKey = prodKey.trim().toUpperCase();
    const prod = this.availableProductsForBusiness().find(
      p => (p.sku && p.sku.toUpperCase() === targetKey) || p.name.toUpperCase() === targetKey
    );

    if (prod) {
      this.newPurchase.category = prod.category;
      this.newPurchase.productDetail = `${prod.name}${prod.sku ? ' (' + prod.sku + ')' : ''} — ${prod.presentation || 'Caja'}`;
      this.newPurchase.boxCost = prod.wholesalePrice || prod.retailPrice || 25.0;
    }
  }

  /**
   * Manejador al cambiar manualmente la categoría del producto.
   */
  onCategoryChange(newCat: string): void {
    this.newPurchase.category = newCat;
    // Si el producto seleccionado no pertenece a la nueva categoría, deseleccionar
    const currentKey = this.selectedProductKey();
    if (currentKey) {
      const prod = this.availableProductsForBusiness().find(
        p => (p.sku && p.sku === currentKey) || p.name === currentKey
      );
      if (prod && (prod.category || '').toLowerCase() !== (newCat || '').toLowerCase()) {
        this.selectedProductKey.set('');
        this.newPurchase.productDetail = '';
      }
    }
  }

  registerBeveragePurchase(): void {
    this.formSubmitted.set(true);

    const supplier = this.newPurchase.supplier?.trim();
    const category = this.newPurchase.category?.trim();
    const productDetail = this.newPurchase.productDetail?.trim();
    const boxes = Number(this.newPurchase.boxesQty);
    const cost = Number(this.newPurchase.boxCost);

    if (!supplier || !category || !productDetail || isNaN(boxes) || boxes <= 0 || isNaN(cost) || cost <= 0) {
      this.feedbackMessage.set({
        text: 'Por favor, completa todos los campos obligatorios pendientes (resaltados en rojo).',
        type: 'warning',
      });
      return;
    }

    const totalCost = +(boxes * cost).toFixed(2);
    const prodName = this.selectedProduct()?.name || productDetail;
    const finalStock = this.projectedStockBoxes();

    const purchaseData = {
      id: '',
      branchName: this.assignedBranch(),
      supplier: this.newPurchase.supplier,
      category: this.newPurchase.category,
      productDetail: this.newPurchase.productDetail,
      productSku: this.selectedProductKey() || undefined,
      boxesQty: boxes,
      boxCost: cost,
      totalCost,
      buyerUser: this.currentSessionUser(),
      status: 'Recibido' as any,
      date: formatCurrentDateTime(),
    };

    this.dummyData.addPurchase(
      purchaseData,
      (saved) => {
        this.feedbackMessage.set({
          text: `Abastecimiento registrado en tu local asignado (${this.assignedBranch()}) por ${this.currentSessionUser()} bajo la categoría "${this.newPurchase.category}" por un total de ${this.currencySymbol()} ${formatAmount(totalCost)}. Stock final de "${prodName}" en almacén: ${finalStock} cajas (${finalStock * 12} und.).`,
          type: 'success',
        });
        this.resetPurchaseForm();
      },
      (err) => {
        const detail = err?.error?.message || err?.message || 'Error al persistir en base de datos';
        this.feedbackMessage.set({
          text: `Error al registrar abastecimiento: ${detail}`,
          type: 'error',
        });
      }
    );
  }
}
