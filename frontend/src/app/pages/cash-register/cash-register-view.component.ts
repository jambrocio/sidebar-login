import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DummyDataService } from '../../core/services/dummy-data.service';
import { CashRegisterAudit } from '../../core/models/domain.models';

/**
 * Componente dedicado al Arqueo y Cierre de Caja por Turno (`/dashboard/cash-register`).
 */
@Component({
  selector: 'app-cash-register-view',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cash-register-view.component.html',
  styleUrl: './cash-register-view.component.scss',
})
export class CashRegisterViewComponent {
  private readonly dummyData = inject(DummyDataService);

  readonly businessInfo = this.dummyData.businessInfo;
  readonly assignedBranch = this.dummyData.assignedBranch;
  readonly currentSessionUser = this.dummyData.currentSessionUser;
  readonly cashAuditsList = this.dummyData.cashAuditsList;
  readonly feedbackMessage = signal<string | null>(null);

  newCashAudit = {
    shift: 'Turno Tarde/Cierre (14:00 - 22:00)',
    openingBalance: 300,
    cashSales: 2450,
    digitalSales: 1380,
    expenses: 120,
    countedCash: 2630,
  };

  getExpectedCash(): number {
    return (
      (Number(this.newCashAudit.openingBalance) || 0) +
      (Number(this.newCashAudit.cashSales) || 0) -
      (Number(this.newCashAudit.expenses) || 0)
    );
  }

  getCashDifference(): number {
    return +((Number(this.newCashAudit.countedCash) || 0) - this.getExpectedCash()).toFixed(2);
  }

  registerCashRegisterClose(): void {
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
      closedAt: 'Ahora mismo',
    };

    this.dummyData.closeCashRegister(auditData);

    this.feedbackMessage.set(
      `Arqueo de Caja registrado en PostgreSQL para tu local (${this.assignedBranch()}) — Estado: ${status}.`
    );
  }
}
