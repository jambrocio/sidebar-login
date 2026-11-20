import { Component, OnInit, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DummyDataService } from '../../core/services/dummy-data.service';
import { CommercialCustomer, DiscountCoupon, FeedbackNotification, resolveCurrencySymbol } from '../../core/models/domain.models';
import { TablePaginationComponent } from '../../shared/components/pagination/table-pagination.component';
import { AppAmountPipe } from '../../shared/pipes/app-amount.pipe';

/**
 * Componente Smart/Container dedicado a la Gestión y Auditoría de Cupones de Descuento (`/dashboard/coupons`).
 *
 * @description Permite a los supervisores comerciales generar códigos promocionales con descuentos
 * porcentuales o montos fijos, restricciones por cliente comercial del negocio o todos los clientes,
 * categorías registradas del negocio o todas, compra mínima y límites de uso con paginación de 15 registros.
 *
 * @author Equipo de Arquitectura Frontend Senior
 * @version 2.5
 */
@Component({
  selector: 'app-coupons-view',
  standalone: true,
  imports: [CommonModule, FormsModule, TablePaginationComponent, AppAmountPipe],
  templateUrl: './coupons-view.component.html',
  styleUrl: './coupons-view.component.scss',
})
export class CouponsViewComponent implements OnInit {
  private readonly dummyData = inject(DummyDataService);

  readonly businessInfo = this.dummyData.businessInfo;
  readonly currentSessionUser = this.dummyData.currentSessionUser;
  readonly currentUserProfile = this.dummyData.currentUserProfile;
  readonly couponsList = this.dummyData.couponsList;
  readonly categories = this.dummyData.categories;
  readonly customers = this.dummyData.customers;
  readonly feedbackMessage = signal<FeedbackNotification | null>(null);
  readonly formSubmitted = signal<boolean>(false);

  /** Código del negocio activo en sesión */
  readonly activeBusinessCode = computed<string>(() => {
    return (this.businessInfo().id || this.currentUserProfile().assignedBusinessId || 'BIZ-001').trim().toUpperCase();
  });

  /** Símbolo de moneda por defecto del negocio en sesión */
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

  /** Categorías registradas exclusivamente para el negocio activo */
  readonly availableCategoriesForBusiness = computed<string[]>(() => {
    const biz = this.activeBusinessCode();
    const list = this.categories().filter(c => {
      const bCode = (c.businessCode || '').trim().toUpperCase();
      const bId = (c.businessId || '').trim().toUpperCase();
      const matches = !bCode && !bId || bCode === biz || bId === biz;
      return matches && c.active !== false;
    });
    const unique = new Set(list.map(c => c.name));
    return Array.from(unique);
  });

  /** Tamaño de página estándar (15 registros) */
  readonly pageSize = 15;

  /** Página activa actual */
  readonly currentPage = signal<number>(1);

  /** Cupones paginados a 15 por página */
  readonly pagedCoupons = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.couponsList().slice(start, start + this.pageSize);
  });

  newCoupon = {
    code: '',
    discountType: 'PERCENT' as 'PERCENT' | 'FIXED',
    discountValue: null as any,
    targetModality: 'Mayor y Menor' as 'Mayorista' | 'Minorista' | 'Mayor y Menor',
    targetCategory: 'Todas las Categorías',
    assignedClient: '',
    minPurchase: null as any,
    maxUses: null as any,
    expiresAt: '',
  };

  constructor() {}

  ngOnInit(): void {
    this.resetCouponForm();
    this.dummyData.loadAllFromBackend();
  }

  resetCouponForm(): void {
    this.formSubmitted.set(false);
    this.newCoupon = {
      code: '',
      discountType: 'PERCENT',
      discountValue: null as any,
      targetModality: 'Mayor y Menor',
      targetCategory: 'Todas las Categorías',
      assignedClient: '',
      minPurchase: null as any,
      maxUses: null as any,
      expiresAt: '',
    };
  }

  generateRandomCouponCode(): void {
    const prefixes = ['LICOR', 'CHELA', 'MAYOR', 'BEBIDA', 'BRINDIS'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const randomNum = Math.floor(10 + Math.random() * 89);
    this.newCoupon.code = `${prefix}${randomNum}VIP`;
  }

  saveDiscountCoupon(): void {
    this.formSubmitted.set(true);
    const cleanCode = this.newCoupon.code.trim().toUpperCase();
    const discountVal = Number(this.newCoupon.discountValue);
    const assignedClient = (this.newCoupon.assignedClient || '').trim();

    if (!cleanCode || isNaN(discountVal) || discountVal <= 0 || !assignedClient) {
      this.feedbackMessage.set({
        text: 'Por favor, completa todos los campos obligatorios del cupón (resaltados en rojo).',
        type: 'warning',
      });
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

    this.feedbackMessage.set({
      text: `Cupón "${cleanCode}" registrado exitosamente en la base de datos por ${this.currentSessionUser()} para "${this.newCoupon.assignedClient || 'Todos los Clientes'}".`,
      type: 'success',
    });
    this.resetCouponForm();
  }

  toggleCouponStatus(coupon: DiscountCoupon): void {
    this.dummyData.toggleCouponStatus(coupon.code);
  }
}
