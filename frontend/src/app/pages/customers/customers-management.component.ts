import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DummyDataService } from '../../core/services/dummy-data.service';
import { AdminApiService } from '../../core/services/admin-api.service';
import { AuthApiService } from '../../core/services/auth-api.service';
import { CommercialCustomer, FeedbackNotification } from '../../core/models/domain.models';

/**
 * Componente Smart/Container de Administración de Clientes Comerciales (`/dashboard/customers`).
 *
 * @description Implementa la gestión, consulta y alta de clientes comerciales (Mayoristas, Minoristas,
 * Distribuidores) con aislamiento estricto y unicidad multi-tenant por Negocio Matriz en PostgreSQL.
 *
 * @author Equipo de Arquitectura Frontend Senior
 * @version 2.0
 */
@Component({
  selector: 'app-customers-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
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
    creditLine: 5000.0,
    businessCode: 'BIZ-001',
  };

  ngOnInit(): void {
    // Inicializar negocio por defecto según el usuario en sesión
    const userBiz = this.currentUserProfile().assignedBusinessId || 'BIZ-001';
    this.customerForm.businessCode = userBiz;
    if (!this.isGeneralAdmin()) {
      this.filterBusinessCode.set(userBiz);
    }
    this.loadCustomersFromBackend();
  }

  loadCustomersFromBackend(): void {
    const filter = this.isGeneralAdmin()
      ? this.filterBusinessCode()
      : (this.currentUserProfile().assignedBusinessId || 'BIZ-001');
    this.adminApi.getCustomers(filter).subscribe({
      next: (list) => {
        if (list && list.length > 0) {
          this.customers.set(list);
        }
      },
      error: (err) => {
        console.warn('Carga de clientes offline o local:', err?.status);
      },
    });
  }

  onFilterBusinessChange(businessCode: string): void {
    this.filterBusinessCode.set(businessCode);
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
    this.feedbackMessage.set(null);
    this.errorMessage.set(null);

    if (!this.customerForm.documentNumber.trim() || !this.customerForm.legalName.trim()) {
      this.feedbackMessage.set({
        text: 'Por favor, completa el número de documento y la razón social / nombre del cliente.',
        type: 'warning',
      });
      return;
    }

    // Si NO es Administrador General, forzar siempre su propio negocio
    if (!this.isGeneralAdmin()) {
      this.customerForm.businessCode = this.currentUserProfile().assignedBusinessId || 'BIZ-001';
    }

    const targetBizCode = this.customerForm.businessCode.toUpperCase();
    const doc = this.customerForm.documentNumber.trim();

    // Validación de unicidad de cliente por negocio
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
    const businessName = bizObj?.legalName || bizObj?.commercialName || 'Distribuidora El Roble';

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

    // Actualización reactiva inmediata
    this.customers.update(list => [newCustomer, ...list]);
    this.feedbackMessage.set({
      text: `Cliente "${newCustomer.legalName}" (${newCustomer.customerCode}) registrado exitosamente para el negocio ${businessName}.`,
      type: 'success',
    });

    // Persistencia en PostgreSQL
    this.dummyData.addCustomer(newCustomer);
    this.resetCustomerForm();
  }

  getBusinessName(code: string): string {
    const biz = this.businesses().find(b => b.id?.toUpperCase() === code?.toUpperCase());
    return biz ? (biz.commercialName || biz.legalName) : code;
  }

  resetCustomerForm(): void {
    const defaultBiz = this.isGeneralAdmin() ? 'BIZ-001' : (this.currentUserProfile().assignedBusinessId || 'BIZ-001');
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
      creditLine: 5000.0,
      businessCode: defaultBiz,
    };
  }
}
