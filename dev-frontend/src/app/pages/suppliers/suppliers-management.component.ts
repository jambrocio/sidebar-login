import { Component, OnInit, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DummyDataService } from '../../core/services/dummy-data.service';
import { CommercialSupplier, FeedbackNotification } from '../../core/models/domain.models';
import { TablePaginationComponent } from '../../shared/components/pagination/table-pagination.component';

/**
 * Componente Smart/Container de Administración de Proveedores Comerciales (`/dashboard/suppliers`).
 *
 * @description Implementa la gestión, consulta, alta y control de estado operativo (Activo/Inactivo)
 * de proveedores de bebidas e insumos con aislamiento multi-tenant estricto por Negocio Matriz en PostgreSQL,
 * soporte de búsqueda reactiva y paginación estándar de 15 registros por página.
 *
 * @author Equipo de Arquitectura Frontend Senior
 * @version 1.0
 */
@Component({
  selector: 'app-suppliers-management',
  standalone: true,
  imports: [CommonModule, FormsModule, TablePaginationComponent],
  templateUrl: './suppliers-management.component.html',
  styleUrl: './suppliers-management.component.scss',
})
export class SuppliersManagementComponent implements OnInit {
  private readonly dummyData = inject(DummyDataService);

  readonly businessInfo = this.dummyData.businessInfo;
  readonly businesses = this.dummyData.businesses;
  readonly availableBusinesses = this.dummyData.availableBusinesses;
  readonly suppliers = this.dummyData.suppliers;
  readonly currentSessionUser = this.dummyData.currentSessionUser;
  readonly currentUserProfile = this.dummyData.currentUserProfile;

  readonly searchQuery = signal<string>('');
  readonly filterBusinessCode = signal<string>('ALL');
  readonly feedbackMessage = signal<FeedbackNotification | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly isSubmitting = signal<boolean>(false);
  readonly formSubmitted = signal<boolean>(false);
  readonly isToggling = signal<string | null>(null);

  /** Determina si el usuario en sesión cuenta con privilegios de Administrador General (Superusuario) */
  readonly isGeneralAdmin = computed<boolean>(() => {
    const profile = this.currentUserProfile();
    const roleName = (profile?.role || '').trim();
    if (roleName.includes('Negocio') || roleName === 'ADMIN_NEGOCIO') {
      return false;
    }
    return roleName === 'ADMIN' || roleName.includes('Administrador General') || roleName.includes('Superusuario');
  });

  supplierForm = {
    documentType: 'RUC' as 'RUC' | 'DNI' | 'OTRO',
    documentNumber: '',
    legalName: '',
    commercialName: '',
    contactName: '',
    email: '',
    phone: '',
    address: '',
    rubroCategory: '',
    businessCode: 'BIZ-001',
  };

  /** Tamaño de página estándar (15 registros) */
  readonly pageSize = 15;

  /** Página activa actual */
  readonly currentPage = signal<number>(1);

  constructor() {
    // Sincronizar automáticamente el negocio y resetear paginación
    effect(() => {
      const activeBiz = this.businessInfo().id;
      if (activeBiz && this.isGeneralAdmin()) {
        this.supplierForm.businessCode = activeBiz;
        this.filterBusinessCode.set(activeBiz);
        this.currentPage.set(1);
      } else if (!this.isGeneralAdmin()) {
        const assigned = this.currentUserProfile().assignedBusinessId || this.businessInfo().id || 'BIZ-001';
        this.supplierForm.businessCode = assigned;
        this.filterBusinessCode.set(assigned);
      }
    });

    // Resetear a página 1 cuando cambie el filtro de búsqueda
    effect(() => {
      this.searchQuery();
      this.currentPage.set(1);
    });
  }

  ngOnInit(): void {
    this.dummyData.loadAllFromBackend();
    this.resetSupplierForm();
  }

  onFilterBusinessChange(newCode: string): void {
    this.filterBusinessCode.set(newCode);
    this.currentPage.set(1);
  }

  /**
   * Proveedores filtrados reactivamente por negocio, rol y término de búsqueda.
   */
  readonly filteredSuppliers = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const filterBiz = this.filterBusinessCode();
    let list = this.suppliers();

    if (!this.isGeneralAdmin()) {
      const userBiz = (this.currentUserProfile().assignedBusinessId || this.businessInfo().id || 'BIZ-001').toUpperCase();
      list = list.filter(s => s.businessCode?.toUpperCase() === userBiz);
    } else if (filterBiz && filterBiz !== 'ALL') {
      list = list.filter(s => s.businessCode?.toUpperCase() === filterBiz.toUpperCase());
    }

    if (!q) return list;

