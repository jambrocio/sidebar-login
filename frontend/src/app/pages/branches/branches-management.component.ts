import { Component, OnInit, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DummyDataService } from '../../core/services/dummy-data.service';
import { AdminApiService, CreateBusinessRequestDto, CreateBranchRequestDto } from '../../core/services/admin-api.service';
import { BusinessBranch, BusinessProfile, FeedbackNotification, SYSTEM_AVAILABLE_CURRENCIES, SupportedCurrencyOption } from '../../core/models/domain.models';
import { TablePaginationComponent } from '../../shared/components/pagination/table-pagination.component';

/**
 * Componente Smart/Container dedicado a la Estructura Organizacional: Negocios Matriz y Locales.
 *
 * @description Gobierna la jerarquía multi-tenant `1 Negocio Matriz (Empresa) -> N Locales / Sucursales`,
 * permitiendo crear empresas, registrar sucursales, series de facturación y puntos de venta en PostgreSQL.
 * Incluye paginación de 15 registros por página en cada tabla.
 *
 * @author Equipo de Arquitectura Frontend Senior
 * @version 2.0
 */
@Component({
  selector: 'app-branches-management',
  standalone: true,
  imports: [CommonModule, FormsModule, TablePaginationComponent],
  templateUrl: './branches-management.component.html',
  styleUrl: './branches-management.component.scss',
})
export class BranchesManagementComponent implements OnInit {
  private readonly dummyData = inject(DummyDataService);
  private readonly adminApi = inject(AdminApiService);

  readonly businessInfo = this.dummyData.businessInfo;
  readonly businesses = this.dummyData.businesses;
  readonly availableBusinesses = this.dummyData.availableBusinesses;
  readonly branches = this.dummyData.branches;
  readonly assignedBranch = this.dummyData.assignedBranch;
  readonly currentUserProfile = this.dummyData.currentUserProfile;

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

  /** Pestaña activa: 'branches' para Administrador de Negocio, 'businesses' para Superadmin */
  readonly activeTab = signal<'businesses' | 'branches'>('branches');
  readonly selectedBusinessFilter = signal<string>('ALL');
  readonly feedbackMessage = signal<FeedbackNotification | null>(null);
  readonly isSubmittingBusiness = signal<boolean>(false);
  readonly isSubmittingBranch = signal<boolean>(false);
  readonly formSubmittedBusiness = signal<boolean>(false);
  readonly formSubmittedBranch = signal<boolean>(false);

  readonly systemCurrencies: SupportedCurrencyOption[] = SYSTEM_AVAILABLE_CURRENCIES;

  constructor() {
    // Sincronizar automáticamente la pestaña y el negocio según el rol del usuario
    effect(() => {
      if (this.isGeneralAdmin()) {
        // Superadmin puede acceder a ambas pestañas
      } else {
        // Administrador de Negocio: forzar siempre pestaña de locales y su propio negocio
        this.activeTab.set('branches');
        const myBiz = this.currentUserProfile().assignedBusinessId || this.businessInfo().id || 'BIZ-001';
        this.selectedBusinessFilter.set(myBiz);
        this.newBranch.businessId = myBiz;
      }
    });
  }

  newBusiness = {
    code: '',
    commercialName: '',
    legalName: '',
    taxId: '',
    fiscalAddress: '',
    phone: '',
    supportEmail: '',
    currency: 'PEN',
    defaultCurrency: 'PEN',
    supportedCurrencies: ['PEN', 'USD'],
  };

  /** Formulario de Local: campos completamente limpios por defecto */
  newBranch = {
    businessId: '',
    name: '',
    type: 'Centro Mayorista y Minorista',
    address: '',
    phone: '',
    invoiceSeries: '',
    managerUser: '',
    posTerminals: null as any,
  };

  ngOnInit(): void {
    if (this.isGeneralAdmin()) {
      this.activeTab.set('businesses');
    } else {
      this.activeTab.set('branches');
      const myBiz = this.currentUserProfile().assignedBusinessId || this.businessInfo().id || 'BIZ-001';
      this.selectedBusinessFilter.set(myBiz);
      this.newBranch.businessId = myBiz;
    }
    this.loadBusinessesAndBranchesFromBackend();
    this.newBusiness.code = this.suggestNextBusinessCode();
  }

