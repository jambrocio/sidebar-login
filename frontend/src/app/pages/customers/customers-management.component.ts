import { Component, OnInit, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DummyDataService } from '../../core/services/dummy-data.service';
import { AdminApiService } from '../../core/services/admin-api.service';
import { AuthApiService } from '../../core/services/auth-api.service';
import { CommercialCustomer, FeedbackNotification, resolveCurrencySymbol } from '../../core/models/domain.models';
import { TablePaginationComponent } from '../../shared/components/pagination/table-pagination.component';
import { AppAmountPipe } from '../../shared/pipes/app-amount.pipe';

/**
 * Componente Smart/Container de Administración de Clientes Comerciales (`/dashboard/customers`).
 *
 * @description Implementa la gestión, consulta y alta de clientes comerciales (Mayoristas, Minoristas,
 * Distribuidores) con aislamiento estricto y unicidad multi-tenant por Negocio Matriz en PostgreSQL,
 * soporte de monedas por negocio (PEN -> S/, USD -> $) y paginación de 15 registros por página.
 *
 * @author Equipo de Arquitectura Frontend Senior
 * @version 2.2
 */
@Component({
  selector: 'app-customers-management',
  standalone: true,
  imports: [CommonModule, FormsModule, TablePaginationComponent, AppAmountPipe],
  templateUrl: './customers-management.component.html',
  styleUrl: './customers-management.component.scss',
})
export class CustomersManagementComponent implements OnInit {
  private readonly dummyData = inject(DummyDataService);
  private readonly adminApi = inject(AdminApiService);
  private readonly authApi = inject(AuthApiService);

  readonly businessInfo = this.dummyData.businessInfo;
  readonly businesses = this.dummyData.businesses;
  readonly availableBusinesses = this.dummyData.availableBusinesses;
  readonly customers = this.dummyData.customers;
  readonly currentSessionUser = this.dummyData.currentSessionUser;
  readonly currentUserProfile = this.dummyData.currentUserProfile;

  readonly searchQuery = signal<string>('');
  readonly filterBusinessCode = signal<string>('ALL');
  readonly feedbackMessage = signal<FeedbackNotification | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly isSubmitting = signal<boolean>(false);
  readonly formSubmitted = signal<boolean>(false);

  /** Determina si el usuario en sesión cuenta con privilegios de Administrador General (Superusuario) */
  readonly isGeneralAdmin = computed<boolean>(() => {
    const profile = this.currentUserProfile();
    const roleName = (profile?.role || '').trim();
    if (roleName.includes('Negocio') || roleName === 'ADMIN_NEGOCIO') {
      return false;
    }
    return roleName === 'ADMIN' || roleName.includes('Administrador General') || roleName.includes('Superusuario');
  });

  /** Determina si el usuario en sesión es Administrador de Negocio */
  readonly isBusinessAdmin = computed<boolean>(() => {
    const profile = this.currentUserProfile();
    const roleName = (profile?.role || '').trim();
    return roleName === 'ADMIN_NEGOCIO' || roleName.includes('Administrador de Negocio');
  });

  customerForm = {
    customerCode: '',
    documentType: 'RUC' as 'RUC' | 'DNI' | 'CE' | 'PASAPORTE',
    documentNumber: '',
    legalName: '',
    commercialName: '',
    customerType: 'Mayorista VIP' as 'Mayorista VIP' | 'Minorista Frecuente' | 'Distribuidor' | 'Corporativo',
    email: '',
    phone: '',
    address: '',
    creditLine: null as any,
    businessCode: 'BIZ-001',
  };

  /** Perfil del negocio seleccionado en el formulario de clientes */
  readonly selectedCustomerBusiness = computed(() => {
    const code = (this.customerForm.businessCode || this.businessInfo().id || 'BIZ-001').trim().toUpperCase();
    return this.businesses().find(b => b.id?.toUpperCase() === code) || this.businessInfo();
  });

  /** Moneda por defecto configurada para el negocio del cliente */
  readonly defaultCurrencyForCustomerBusiness = computed<string>(() => {
    const biz = this.selectedCustomerBusiness();
    return biz?.defaultCurrency || biz?.currency || 'PEN';
  });

  /** Monedas admitidas para el negocio del cliente */
  readonly availableCurrenciesForCustomerBusiness = computed<string[]>(() => {
    const biz = this.selectedCustomerBusiness();
    if (biz?.supportedCurrencies && biz.supportedCurrencies.length > 0) {
      return biz.supportedCurrencies;
    }
    const def = this.defaultCurrencyForCustomerBusiness();
    return [def, def === 'PEN' ? 'USD' : 'PEN'];
  });

