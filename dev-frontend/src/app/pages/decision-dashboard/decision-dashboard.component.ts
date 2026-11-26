import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  AdminApiService,
  DecisionDashboardResponseDto,
} from '../../core/services/admin-api.service';
import { DummyDataService } from '../../core/services/dummy-data.service';
import { resolveCurrencySymbol } from '../../core/models/domain.models';

/**
 * Componente Smart/Container para el Dashboard Ejecutivo de Toma de Decisiones (`/dashboard/decision-dashboard`).
 *
 * @description Consolida KPIs financieros, tendencias diarias de ventas vs compras,
 * desempeño comparativo por local, productos líderes, categorías y alertas accionables de stock crítico.
 */
@Component({
  selector: 'app-decision-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './decision-dashboard.component.html',
  styleUrl: './decision-dashboard.component.scss',
})
export class DecisionDashboardComponent implements OnInit {
  private readonly adminApi = inject(AdminApiService);
  private readonly appData = inject(DummyDataService);

  readonly businesses = this.appData.businesses;
  readonly businessInfo = this.appData.businessInfo;
  readonly currentUserProfile = this.appData.currentUserProfile;

  readonly isGeneralAdmin = computed<boolean>(() => {
    const roleName = (this.currentUserProfile()?.role || '').trim();
    if (roleName.includes('Negocio') || roleName === 'ADMIN_NEGOCIO') {
      return false;
    }
    return roleName === 'ADMIN' || roleName.includes('Administrador General') || roleName.includes('Superusuario');
  });

  readonly currencySymbol = computed<string>(() =>
    resolveCurrencySymbol(this.businessInfo().defaultCurrency || this.businessInfo().currency)
  );

