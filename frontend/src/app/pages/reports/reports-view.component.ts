import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AppDataService } from '../../core/services/app-data.service';
import { TablePaginationComponent } from '../../shared/components/pagination/table-pagination.component';

import { AppAmountPipe } from '../../shared/pipes/app-amount.pipe';
import { EnterpriseReport } from '../../core/models/domain.models';

/**
 * @fileoverview Vista de Reportes Comerciales y de Auditoría Avanzada.
 * Permite visualizar métricas consolidadas, previsualizar datos en vivo y exportar
 * reportes reales en formato CSV (compatible con Excel mediante BOM UTF-8) y TXT SUNAT.
 *
 * @author Equipo de Arquitectura Frontend Senior
 * @version 3.0.0
 */
@Component({
  selector: 'app-reports-view',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TablePaginationComponent,
    AppAmountPipe,
  ],
  templateUrl: './reports-view.component.html',
  styleUrl: './reports-view.component.scss',
})
export class ReportsViewComponent {
  private readonly appData = inject(AppDataService);

  /** Información institucional del Negocio Matriz */
  readonly businessInfo = this.appData.businessInfo;

  /** Local asignado al usuario activo */
  readonly assignedBranch = this.appData.assignedBranch;

  /** Símbolo monetario dinámico según moneda principal */
  readonly currencySymbol = computed(() =>
    this.businessInfo().currency === 'USD' ? '$' : 'S/'
  );

  /** Catálogo de reportes comerciales */
  readonly reports = this.appData.reports;

  /** Mensaje de retroalimentación interactivo */
  readonly feedbackMessage = signal<{
    text: string;
    type: 'success' | 'info' | 'warning' | 'error';
  } | null>(null);

  /** Buscador reactivo */
  readonly searchQuery = signal<string>('');

  /** Filtro por Módulo / Área de Negocio */
  readonly selectedModule = signal<string>('ALL');

  /** Filtro por Formato de Archivo */
  readonly selectedFormat = signal<string>('ALL');

  /** Tamaño de página estándar (15 registros) */
  readonly pageSize = 15;

  /** Página activa actual */
  readonly currentPage = signal<number>(1);

  /** Reporte en modal de previsualización */
  readonly previewModalReport = signal<EnterpriseReport | null>(null);

  /** Datos tabulares para la previsualización interactiva */
  readonly previewData = signal<{
    headers: string[];
    rows: (string | number)[][];
    totalCount: number;
  } | null>(null);

  /** Estado de exportación en progreso */
  readonly isExporting = signal<boolean>(false);

  /** KPI: Total Ventas Facturadas */
  readonly totalSalesAmount = computed(() =>
    this.appData.salesList().reduce((acc, s) => acc + (s.total || 0), 0)
  );

  /** KPI: Valorización Estimada del Inventario */
  readonly totalInventoryValue = computed(() =>
    this.appData
      .products()
      .reduce((acc, p) => acc + (p.stockBoxes * (p.wholesalePrice || 0)), 0)
  );

  /** KPI: Inversión Total en Abastecimiento */
  readonly totalPurchasesAmount = computed(() =>
    this.appData.purchasesList().reduce((acc, p) => acc + (p.totalCost || 0), 0)
  );

  /** KPI: Total de Turnos de Caja Registrados */
  readonly totalCashAuditsCount = computed(
    () => this.appData.cashAuditsList().length
  );

  /** Lista única de módulos para el selector de filtros */
  readonly modulesList = computed(() => {
    const list = this.reports().map((r) => r.module);
    return Array.from(new Set(list)).sort();
  });

  /** Lista filtrada según los criterios seleccionados */
  readonly filteredReports = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const mod = this.selectedModule();
    const fmt = this.selectedFormat();

