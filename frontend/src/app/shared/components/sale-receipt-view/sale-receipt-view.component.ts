import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { BeverageSale, BusinessProfile } from '../../../core/models/domain.models';

/**
 * Componente presentacional dedicado a la visualización e impresión del
 * Comprobante de Venta Electrónico (`FACTURA ELECTRÓNICA` / `BOLETA DE VENTA ELECTRÓNICA`).
 */
@Component({
  selector: 'app-sale-receipt-view',
  standalone: true,
  imports: [CommonModule, RouterLink],
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
}
