import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DummyDataService } from '../../core/services/dummy-data.service';

/**
 * Componente dedicado al Registro de Nueva Bebida o Licor en el Catálogo (`/dashboard/products/add`).
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
  readonly currentSessionUser = this.dummyData.currentSessionUser;
  readonly products = this.dummyData.products;
  readonly feedbackMessage = signal<string | null>(null);

  newProduct = {
    name: '',
    sku: 'LIC-099',
    category: 'Licores' as 'Licores' | 'Cervezas' | 'Gaseosas' | 'Otros',
    presentation: 'Caja x 12 Botellas 750ml',
    retailPrice: 35.0,
    wholesalePrice: 360.0,
    stockBoxes: 20,
  };

  saveProduct(): void {
    if (!this.newProduct.name.trim()) {
      this.feedbackMessage.set('Por favor, ingresa el nombre de la bebida o licor.');
      return;
    }

    const boxes = Number(this.newProduct.stockBoxes) || 0;
    const productData = {
      sku: this.newProduct.sku || 'BEV-NEW',
      name: this.newProduct.name,
      category: this.newProduct.category,
      presentation: this.newProduct.presentation,
      retailPrice: Number(this.newProduct.retailPrice) || 0,
      wholesalePrice: Number(this.newProduct.wholesalePrice) || 0,
      stockBoxes: boxes,
      stockUnits: boxes * 12,
      status: (boxes > 10 ? 'En Stock' : boxes > 0 ? 'Stock Bajo' : 'Agotado') as any,
      registeredByUser: this.currentSessionUser(),
    };

    this.dummyData.addProduct(productData);

    this.feedbackMessage.set(
      `Ficha técnica de "${this.newProduct.name}" guardada en la base de datos por ${this.currentSessionUser()}.`
    );
    this.newProduct.name = '';
  }
}
