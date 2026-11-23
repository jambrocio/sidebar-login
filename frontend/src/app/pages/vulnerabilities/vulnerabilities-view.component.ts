import { Component, OnInit, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DummyDataService } from '../../core/services/dummy-data.service';
import { SecurityVulnerability, FeedbackNotification } from '../../core/models/domain.models';
import { TablePaginationComponent } from '../../shared/components/pagination/table-pagination.component';

/**
 * Componente corporativo para la Auditoría, Registro y Seguimiento de Vulnerabilidades de Seguridad.
 * Materializa los hallazgos identificados por el marco de ciberseguridad defensiva (Skill Cybersecurity Senior).
 */
@Component({
  selector: 'app-vulnerabilities-view',
  standalone: true,
  imports: [CommonModule, FormsModule, TablePaginationComponent],
  templateUrl: './vulnerabilities-view.component.html',
  styleUrls: ['./vulnerabilities-view.component.scss'],
})
export class VulnerabilitiesViewComponent implements OnInit {
  readonly dummyData = inject(DummyDataService);

  /** Listado reactivo de vulnerabilidades desde la base de datos */
  readonly vulnerabilitiesList = this.dummyData.vulnerabilitiesList;

  /** Usuario autenticado en sesión */
  readonly currentSessionUser = this.dummyData.currentSessionUser;

  /** Información del Negocio Matriz */
  readonly businessInfo = this.dummyData.businessInfo;

  /** Filtro de búsqueda textual */
  readonly searchQuery = signal<string>('');

  /** Filtro por Severidad: 'ALL' | 'CRITICA' | 'ALTA' | 'MEDIA' | 'BAJA' | 'INFORMATIVA' */
  readonly filterSeverity = signal<string>('ALL');

  /** Filtro por Estado: 'ALL' | 'ABIERTO' | 'EN_PROCESO' | 'MITIGADO' | 'FALSO_POSITIVO' */
  readonly filterStatus = signal<string>('ALL');

  /** Paginación estándar corporativa (15 registros) */
  readonly pageSize = 15;
  readonly currentPage = signal<number>(1);

  /** Mensaje de retroalimentación de la interfaz */
  readonly feedbackMessage = signal<FeedbackNotification | null>(null);

  /** Estado de validación del formulario */
  readonly formSubmitted = signal<boolean>(false);

  /** Categorías predefinidas basadas en OWASP Top 10 y CIS Benchmarks */
  readonly categoriesList: string[] = [
    'A01: Pérdida de Control de Acceso (Broken Access Control)',
    'A02: Fallas Criptográficas (Cryptographic Failures)',
    'A03: Inyección (Injection Flaws)',
    'A04: Diseño Inseguro (Insecure Design)',
    'A05: Configuración de Seguridad Defectuosa (Security Misconfiguration)',
    'A06: Componentes Vulnerables y Obsoletos (SCA / Dependencies)',
    'A07: Fallas de Identificación y Autenticación',
    'A08: Fallas de Integridad de Software y Datos',
    'A09: Fallas en Registro y Monitoreo de Seguridad (SIEM)',
    'A10: Falsificación de Solicitudes Servidor (SSRF)',
    'Seguridad en Contenedores Docker (CIS Benchmarks)',
    'Seguridad en Redes y Proxy TLS (Nginx / SSL)',
    'Endurecimiento de Base de Datos (PostgreSQL Least Privilege)',
    'Seguridad Frontend (XSS / Sanitización de Entrada)',
  ];

  /** Modelo para el nuevo hallazgo */
  newVuln = {
    code: '',
    title: '',
    category: 'A05: Configuración de Seguridad Defectuosa (Security Misconfiguration)',
    severity: 'ALTA' as 'CRITICA' | 'ALTA' | 'MEDIA' | 'BAJA' | 'INFORMATIVA',
    affectedComponent: '',
    description: '',
    estimatedImpact: '',
    remediationPlan: '',
  };

  /** KPIs reactivos de postura de seguridad */
  readonly totalCount = computed(() => this.vulnerabilitiesList().length);

  readonly criticalAndHighPending = computed(() =>
    this.vulnerabilitiesList().filter(
      v => (v.severity === 'CRITICA' || v.severity === 'ALTA') &&
           (v.status === 'ABIERTO' || v.status === 'EN_PROCESO')
    ).length
  );

  readonly inProgressCount = computed(() =>
    this.vulnerabilitiesList().filter(v => v.status === 'EN_PROCESO').length
  );

  readonly mitigatedCount = computed(() =>
    this.vulnerabilitiesList().filter(v => v.status === 'MITIGADO').length
  );

  readonly mitigationRate = computed(() => {
    const total = this.totalCount();
    if (total === 0) return 100;
    return Math.round((this.mitigatedCount() / total) * 100);
  });