  /** Moneda seleccionada para la línea de crédito */
  readonly selectedCreditCurrency = signal<string>('PEN');

  /** Símbolo monetario dinámico de la línea de crédito */
  readonly creditCurrencySymbol = computed<string>(() => {
    return resolveCurrencySymbol(this.selectedCreditCurrency());
  });

  /** Tamaño de página estándar (15 registros) */
  readonly pageSize = 15;

  /** Página activa actual */
  readonly currentPage = signal<number>(1);

  constructor() {
    // Sincronizar automáticamente el negocio y resetear paginación
    effect(() => {
      const activeBiz = this.businessInfo().id;
      if (activeBiz && this.isGeneralAdmin()) {
        this.customerForm.businessCode = activeBiz;
        this.filterBusinessCode.set(activeBiz);
        this.currentPage.set(1);
      }
    });

    // Auto-seleccionar la moneda por defecto del negocio para la línea de crédito
    effect(() => {
      const def = this.defaultCurrencyForCustomerBusiness();
      this.selectedCreditCurrency.set(def);
    });

    // Resetear a página 1 ante cambios en la búsqueda
    effect(() => {
      this.searchQuery();
      this.currentPage.set(1);
    });
  }

  ngOnInit(): void {
    this.resetCustomerForm();
    // Inicializar negocio por defecto según el usuario en sesión
    const userBiz = this.businessInfo().id || this.currentUserProfile().assignedBusinessId || 'BIZ-001';
    this.customerForm.businessCode = userBiz;
    if (!this.isGeneralAdmin()) {
      this.filterBusinessCode.set(userBiz);
    }
    this.loadCustomersFromBackend();
  }

  /**
   * Obtiene el símbolo monetario según la divisa configurada para el negocio matriz.
   */
  getCurrencySymbol(businessCode?: string): string {
    const code = (businessCode || this.customerForm.businessCode || this.businessInfo().id || '').trim().toUpperCase();
    const biz = this.businesses().find(b => b.id?.toUpperCase() === code);
    const curr = (biz?.currency || (code === 'BIZ-003' ? 'PEN' : this.businessInfo().currency) || 'PEN').toUpperCase();
    if (curr.includes('PEN') || curr.includes('SOL')) return 'S/';
    if (curr.includes('EUR') || curr.includes('€')) return '€';
    return '$';
  }

  /** Símbolo de divisa reactivo para el formulario de registro */
  readonly formCurrencySymbol = computed<string>(() => this.getCurrencySymbol(this.customerForm.businessCode));

