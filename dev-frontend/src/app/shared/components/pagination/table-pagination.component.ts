import { Component, EventEmitter, Input, Output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Componente Reutilizable de Paginación para Tablas y Listados de Datos.
 *
 * @description Proporciona navegación estándar (15 registros por página por defecto),
 * visualización de rangos ("Mostrando X - Y de Z registros") y controles de página accesibles.
 *
 * @author Equipo de Arquitectura Frontend Senior
 * @version 1.0.0
 */
@Component({
  selector: 'app-table-pagination',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './table-pagination.component.html',
  styleUrl: './table-pagination.component.scss',
})
export class TablePaginationComponent {
  /** Cantidad total de registros filtrados */
  @Input() totalItems: number = 0;

  /** Tamaño de página (por requerimiento corporativo: 15 registros por página) */
  @Input() pageSize: number = 15;

  /** Página activa actual (índice 1-based) */
  @Input() currentPage: number = 1;

  /** Emite el nuevo número de página al navegar */
  @Output() pageChange = new EventEmitter<number>();

  /** Total de páginas calculadas */
  get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalItems / this.pageSize));
  }

  /** Índice del primer ítem en la página actual */
  get startItem(): number {
    if (this.totalItems === 0) return 0;
    return (this.currentPage - 1) * this.pageSize + 1;
  }

  /** Índice del último ítem en la página actual */
  get endItem(): number {
    return Math.min(this.currentPage * this.pageSize, this.totalItems);
  }

  /** Indica si se puede retroceder de página */
  get canPrev(): boolean {
    return this.currentPage > 1;
  }

  /** Indica si se puede avanzar de página */
  get canNext(): boolean {
    return this.currentPage < this.totalPages;
  }

  /** Lista visible de números de página para navegación con truncamiento inteligente */
  get pages(): (number | string)[] {
    const total = this.totalPages;
    const current = this.currentPage;

    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }

    if (current <= 4) {
      return [1, 2, 3, 4, 5, '...', total];
    }

    if (current >= total - 3) {
      return [1, '...', total - 4, total - 3, total - 2, total - 1, total];
    }

    return [1, '...', current - 1, current, current + 1, '...', total];
  }

  onSelectPage(page: number | string): void {
    if (typeof page === 'number' && page >= 1 && page <= this.totalPages && page !== this.currentPage) {
      this.pageChange.emit(page);
    }
  }

  onPrev(): void {
    if (this.canPrev) {
      this.pageChange.emit(this.currentPage - 1);
    }
  }

  onNext(): void {
    if (this.canNext) {
      this.pageChange.emit(this.currentPage + 1);
    }
  }
}
