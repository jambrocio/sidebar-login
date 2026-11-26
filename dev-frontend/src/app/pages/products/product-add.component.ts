import { Component, OnInit, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DummyDataService } from '../../core/services/dummy-data.service';
import { BeverageCategory, BeverageProduct, FeedbackNotification, resolveCurrencySymbol } from '../../core/models/domain.models';

/**
 * Componente Smart/Container para el Registro de Nuevos Productos (`/dashboard/products/add`).
 *
 * @description Permite registrar bebidas con precios diferenciados por mayor y menor, control de stock
 * en cajas y unidades, vinculando únicamente las categorías creadas para el negocio matriz seleccionado.
 *
 * @author Equipo de Arquitectura Frontend Senior
 * @version 2.2
 */
@Component({
  selector: 'app-product-add',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './product-add.component.html',
  styleUrl: './product-add.component.scss',
})
export class ProductAddComponent implements OnInit {
  private readonly dummyData = inject(DummyDataService);

  readonly businessInfo = this.dummyData.businessInfo;
  readonly businesses = this.dummyData.businesses;
  readonly availableBusinesses = this.dummyData.availableBusinesses;
  readonly currentSessionUser = this.dummyData.currentSessionUser;
  readonly currentUserProfile = this.dummyData.currentUserProfile;
  readonly categories = this.dummyData.categories;
  readonly products = this.dummyData.products;
  readonly feedbackMessage = signal<FeedbackNotification | null>(null);
  readonly isSubmitting = signal<boolean>(false);
  readonly formSubmitted = signal<boolean>(false);

  /** Determina si el usuario en sesión es Administrador General (Superusuario) */
  readonly isGeneralAdmin = computed<boolean>(() => {
    const roleName = (this.currentUserProfile()?.role || '').trim();
    if (roleName.includes('Negocio') || roleName === 'ADMIN_NEGOCIO') {
      return false;
    }
    return roleName === 'ADMIN' || roleName.includes('Administrador General') || roleName.includes('Superusuario');
  });

  /** Determina si el usuario en sesión es Administrador de Negocio */
  readonly isBusinessAdmin = computed<boolean>(() => {
    const roleName = (this.currentUserProfile()?.role || '').trim();
    return roleName === 'ADMIN_NEGOCIO' || roleName.includes('Administrador de Negocio');
  });

  /** Negocio seleccionado reactivamente */
  readonly selectedBusinessCode = signal<string>(
    this.businessInfo().id || this.currentUserProfile().assignedBusinessId || 'BIZ-001'
  );

  /** Perfil del negocio seleccionado */
  readonly selectedBusiness = computed(() => {
    const targetCode = (this.selectedBusinessCode() || '').trim().toUpperCase();
    return this.businesses().find(b => b.id?.toUpperCase() === targetCode) || this.businessInfo();
  });

  /** Moneda configurada por defecto para el negocio seleccionado */
  readonly defaultBusinessCurrency = computed<string>(() => {
    const biz = this.selectedBusiness();
    return biz?.defaultCurrency || biz?.currency || 'PEN';
  });

  /** Lista de monedas admitidas / operativas para el negocio seleccionado */
  readonly availableCurrenciesForBusiness = computed<string[]>(() => {
    const biz = this.selectedBusiness();
    if (biz?.supportedCurrencies && biz.supportedCurrencies.length > 0) {
      return biz.supportedCurrencies;
    }
    const def = this.defaultBusinessCurrency();
    return [def, def === 'PEN' ? 'USD' : 'PEN'];
  });

  /** Moneda seleccionada para el producto que se está registrando */
  readonly selectedProductCurrency = signal<string>('PEN');

  /** Moneda configurada para el negocio seleccionado (compatibilidad) */
  readonly currentBusinessCurrency = computed<string>(() => {
    return this.defaultBusinessCurrency();
  });

  /** Símbolo monetario dinámico según la divisa seleccionada para el producto */
  readonly currencySymbol = computed<string>(() => {
    return resolveCurrencySymbol(this.selectedProductCurrency());
  });

  /**
   * Categorías disponibles exclusivamente para el negocio seleccionado.
   * Filtra reactivamente las categorías según el businessCode o businessId asignado.
   */
  readonly availableCategoriesForBusiness = computed<BeverageCategory[]>(() => {
    const targetBiz = (this.selectedBusinessCode() || '').trim().toUpperCase();
    return this.categories().filter(c => {
      const bizCode = (c.businessCode || '').trim().toUpperCase();
      const bizId = (c.businessId || '').trim().toUpperCase();
      const matchesBiz = bizCode === targetBiz || bizId === targetBiz;
      return matchesBiz && c.active !== false;
    });
  });

  newProduct = {
    name: '',
    sku: '',
    category: '',
    presentation: '',
    retailPrice: null as any,
    wholesalePrice: null as any,
    stockBoxes: null as any,
    businessCode: 'BIZ-001',
  };

  constructor() {
    // Inicializar negocio matriz según el negocio activo en sesión
    const defaultBiz = this.businessInfo().id || this.currentUserProfile().assignedBusinessId || 'BIZ-001';
    this.selectedBusinessCode.set(defaultBiz);
    this.newProduct.businessCode = defaultBiz;

    // Sincronizar reactivamente el negocio cuando cambie el negocio matriz activo
    effect(() => {
      const activeBiz = this.businessInfo().id;
      if (activeBiz && this.isGeneralAdmin()) {
        this.selectedBusinessCode.set(activeBiz);
        this.newProduct.businessCode = activeBiz;
      }
    });

    // Auto-seleccionar la moneda por defecto del negocio en el producto
    effect(() => {
      const def = this.defaultBusinessCurrency();
      this.selectedProductCurrency.set(def);
    });

    // Auto-seleccionar la primera categoría disponible cuando cambie o cargue la lista
    effect(() => {
      const avail = this.availableCategoriesForBusiness();
      if (avail.length > 0) {
        if (!this.newProduct.category || !avail.some(c => c.name === this.newProduct.category)) {
          this.newProduct.category = avail[0].name;
        }
      } else {
        this.newProduct.category = '';
      }
    });
  }

