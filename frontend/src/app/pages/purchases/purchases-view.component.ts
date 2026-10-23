import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DummyDataService } from '../../core/services/dummy-data.service';

/**
 * Componente dedicado a Compras y Abastecimiento de Bebidas (`/dashboard/purchases`).
 * Restringe el registro de órdenes de compra al Local Asignado al usuario (`assignedBranch`).
 */
@Component({
  selector: 'app-purchases-view',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './purchases-view.component.html',
  styleUrl: './purchases-view.component.scss',
})
export class PurchasesViewComponent {
  private readonly dummyData = inject(DummyDataService);

  readonly businessInfo = this.dummyData.businessInfo;
  readonly assignedBranch = this.dummyData.assignedBranch;
  readonly currentSessionUser = this.dummyData.currentSessionUser;
  readonly purchasesList = this.dummyData.purchasesList;
  readonly feedbackMessage = signal<string | null>(null);

  newPurchase = {
    supplier: 'Unión de Cervecerías Backus y Johnston',
    category: 'Cervezas',
    productDetail: 'Cerveza Pilsen Callao 630ml (Caja x 12)',
    boxesQty: 50,
    boxCost: 20.5,
  };

  registerBeveragePurchase(): void {
    const totalCost =
      (Number(this.newPurchase.boxesQty) || 1) *
      (Number(this.newPurchase.boxCost) || 10);

    const purchaseData = {
      id: `OC-2026-0${this.purchasesList().length + 90}`,
      branchName: this.assignedBranch(),
      supplier: this.newPurchase.supplier,
      category: this.newPurchase.category,
      productDetail: this.newPurchase.productDetail,
      boxesQty: Number(this.newPurchase.boxesQty),
      boxCost: Number(this.newPurchase.boxCost),
      totalCost,
      buyerUser: this.currentSessionUser(),
      status: 'Recibido' as any,
      date: 'Hoy',
    };

    this.dummyData.addPurchase(purchaseData);

    this.feedbackMessage.set(
      `Abastecimiento registrado en tu local asignado (${this.assignedBranch()}) por ${this.currentSessionUser()}.`
    );
  }
}
