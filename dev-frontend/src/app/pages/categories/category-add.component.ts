import { Component, OnInit, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DummyDataService } from '../../core/services/dummy-data.service';
import { BeverageCategory, FeedbackNotification } from '../../core/models/domain.models';

/**
 * Componente Smart/Container para el Registro de Nueva Línea o Categoría (`/dashboard/categories/new`).
 *
 * @description Permite dar de alta familias comerciales de bebidas, asegurando la unicidad
 * por negocio y vinculándolas a la empresa matriz correspondiente.
 *
 * @author Equipo de Arquitectura Frontend Senior
 * @version 2.2
 */
@Component({
  selector: 'app-category-add',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './category-add.component.html',
  styleUrl: './category-add.component.scss',
})
export class CategoryAddComponent implements OnInit {
  private readonly dummyData = inject(DummyDataService);

  readonly businessInfo = this.dummyData.businessInfo;
  readonly businesses = this.dummyData.businesses;
  readonly availableBusinesses = this.dummyData.availableBusinesses;
  readonly isGeneralAdmin = this.dummyData.isGeneralAdmin;
  readonly currentUserProfile = this.dummyData.currentUserProfile;
  readonly categories = this.dummyData.categories;
  readonly feedbackMessage = signal<FeedbackNotification | null>(null);
  readonly formSubmitted = signal<boolean>(false);

  newCategory = {
    name: '',
    slug: '',
    wholesaleMargin: '',
    businessCode: this.businessInfo().id || this.currentUserProfile().assignedBusinessId || 'BIZ-001',
  };

  constructor() {
    effect(() => {
      const activeBiz = this.businessInfo().id;
      if (activeBiz && this.isGeneralAdmin()) {
        this.newCategory.businessCode = activeBiz;
      }
    });
  }

  ngOnInit(): void {
    this.resetCategoryForm();
    this.dummyData.loadAllFromBackend();
  }

  resetCategoryForm(): void {
    this.formSubmitted.set(false);
    const defaultBiz = this.businessInfo().id || this.currentUserProfile().assignedBusinessId || 'BIZ-001';
    this.newCategory = {
      name: '',
      slug: '',
      wholesaleMargin: '',
      businessCode: defaultBiz,
    };
  }

  saveCategory(): void {
    this.formSubmitted.set(true);
    const trimmedName = this.newCategory.name.trim();
    if (!trimmedName) {
      this.feedbackMessage.set({
        text: 'Por favor, ingresa el nombre de la categoría (campo obligatorio resaltado en rojo).',
        type: 'warning',
      });
      return;
    }

    // Si NO es Administrador General, forzar siempre su propio negocio asignado
    if (!this.isGeneralAdmin()) {
      this.newCategory.businessCode = this.businessInfo().id || this.currentUserProfile().assignedBusinessId || 'BIZ-001';
    }

    const targetBizCode = (this.newCategory.businessCode || 'BIZ-001').toUpperCase();

    // Validar unicidad de la categoría por negocio (case-insensitive)
    const alreadyExists = this.categories().some(c =>
      (c.businessCode || '').toUpperCase() === targetBizCode &&
      c.name.trim().toUpperCase() === trimmedName.toUpperCase()
    );

    if (alreadyExists) {
      const bizObj = this.businesses().find(b => b.id?.toUpperCase() === targetBizCode);
      const bizName = bizObj?.commercialName || bizObj?.legalName || targetBizCode;
      this.feedbackMessage.set({
        text: `Ya existe la categoría "${trimmedName}" registrada para el negocio "${bizName}". El registro de categorías debe ser único por negocio.`,
        type: 'warning',
      });
      return;
    }

    const generatedSlug =
      this.newCategory.slug.trim() ||
      trimmedName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    const bizCount = this.categories().filter(c => (c.businessCode || '').toUpperCase() === targetBizCode).length;
    const catCode = `LIN-0${bizCount + 1}`;

    const catData: BeverageCategory = {
      code: catCode,
      name: trimmedName,
      slug: generatedSlug,
      totalProducts: 0,
      wholesaleMargin: this.newCategory.wholesaleMargin,
      active: true,
      businessCode: targetBizCode,
    };

    this.dummyData.addCategory(catData);

    const bizObj = this.businesses().find(b => b.id?.toUpperCase() === targetBizCode);
    const bizName = bizObj?.commercialName || bizObj?.legalName || targetBizCode;

    this.feedbackMessage.set({
      text: `Línea comercial "${catData.name}" (${catData.code}) registrada exitosamente en el negocio "${bizName}".`,
      type: 'success',
    });
    this.resetCategoryForm();
  }
}
