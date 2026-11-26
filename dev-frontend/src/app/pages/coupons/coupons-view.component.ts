import { Component, OnInit, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AppDataService } from '../../core/services/app-data.service';
import { DummyDataService } from '../../core/services/dummy-data.service';
import { BeverageSale, CommercialCustomer, DiscountCoupon, FeedbackNotification, resolveCurrencySymbol } from '../../core/models/domain.models';
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
  private readonly appData = inject(AppDataService);

  readonly businessInfo = this.dummyData.businessInfo;
  readonly currentSessionUser = this.dummyData.currentSessionUser;
  readonly currentUserProfile = this.dummyData.currentUserProfile;
  readonly couponsList = this.dummyData.couponsList;
  readonly salesList = this.appData.salesList;
  readonly categories = this.dummyData.categories;
  readonly customers = this.dummyData.customers;
  readonly feedbackMessage = signal<FeedbackNotification | null>(null);
  readonly formSubmitted = signal<boolean>(false);

  /** Cupón seleccionado para auditar las ventas donde fue canjeado */
  readonly selectedCouponForSales = signal<DiscountCoupon | null>(null);

  /** Ventas vinculadas al cupón seleccionado en el modal de auditoría */
  readonly selectedCouponSales = computed<BeverageSale[]>(() => {
    const coupon = this.selectedCouponForSales();
    if (!coupon) return [];
    return this.getSalesForCoupon(coupon.code);
  });

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

  /** Término de búsqueda en vivo para filtrar cupones */
  readonly searchQuery = signal<string>('');

  /** Filtro de estado: 'ALL' | 'ACTIVE' | 'PAUSED' */
  readonly filterStatus = signal<string>('ALL');

  /** Filtro de modalidad comercial: 'ALL' | 'Mayorista' | 'Minorista' | 'Mayor y Menor' */
  readonly filterModality = signal<string>('ALL');

  /** Tamaño de página estándar (15 registros) */
  readonly pageSize = 15;

  /** Página activa actual */
  readonly currentPage = signal<number>(1);

  /**
   * Cupones filtrados reactivamente por búsqueda textual, estado y modalidad.
   */
  readonly filteredCoupons = computed<DiscountCoupon[]>(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const st = this.filterStatus();
    const mod = this.filterModality();
    let list = this.couponsList();

    if (st === 'ACTIVE') {
      list = list.filter(c => c.active !== false);
    } else if (st === 'PAUSED') {
      list = list.filter(c => c.active === false);
    }

    if (mod !== 'ALL') {
      list = list.filter(c => c.targetModality === mod);
    }

    if (!q) {
      return list;
    }

    return list.filter(
      c =>
        (c.code && c.code.toLowerCase().includes(q)) ||
        (c.assignedClient && c.assignedClient.toLowerCase().includes(q)) ||
        (c.targetCategory && c.targetCategory.toLowerCase().includes(q)) ||
        (c.createdByUser && c.createdByUser.toLowerCase().includes(q))
    );
  });

  /** Cupones paginados a 15 por página bajo el estándar corporativo */
  readonly pagedCoupons = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.filteredCoupons().slice(start, start + this.pageSize);
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

  constructor() {
    // Resetear a página 1 cuando cambia la búsqueda o filtros
    effect(() => {
      this.searchQuery();
      this.filterStatus();
      this.filterModality();
      this.currentPage.set(1);
    });
  }

  ngOnInit(): void {
    this.resetCouponForm();
    this.dummyData.loadAllFromBackend();
  }

  /**
   * Refresca los cupones desde el backend.
   */
  refreshData(): void {
    this.dummyData.loadAllFromBackend();
  }

  /** Fecha mínima seleccionable en formato ISO YYYY-MM-DD (hoy) para el selector de vigencia */
  readonly todayIsoDate = computed<string>(() => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });

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
    // Inicializar código único con sufijo aleatorio (8 letras cliente + 5 dígitos sin fecha)
    this.generateCouponCodeFromClient('');
  }

  /**
   * Genera un sufijo aleatorio alfanumérico de 5 caracteres (letras y números sin ambigüedad).
   */
  generateUnique5CharSuffix(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < 5; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Genera automáticamente el código del cupón en base al cliente beneficiario abreviado a 8 letras
   * y un sufijo aleatorio irrepetible de 5 caracteres alfanuméricos (sin incluir fecha).
   * Formato: [CLIENTE8]-[XXXXX] (Ej: BODELIZE-A9K4F)
   */
  generateCouponCodeFromClient(targetClient?: string): void {
    const client = targetClient !== undefined ? targetClient : this.newCoupon.assignedClient;
    const clientSlug = this.sanitizeClientFor8Letters(client);

    const existingCodes = new Set(this.couponsList().map(c => c.code.toUpperCase()));
    let candidateCode = '';
    let attempts = 0;

    do {
      const suffix = this.generateUnique5CharSuffix();
      candidateCode = `${clientSlug}-${suffix}`;
      attempts++;
    } while (existingCodes.has(candidateCode) && attempts < 100);

    this.newCoupon.code = candidateCode;
  }

  /**
   * Alias de compatibilidad hacia generateCouponCodeFromClient.
   */
  generateCouponCodeFromClientAndDate(targetClient?: string): void {
    this.generateCouponCodeFromClient(targetClient);
  }

  /**
   * Genera un identificador alfanumérico limpio y distinguible de exactamente 8 letras
   * a partir del nombre del cliente o razón social.
   */
  sanitizeClientFor8Letters(clientName: string): string {
    const trimmed = (clientName || '').trim();
    if (!trimmed || trimmed === 'Todos los Clientes del Negocio') {
      return 'TODOSCLI';
    }

    // Remover siglas societarias habituales
    const cleanWithoutCorp = trimmed
      .replace(/\b(S\.?A\.?C\.?|E\.?I\.?R\.?L\.?|S\.?R\.?L\.?|S\.?A\.?)\b/gi, '')
      .trim();

    // Normalizar tildes y caracteres especiales a ASCII puro (solo letras)
    const asciiOnly = cleanWithoutCorp
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z\s]/g, '')
      .toUpperCase();

    const words = asciiOnly.split(/\s+/).filter(w => w.length > 0);
    if (words.length === 0) return 'CLIENTEX';

    let slug = '';
    if (words.length === 1) {
      slug = words[0].slice(0, 8);
    } else if (words.length >= 2) {
      // Filtrar conectores comunes para priorizar nombres distintivos
      const stopWords = new Set(['EL', 'LA', 'LOS', 'LAS', 'DE', 'DEL', 'Y']);
      const significant = words.filter(w => !stopWords.has(w));
      const wordsToUse = significant.length >= 2 ? significant : words;

      if (wordsToUse.length === 2) {
        const w1 = wordsToUse[0];
        const w2 = wordsToUse[1];
        if (w1.length >= 4 && w2.length >= 4) {
          slug = w1.slice(0, 4) + w2.slice(0, 4);
        } else if (w1.length < 4) {
          const take2 = Math.min(w2.length, 8 - w1.length);
          slug = w1 + w2.slice(0, take2);
        } else {
          const take1 = Math.min(w1.length, 8 - w2.length);
          slug = w1.slice(0, take1) + w2;
        }
      } else {
        // 3 o más palabras distintivas: 3 letras de la primera, 3 de la segunda y 2 de la tercera
        slug = wordsToUse[0].slice(0, 3) + wordsToUse[1].slice(0, 3) + wordsToUse[2].slice(0, 2);
      }
    }

    // Si aún tiene menos de 8 letras, tomar del texto continuo filtrado
    if (slug.length < 8) {
      const continuous = asciiOnly.replace(/\s+/g, '');
      if (continuous.length >= 8) {
        slug = continuous.slice(0, 8);
      }
    }

    // Si todavía tiene menos de 8 letras, rellenar con 'X'
    while (slug.length < 8) {
      slug += 'X';
    }

    return slug.slice(0, 8);
  }

  /**
   * Manejador al seleccionar un cliente beneficiario:
   * auto-genera el código del cupón tomando como base el cliente distinguido en 8 letras y sufijo de 5 caracteres.
   */
  onClientSelected(clientName: string): void {
    this.newCoupon.assignedClient = clientName;
    this.generateCouponCodeFromClient(clientName);
  }

  /**
   * Limpia la fecha límite de vigencia opcional dejándola indefinida.
   */
  clearExpiryDate(): void {
    this.newCoupon.expiresAt = '';
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

    // Validación estricta de unicidad en memoria local previa al registro en base de datos
    const duplicate = this.couponsList().find(
      c => c.code && c.code.trim().toUpperCase() === cleanCode
    );
    if (duplicate) {
      this.feedbackMessage.set({
        text: `El código de cupón "${cleanCode}" ya se encuentra registrado en la base de datos (asignado a: "${duplicate.assignedClient || 'General'}"). Los códigos deben ser únicos e irrepetibles.`,
        type: 'error',
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
      expiresAt: this.newCoupon.expiresAt || 'Indefinido',
      createdByUser: this.currentSessionUser(),
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
      active: true,
    };

    this.dummyData.addCoupon(
      couponData,
      () => {
        this.feedbackMessage.set({
          text: `Cupón único "${cleanCode}" registrado exitosamente en la base de datos por ${this.currentSessionUser()} para "${this.newCoupon.assignedClient || 'Todos los Clientes'}".`,
          type: 'success',
        });
        this.resetCouponForm();
      },
      (err: any) => {
        const detail = err?.error?.detail || err?.error?.title || err?.message || `El código de cupón "${cleanCode}" ya existe en la base de datos.`;
        this.feedbackMessage.set({
          text: `Error de unicidad: ${detail}`,
          type: 'error',
        });
      }
    );
  }

  toggleCouponStatus(coupon: DiscountCoupon): void {
    this.dummyData.toggleCouponStatus(coupon.code);
  }

  /**
   * Obtiene la lista de ventas emitidas en las que se aplicó el código de cupón indicado.
   *
   * @param code Código único del cupón a consultar.
   * @returns Arreglo de ventas asociadas al cupón.
   */
  getSalesForCoupon(code: string): BeverageSale[] {
    const normalized = (code || '').trim().toUpperCase();
    if (!normalized) return [];
    return this.salesList().filter(s => (s.couponCode || '').trim().toUpperCase() === normalized);
  }

  /**
   * Abre el modal de auditoría mostrando las ventas donde fue utilizado el cupón.
   *
   * @param coupon Cupón seleccionado desde la tabla.
   */
  openCouponSalesModal(coupon: DiscountCoupon): void {
    this.selectedCouponForSales.set(coupon);
  }

  /**
   * Cierra el modal de auditoría de ventas por cupón.
   */
  closeCouponSalesModal(): void {
    this.selectedCouponForSales.set(null);
  }
}
