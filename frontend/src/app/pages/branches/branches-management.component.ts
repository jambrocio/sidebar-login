import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DummyDataService } from '../../core/services/dummy-data.service';
import { AdminApiService } from '../../core/services/admin-api.service';
import { BusinessBranch, BusinessProfile } from '../../core/models/domain.models';

/**
 * Componente dedicado a la Estructura del Negocio y Administración de sus Locales (`/dashboard/branches`).
 * Permite gestionar la jerarquía `1 Negocio -> N Locales / Sucursales`.
 */
@Component({
  selector: 'app-branches-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './branches-management.component.html',
  styleUrl: './branches-management.component.scss',
})
export class BranchesManagementComponent implements OnInit {
  private readonly dummyData = inject(DummyDataService);
  private readonly adminApi = inject(AdminApiService);

  readonly businessInfo = this.dummyData.businessInfo;
  readonly businesses = this.dummyData.businesses;
  readonly branches = this.dummyData.branches;
  readonly assignedBranch = this.dummyData.assignedBranch;

  readonly selectedBusinessFilter = signal<string>('ALL');
  readonly feedbackMessage = signal<string | null>(null);

  ngOnInit(): void {
    this.loadBusinessesAndBranchesFromBackend();
  }

  /**
   * Carga los datos reales de Negocios y Locales desde la base de datos PostgreSQL via Spring Boot 4.
   */
  loadBusinessesAndBranchesFromBackend(): void {
    this.adminApi.getBusinesses().subscribe({
      next: backendBizList => {
        if (backendBizList && backendBizList.length > 0) {
          const mappedBusinesses: BusinessProfile[] = backendBizList.map(b => ({
            id: b.code,
            commercialName: b.commercialName || b.legalName,
            legalName: b.legalName,
            taxId: b.taxId,
            fiscalAddress: b.fiscalAddress || 'Dirección fiscal registrada',
            phone: b.phone || '+51 01 440-1200',
            supportEmail: 'contacto@distribuidoradelima.com',
            timezone: 'America/Lima (UTC-5)',
            currency: b.currency || 'PEN',
          }));
          this.dummyData.businesses.set(mappedBusinesses);
          if (mappedBusinesses.length > 0) {
            this.dummyData.businessInfo.set(mappedBusinesses[0]);
          }
        }
      },
      error: err => {
        console.warn('Uso de datos locales para Negocios (backend no accesible o sin sesión):', err?.status);
      },
    });

    this.adminApi.getBranches().subscribe({
      next: backendBranches => {
        if (backendBranches && backendBranches.length > 0) {
          const mappedBranches: BusinessBranch[] = backendBranches.map(br => ({
            code: br.code,
            businessId: br.businessCode,
            name: br.name,
            type: br.branchType || br.type || 'Centro Mayorista y Minorista',
            address: br.address || 'Av. Industrial 450, Lima',
            phone: br.phone || '+51 01 440-1200',
            invoiceSeries: br.invoiceSeries || 'F001 / B001',
            managerUser: br.managerName || br.managerUser || 'Administrador de Local',
            posTerminals: br.posTerminals || 2,
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

  readonly filteredBranches = computed(() => {
    const filter = this.selectedBusinessFilter();
    if (filter === 'ALL') return this.branches();
    return this.branches().filter(b => b.businessId === filter);
  });

  newBranch = {
    businessId: 'BIZ-001',
    name: '',
    type: 'Centro Mayorista y Minorista',
    address: '',
    phone: '+51 01 440-1200',
    invoiceSeries: 'F005 / B005',
    managerUser: 'Ana García (agarcia)',
    posTerminals: 2,
  };

  getBusinessName(businessId: string): string {
    return (
      this.businesses().find(b => b.id === businessId)?.commercialName || businessId
    );
  }

  registerBusinessBranch(): void {
    if (!this.newBranch.name.trim()) {
      this.feedbackMessage.set('Ingresa el nombre del nuevo Local o Sucursal del negocio.');
      return;
    }

    const nextIdx = this.branches().length + 1;
    const code = `LOC-0${nextIdx}`;
    const createdBranch: BusinessBranch = {
      code,
      businessId: this.newBranch.businessId,
      name: this.newBranch.name.trim(),
      type: this.newBranch.type,
      address: this.newBranch.address.trim() || 'Dirección comercial registrada',
      phone: this.newBranch.phone,
      invoiceSeries: this.newBranch.invoiceSeries || `F00${nextIdx} / B00${nextIdx}`,
      managerUser: this.newBranch.managerUser,
      posTerminals: Number(this.newBranch.posTerminals) || 1,
      status: 'Operativo',
    };

    this.branches.update(list => [...list, createdBranch]);
    const bizName = this.getBusinessName(createdBranch.businessId);
    this.feedbackMessage.set(
      `Local "${createdBranch.name}" (${code}) registrado exitosamente dentro del negocio ${bizName}.`
    );
    this.newBranch.name = '';
    this.newBranch.address = '';
  }
}
