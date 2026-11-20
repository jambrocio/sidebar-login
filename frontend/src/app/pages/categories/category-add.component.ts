import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DummyDataService } from '../../core/services/dummy-data.service';
import { FeedbackNotification } from '../../core/models/domain.models';

/**
 * Componente Smart/Container para el Registro de Nueva Línea o Categoría (`/dashboard/categories/new`).
 *
 * @description Permite dar de alta familias comerciales de bebidas, definiendo el slug amigable
 * y los márgenes de descuento mayorista vinculados a la empresa matriz.
 *
 * @author Equipo de Arquitectura Frontend Senior
 * @version 2.0
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
  readonly businesses = this.dummyData.businesses;
  readonly availableBusinesses = this.dummyData.availableBusinesses;
  readonly isGeneralAdmin = this.dummyData.isGeneralAdmin;
  readonly currentUserProfile = this.dummyData.currentUserProfile;
  readonly categories = this.dummyData.categories;
  readonly feedbackMessage = signal<FeedbackNotification | null>(null);

  newCategory = {
    name: '',
    slug: '',
    wholesaleMargin: '20% margen mayorista',
    businessCode: this.currentUserProfile().assignedBusinessId || 'BIZ-001',
  };

  saveCategory(): void {
    if (!this.newCategory.name.trim()) {
      this.feedbackMessage.set({
        text: 'Por favor, ingresa el nombre de la categoría de productos.',
        type: 'warning',
      });
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
    this.feedbackMessage.set({
      text: `Línea comercial "${catData.name}" (${catData.code}) registrada exitosamente.`,
      type: 'success',
    });
    this.newCategory.name = '';
    this.newCategory.slug = '';
  }
}
