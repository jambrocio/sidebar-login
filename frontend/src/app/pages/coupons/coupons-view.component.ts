import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DummyDataService } from '../../core/services/dummy-data.service';
import { DiscountCoupon } from '../../core/models/domain.models';

/**
 * Componente dedicado a la Gestión de Cupones de Descuento (`/dashboard/coupons`).
 */
@Component({
  selector: 'app-coupons-view',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './coupons-view.component.html',
  styleUrl: './coupons-view.component.scss',
})
export class CouponsViewComponent {
  private readonly dummyData = inject(DummyDataService);

  readonly businessInfo = this.dummyData.businessInfo;
  readonly currentSessionUser = this.dummyData.currentSessionUser;
  readonly couponsList = this.dummyData.couponsList;
  readonly feedbackMessage = signal<string | null>(null);

  newCoupon = {
    code: 'VIPBEBIDAS25',
    discountType: 'PERCENT' as 'PERCENT' | 'FIXED',
    discountValue: 15,
    targetModality: 'Mayor y Menor' as 'Mayorista' | 'Minorista' | 'Mayor y Menor',
    targetCategory: 'Todas' as 'Todas' | 'Licores' | 'Cervezas' | 'Gaseosas' | 'Otros',
    assignedClient: 'Licorería El Brindis S.A.C.',
    minPurchase: 200,
    maxUses: 30,
    expiresAt: '31 Dic 2026',
  };

  generateRandomCouponCode(): void {
    const prefixes = ['LICOR', 'CHELA', 'MAYOR', 'BEBIDA', 'BRINDIS'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const randomNum = Math.floor(10 + Math.random() * 89);
    this.newCoupon.code = `${prefix}${randomNum}VIP`;
  }

  saveDiscountCoupon(): void {
    const cleanCode = this.newCoupon.code.trim().toUpperCase();
    if (!cleanCode) {
      this.feedbackMessage.set('Ingresa un código válido para el cupón de descuento.');
      return;
    }

    const couponData: DiscountCoupon = {
      code: cleanCode,
      discountType: this.newCoupon.discountType,
      discountValue: Number(this.newCoupon.discountValue) || 10,
      targetModality: this.newCoupon.targetModality,
      targetCategory: this.newCoupon.targetCategory,
      assignedClient: this.newCoupon.assignedClient,
      minPurchase: Number(this.newCoupon.minPurchase) || 0,
      usedCount: 0,
      maxUses: Number(this.newCoupon.maxUses) || 50,
      expiresAt: this.newCoupon.expiresAt || '31 Dic 2026',
      createdByUser: this.currentSessionUser(),
      active: true,
    };

    this.dummyData.addCoupon(couponData);

    this.feedbackMessage.set(
      `Cupón "${cleanCode}" registrado en la base de datos por ${this.currentSessionUser()} para ${this.newCoupon.assignedClient}.`
    );
    this.generateRandomCouponCode();
  }

  toggleCouponStatus(coupon: DiscountCoupon): void {
    this.dummyData.toggleCouponStatus(coupon.code);
  }
}