  /** Extrae iniciales legibles para el avatar del cliente */
  getInitials(name: string): string {
    if (!name) return 'CL';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  loadCustomersFromBackend(): void {
    const filter = this.isGeneralAdmin()
      ? this.filterBusinessCode()
      : (this.currentUserProfile().assignedBusinessId || 'BIZ-001');
    this.adminApi.getCustomers(filter).subscribe({
      next: (list) => {
        if (list && list.length > 0) {
          // Asegurar deduplicación estricta por número de documento y negocio
          const seen = new Set<string>();
          const deduped: CommercialCustomer[] = [];
          for (const item of list) {
            const key = `${(item.businessCode || '').toUpperCase()}__${item.documentNumber.trim()}`;
            if (!seen.has(key)) {
              seen.add(key);
              deduped.push(item);
            }
          }
          this.customers.set(deduped);
        }
      },
      error: (err) => {
        console.warn('Carga de clientes offline o local:', err?.status);
      },
    });
  }

  onFilterBusinessChange(businessCode: string): void {
    this.filterBusinessCode.set(businessCode);
    this.currentPage.set(1);
    this.loadCustomersFromBackend();
  }

  readonly filteredCustomers = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const filterBiz = this.filterBusinessCode();
    let list = this.customers();

    if (!this.isGeneralAdmin()) {
      const userBiz = (this.currentUserProfile().assignedBusinessId || 'BIZ-001').toUpperCase();
      list = list.filter(c => c.businessCode?.toUpperCase() === userBiz);
    } else if (filterBiz && filterBiz !== 'ALL') {
      list = list.filter(c => c.businessCode?.toUpperCase() === filterBiz.toUpperCase());
    }

    if (!q) return list;

    return list.filter(
      c =>
        c.legalName.toLowerCase().includes(q) ||
        (c.commercialName && c.commercialName.toLowerCase().includes(q)) ||
        c.documentNumber.toLowerCase().includes(q) ||
        c.customerCode.toLowerCase().includes(q) ||
        (c.email && c.email.toLowerCase().includes(q))
    );
  });

  /** Subconjunto de clientes paginados a 15 registros por página */
  readonly pagedCustomers = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.filteredCustomers().slice(start, start + this.pageSize);
  });

  suggestNextCustomerCode(): string {
    const targetBiz = this.customerForm.businessCode.toUpperCase();
    const bizCustomers = this.customers().filter(
      c => c.businessCode?.toUpperCase() === targetBiz
    );
    let maxNum = 0;
    for (const c of bizCustomers) {
      const match = c.customerCode?.match(/^CLI-(\d+)$/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    }
    const next = maxNum + 1;
    return `CLI-${next < 10 ? '00' + next : next < 100 ? '0' + next : next}`;
  }

  saveCustomer(): void {
    if (this.isSubmitting()) return;

    this.formSubmitted.set(true);
    this.feedbackMessage.set(null);
    this.errorMessage.set(null);

    const doc = this.customerForm.documentNumber.trim();
    const legalName = this.customerForm.legalName.trim();

    if (!doc || !legalName) {
      this.feedbackMessage.set({
        text: 'Por favor, completa los campos obligatorios pendientes del cliente (resaltados en rojo).',
        type: 'warning',
      });
      return;
    }

    // Si NO es Administrador General, forzar siempre su propio negocio
    if (!this.isGeneralAdmin()) {
      this.customerForm.businessCode = this.currentUserProfile().assignedBusinessId || 'BIZ-001';
    }

    const targetBizCode = this.customerForm.businessCode.toUpperCase();

    // Validación preventiva de unicidad de cliente por negocio
    const existingInBusiness = this.customers().find(
      c => c.businessCode?.toUpperCase() === targetBizCode && c.documentNumber.trim() === doc
    );

    if (existingInBusiness) {
      const bizName = this.getBusinessName(targetBizCode);
      this.feedbackMessage.set({
        text: `Regla de Unicidad: El cliente con documento "${doc}" ya está registrado en el negocio "${bizName}" (${existingInBusiness.legalName}).`,
        type: 'warning',
      });
      return;
    }

    const nextCode = this.customerForm.customerCode.trim() || this.suggestNextCustomerCode();
    const bizObj = this.businesses().find(b => b.id?.toUpperCase() === targetBizCode);
    const businessName = bizObj?.legalName || bizObj?.commercialName || targetBizCode;

    const newCustomer: CommercialCustomer = {
      id: `cli-${Date.now()}`,
      customerCode: nextCode,
      documentType: this.customerForm.documentType,
      documentNumber: doc,
      legalName: this.customerForm.legalName.trim(),
      commercialName: this.customerForm.commercialName.trim() || this.customerForm.legalName.trim(),
      customerType: this.customerForm.customerType,
      email: this.customerForm.email.trim() || undefined,
      phone: this.customerForm.phone.trim() || undefined,
      address: this.customerForm.address.trim() || undefined,
      creditLine: Number(this.customerForm.creditLine) || 0,
      active: true,
      businessCode: targetBizCode,
      businessName,
      registeredBy: this.currentSessionUser(),
      createdAt: new Date().toISOString().split('T')[0],
    };

    this.isSubmitting.set(true);

    // Persistencia en Backend / PostgreSQL sin duplicación en estado reactivo
    this.dummyData.addCustomer(
      newCustomer,
      (savedCustomer) => {
        this.isSubmitting.set(false);
        this.feedbackMessage.set({
          text: `Cliente "${savedCustomer.legalName}" (${savedCustomer.customerCode}) registrado exitosamente para el negocio "${businessName}".`,
          type: 'success',
        });
        this.resetCustomerForm();
      },
      (err) => {
        this.isSubmitting.set(false);
        const detail = err?.error?.detail || err?.error?.title || err?.message || 'Error al persistir el cliente.';
        this.feedbackMessage.set({
          text: `No se pudo registrar el cliente: ${detail}`,
          type: 'error',
        });
      }
    );
  }

  getBusinessName(code: string): string {
    const biz = this.businesses().find(b => b.id?.toUpperCase() === code?.toUpperCase());
    return biz ? (biz.commercialName || biz.legalName) : code;
  }

  resetCustomerForm(): void {
    this.formSubmitted.set(false);
    const defaultBiz = this.businessInfo().id || (this.isGeneralAdmin() ? 'BIZ-001' : (this.currentUserProfile().assignedBusinessId || 'BIZ-001'));
    this.customerForm = {
      customerCode: '',
      documentType: 'RUC',
      documentNumber: '',
      legalName: '',
      commercialName: '',
      customerType: 'Mayorista VIP',
      email: '',
      phone: '',
      address: '',
      creditLine: null as any,
      businessCode: defaultBiz,
    };
  }
}
