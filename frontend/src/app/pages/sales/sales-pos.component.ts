import { Component, OnInit, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DummyDataService } from '../../core/services/dummy-data.service';
import { BeverageProduct, BeverageSale, CommercialCustomer, FeedbackNotification, resolveCurrencySymbol } from '../../core/models/domain.models';
import { SaleReceiptViewComponent } from '../../shared/components/sale-receipt-view/sale-receipt-view.component';
import { AppAmountPipe } from '../../shared/pipes/app-amount.pipe';
import { formatAmount, formatCurrentDateTime } from '../../core/utils/formatters';

/**
 * Componente Smart/Container dedicado al Punto de Venta por Mayor y por Menor (POS - `/dashboard/sales`).
 *
 * @description Administra el carrito de compra multiproducto, clientes y productos filtrados exclusivamente
 * por el negocio activo en sesión, cálculo de impuestos, aplicación de cupones y emisión de comprobantes.
 *
 * @author Equipo de Arquitectura Frontend Senior
 * @version 2.5
 */
@Component({
  selector: 'app-sales-pos',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, SaleReceiptViewComponent, AppAmountPipe],
  templateUrl: './sales-pos.component.html',
  styleUrl: './sales-pos.component.scss',
})
export class SalesPosComponent implements OnInit {
  private readonly dummyData = inject(DummyDataService);

  readonly businessInfo = this.dummyData.businessInfo;
  readonly assignedBranch = this.dummyData.assignedBranch;
  readonly currentSessionUser = this.dummyData.currentSessionUser;
  readonly currentUserProfile = this.dummyData.currentUserProfile;
  readonly products = this.dummyData.products;
  readonly customers = this.dummyData.customers;
  readonly saleCart = this.dummyData.saleCart;
  readonly salesList = this.dummyData.salesList;
  readonly couponsList = this.dummyData.couponsList;

  readonly selectedReceipt = signal<BeverageSale | null>(null);
  readonly feedbackMessage = signal<FeedbackNotification | null>(null);
  readonly formSubmitted = signal<boolean>(false);

  /** Código del negocio activo en sesión */
  readonly activeBusinessCode = computed<string>(() => {
    return (this.businessInfo().id || this.currentUserProfile().assignedBusinessId || 'BIZ-001').trim().toUpperCase();
  });

  /** Símbolo de moneda según la configuración del negocio */
  readonly currencySymbol = computed<string>(() => {
    const curr = this.businessInfo().defaultCurrency || this.businessInfo().currency || 'PEN';
    return resolveCurrencySymbol(curr);
  });

  /** Clientes comerciales registrados exclusivamente para el negocio activo */
  readonly availableCustomersForBusiness = computed<CommercialCustomer[]>(() => {
    const biz = this.activeBusinessCode();
    return this.customers().filter(c => {
      const bCode = (c.businessCode || '').trim().toUpperCase();
      return (!bCode || bCode === biz) && c.active !== false;
    });
  });

  /** Productos de inventario registrados exclusivamente para el negocio activo */
  readonly availableProductsForBusiness = computed<BeverageProduct[]>(() => {
    const biz = this.activeBusinessCode();
    return this.products().filter(p => {
      const bCode = (p.businessCode || '').trim().toUpperCase();
      const bId = (p.businessId || '').trim().toUpperCase();
      return !bCode && !bId || bCode === biz || bId === biz;
    });
  });

  /** Productos del negocio que cuentan con stock físico disponible para la venta */
  readonly availableProductsWithStock = computed<BeverageProduct[]>(() => {
    return this.availableProductsForBusiness().filter(p => (p.stockBoxes || 0) > 0 || (p.stockUnits || 0) > 0);
  });

  /** Término de búsqueda ágil de producto por texto o SKU */
  readonly productSearchQuery = signal<string>('');
  /** Control del desplegable de búsqueda interactivo */
  readonly isProductDropdownOpen = signal<boolean>(false);

  /** Lista reactiva de productos filtrados por búsqueda que cuentan con stock */
  readonly searchedProducts = computed<BeverageProduct[]>(() => {
    const q = this.productSearchQuery().trim().toLowerCase();
    const list = this.availableProductsWithStock();
    if (!q) return list;
    return list.filter(p =>
      p.name.toLowerCase().includes(q) ||
      (p.sku && p.sku.toLowerCase().includes(q)) ||
      (p.category && p.category.toLowerCase().includes(q))
    );
  });

  /** Producto seleccionado en el catálogo */
  readonly selectedProduct = computed<BeverageProduct | undefined>(() => {
    const target = (this.newSale.selectedSku || '').trim().toUpperCase();
    if (!target) return undefined;
    return this.availableProductsForBusiness().find(
      p => (p.sku && p.sku.toUpperCase() === target) || p.name.toUpperCase() === target
    );
  });