  /**
   * Carga los datos reales de Negocios y Locales desde la base de datos PostgreSQL via Spring Boot.
   */
  loadBusinessesAndBranchesFromBackend(): void {
    this.adminApi.getBusinesses().subscribe({
      next: (backendBizList: any[]) => {
        if (backendBizList && backendBizList.length > 0) {
          const mappedBusinesses: BusinessProfile[] = backendBizList.map(b => {
            const code = b.code || b.id || '';
            const defCurr = b.defaultCurrency || b.currency || 'PEN';
            let supp = b.supportedCurrencies;
            if (!supp || supp.length === 0) {
              if (b.supportedCurrenciesRaw) {
                supp = b.supportedCurrenciesRaw.split(',').map((s: string) => s.trim()).filter(Boolean);
              } else {
                supp = [defCurr, defCurr === 'PEN' ? 'USD' : 'PEN'];
              }
            }
            return {
              id: code,
              commercialName: b.commercialName || b.legalName || code,
              legalName: b.legalName || code,
              taxId: b.taxId || '',
              fiscalAddress: b.fiscalAddress || 'Dirección fiscal registrada',
              phone: b.phone || '+51 01 440-1200',
              supportEmail: b.supportEmail || 'contacto@empresa.pe',
              timezone: b.timezone || 'America/Lima (UTC-5)',
              currency: defCurr,
              defaultCurrency: defCurr,
              supportedCurrencies: supp,
            };
          });

          this.dummyData.businesses.set(mappedBusinesses);
          if (mappedBusinesses.length > 0) {
            this.dummyData.businessInfo.set(mappedBusinesses[0]);
          }

          // Si el formulario de local no tiene negocio seleccionado, asignar el primero disponible
          if (!this.newBranch.businessId && mappedBusinesses.length > 0) {
            this.newBranch.businessId = mappedBusinesses[0].id;
          }

          // Recalcular correlativo de nuevo negocio si está vacío o ya existe
          if (!this.newBusiness.code || this.businesses().some(b => b.id.toUpperCase() === this.newBusiness.code.toUpperCase())) {
            this.newBusiness.code = this.suggestNextBusinessCode();
          }
        }
      },
      error: err => {
        console.warn('Uso de datos locales para Negocios (backend no accesible o sin sesión):', err?.status);
      },
    });

    this.adminApi.getBranches().subscribe({
      next: (backendBranches: any[]) => {
        if (backendBranches && backendBranches.length > 0) {
          const mappedBranches: BusinessBranch[] = backendBranches.map(br => ({
            code: br.code || br.id || '',
            businessId: br.businessCode || br.businessId || '',
            name: br.name || '',
            type: br.branchType || br.type || 'Centro Mayorista y Minorista',
            address: br.address || 'Dirección comercial registrada',
            phone: br.phone || '',
            invoiceSeries: br.invoiceSeries || br.series || 'F001 / B001',
            managerUser: br.managerName || br.managerUser || br.manager || '',
            posTerminals: Number(br.posTerminals) || 1,
            status: (br.status as any) || 'Operativo',
          }));
          this.dummyData.branches.set(mappedBranches);
        }
      },
      error: err => {
        console.warn('Uso de datos locales para Locales (backend no accesible o sin sesión):', err?.status);
      },
    });
  }

  /** Tamaño de página estándar (15 registros) */
  readonly pageSize = 15;

  /** Páginas activas */
  readonly currentBusinessPage = signal<number>(1);
  readonly currentBranchPage = signal<number>(1);

  readonly filteredBranches = computed(() => {
    if (!this.isGeneralAdmin()) {
      const myBiz = this.currentUserProfile().assignedBusinessId || 'BIZ-001';
      return this.branches().filter(b => b.businessId?.toUpperCase() === myBiz.toUpperCase());
    }
    const filter = this.selectedBusinessFilter();
    if (filter === 'ALL') return this.branches();
    return this.branches().filter(b => b.businessId?.toUpperCase() === filter.toUpperCase());
  });

  /** Locales paginados a 15 registros por página */
  readonly pagedBranches = computed(() => {
    const start = (this.currentBranchPage() - 1) * this.pageSize;
    return this.filteredBranches().slice(start, start + this.pageSize);
  });

  /** Negocios paginados a 15 registros por página */
  readonly pagedBusinesses = computed(() => {
    const start = (this.currentBusinessPage() - 1) * this.pageSize;
    return this.businesses().slice(start, start + this.pageSize);
  });

  getBusinessName(businessId: string): string {
    if (!businessId) return 'Negocio no especificado';
    const biz = this.businesses().find(b => b.id.toUpperCase() === businessId.toUpperCase());
    return biz?.commercialName || biz?.legalName || businessId;
  }

  getBranchCount(businessId: string): number {
    if (!businessId) return 0;
    return this.branches().filter(b => b.businessId.toUpperCase() === businessId.toUpperCase()).length;
  }

  toggleSupportedCurrency(code: string): void {
    const list = [...this.newBusiness.supportedCurrencies];
    const idx = list.indexOf(code);
    if (idx >= 0) {
      if (list.length === 1) {
        return; // Al menos una moneda debe quedar seleccionada
      }
      list.splice(idx, 1);
      if (this.newBusiness.defaultCurrency === code) {
        this.newBusiness.defaultCurrency = list[0];
        this.newBusiness.currency = list[0];
      }
    } else {
      list.push(code);
    }
    this.newBusiness.supportedCurrencies = list;
  }