  ngOnInit(): void {
    this.resetProductForm();
    // Asegurar que los datos más recientes estén sincronizados desde el Backend
    this.dummyData.loadAllFromBackend();
  }

  resetProductForm(): void {
    this.formSubmitted.set(false);
    const defaultBiz = this.selectedBusinessCode() || this.businessInfo().id || 'BIZ-001';
    this.newProduct = {
      name: '',
      sku: '',
      category: '',
      presentation: '',
      retailPrice: null as any,
      wholesalePrice: null as any,
      stockBoxes: null as any,
      businessCode: defaultBiz,
    };
  }

  /**
   * Manejador de cambio de negocio matriz (para Administrador General).
   * Actualiza el negocio y recalcula las categorías disponibles del negocio destino.
   */
  onBusinessChange(code: string): void {
    this.selectedBusinessCode.set(code);
    this.newProduct.businessCode = code;
    this.selectedProductCurrency.set(this.defaultBusinessCurrency());

    // Sincronizar la categoría seleccionada con las del nuevo negocio
    const avail = this.availableCategoriesForBusiness();
    if (avail.length > 0 && !avail.some(c => c.name === this.newProduct.category)) {
      this.newProduct.category = avail[0].name;
    } else if (avail.length === 0) {
      this.newProduct.category = '';
    }
  }

  saveProduct(): void {
    this.formSubmitted.set(true);

    const prodName = this.newProduct.name.trim();
    const prodCategory = (this.newProduct.category || '').trim();
    const retail = Number(this.newProduct.retailPrice);
    const wholesale = Number(this.newProduct.wholesalePrice);

    if (!prodName || !prodCategory || isNaN(retail) || retail <= 0 || isNaN(wholesale) || wholesale <= 0) {
      this.feedbackMessage.set({
        text: 'Por favor, completa todos los campos obligatorios pendientes (resaltados en rojo).',
        type: 'warning',
      });
      return;
    }

    if (!this.newProduct.category) {
      this.feedbackMessage.set({
        text: 'Por favor, selecciona una categoría creada para este negocio.',
        type: 'warning',
      });
      return;
    }

    // Si NO es Administrador General, forzar siempre su propio negocio asignado
    if (!this.isGeneralAdmin()) {
      this.newProduct.businessCode = this.businessInfo().id || this.currentUserProfile().assignedBusinessId || 'BIZ-001';
    }

    const targetBizCode = this.newProduct.businessCode.toUpperCase();
    const boxes = Number(this.newProduct.stockBoxes) || 0;
    const enteredSku = (this.newProduct.sku || '').trim().toUpperCase();

    // Validación de unicidad de SKU si se especifica
    if (enteredSku) {
      const skuExists = this.products().some(p => {
        const pSku = (p.sku || '').trim().toUpperCase();
        const pBizCode = (p.businessCode || '').toUpperCase();
        const pBizId = (p.businessId || '').toUpperCase();
        const sameBiz = !p.businessCode || pBizCode === targetBizCode || pBizId === targetBizCode;
        return sameBiz && pSku === enteredSku;
      });

      if (skuExists) {
        this.feedbackMessage.set({
          text: `El código SKU "${enteredSku}" ya está registrado en otro producto de este negocio. Debe ser único o dejar el campo vacío.`,
          type: 'warning',
        });
        return;
      }
    }

    const productData: BeverageProduct = {
      sku: enteredSku || undefined as any,
      name: this.newProduct.name.trim(),
      category: this.newProduct.category as any,
      presentation: this.newProduct.presentation.trim(),
      retailPrice: Number(this.newProduct.retailPrice) || 0,
      wholesalePrice: Number(this.newProduct.wholesalePrice) || 0,
      stockBoxes: boxes,
      stockUnits: boxes * 12,
      status: (boxes > 10 ? 'En Stock' : boxes > 0 ? 'Stock Bajo' : 'Agotado') as any,
      registeredByUser: this.currentSessionUser(),
      businessId: targetBizCode,
      businessCode: targetBizCode,
    };

    this.isSubmitting.set(true);

    this.dummyData.addProduct(
      productData,
      () => {
        this.isSubmitting.set(false);
        const bizObj = this.businesses().find(b => b.id?.toUpperCase() === targetBizCode);
        const bizName = bizObj?.commercialName || bizObj?.legalName || targetBizCode;
        const skuLabel = enteredSku ? ` (${enteredSku})` : '';
        this.feedbackMessage.set({
          text: `Ficha técnica de "${prodName}"${skuLabel} registrada exitosamente en el negocio "${bizName}" bajo la categoría "${prodCategory}".`,
          type: 'success',
        });
        this.resetProductForm();
      },
      (err) => {
        this.isSubmitting.set(false);
        const detail = err?.error?.detail || err?.error?.title || err?.message || 'Error al persistir el producto en la base de datos.';
        this.feedbackMessage.set({
          text: `No se pudo registrar el producto en el catálogo: ${detail}`,
          type: 'error',
        });
      }
    );
  }
}
