import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DummyDataService } from '../../core/services/dummy-data.service';
import { BeverageProduct } from '../../core/models/domain.models';

/**
 * @fileoverview Componente de Catálogo e Inventario Maestro de Bebidas.
 * Permite la búsqueda reactiva, filtrado por empresa/negocio y visualización
 * detallada del stock y precios por local.
 *
 * @author Equipo de Arquitectura Frontend
 * @version 1.0.0
 */

/**
 * Componente dedicado al Inventario Maestro de Bebidas (`/dashboard/products/list`).
 * Implementa filtrado reactivo mediante Angular Signals y restricción por alcance de rol.
 */
@Component({
  selector: 'app-products-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './products-list.component.html',
  styleUrl: './products-list.component.scss',
})
export class ProductsListComponent {
  private readonly dummyData = inject(DummyDataService);

  /** Información del Negocio actual activo */
  readonly businessInfo = this.dummyData.businessInfo;

  /** Catálogo de Negocios disponibles para filtro de Superusuario */
  readonly businesses = this.dummyData.businesses;

  /** Local asignado al usuario activo */
  readonly assignedBranch = this.dummyData.assignedBranch;

  /** Perfil del usuario actualmente autenticado */
  readonly currentUserProfile = this.dummyData.currentUserProfile;

  /** Señal computada que indica si el usuario posee privilegios de Administrador General */
  readonly isGeneralAdmin = this.dummyData.isGeneralAdmin;

  /** Catálogo global reactivo de productos de bebidas */
  readonly products = this.dummyData.products;

  /** Término de búsqueda textual ingresado por el usuario */
  readonly searchQuery = signal<string>('');

  /** Código del negocio seleccionado para filtrar ('ALL' para todos) */
  readonly filterBusinessCode = signal<string>('ALL');

  /**
   * Lista computada de productos filtrados según:
   * 1. Alcance de rol (Restricción por Negocio asignado si no es Administrador General).
   * 2. Filtro de negocio seleccionado (si es Administrador General).
   * 3. Búsqueda por nombre, SKU o categoría.
   */
  readonly filteredProducts = computed<BeverageProduct[]>(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const filterBiz = this.filterBusinessCode();
    let list: BeverageProduct[] = this.products();

    if (!this.isGeneralAdmin()) {
      const myBiz = (this.currentUserProfile().assignedBusinessId || 'BIZ-001').toUpperCase();
      list = list.filter(p => !p.businessCode || p.businessCode.toUpperCase() === myBiz);
    } else if (filterBiz && filterBiz !== 'ALL') {
      list = list.filter(p => !p.businessCode || p.businessCode.toUpperCase() === filterBiz.toUpperCase());
    }

    if (!q) {
      return list;
    }

    return list.filter(
      p =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
    );
  });
}