    return list.filter(
      s =>
        s.legalName.toLowerCase().includes(q) ||
        (s.commercialName && s.commercialName.toLowerCase().includes(q)) ||
        s.documentNumber.toLowerCase().includes(q) ||
        s.supplierCode.toLowerCase().includes(q) ||
        (s.contactName && s.contactName.toLowerCase().includes(q)) ||
        (s.email && s.email.toLowerCase().includes(q)) ||
        (s.rubroCategory && s.rubroCategory.toLowerCase().includes(q))
    );
  });

  /** Subconjunto de proveedores paginados a 15 registros por página */
  readonly pagedSuppliers = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.filteredSuppliers().slice(start, start + this.pageSize);
  });

  saveSupplier(): void {
    if (this.isSubmitting()) return;

    this.formSubmitted.set(true);
    this.feedbackMessage.set(null);
    this.errorMessage.set(null);

    const doc = this.supplierForm.documentNumber.trim();
    const legalName = this.supplierForm.legalName.trim();

    if (!doc || !legalName) {
      this.feedbackMessage.set({
        text: 'Por favor, completa los campos obligatorios pendientes del proveedor (resaltados en rojo).',
        type: 'warning',
      });
      return;
    }

    const targetBizCode = this.isGeneralAdmin()
      ? this.supplierForm.businessCode
      : (this.currentUserProfile().assignedBusinessId || this.businessInfo().id || 'BIZ-001');

    const bizObj = this.businesses().find(b => b.id?.toUpperCase() === targetBizCode.toUpperCase());
    const businessName = bizObj ? (bizObj.commercialName || bizObj.legalName) : targetBizCode;

    const newSupplier: CommercialSupplier = {
      supplierCode: '',
      documentType: this.supplierForm.documentType,
      documentNumber: this.supplierForm.documentNumber.trim(),
      legalName: this.supplierForm.legalName.trim(),
      commercialName: this.supplierForm.commercialName.trim() || this.supplierForm.legalName.trim(),
      contactName: this.supplierForm.contactName.trim(),
      email: this.supplierForm.email.trim(),
      phone: this.supplierForm.phone.trim(),
      address: this.supplierForm.address.trim(),
      rubroCategory: this.supplierForm.rubroCategory.trim(),
      active: true,
      businessCode: targetBizCode,
      businessName,
      registeredBy: this.currentSessionUser(),
      createdAt: new Date().toISOString().split('T')[0],
    };

    this.isSubmitting.set(true);

    this.dummyData.addSupplier(
      newSupplier,
      (savedSupplier) => {
        this.isSubmitting.set(false);
        this.feedbackMessage.set({
          text: `Proveedor "${savedSupplier.legalName}" (${savedSupplier.supplierCode}) registrado exitosamente para el negocio "${businessName}".`,
          type: 'success',
        });
        this.resetSupplierForm();
      },
      (err) => {
        this.isSubmitting.set(false);
        const detail = err?.error?.detail || err?.error?.message || err?.message || 'Error al persistir el proveedor.';
        this.feedbackMessage.set({
          text: `No se pudo registrar el proveedor: ${detail}`,
          type: 'error',
        });
      }
    );
  }

  toggleSupplierStatus(supplier: CommercialSupplier): void {
    if (!supplier.id) return;
    this.isToggling.set(supplier.id);

    const prevStatus = supplier.active;
    this.dummyData.toggleSupplierStatus(
      supplier.id,
      prevStatus,
      (newStatus) => {
        this.isToggling.set(null);
        this.feedbackMessage.set({
          text: `Estado del proveedor "${supplier.commercialName || supplier.legalName}" actualizado a: ${newStatus ? 'ACTIVO' : 'INACTIVO'}.`,
          type: 'success',
        });
      },
      (err) => {
        this.isToggling.set(null);
        const detail = err?.error?.detail || err?.error?.message || err?.message || 'No se pudo actualizar el estado.';
        this.feedbackMessage.set({
          text: `Error al cambiar estado: ${detail}`,
          type: 'error',
        });
      }
    );
  }

  getBusinessName(code?: string): string {
    if (!code) return '—';
    const biz = this.businesses().find(b => b.id?.toUpperCase() === code?.toUpperCase());
    return biz ? (biz.commercialName || biz.legalName) : code;
  }

  resetSupplierForm(): void {
    this.formSubmitted.set(false);
    const defaultBiz = this.isGeneralAdmin()
      ? (this.businessInfo().id || 'BIZ-001')
      : (this.currentUserProfile().assignedBusinessId || this.businessInfo().id || 'BIZ-001');

    this.supplierForm = {
      documentType: 'RUC',
      documentNumber: '',
      legalName: '',
      commercialName: '',
      contactName: '',
      email: '',
      phone: '',
      address: '',
      rubroCategory: '',
      businessCode: defaultBiz,
    };
  }
}
