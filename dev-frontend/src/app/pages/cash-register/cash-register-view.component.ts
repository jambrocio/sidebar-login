import { Component, OnInit, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DummyDataService } from '../../core/services/dummy-data.service';
import { CashRegisterAudit, FeedbackNotification, resolveCurrencySymbol } from '../../core/models/domain.models';
import { TablePaginationComponent } from '../../shared/components/pagination/table-pagination.component';
import { AppDatePipe } from '../../shared/pipes/app-date.pipe';
import { AppAmountPipe } from '../../shared/pipes/app-amount.pipe';
import { formatAmount, formatCurrentDateTime } from '../../core/utils/formatters';

/**
 * Componente Smart/Container dedicado al Arqueo y Cierre de Caja por Turno (`/dashboard/cash-register`).
 *
 * @description Permite a los cajeros y supervisores registrar el conteo físico de efectivo,
 * contrastarlo contra el saldo teórico esperado (apertura + ventas en efectivo - gastos de caja)
 * y persistir el acta de cierre con semaforización de diferencias con paginación de 15 por página.
 *
 * @author Equipo de Arquitectura Frontend Senior
 * @version 2.0
 */
@Component({
  selector: 'app-cash-register-view',
  standalone: true,
  imports: [CommonModule, FormsModule, TablePaginationComponent, AppDatePipe, AppAmountPipe],
  templateUrl: './cash-register-view.component.html',
  styleUrl: './cash-register-view.component.scss',
})
export class CashRegisterViewComponent implements OnInit {
  private readonly dummyData = inject(DummyDataService);

  readonly businessInfo = this.dummyData.businessInfo;
  readonly assignedBranch = this.dummyData.assignedBranch;
  readonly currentSessionUser = this.dummyData.currentSessionUser;
  readonly cashAuditsList = this.dummyData.cashAuditsList;
  readonly feedbackMessage = signal<FeedbackNotification | null>(null);
  readonly formSubmitted = signal<boolean>(false);

  /** Término de búsqueda textual para filtrar actas de arqueo */
  readonly searchQuery = signal<string>('');

  /** Filtro por estado de cuadre ('ALL' | 'Cuadre Exacto' | 'Sobrante' | 'Faltante') */
  readonly filterStatus = signal<string>('ALL');

  /** Moneda configurada por defecto para el negocio en sesión */
  readonly defaultBusinessCurrency = computed<string>(() => {
    return this.businessInfo().defaultCurrency || this.businessInfo().currency || 'PEN';
  });

  /** Monedas admitidas por el negocio en sesión */
  readonly availableCurrencies = computed<string[]>(() => {
    if (this.businessInfo().supportedCurrencies && this.businessInfo().supportedCurrencies!.length > 0) {
      return this.businessInfo().supportedCurrencies!;
    }
    const def = this.defaultBusinessCurrency();
    return [def, def === 'PEN' ? 'USD' : 'PEN'];
  });

  /** Moneda seleccionada para el arqueo */
  readonly selectedAuditCurrency = signal<string>('PEN');

  /** Símbolo monetario dinámico según la divisa del arqueo */
  readonly currencySymbol = computed<string>(() => {
    return resolveCurrencySymbol(this.selectedAuditCurrency());
  });

  /** Tamaño de página estándar corporativo (15 registros por página) */
  readonly pageSize = 15;

  /** Página activa actual */
  readonly currentPage = signal<number>(1);

