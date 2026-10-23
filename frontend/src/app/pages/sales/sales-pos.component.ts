import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DummyDataService } from '../../core/services/dummy-data.service';
import { BeverageSale } from '../../core/models/domain.models';
import { SaleReceiptViewComponent } from '../../shared/components/sale-receipt-view/sale-receipt-view.component';

/**
 * Componente dedicado al Punto de Venta por Mayor y por Menor (`/dashboard/sales`).
 *
 * Responsabilidades:
 * - Restringir el registro de la venta al Local Asignado al usuario (`assignedBranch`).
 * - Gestionar el carrito multiproducto (`saleCart`) con cálculo de subtotal, descuento por cupón y total neto.
 * - Emitir el comprobante electrónico y abrir su vista de visualización (`SaleReceiptViewComponent`).
 */
@Component({
  selector: 'app-sales-pos',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, SaleReceiptViewComponent],
  templateUrl: './sales-pos.component.html',
  styleUrl: './sales-pos.component.scss',
})
export class SalesPosComponent {
  private readonly dummyData = inject(DummyDataService);

  readonly businessInfo = this.dummyData.businessInfo;
  readonly assignedBranch = this.dummyData.assignedBranch;
  readonly currentSessionUser = this.dummyData.currentSessionUser;
  readonly products = this.dummyData.products;
  readonly saleCart = this.dummyData.saleCart;
  readonly salesList = this.dummyData.salesList;
  readonly couponsList = this.dummyData.couponsList;

  readonly selectedReceipt = signal<BeverageSale | null>(null);
  readonly feedbackMessage = signal<string | null>(null);

  readonly cartTotalItemsCount = computed(() =>
    this.saleCart().reduce((acc, item) => acc + item.quantity, 0)
  );

  readonly cartSubtotal = computed(() =>
    +this.saleCart()
      .reduce((acc, item) => acc + item.lineSubtotal, 0)
      .toFixed(2)
  );

  newSale = {
    clientName: 'Licorería El Brindis S.A.C.',
    documentType: 'FACTURA ELECTRÓNICA' as 'FACTURA ELECTRÓNICA' | 'BOLETA DE VENTA ELECTRÓNICA',
    paymentMethod: 'Efectivo' as 'Efectivo' | 'Transferencia / Yape' | 'Tarjeta',
    couponCode: 'MAYORISTA15',
    selectedSku: 'CER-102',
    modality: 'Por Mayor' as 'Por Mayor' | 'Por Menor',
    quantity: 5,
    unitPrice: 44.0,
  };

  onSaleProductOrModalityChange(): void {
    const prod = this.products().find(p => p.sku === this.newSale.selectedSku);
    if (!prod) return;
    this.newSale.unitPrice =
      this.newSale.modality === 'Por Mayor' ? prod.wholesalePrice : prod.retailPrice;
  }

  addItemToSaleCart(): void {
    const prod = this.products().find(p => p.sku === this.newSale.selectedSku);
    const qty = Math.max(1, Number(this.newSale.quantity) || 1);
    const price = Number(this.newSale.unitPrice) || 1;
    const subtotal = +(qty * price).toFixed(2);

    const unitLabel =
      this.newSale.modality === 'Por Mayor'
        ? prod?.presentation || 'Cajas / Packs'
        : 'Botellas / Unidades';

    this.saleCart.update(items => [
      ...items,
      {
        sku: prod?.sku || 'BEV-01',
        productName: prod?.name || 'Bebida Seleccionada',
        modality: this.newSale.modality,
        unitLabel,
        quantity: qty,
        unitPrice: price,
        lineSubtotal: subtotal,
      },
    ]);
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
      : matchedCoupon.discountValue;
  }

  getCartFinalTotal(): number {
    return Math.max(0, +(this.cartSubtotal() - this.getCartDiscountAmount()).toFixed(2));
  }

  registerBeverageSale(): void {
    if (this.saleCart().length === 0) {
      this.feedbackMessage.set('Agrega al menos una bebida a la lista antes de emitir el comprobante.');
      return;
    }

    const subtotal = this.cartSubtotal();
    const discountAmount = this.getCartDiscountAmount();
    const total = this.getCartFinalTotal();
    const taxIgv = +(total * 0.18).toFixed(2);
    const code = this.newSale.couponCode.trim().toUpperCase();
    const matchedCoupon = this.couponsList().find(c => c.code === code && c.active);

    const summaryText = this.saleCart()
      .map(i => `${i.quantity}x ${i.productName} (${i.modality})`)
      .join(' + ');

    const newReceipt: BeverageSale = {
      id: `VTA-${Math.floor(9042 + Math.random() * 90)}`,
      documentType: this.newSale.documentType,
      branchName: this.assignedBranch(),
      clientName: this.newSale.clientName,
      modality: 'Mayor y Menor',
      paymentMethod: this.newSale.paymentMethod,
      items: [...this.saleCart()],
      itemsSummary: summaryText,
      totalItemsCount: this.cartTotalItemsCount(),
      subtotal,
      couponCode: matchedCoupon ? matchedCoupon.code : undefined,
      discountAmount,
      taxIgv,
      total,
      sellerUser: this.currentSessionUser(),
      date:
        '21 Oct 2026, ' +
        new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    this.dummyData.recordSale(newReceipt);
    this.selectedReceipt.set(newReceipt);
    this.feedbackMessage.set(
      `Comprobante registrado en el backend para ${this.assignedBranch()} (${this.businessInfo().commercialName}) por $${total.toFixed(2)}.`
    );
  }
}