  /** Listado reactivo filtrado */
  readonly filteredVulnerabilities = computed<SecurityVulnerability[]>(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const sev = this.filterSeverity();
    const st = this.filterStatus();
    let list = this.vulnerabilitiesList();

    if (sev !== 'ALL') {
      list = list.filter(v => v.severity === sev);
    }

    if (st !== 'ALL') {
      list = list.filter(v => v.status === st);
    }

    if (!q) {
      return list;
    }

    return list.filter(
      v =>
        (v.code && v.code.toLowerCase().includes(q)) ||
        (v.title && v.title.toLowerCase().includes(q)) ||
        (v.category && v.category.toLowerCase().includes(q)) ||
        (v.affectedComponent && v.affectedComponent.toLowerCase().includes(q)) ||
        (v.reportedByUser && v.reportedByUser.toLowerCase().includes(q))
    );
  });

  /** Listado paginado a 15 elementos por página */
  readonly pagedVulnerabilities = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.filteredVulnerabilities().slice(start, start + this.pageSize);
  });

  constructor() {
    // Resetear a página 1 cuando cambien filtros o búsqueda
    effect(() => {
      this.searchQuery();
      this.filterSeverity();
      this.filterStatus();
      this.currentPage.set(1);
    });
  }

  ngOnInit(): void {
    this.resetForm();
    this.dummyData.loadAllFromBackend();
  }

  refreshData(): void {
    this.dummyData.loadAllFromBackend();
  }

  resetForm(): void {
    this.formSubmitted.set(false);
    this.newVuln = {
      code: this.generateUniqueCode(),
      title: '',
      category: 'A05: Configuración de Seguridad Defectuosa (Security Misconfiguration)',
      severity: 'ALTA',
      affectedComponent: '',
      description: '',
      estimatedImpact: '',
      remediationPlan: '',
    };
  }

  /**
   * Genera un código correlativo único en formato SEC-2026-XXXXX
   */
  generateUniqueCode(): string {
    const year = new Date().getFullYear();
    const existing = new Set(this.vulnerabilitiesList().map(v => v.code.toUpperCase()));
    const chars = '0123456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    let code = '';
    let attempts = 0;

    do {
      let suffix = '';
      for (let i = 0; i < 4; i++) {
        suffix += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      code = `SEC-${year}-${suffix}`;
      attempts++;
    } while (existing.has(code) && attempts < 100);

    return code;
  }

  saveVulnerability(): void {
    this.formSubmitted.set(true);
    const cleanCode = this.newVuln.code.trim().toUpperCase();
    const cleanTitle = this.newVuln.title.trim();
    const cleanComponent = this.newVuln.affectedComponent.trim();
    const cleanDesc = this.newVuln.description.trim();
    const cleanRemediation = this.newVuln.remediationPlan.trim();

    if (!cleanCode || !cleanTitle || !cleanComponent || !cleanDesc || !cleanRemediation) {
      this.feedbackMessage.set({
        text: 'Por favor completa todos los campos requeridos del hallazgo de seguridad.',
        type: 'warning',
      });
      return;
    }

    // Validación preventiva de unicidad
    if (this.vulnerabilitiesList().some(v => v.code && v.code.trim().toUpperCase() === cleanCode)) {
      this.feedbackMessage.set({
        text: `El código de hallazgo "${cleanCode}" ya existe en la base de datos. Se requiere un código único.`,
        type: 'error',
      });
      return;
    }

    const payload: SecurityVulnerability = {
      code: cleanCode,
      title: cleanTitle,
      category: this.newVuln.category,
      severity: this.newVuln.severity,
      status: 'ABIERTO',
      affectedComponent: cleanComponent,
      description: cleanDesc,
      estimatedImpact: this.newVuln.estimatedImpact.trim() || undefined,
      remediationPlan: cleanRemediation,
      reportedByUser: this.currentSessionUser(),
      detectionDate: new Date().toISOString().replace('T', ' ').substring(0, 19),
    };

    this.dummyData.addVulnerability(
      payload,
      () => {
        this.feedbackMessage.set({
          text: `Hallazgo "${cleanCode}" registrado exitosamente en la base de datos de seguridad por ${this.currentSessionUser()}.`,
          type: 'success',
        });
        this.resetForm();
      },
      (err: any) => {
        const detail = err?.error?.detail || err?.error?.title || err?.message || 'Error al registrar la vulnerabilidad.';
        this.feedbackMessage.set({
          text: `No se pudo registrar: ${detail}`,
          type: 'error',
        });
      }
    );
  }

  changeStatus(vuln: SecurityVulnerability, newStatus: 'ABIERTO' | 'EN_PROCESO' | 'MITIGADO' | 'FALSO_POSITIVO'): void {
    if (!vuln.id) return;
    this.dummyData.updateVulnerabilityStatus(
      vuln.id,
      newStatus,
      () => {
        this.feedbackMessage.set({
          text: `El hallazgo ${vuln.code} cambió su estado a "${newStatus}".`,
          type: 'info',
        });
      },
      (err: any) => {
        this.feedbackMessage.set({
          text: `Error al actualizar estado: ${err?.error?.detail || err?.message}`,
          type: 'error',
        });
      }
    );
  }
}
