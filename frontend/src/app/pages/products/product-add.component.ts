import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DummyDataService } from '../../core/services/dummy-data.service';
import { FeedbackNotification } from '../../core/models/domain.models';

/**
 * Componente Smart/Container para el Registro de Nuevos Productos (`/dashboard/products/add`).
 *
 * @description Permite registrar bebidas con precios diferenciados por mayor y menor, control de stock
 * en cajas y unidades, asignación a su Negocio Matriz y sincronización con PostgreSQL.
 *
 * @author Equipo de Arquitectura Frontend Senior
 * @version 2.0
 */
@Component({
  selector: 'app-product-add',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './product-add.component.html',
  styleUrl: './product-add.component.scss',
})
export class ProductAddComponent {
  private readonly dummyData = inject(DummyDataService);

  readonly businessInfo = this.dummyData.businessInfo;
  readonly businesses = this.dummyData.businesses;
  readonly availableBusinesses = this.dummyData.availableBusinesses;
  readonly currentSessionUser = this.dummyData.currentSessionUser;
  readonly currentUserProfile = this.dummyData.currentUserProfile;
  readonly products = this.dummyData.products;
  readonly feedbackMessage = signal<FeedbackNotification | null>(null);

  /** Determina si el usuario en sesión es Administrador General (Superusuario) */
  readonly isGeneralAdmin = computed<boolean>(() => {
    const roleName = (this.currentUserProfile()?.role || '').trim();
    if (roleName.includes('Negocio') || roleName === 'ADMIN_NEGOCIO') {
      return false;
    }
    return roleName === 'ADMIN' || roleName.includes('Administrador General') || roleName.includes('Superusuario');
  });

  /** Determina si el usuario en sesión es Administrador de Negocio */
  readonly isBusinessAdmin = computed<boolean>(() => {
    const roleName = (this.currentUserProfile()?.role || '').trim();
    return roleName === 'ADMIN_NEGOCIO' || roleName.includes('Administrador de Negocio');
  });

  newProduct = {
    name: '',
    sku: 'PRD-101',
    category: 'Licores' as 'Licores' | 'Cervezas' | 'Gaseosas' | 'Otros',
    presentation: 'Caja x 12 Unidades',
    retailPrice: 35.0,
    wholesalePrice: 360.0,
    stockBoxes: 20,
    businessCode: 'BIZ-001',
  };

  constructor() {
    // Inicializar negocio matriz según el usuario autenticado
    const defaultBiz = this.currentUserProfile().assignedBusinessId || 'BIZ-001';
    this.newProduct.businessCode = defaultBiz;
  }

  saveProduct(): void {
    if (!this.newProduct.name.trim()) {
      this.feedbackMessage.set({
        text: 'Por favor, ingresa el nombre comercial del producto.',
        type: 'warning',
      });
      return;
    }

    // Si NO es Administrador General, forzar siempre su propio negocio asignado
    if (!this.isGeneralAdmin()) {
      this.newProduct.businessCode = this.currentUserProfile().assignedBusinessId || 'BIZ-001';
    }

    const targetBizCode = this.newProduct.businessCode.toUpperCase();
    const boxes = Number(this.newProduct.stockBoxes) || 0;

    const productData = {
      sku: this.newProduct.sku?.toUpperCase() || 'PRD-NEW',
      name: this.newProduct.name.trim(),
      category: this.newProduct.category,
      presentation: this.newProduct.presentation.trim(),
      retailPrice: Number(this.newProduct.retailPrice) || 0,
      wholesalePrice: Number(this.newProduct.wholesalePrice) || 0,
      stockBoxes: boxes,
      stockUnits: boxes * 12,
      status: (boxes > 10 ? 'En Stock' : boxes > 0 ? 'Stock Bajo' : 'Agotado') as any,
      registeredByUser: this.currentSessionUser(),
      businessId: targetBizCode,
      businessCode: targetBizCode,
    };

    this.dummyData.addProduct(productData);

    const bizObj = this.businesses().find(b => b.id?.toUpperCase() === targetBizCode);
    const bizName = bizObj?.commercialName || bizObj?.legalName || targetBizCode;

    this.feedbackMessage.set({
      text: `Ficha técnica de "${this.newProduct.name}" (${productData.sku}) registrada exitosamente en el negocio "${bizName}" por ${this.currentSessionUser()}.`,
      type: 'success',
    });
    this.newProduct.name = '';
  }
}
