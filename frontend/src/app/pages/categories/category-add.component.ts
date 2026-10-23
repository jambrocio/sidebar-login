import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DummyDataService } from '../../core/services/dummy-data.service';

/**
 * Componente dedicado al Registro de Nueva Línea / Categoría de Bebidas (`/dashboard/categories/new`).
 */
@Component({
  selector: 'app-category-add',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './category-add.component.html',
  styleUrl: './category-add.component.scss',
})
export class CategoryAddComponent {
  private readonly dummyData = inject(DummyDataService);

  readonly businessInfo = this.dummyData.businessInfo;
  readonly categories = this.dummyData.categories;
  readonly feedbackMessage = signal<string | null>(null);

  newCategory = {
    name: '',
    slug: '',
    wholesaleMargin: '20% margen mayorista',
  };

  saveCategory(): void {
    if (!this.newCategory.name.trim()) {
      this.feedbackMessage.set('Ingresa el nombre de la línea o categoría de bebidas.');
      return;
    }

    const generatedSlug =
      this.newCategory.slug.trim() ||
      this.newCategory.name.toLowerCase().replace(/\s+/g, '-');

    const catData = {
      code: `LIN-0${this.categories().length + 1}`,
      name: this.newCategory.name,
      slug: generatedSlug,
      totalProducts: 0,
      wholesaleMargin: this.newCategory.wholesaleMargin,
      active: true,
    };

    this.dummyData.addCategory(catData);

    this.feedbackMessage.set(`Categoría "${this.newCategory.name}" guardada en la base de datos.`);
    this.newCategory.name = '';
    this.newCategory.slug = '';
  }
}