  readonly cartTotalItemsCount = computed(() =>
    this.saleCart().reduce((acc, item) => acc + item.quantity, 0)
  );

  readonly cartSubtotal = computed(() =>
    +this.saleCart()
      .reduce((acc, item) => acc + item.lineSubtotal, 0)
      .toFixed(2)
  );

  newSale = {
    clientName: '',
    documentType: 'FACTURA ELECTRÓNICA' as 'FACTURA ELECTRÓNICA' | 'BOLETA DE VENTA ELECTRÓNICA',
    paymentMethod: 'Efectivo' as 'Efectivo' | 'Transferencia / Yape' | 'Tarjeta',
    couponCode: '',
    selectedSku: '',
    modality: 'Por Mayor' as 'Por Mayor' | 'Por Menor',
    quantity: null as any,
    unitPrice: null as any,
  };

  constructor() {}

  ngOnInit(): void {
    this.resetSaleForm();
    this.dummyData.loadAllFromBackend();
  }

  resetSaleForm(): void {
    this.formSubmitted.set(false);
    this.productSearchQuery.set('');
    this.isProductDropdownOpen.set(false);
    this.newSale = {
      clientName: '',
      documentType: 'FACTURA ELECTRÓNICA',
      paymentMethod: 'Efectivo',
      couponCode: '',
      selectedSku: '',
      modality: 'Por Mayor',
      quantity: null as any,
      unitPrice: null as any,
    };
  }

  selectProductFromSearch(product: BeverageProduct): void {
    this.newSale.selectedSku = product.sku || product.name;
    this.productSearchQuery.set(`${product.name}${product.sku ? ' (' + product.sku + ')' : ''}`);
    this.isProductDropdownOpen.set(false);
    this.onSaleProductOrModalityChange();
  }

  clearProductSearch(): void {
    this.newSale.selectedSku = '';
    this.productSearchQuery.set('');
    this.newSale.unitPrice = null as any;
    this.newSale.quantity = null as any;
    this.isProductDropdownOpen.set(false);
  }

  onSaleProductOrModalityChange(): void {
    const target = (this.newSale.selectedSku || '').trim().toUpperCase();
    if (!target) {
      this.newSale.unitPrice = null;
      return;
    }
    const prod = this.availableProductsForBusiness().find(
      p => (p.sku && p.sku.toUpperCase() === target) || p.name.toUpperCase() === target
    );
    if (!prod) {
      this.newSale.unitPrice = null;
      return;
    }
    this.newSale.unitPrice =
      this.newSale.modality === 'Por Mayor' ? prod.wholesalePrice : prod.retailPrice;
  }

  /**
   * Calcula automáticamente el total del producto en base a la cantidad y precio unitario.
   */
  getProductSubtotal(): number {
    const qty = Number(this.newSale.quantity);
    const price = Number(this.newSale.unitPrice);
    if (isNaN(qty) || qty <= 0 || isNaN(price) || price <= 0) {
      return 0;
    }
    return +(qty * price).toFixed(2);
  }

  addItemToSaleCart(): void {
    const target = (this.newSale.selectedSku || '').trim().toUpperCase();
    const prod = this.availableProductsForBusiness().find(
      p => (p.sku && p.sku.toUpperCase() === target) || p.name.toUpperCase() === target
    );
    const qty = Number(this.newSale.quantity);
    const price = Number(this.newSale.unitPrice);

    if (!target || isNaN(qty) || qty <= 0 || isNaN(price) || price <= 0) {
      this.formSubmitted.set(true);
      this.feedbackMessage.set({
        text: 'Por favor, selecciona un producto e ingresa una cantidad válida (campos obligatorios resaltados en rojo).',
        type: 'warning',
      });
      return;
    }
    const subtotal = +(qty * price).toFixed(2);

    const unitLabel =
      this.newSale.modality === 'Por Mayor'
        ? prod?.presentation || 'Cajas / Packs'
        : 'Botellas / Unidades';

    this.saleCart.update(items => [
      ...items,
      {
        sku: prod?.sku || 'PRD-01',
        productName: prod?.name || 'Producto Seleccionado',
        modality: this.newSale.modality,
        unitLabel,
        quantity: qty,
        unitPrice: price,
        lineSubtotal: subtotal,
      },
    ]);

    // Limpiar campos de selección del producto para permitir agregar otro ítem
    this.newSale.selectedSku = '';
    this.productSearchQuery.set('');
    this.newSale.quantity = null as any;
    this.newSale.unitPrice = null as any;
    this.isProductDropdownOpen.set(false);
    this.formSubmitted.set(false);
  }

