import { Component, OnInit, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DummyDataService } from '../../core/services/dummy-data.service';
import { BeverageCategory } from '../../core/models/domain.models';
import { TablePaginationComponent } from '../../shared/components/pagination/table-pagination.component';

/**
 * @fileoverview Componente para la administración y visualización del listado
 * de categorías y líneas comerciales de productos con filtrado por negocio y paginación.
 *
 * @author Equipo de Arquitectura Frontend
 * @version 2.0.0
 */

/**
 * Componente dedicado al Listado de Líneas y Categorías de Bebidas (`/dashboard/categories`).
 * Permite explorar las familias de productos, códigos y atributos de clasificación por negocio.
 */
@Component({
  selector: 'app-categories-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, TablePaginationComponent],
  templateUrl: './categories-list.component.html',
  styleUrl: './categories-list.component.scss',
})
export class CategoriesListComponent implements OnInit {
  private readonly dummyData = inject(DummyDataService);

  /** Información del Negocio actual activo */
  readonly businessInfo = this.dummyData.businessInfo;

  /** Catálogo de Negocios disponibles para filtro de Superusuario */
  readonly businesses = this.dummyData.businesses;

  /** Perfil del usuario actualmente autenticado */
  readonly currentUserProfile = this.dummyData.currentUserProfile;

  /** Señal computada que indica si el usuario posee privilegios de Administrador General */
  readonly isGeneralAdmin = this.dummyData.isGeneralAdmin;

  /** Lista reactiva de categorías de bebidas */
  readonly categories = this.dummyData.categories;

  /** Código del negocio seleccionado para filtrar ('ALL' para todos) */
  readonly filterBusinessCode = signal<string>('ALL');

  /** Tamaño de página estándar */
  readonly pageSize = 15;

  /** Página activa actual */
  readonly currentPage = signal<number>(1);

  constructor() {
    // Sincronizar automáticamente el filtro y resetear paginación
    effect(() => {
      this.filterBusinessCode();
      this.currentPage.set(1);
    });
  }

  ngOnInit(): void {
    this.dummyData.loadAllFromBackend();
  }

  /**
   * Lista computada de categorías filtradas según el alcance de rol:
   * - Usuario de Negocio: solo ve las categorías de su propio negocio asignado.
   * - Administrador General: puede filtrar por negocio o ver todas.
   */
  readonly filteredCategories = computed<BeverageCategory[]>(() => {
    const filterBiz = this.filterBusinessCode();
    let list: BeverageCategory[] = this.categories();

    if (!this.isGeneralAdmin()) {
      const myBiz = (this.businessInfo().id || this.currentUserProfile().assignedBusinessId || 'BIZ-001').toUpperCase();
      return list.filter(c => {
        const bCode = (c.businessCode || '').toUpperCase();
        const bId = (c.businessId || '').toUpperCase();
        return !c.businessCode || bCode === myBiz || bId === myBiz;
      });
    } else if (filterBiz && filterBiz !== 'ALL') {
      const target = filterBiz.toUpperCase();
      return list.filter(c => {
        const bCode = (c.businessCode || '').toUpperCase();
        const bId = (c.businessId || '').toUpperCase();
        return bCode === target || bId === target;
      });
    }

    return list;
  });

  /** Subconjunto paginado a 15 registros por página */
  readonly pagedCategories = computed<BeverageCategory[]>(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.filteredCategories().slice(start, start + this.pageSize);
  });
}