  readonly selectedDays = signal<number>(30);
  readonly selectedBusinessCode = signal<string>('ALL');
  readonly isLoading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);
  readonly dashboard = signal<DecisionDashboardResponseDto | null>(null);

  readonly maxTrendValue = computed<number>(() => {
    const rows = this.dashboard()?.dailyTrend ?? [];
    let maxVal = 1;
    for (const r of rows) {
      maxVal = Math.max(maxVal, Number(r.sales || 0), Number(r.purchases || 0));
    }
    return maxVal;
  });

  readonly maxBranchRevenue = computed<number>(() => {
    const rows = this.dashboard()?.branchPerformance ?? [];
    let maxVal = 1;
    for (const r of rows) {
      maxVal = Math.max(maxVal, Number(r.revenue || 0));
    }
    return maxVal;
  });

  readonly maxCategoryRevenue = computed<number>(() => {
    const rows = this.dashboard()?.categoryBreakdown ?? [];
    let maxVal = 1;
    for (const r of rows) {
      maxVal = Math.max(maxVal, Number(r.revenue || 0));
    }
    return maxVal;
  });

  /** Recomendaciones automáticas derivadas de los indicadores del período */
  readonly recommendations = computed<Array<{ severity: 'danger' | 'warning' | 'success' | 'info'; title: string; detail: string; route: string; actionLabel: string }>>(() => {
    const data = this.dashboard();
    if (!data) return [];

    const items: Array<{ severity: 'danger' | 'warning' | 'success' | 'info'; title: string; detail: string; route: string; actionLabel: string }> = [];
    const k = data.kpis;

    if ((k.criticalStockCount || 0) > 0) {
      items.push({
        severity: 'danger',
        title: `Reposición urgente: ${k.criticalStockCount} producto(s) en stock crítico`,
        detail: 'Hay SKUs por debajo o igual al stock mínimo. Conviene emitir una orden de compra para evitar quiebres de venta.',
        route: '/dashboard/purchases',
        actionLabel: 'Ir a Compras',
      });
    } else {
      items.push({
        severity: 'success',
        title: 'Inventario saludable sin quiebres de stock',
        detail: 'Todos los productos activos mantienen existencias por encima del mínimo configurado.',
        route: '/dashboard/products/list',
        actionLabel: 'Ver Inventario',
      });
    }

    if (Number(k.marginPercent || 0) < 15 && Number(k.totalRevenue || 0) > 0) {
      items.push({
        severity: 'warning',
        title: `Margen neto ajustado (${k.marginPercent}%)`,
        detail: 'La relación ingresos vs compras está por debajo del 15%. Revisá costos de proveedores o campañas de cupones.',
        route: '/dashboard/suppliers',
        actionLabel: 'Revisar Proveedores',
      });
    } else if (Number(k.totalRevenue || 0) > 0) {
      items.push({
        severity: 'info',
        title: `Margen operativo favorable (${k.marginPercent}%)`,
        detail: `Los ingresos del período superan las compras en ${this.currencySymbol()} ${Number(k.estimatedMargin || 0).toFixed(2)}.`,
        route: '/dashboard/sales-history',
        actionLabel: 'Ver Historial',
      });
    }

    if (data.branchPerformance.length > 1) {
      const leader = data.branchPerformance[0];
      const trailing = data.branchPerformance[data.branchPerformance.length - 1];
      if (Number(leader.revenue || 0) > 0 && Number(trailing.revenue || 0) < Number(leader.revenue) * 0.4) {
        items.push({
          severity: 'warning',
          title: `Brecha de ventas entre sedes (${leader.code} vs ${trailing.code})`,
          detail: `${leader.name} lidera con ${this.currencySymbol()} ${Number(leader.revenue).toFixed(2)}, mientras ${trailing.name} registra menor tracción.`,
          route: '/dashboard/branches',
          actionLabel: 'Ver Locales',
        });
      }
    }

    return items;
  });

  ngOnInit(): void {
    if (!this.isGeneralAdmin()) {
      this.selectedBusinessCode.set(this.currentUserProfile()?.assignedBusinessId || 'BIZ-001');
    }
    this.loadDashboard();
  }

  /**
   * Consulta las métricas consolidadas desde el backend según filtros activos.
   */
  loadDashboard(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    const bizFilter = this.isGeneralAdmin() ? this.selectedBusinessCode() : undefined;
    this.adminApi.getDecisionDashboard(this.selectedDays(), bizFilter).subscribe({
      next: res => {
        this.isLoading.set(false);
        this.dashboard.set(res);
      },
      error: err => {
        this.isLoading.set(false);
        this.errorMessage.set(err?.error?.detail || err?.message || 'No se pudo cargar el dashboard de toma de decisiones.');
      },
    });
  }

  changePeriod(days: number): void {
    this.selectedDays.set(days);
    this.loadDashboard();
  }

  changeBusiness(code: string): void {
    this.selectedBusinessCode.set(code);
    this.loadDashboard();
  }

  barHeightPercent(value: number, maxValue: number): number {
    if (!maxValue || maxValue <= 0) return 0;
    return Math.min(100, Math.max(4, Math.round((Number(value || 0) / maxValue) * 100)));
  }

  /**
   * Exporta un resumen ejecutivo en CSV (UTF-8 con BOM) para análisis en Excel.
   */
  exportExecutiveCsv(): void {
    const data = this.dashboard();
    if (!data) return;

    const lines: string[] = [
      'Seccion,Concepto,Valor 1,Valor 2',
      `KPI,Ingresos Totales (${this.currencySymbol()}),${data.kpis.totalRevenue},Ventas: ${data.kpis.totalSales}`,
      `KPI,Compras Totales (${this.currencySymbol()}),${data.kpis.totalPurchasesAmount},Ordenes: ${data.kpis.totalPurchases}`,
      `KPI,Margen Estimado (${this.currencySymbol()}),${data.kpis.estimatedMargin},${data.kpis.marginPercent}%`,
      `KPI,Ticket Promedio (${this.currencySymbol()}),${data.kpis.averageTicket},`,
      `KPI,Productos Stock Critico,${data.kpis.criticalStockCount},Valoracion: ${data.kpis.inventoryValuation}`,
      '',
      'Local,Codigo,Ventas,Ingresos',
      ...data.branchPerformance.map(b => `"${b.name}",${b.code},${b.salesCount},${b.revenue}`),
      '',
      'Top Producto,SKU,Unidades,Ingresos',
      ...data.topProducts.map(p => `"${p.name}",${p.sku},${p.unitsSold},${p.revenue}`),
    ];

    const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `dashboard_decisiones_${data.businessCode}_${data.days}d.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }
}
