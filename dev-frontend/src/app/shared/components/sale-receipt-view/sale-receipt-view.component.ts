import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { BeverageSale, BusinessProfile } from '../../../core/models/domain.models';
import { AppDatePipe } from '../../pipes/app-date.pipe';
import { AppAmountPipe } from '../../pipes/app-amount.pipe';

/**
 * Componente presentacional dedicado a la visualización e impresión del
 * Comprobante de Venta Electrónico (`FACTURA ELECTRÓNICA` / `BOLETA DE VENTA ELECTRÓNICA`).
 * Soporta emisión estándar A4 y formato para ticketera térmica de 80mm / 58mm.
 */
@Component({
  selector: 'app-sale-receipt-view',
  standalone: true,
  imports: [CommonModule, RouterLink, AppDatePipe, AppAmountPipe],
  templateUrl: './sale-receipt-view.component.html',
  styleUrl: './sale-receipt-view.component.scss',
})
export class SaleReceiptViewComponent {
  /** Comprobante de venta a renderizar */
  @Input({ required: true }) receipt!: BeverageSale;

  /** Información del Negocio Matriz emisor */
  @Input({ required: true }) business!: BusinessProfile;

  /** Indica si se muestra el botón rápido hacia Historial de Ventas */
  @Input() showHistoryShortcut = false;

  /** Evento emitido al cerrar la vista del comprobante */
  @Output() readonly closed = new EventEmitter<void>();

  /** Evento emitido al solicitar impresión / descarga PDF */
  @Output() readonly printRequested = new EventEmitter<string>();

  /** Alterna la vista previa interactiva del ticket en pantalla */
  showTicketPreview = false;

  get currencySymbol(): string {
    const cur = this.business?.defaultCurrency || this.business?.currency;
    return cur === 'PEN' ? 'S/' : '$';
  }

  /**
   * Subtotal del comprobante calculado estrictamente como la resta del Importe Total - IGV.
   * Cumple con la regla contable: Subtotal = Importe Total - IGV.
   */
  get receiptSubtotal(): number {
    const total = Number(this.receipt?.total) || 0;
    const igv = Number(this.receipt?.taxIgv) || 0;
    return Math.max(0, +(total - igv).toFixed(2));
  }