  /**
   * Modifica directamente la cantidad de un ítem en el carrito con recálculo automático.
   */
  updateCartItemQty(index: number, newQty: number | string): void {
    const qty = Math.max(1, Math.floor(Number(newQty) || 1));
    this.saleCart.update(items =>
      items.map((it, idx) => {
        if (idx !== index) return it;
        return {
          ...it,
          quantity: qty,
          lineSubtotal: +(qty * it.unitPrice).toFixed(2),
        };
      })
    );
  }

  incrementCartItemQty(index: number): void {
    const item = this.saleCart()[index];
    if (item) {
      this.updateCartItemQty(index, item.quantity + 1);
    }
  }

  decrementCartItemQty(index: number): void {
    const item = this.saleCart()[index];
    if (item && item.quantity > 1) {
      this.updateCartItemQty(index, item.quantity - 1);
    }
  }

  removeSaleCartItem(index: number): void {
    this.saleCart.update(items => items.filter((_, idx) => idx !== index));
  }

  getCartDiscountAmount(): number {
    const subtotal = this.cartSubtotal();
    const code = this.newSale.couponCode.trim().toUpperCase();
    const matchedCoupon = this.couponsList().find(c => c.code === code && c.active);
    if (!matchedCoupon || subtotal === 0) return 0;

    return matchedCoupon.discountType === 'PERCENT'
      ? +(subtotal * (matchedCoupon.discountValue / 100)).toFixed(2)
      : Math.min(subtotal, matchedCoupon.discountValue);
  }

  /**
   * Importe Total del comprobante: suma de líneas agregadas menos descuento por cupón.
   */
  getCartFinalTotal(): number {
    return Math.max(0, +(this.cartSubtotal() - this.getCartDiscountAmount()).toFixed(2));
  }

  /**
   * IGV (18%) desagregado del total según normativa comercial SUNAT: Total - (Total / 1.18).
   */
  getCartTaxIgv(): number {
    const total = this.getCartFinalTotal();
    const base = +(total / 1.18).toFixed(2);
    return +(total - base).toFixed(2);
  }

  /**
   * Subtotal del comprobante: exactamente la resta del Importe Total - IGV.
   * Cumple la relación matemática contable: Subtotal = Importe Total - IGV.
   */
  getCartNetSubtotal(): number {
    const total = this.getCartFinalTotal();
    const igv = this.getCartTaxIgv();
    return Math.max(0, +(total - igv).toFixed(2));
  }

  registerBeverageSale(): void {
    const client = (this.newSale.clientName || '').trim();
    if (!client) {
      this.formSubmitted.set(true);
      this.feedbackMessage.set({
        text: 'Por favor, selecciona o ingresa el cliente de la venta (campo obligatorio resaltado en rojo).',
        type: 'warning',
      });
      return;
    }

    if (this.saleCart().length === 0) {
      this.feedbackMessage.set({
        text: 'Por favor, agrega al menos un producto a la lista antes de emitir el comprobante.',
        type: 'warning',
      });
      return;
    }

    const netSubtotal = this.getCartNetSubtotal();
    const discountAmount = this.getCartDiscountAmount();
    const taxIgv = this.getCartTaxIgv();
    const total = this.getCartFinalTotal();
    const code = this.newSale.couponCode.trim().toUpperCase();
    const matchedCoupon = this.couponsList().find(c => c.code === code && c.active);

    const summaryText = this.saleCart()
      .map(i => `${i.quantity}x ${i.productName} (${i.modality})`)
      .join(' + ');

    const newReceipt: BeverageSale = {
      id: '',
      documentType: this.newSale.documentType,
      branchName: this.assignedBranch(),
      clientName: this.newSale.clientName,
      modality: 'Mayor y Menor',
      paymentMethod: this.newSale.paymentMethod,
      items: [...this.saleCart()],
      itemsSummary: summaryText,
      totalItemsCount: this.cartTotalItemsCount(),
      subtotal: netSubtotal, // Subtotal neto para que Subtotal + IGV = Total
      couponCode: matchedCoupon ? matchedCoupon.code : undefined,
      discountAmount,
      taxIgv,
      total,
      sellerUser: this.currentSessionUser(),
      date: formatCurrentDateTime(),
    };

    this.dummyData.recordSale(
      newReceipt,
      (savedSale) => {
        this.selectedReceipt.set(savedSale);
        this.feedbackMessage.set({
          text: `Comprobante ${savedSale.id} registrado exitosamente para ${this.assignedBranch()} por ${this.currencySymbol()} ${formatAmount(total)}.`,
          type: 'success',
        });
        this.saleCart.set([]);
        this.resetSaleForm();
      },
      (err) => {
        const detail = err?.error?.message || err?.message || 'Error al persistir venta en base de datos';
        this.feedbackMessage.set({
          text: `Error al emitir el comprobante: ${detail}`,
          type: 'error',
        });
      }
    );
  }
}
