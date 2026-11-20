import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { DummyDataService } from '../../core/services/dummy-data.service';

/**
 * @fileoverview Componente para la administración y visualización del listado
 * de categorías y líneas comerciales de productos.
 *
 * @author Equipo de Arquitectura Frontend
 * @version 1.0.0
 */

/**
 * Componente dedicado al Listado de Líneas y Categorías de Bebidas (`/dashboard/categories`).
 * Permite explorar las familias de productos, códigos y atributos de clasificación.
 */
@Component({
  selector: 'app-categories-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './categories-list.component.html',
  styleUrl: './categories-list.component.scss',
})
export class CategoriesListComponent {
  private readonly dummyData = inject(DummyDataService);

  /** Información del Negocio actual activo */
  readonly businessInfo = this.dummyData.businessInfo;

  /** Lista reactiva de categorías de bebidas */
  readonly categories = this.dummyData.categories;
}