  /**
   * Obtiene la colección de ítems normalizada de la venta, deserializando
   * de forma segura si los datos provienen de un string JSON o estructura PGobject.
   */
  get receiptItems(): any[] {
    const raw = this.receipt?.items;
    if (Array.isArray(raw)) return raw;
    if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    if (raw && typeof raw === 'object' && typeof (raw as any).value === 'string') {
      try {
        const parsed = JSON.parse((raw as any).value);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  }

  toggleTicketPreview(): void {
    this.showTicketPreview = !this.showTicketPreview;
  }

  /**
   * Imprime directamente el ticket en formato de ticketera térmica (80mm).
   * Genera un marco aislado con los estilos exactos de impresión de punto de venta.
   */
  printThermalTicket(): void {
    this.printRequested.emit(this.receipt.id);

    const ticketElement = document.getElementById(`thermal-ticket-${this.receipt.id}`);
    if (!ticketElement) {
      window.print();
      return;
    }

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.setAttribute('title', 'Ticket de Venta Seguro');
    iframe.setAttribute('sandbox', 'allow-modals allow-same-origin allow-scripts');
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      window.print();
      return;
    }

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Ticket_${this.receipt.id}</title>
          <style>
            @page {
              size: 80mm auto;
              margin: 0mm;
            }
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
            }
            body {
              font-family: 'Courier New', Courier, monospace, sans-serif;
              font-size: 11px;
              line-height: 1.25;
              color: #000000;
              background: #ffffff;
              width: 74mm;
              margin: 0 auto;
              padding: 4mm 2mm;
            }
            .ticket-header, .ticket-footer {
              text-align: center;
            }
            .ticket-title {
              font-size: 13px;
              font-weight: bold;
              text-transform: uppercase;
              margin-bottom: 2px;
            }
            .ticket-subtitle {
              font-size: 10px;
              margin-bottom: 2px;
            }
            .ticket-separator {
              border-top: 1px dashed #000000;
              margin: 5px 0;
            }
            .ticket-double-separator {
              border-top: 2px solid #000000;
              margin: 5px 0;
            }
            .ticket-info-row {
              display: flex;
              justify-content: space-between;
              font-size: 10px;
              margin-bottom: 2px;
            }
            .ticket-table {
              width: 100%;
              border-collapse: collapse;
              font-size: 10px;
              margin: 4px 0;
            }
            .ticket-table th {
              text-align: left;
              border-bottom: 1px dashed #000000;
              padding: 3px 0;
            }
            .ticket-table td {
              padding: 3px 0;
              vertical-align: top;
            }
            .ticket-item-qty {
              width: 15%;
              font-weight: bold;
            }
            .ticket-item-desc {
              width: 55%;
            }
            .ticket-item-price {
              width: 30%;
              text-align: right;
              font-weight: bold;
            }
            .ticket-totals {
              width: 100%;
              font-size: 11px;
              margin-top: 4px;
            }
            .ticket-total-row {
              display: flex;
              justify-content: space-between;
              padding: 2px 0;
            }
            .ticket-grand-total {
              font-size: 13px;
              font-weight: bold;
              padding-top: 4px;
              border-top: 1px dashed #000000;
            }
            .ticket-footer {
              margin-top: 8px;
              font-size: 10px;
            }
          </style>
        </head>
        <body>
          ${ticketElement.innerHTML}
        </body>
      </html>
    `);
    doc.close();

    iframe.contentWindow?.focus();
    setTimeout(() => {
      iframe.contentWindow?.print();
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 1500);
    }, 300);
  }

  /**
   * Imprime la vista de comprobante estándar / A4.
   * Aísla el ticket en un iframe dedicado para evitar que se impriman las opciones
   * de menú, barras laterales u otros elementos de la interfaz web.
   */
  printFullReceipt(): void {
    this.printRequested.emit(this.receipt.id);

    const ticketElement = document.getElementById(`thermal-ticket-${this.receipt.id}`);
    if (!ticketElement) {
      window.print();
      return;
    }

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.setAttribute('title', 'Ticket de Venta Seguro');
    iframe.setAttribute('sandbox', 'allow-modals allow-same-origin allow-scripts');
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      window.print();
      return;
    }

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Comprobante_${this.receipt.id}</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 15mm;
            }
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, monospace, sans-serif;
              font-size: 12px;
              line-height: 1.45;
              color: #000000;
              background: #ffffff;
              width: 100%;
              max-width: 480px;
              margin: 20px auto;
              padding: 24px;
              border: 1px solid #1f2937;
              border-radius: 8px;
            }
            .ticket-header, .ticket-footer {
              text-align: center;
            }
            .ticket-title {
              font-size: 15px;
              font-weight: bold;
              text-transform: uppercase;
              margin-bottom: 3px;
              letter-spacing: 0.5px;
            }
            .ticket-subtitle {
              font-size: 12px;
              margin-bottom: 3px;
              color: #1f2937;
            }
            .ticket-separator {
              border-top: 1px dashed #4b5563;
              margin: 10px 0;
            }
            .ticket-double-separator {
              border-top: 2px solid #111827;
              margin: 10px 0;
            }
            .ticket-info-row {
              display: flex;
              justify-content: space-between;
              font-size: 11px;
              margin-bottom: 4px;
            }
            .ticket-table {
              width: 100%;
              border-collapse: collapse;
              font-size: 11px;
              margin: 8px 0;
            }
            .ticket-table th {
              text-align: left;
              border-bottom: 1px dashed #000000;
              padding: 6px 0;
              font-weight: bold;
            }
            .ticket-table td {
              padding: 5px 0;
              vertical-align: top;
            }
            .ticket-item-qty {
              width: 15%;
              font-weight: bold;
            }
            .ticket-item-desc {
              width: 55%;
            }
            .ticket-item-price {
              width: 30%;
              text-align: right;
              font-weight: bold;
            }
            .ticket-totals {
              width: 100%;
              font-size: 12px;
              margin-top: 6px;
            }
            .ticket-total-row {
              display: flex;
              justify-content: space-between;
              padding: 3px 0;
            }
            .ticket-grand-total {
              font-size: 16px;
              font-weight: bold;
              padding-top: 8px;
              border-top: 1px dashed #000000;
              margin-top: 4px;
            }
            .ticket-footer {
              margin-top: 16px;
              font-size: 11px;
              color: #374151;
            }
          </style>
        </head>
        <body>
          ${ticketElement.innerHTML}
        </body>
      </html>
    `);
    doc.close();

    iframe.contentWindow?.focus();
    setTimeout(() => {
      iframe.contentWindow?.print();
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 1500);
    }, 300);
  }
}