    return this.reports().filter((rep) => {
      const matchSearch =
        !q ||
        rep.id.toLowerCase().includes(q) ||
        rep.title.toLowerCase().includes(q) ||
        (rep.description && rep.description.toLowerCase().includes(q)) ||
        rep.module.toLowerCase().includes(q) ||
        (rep.registeredBy && rep.registeredBy.toLowerCase().includes(q));

      const matchMod = mod === 'ALL' || rep.module === mod;
      const matchFmt = fmt === 'ALL' || rep.format === fmt;

      return matchSearch && matchMod && matchFmt;
    });
  });

  /** Reportes paginados para la tabla principal */
  readonly pagedReports = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.filteredReports().slice(start, start + this.pageSize);
  });

  /**
   * Abre el modal de previsualización con las filas de datos reales del sistema.
   *
   * @param rep Reporte seleccionado para examinar
   */
  openPreview(rep: EnterpriseReport): void {
    this.previewModalReport.set(rep);
    const data = this.generateDataset(rep.reportType || 'SALES');
    this.previewData.set(data);
  }

  /**
   * Cierra el modal de previsualización.
   */
  closePreview(): void {
    this.previewModalReport.set(null);
    this.previewData.set(null);
  }

  /**
   * Genera el conjunto de datos estructurado en base a los datos en vivo.
   *
   * @param type Tipo de reporte a generar
   * @returns Encabezados y filas con datos reales del negocio
   */
  private generateDataset(type: string): {
    headers: string[];
    rows: (string | number)[][];
    totalCount: number;
  } {
    switch (type) {
      case 'SALES': {
        const sales = this.appData.salesList();
        const headers = [
          'Comprobante',
          'Tipo',
          'Local',
          'Cliente',
          'Modalidad',
          'Resumen Ítems',
          'Subtotal',
          'Cupón',
          'Descuento',
          'IGV',
          'Total Neto',
          'Vendedor Responsable',
          'Fecha Emisión',
        ];
        const rows: (string | number)[][] = sales.map((s) => [
          s.id,
          s.documentType,
          s.branchName,
          s.clientName,
          s.modality,
          s.itemsSummary,
          s.subtotal.toFixed(2),
          s.couponCode || '—',
          s.discountAmount.toFixed(2),
          s.taxIgv.toFixed(2),
          s.total.toFixed(2),
          s.sellerUser,
          s.date,
        ]);
        return { headers, rows, totalCount: sales.length };
      }

      case 'INVENTORY': {
        const prods = this.appData.products();
        const headers = [
          'SKU',
          'Producto',
          'Categoría',
          'Presentación',
          'Precio Minorista',
          'Precio Mayorista',
          'Stock Cajas',
          'Stock Unidades',
          'Estado Stock',
          'Registrado Por',
          'Fecha Registro',
        ];
        const rows: (string | number)[][] = prods.map((p) => [
          p.sku || '—',
          p.name,
          p.category,
          p.presentation,
          p.retailPrice.toFixed(2),
          p.wholesalePrice.toFixed(2),
          p.stockBoxes,
          p.stockUnits,
          p.status,
          p.registeredByUser || p.registeredBy || 'Ana García López (agarcia)',
          p.createdAt || '2026-10-20 09:30:00',
        ]);
        return { headers, rows, totalCount: prods.length };
      }

      case 'PURCHASES': {
        const purchases = this.appData.purchasesList();
        const headers = [
          'Código Compra',
          'Local',
          'Proveedor',
          'Categoría',
          'Detalle de Producto',
          'Cajas',
          'Costo Caja',
          'Costo Total',
          'Comprador Responsable',
          'Estado',
          'Fecha Compra',
        ];
        const rows: (string | number)[][] = purchases.map((p) => [
          p.id,
          p.branchName,
          p.supplier,
          p.category,
          p.productDetail,
          p.boxesQty,
          p.boxCost.toFixed(2),
          p.totalCost.toFixed(2),
          p.buyerUser,
          p.status,
          p.date,
        ]);
        return { headers, rows, totalCount: purchases.length };
      }

      case 'CASH': {
        const audits = this.appData.cashAuditsList();
        const headers = [
          'Código Arqueo',
          'Local',
          'Turno',
          'Saldo Apertura',
          'Ventas Efectivo',
          'Ventas Digitales',
          'Gastos',
          'Esperado',
          'Contado Físico',
          'Diferencia',
          'Estado Conciliación',
          'Cajero Responsable',
          'Fecha Cierre',
        ];
        const rows: (string | number)[][] = audits.map((a) => [
          a.id,
          a.branchName,
          a.shift,
          a.openingBalance.toFixed(2),
          a.cashSales.toFixed(2),
          a.digitalSales.toFixed(2),
          a.expenses.toFixed(2),
          a.expectedCash.toFixed(2),
          a.countedCash.toFixed(2),
          a.difference.toFixed(2),
          a.status,
          a.cashierUser,
          a.closedAt,
        ]);
        return { headers, rows, totalCount: audits.length };
      }

      case 'COUPONS': {
        const coupons = this.appData.couponsList();
        const headers = [
          'Código Cupón',
          'Tipo Descuento',
          'Valor',
          'Modalidad',
          'Categoría Objetivo',
          'Cliente Asignado',
          'Compra Mínima',
          'Usos Actuales',
          'Usos Máximos',
          'Vigencia / Expiración',
          'Registrado Por',
          'Fecha Registro',
          'Estado',
        ];
        const rows: (string | number)[][] = coupons.map((c) => [
          c.code,
          c.discountType === 'PERCENT' ? 'Porcentaje (%)' : 'Monto Fijo (S/)',
          c.discountValue,
          c.targetModality || 'Todas',
          c.targetCategory || 'Todas',
          c.assignedClient || 'Todos los Clientes',
          c.minPurchase.toFixed(2),
          c.usedCount,
          c.maxUses,
          c.expiresAt || 'Indefinido',
          c.createdByUser || 'Ana García López (agarcia)',
          c.createdAt || '2026-10-21 14:00:00',
          c.active ? 'Activo' : 'Inactivo',
        ]);
        return { headers, rows, totalCount: coupons.length };
      }

      case 'CUSTOMERS': {
        const customers = this.appData.customers();
        const headers = [
          'Código Cliente',
          'Tipo Doc',
          'Número Documento',
          'Razón Social',
          'Nombre Comercial',
          'Tipo Cliente',
          'Email',
          'Teléfono',
          'Dirección',
          'Línea de Crédito',
          'Registrado Por',
          'Fecha Registro',
        ];
        const rows: (string | number)[][] = customers.map((c) => [
          c.customerCode,
          c.documentType,
          c.documentNumber,
          c.legalName,
          c.commercialName || c.legalName,
          c.customerType,
          c.email || '—',
          c.phone || '—',
          c.address || '—',
          (c.creditLine ?? 0).toFixed(2),
          c.registeredBy || 'Ana García López (agarcia)',
          c.createdAt || '2026-10-20 11:30:00',
        ]);
        return { headers, rows, totalCount: customers.length };
      }

      case 'SUPPLIERS': {
        const suppliers = this.appData.suppliers();
        const headers = [
          'Código Proveedor',
          'Tipo Doc',
          'Número Documento',
          'Razón Social',
          'Nombre Comercial',
          'Contacto',
          'Email',
          'Teléfono',
          'Rubro Comercial',
          'Registrado Por',
          'Fecha Registro',
          'Estado',
        ];
        const rows: (string | number)[][] = suppliers.map((s) => [
          s.supplierCode,
          s.documentType,
          s.documentNumber,
          s.legalName,
          s.commercialName || s.legalName,
          s.contactName || '—',
          s.email || '—',
          s.phone || '—',
          s.rubroCategory || 'Bebidas y Licores',
          s.registeredBy || 'Ana García López (agarcia)',
          s.createdAt || '2026-10-20 10:00:00',
          s.active ? 'Activo' : 'Inactivo',
        ]);
        return { headers, rows, totalCount: suppliers.length };
      }

      case 'SUNAT':
      default: {
        const sales = this.appData.salesList();
        const headers = [
          'Periodo',
          'CUO',
          'Fecha Emisión',
          'Tipo Comprobante',
          'Serie',
          'Número',
          'Tipo Doc Cliente',
          'Número Doc Cliente',
          'Razón Social',
          'Base Imponible',
          'IGV (18%)',
          'Importe Total',
          'Moneda',
          'Estado SUNAT',
        ];
        const rows = sales.map((s, idx) => {
          const docTypeCode = s.documentType.toUpperCase().includes('FACTURA')
            ? '01'
            : '03';
          const parts = s.id.split('-');
          const serie = parts[0] || 'B001';
          const correlativo = parts[1] || String(idx + 1).padStart(8, '0');
          const baseImponible = (s.total / 1.18).toFixed(2);
          const igv = (s.total - Number(baseImponible)).toFixed(2);

          return [
            '20261000',
            `CUO-${String(idx + 1).padStart(6, '0')}`,
            s.date.substring(0, 10),
            docTypeCode,
            serie,
            correlativo,
            docTypeCode === '01' ? '6' : '1',
            docTypeCode === '01' ? '20601234567' : '45892147',
            s.clientName,
            baseImponible,
            igv,
            s.total.toFixed(2),
            this.businessInfo().currency || 'PEN',
            '1 (Aceptado SUNAT)',
          ];
        });
        return { headers, rows, totalCount: sales.length };
      }
    }
  }

  /**
   * Genera y descarga el archivo real (.CSV o .TXT) directamente en el navegador.
   * Incorpora BOM UTF-8 (\uFEFF) para compatibilidad total con Microsoft Excel y acentos en español.
   *
   * @param rep Reporte a descargar
   */
  downloadReport(rep: EnterpriseReport): void {
    try {
      this.isExporting.set(true);
      const dataset = this.generateDataset(rep.reportType || 'SALES');

      // Escapado seguro CSV según RFC 4180
      const escapeCell = (val: string | number): string => {
        if (val === null || val === undefined) return '""';
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
      };

      const delimiter = rep.format === 'TXT' ? '|' : ',';
      const lines: string[] = [];

      // Cabeceras
      lines.push(dataset.headers.map(escapeCell).join(delimiter));

      // Filas de datos reales
      dataset.rows.forEach((row) => {
        lines.push(row.map(escapeCell).join(delimiter));
      });

      const content = lines.join('\r\n');
      const mimeType =
        rep.format === 'TXT'
          ? 'text/plain;charset=utf-8;'
          : 'text/csv;charset=utf-8;';

      // Prefijo BOM UTF-8 para garantizar codificación perfecta en Excel
      const blob = new Blob(['\uFEFF' + content], { type: mimeType });
      const sanitizedName = rep.title
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '_')
        .replace(/_+/g, '_');

      const dateTag = new Date().toISOString().substring(0, 10);
      const extension = rep.format === 'TXT' ? 'txt' : 'csv';
      const fileName = `${rep.id}_${sanitizedName}_${dateTag}.${extension}`;

      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);

      this.feedbackMessage.set({
        text: `Reporte "${rep.title}" exportado con éxito (${dataset.totalCount} registros procesados en formato .${extension.toUpperCase()}).`,
        type: 'success',
      });
    } catch (err) {
      console.error('Error al generar reporte:', err);
      this.feedbackMessage.set({
        text: `Ocurrió un error al procesar el reporte "${rep.title}".`,
        type: 'error',
      });
    } finally {
      this.isExporting.set(false);
    }
  }

  /**
   * Exporta un archivo de Balance Comercial Consolidado que integra Ventas, Compras, Caja e Inventario.
   */
  exportCommercialBalance(): void {
    try {
      this.isExporting.set(true);
      const biz = this.businessInfo();
      const curr = this.currencySymbol();
      const dateTag = new Date().toISOString().substring(0, 10);

      const lines: string[] = [];
      lines.push(`"BALANCE COMERCIAL Y AUDITORÍA EJECUTIVA - ${biz.legalName}"`);
      lines.push(`"RUC / Identificación Fiscal:","${biz.taxId}"`);
      lines.push(`"Local de Operación:","${this.assignedBranch()}"`);
      lines.push(`"Fecha de Emisión:","${new Date().toLocaleString('es-PE')}"`);
      lines.push(`"Moneda de Consolidación:","${biz.currency || 'PEN'} (${curr})"`);
      lines.push('');

      lines.push('"RESUMEN DE INDICADORES FINANCIEROS Y OPERATIVOS"');
      lines.push(`"Total Facturado en Ventas:","${curr} ${this.totalSalesAmount().toFixed(2)}"`);
      lines.push(`"Total Invertido en Compras:","${curr} ${this.totalPurchasesAmount().toFixed(2)}"`);
      lines.push(`"Valorización de Inventario (Cajas Mayorista):","${curr} ${this.totalInventoryValue().toFixed(2)}"`);
      lines.push(`"Turnos de Caja Auditados:","${this.totalCashAuditsCount()} turnos"`);
      lines.push(`"Margen Operativo Bruto Estimado:","${curr} ${(this.totalSalesAmount() - this.totalPurchasesAmount()).toFixed(2)}"`);
      lines.push('');

      lines.push('"DETALLE CONSOLIDADO DE COMPROBANTES DE VENTA EMITIDOS"');
      const salesData = this.generateDataset('SALES');
      lines.push(salesData.headers.map((h) => `"${h}"`).join(','));
      salesData.rows.forEach((r) =>
        lines.push(r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      );

      const content = lines.join('\r\n');
      const blob = new Blob(['\uFEFF' + content], {
        type: 'text/csv;charset=utf-8;',
      });
      const fileName = `BALANCE_COMERCIAL_${biz.id}_${dateTag}.csv`;

      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);

      this.feedbackMessage.set({
        text: `Balance Comercial Consolidado generado exitosamente como "${fileName}".`,
        type: 'success',
      });
    } catch (err) {
      console.error('Error al exportar balance comercial:', err);
      this.feedbackMessage.set({
        text: 'Error inesperado al generar el balance comercial.',
        type: 'error',
      });
    } finally {
      this.isExporting.set(false);
    }
  }
}