  isCurrencySupported(code: string): boolean {
    return this.newBusiness.supportedCurrencies.includes(code);
  }

  suggestNextBusinessCode(): string {
    const bizList = this.businesses();
    let maxNum = 0;
    for (const b of bizList) {
      const match = b.id.match(/^BIZ-(\d+)$/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    }
    const next = maxNum + 1;
    return `BIZ-${next < 10 ? '00' + next : next < 100 ? '0' + next : next}`;
  }

  switchTab(tab: 'branches' | 'businesses'): void {
    if (tab === 'businesses' && !this.isGeneralAdmin()) {
      return; // Bloqueo estricto: el Administrador de Negocio no tiene autorización para acceder a registro de negocios
    }
    this.activeTab.set(tab);
    this.feedbackMessage.set(null);
    if (tab === 'branches') {
      // Limpiar campos del formulario al entrar al tab de locales
      this.resetBranchForm(this.newBranch.businessId);
    }
  }

  prepareNewBranchForBusiness(bizId: string): void {
    this.resetBranchForm(bizId);
    this.switchTab('branches');
  }

  /**
   * Registra un nuevo Negocio Matriz / Empresa en PostgreSQL.
   */
  registerBusiness(): void {
    if (!this.isGeneralAdmin()) {
      this.feedbackMessage.set({ text: 'Acceso restringido: Solo el Administrador General (Superusuario) puede registrar nuevos Negocios Matriz.', type: 'error' });
      return;
    }
    this.formSubmittedBusiness.set(true);

    const code = this.newBusiness.code.trim().toUpperCase();
    const legalName = this.newBusiness.legalName.trim();
    const commercialName = this.newBusiness.commercialName.trim() || legalName;
    const taxId = this.newBusiness.taxId.trim();
    const fiscalAddress = this.newBusiness.fiscalAddress.trim();

    if (!code || !legalName || !commercialName || !taxId || !fiscalAddress) {
      this.feedbackMessage.set({ text: 'Por favor, completa todos los campos obligatorios del negocio marcados en rojo.', type: 'warning' });
      return;
    }

    if (!/^[0-9]{11}$/.test(taxId)) {
      this.feedbackMessage.set({ text: 'El RUC / Identificación Fiscal debe tener exactamente 11 dígitos numéricos.', type: 'warning' });
      return;
    }

    // Verificar si ya existe el código o RUC en la lista actual
    const existingByCode = this.businesses().find(b => b.id.toUpperCase() === code);
    if (existingByCode) {
      const suggested = this.suggestNextBusinessCode();
      this.feedbackMessage.set({
        text: `El código "${code}" ya pertenece a "${existingByCode.legalName}". Te sugerimos utilizar "${suggested}".`,
        type: 'warning',
      });
      this.newBusiness.code = suggested;
      return;
    }

    const existingByTaxId = this.businesses().find(b => b.taxId === taxId);
    if (existingByTaxId) {
      this.feedbackMessage.set({
        text: `El RUC "${taxId}" ya pertenece a la empresa registrada "${existingByTaxId.legalName}".`,
        type: 'error',
      });
      return;
    }

    this.isSubmittingBusiness.set(true);
    this.feedbackMessage.set(null);

    const defCurr = this.newBusiness.defaultCurrency || this.newBusiness.currency || 'PEN';
    const suppCurrs = this.newBusiness.supportedCurrencies.length > 0 ? this.newBusiness.supportedCurrencies : [defCurr];

    const payload: CreateBusinessRequestDto = {
      code,
      commercialName,
      legalName,
      taxId,
      fiscalAddress,
      phone: this.newBusiness.phone.trim() || '+51 01 440-1200',
      supportEmail: this.newBusiness.supportEmail.trim() || `contacto@${code.toLowerCase()}.pe`,
      currency: defCurr,
      defaultCurrency: defCurr,
      supportedCurrencies: suppCurrs,
    };

    const newBusinessProfile: BusinessProfile = {
      id: code,
      commercialName,
      legalName,
      taxId,
      fiscalAddress,
      phone: payload.phone || '+51 01 440-1200',
      supportEmail: payload.supportEmail || 'contacto@empresa.pe',
      timezone: 'America/Lima (UTC-5)',
      currency: defCurr,
      defaultCurrency: defCurr,
      supportedCurrencies: suppCurrs,
    };

    this.adminApi.createBusiness(payload).subscribe({
      next: () => {
        this.isSubmittingBusiness.set(false);
        this.dummyData.businesses.update(list => [...list, newBusinessProfile]);
        this.feedbackMessage.set({
          text: `Negocio Matriz "${legalName}" (${code}) registrado exitosamente en la base de datos PostgreSQL.`,
          type: 'success',
        });
        this.resetBusinessForm();
        this.newBranch.businessId = code;
        this.loadBusinessesAndBranchesFromBackend();
      },
      error: err => {
        this.isSubmittingBusiness.set(false);
        const errorDetail = err?.error?.detail || err?.error?.title || err?.message || 'Error al registrar en base de datos.';
        this.feedbackMessage.set({
          text: `No se pudo registrar la empresa en PostgreSQL: ${errorDetail}`,
          type: 'error',
        });
        if (err?.status === 409 || err?.status === 500) {
          this.newBusiness.code = this.suggestNextBusinessCode();
        }
      },
    });
  }

  private resetBusinessForm(): void {
    this.formSubmittedBusiness.set(false);
    this.newBusiness = {
      code: this.suggestNextBusinessCode(),
      commercialName: '',
      legalName: '',
      taxId: '',
      fiscalAddress: '',
      phone: '',
      supportEmail: '',
      currency: 'PEN',
      defaultCurrency: 'PEN',
      supportedCurrencies: ['PEN', 'USD'],
    };
  }

  /**
   * Limpia los campos del formulario de registro de local.
   */
  resetBranchForm(selectedBizId?: string): void {
    this.formSubmittedBranch.set(false);
    const currentBiz = (!this.isGeneralAdmin())
      ? (this.currentUserProfile().assignedBusinessId || 'BIZ-001')
      : (selectedBizId || this.newBranch.businessId || (this.businesses().length > 0 ? this.businesses()[0].id : ''));
    this.newBranch = {
      businessId: currentBiz,
      name: '',
      type: 'Centro Mayorista y Minorista',
      address: '',
      phone: '',
      invoiceSeries: '',
      managerUser: '',
      posTerminals: null as any,
    };
  }

  /**
   * Calcula de forma correlativa el siguiente código para un nuevo local (ej. LOC-07).
   */
  suggestNextBranchCode(): string {
    const branchList = this.branches();
    let maxNum = 0;
    for (const b of branchList) {
      const match = b.code.match(/^LOC-(\d+)$/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    }
    const next = maxNum + 1;
    return `LOC-${next < 10 ? '0' + next : next}`;
  }

  /**
   * Registra un nuevo Local / Sucursal dentro de un Negocio Matriz seleccionado en PostgreSQL.
   */
  registerBusinessBranch(): void {
    if (!this.isGeneralAdmin()) {
      this.newBranch.businessId = this.currentUserProfile().assignedBusinessId || 'BIZ-001';
    }
    this.formSubmittedBranch.set(true);

    if (!this.newBranch.businessId || !this.newBranch.name.trim() || !this.newBranch.type) {
      this.feedbackMessage.set({ text: 'Por favor, completa todos los campos obligatorios del local marcados en rojo.', type: 'warning' });
      return;
    }

    const code = this.suggestNextBranchCode();
    const bizName = this.getBusinessName(this.newBranch.businessId);
    const invoiceSeries = this.newBranch.invoiceSeries.trim() || `F0${code.replace('LOC-', '')} / B0${code.replace('LOC-', '')}`;
    const address = this.newBranch.address.trim() || 'Dirección comercial registrada';
    const phone = this.newBranch.phone.trim() || '+51 01 440-1200';
    const manager = this.newBranch.managerUser.trim() || 'Encargado de Sede';

    const payload: CreateBranchRequestDto = {
      businessCode: this.newBranch.businessId,
      code,
      name: this.newBranch.name.trim(),
      type: this.newBranch.type,
      address,
      phone,
      invoiceSeries,
      manager,
      posTerminals: Number(this.newBranch.posTerminals) || 1,
    };

    this.isSubmittingBranch.set(true);
    this.feedbackMessage.set(null);

    this.adminApi.createBranch(payload).subscribe({
      next: () => {
        this.isSubmittingBranch.set(false);
        this.feedbackMessage.set({
          text: `Local "${payload.name}" (${code}) registrado exitosamente dentro del negocio ${bizName} en PostgreSQL.`,
          type: 'success',
        });
        this.resetBranchForm(this.newBranch.businessId);
        this.loadBusinessesAndBranchesFromBackend();
      },
      error: err => {
        this.isSubmittingBranch.set(false);
        const errorDetail = err?.error?.detail || err?.error?.title || err?.message || 'Error al registrar en base de datos.';
        this.feedbackMessage.set({
          text: `No se pudo registrar el local en PostgreSQL: ${errorDetail}`,
          type: 'error',
        });
      },
    });
  }
}