  /**
   * Lista reactiva de arqueos filtrados por búsqueda textual y estado de cuadre.
   */
  readonly filteredCashAudits = computed<CashRegisterAudit[]>(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const st = this.filterStatus();
    let list = this.cashAuditsList();

    if (st !== 'ALL') {
      list = list.filter(a => a.status === st);
    }

    if (!q) {
      return list;
    }

    return list.filter(
      a =>
        (a.id && a.id.toLowerCase().includes(q)) ||
        (a.branchName && a.branchName.toLowerCase().includes(q)) ||
        (a.shift && a.shift.toLowerCase().includes(q)) ||
        (a.cashierUser && a.cashierUser.toLowerCase().includes(q)) ||
        (a.closedAt && a.closedAt.toLowerCase().includes(q))
    );
  });

  /** Arqueos paginados a 15 por página bajo el estándar corporativo */
  readonly pagedCashAudits = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.filteredCashAudits().slice(start, start + this.pageSize);
  });

  newCashAudit = {
    shift: 'Turno Mañana (08:00 - 16:00)',
    openingBalance: null as any,
    cashSales: null as any,
    digitalSales: null as any,
    expenses: null as any,
    countedCash: null as any,
  };

  /** Efectivo teórico esperado en caja calculado reactivamente */
  readonly expectedCash = computed<number>(() => {
    return (
      (Number(this.newCashAudit.openingBalance) || 0) +
      (Number(this.newCashAudit.cashSales) || 0) -
      (Number(this.newCashAudit.expenses) || 0)
    );
  });

  /** Diferencia entre el efectivo físico contado y el saldo teórico esperado */
  readonly cashDifference = computed<number>(() => {
    return +((Number(this.newCashAudit.countedCash) || 0) - this.expectedCash()).toFixed(2);
  });

  /** Veredicto de auditoría de arqueo */
  readonly reconciliationStatus = computed<'Cuadre Exacto' | 'Sobrante' | 'Faltante'>(() => {
    const diff = this.cashDifference();
    if (diff === 0) return 'Cuadre Exacto';
    return diff > 0 ? 'Sobrante' : 'Faltante';
  });

  constructor() {
    effect(() => {
      this.selectedAuditCurrency.set(this.defaultBusinessCurrency());
    });

    // Resetear a página 1 cuando cambia la búsqueda o filtro
    effect(() => {
      this.searchQuery();
      this.filterStatus();
      this.currentPage.set(1);
    });
  }

  ngOnInit(): void {
    this.resetAuditForm();
    this.dummyData.loadAllFromBackend();
  }

  /**
   * Refresca los registros de arqueo desde el servicio centralizado.
   */
  refreshData(): void {
    this.dummyData.loadAllFromBackend();
  }

  resetAuditForm(): void {
    this.formSubmitted.set(false);
    this.newCashAudit = {
      shift: 'Turno Mañana (08:00 - 16:00)',
      openingBalance: null as any,
      cashSales: null as any,
      digitalSales: null as any,
      expenses: null as any,
      countedCash: null as any,
    };
  }

  getExpectedCash(): number {
    return this.expectedCash();
  }

  getCashDifference(): number {
    return this.cashDifference();
  }

  registerCashRegisterClose(): void {
    this.formSubmitted.set(true);

    if (
      this.newCashAudit.openingBalance === null ||
      this.newCashAudit.openingBalance === undefined ||
      this.newCashAudit.countedCash === null ||
      this.newCashAudit.countedCash === undefined ||
      !this.selectedAuditCurrency()
    ) {
      this.feedbackMessage.set({
        text: 'Por favor, completa los campos obligatorios del arqueo marcados en rojo.',
        type: 'warning',
      });
      return;
    }

    const expected = this.getExpectedCash();
    const counted = Number(this.newCashAudit.countedCash) || 0;
    const diff = +(counted - expected).toFixed(2);
    const status =
      diff === 0 ? 'Cuadre Exacto' : diff > 0 ? 'Sobrante' : 'Faltante';

    const auditData: CashRegisterAudit = {
      id: `ARQ-2026-0${this.cashAuditsList().length + 15}`,
      branchName: this.assignedBranch(),
      shift: this.newCashAudit.shift,
      openingBalance: Number(this.newCashAudit.openingBalance),
      cashSales: Number(this.newCashAudit.cashSales),
      digitalSales: Number(this.newCashAudit.digitalSales),
      expenses: Number(this.newCashAudit.expenses),
      expectedCash: expected,
      countedCash: counted,
      difference: diff,
      cashierUser: this.currentSessionUser(),
      status,
      closedAt: formatCurrentDateTime(),
    };

    this.dummyData.closeCashRegister(auditData);

    this.feedbackMessage.set({
      text: `Arqueo de Caja registrado para tu local (${this.assignedBranch()}) — Estado: ${status} (Diferencia: ${this.currencySymbol()} ${formatAmount(diff)}).`,
      type: diff === 0 ? 'success' : 'warning',
    });
    this.resetAuditForm();
  }
}
