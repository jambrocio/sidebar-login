import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DummyDataService } from '../../core/services/dummy-data.service';
import { FeedbackNotification } from '../../core/models/domain.models';

/**
 * @fileoverview Componente de Configuración del Negocio, Local y Contraseña.
 * Centraliza los parámetros operativos del Negocio Matriz y la gestión de credenciales.
 *
 * @author Equipo de Arquitectura Frontend
 * @version 1.0.0
 */

/**
 * Componente dedicado a la Configuración del Negocio Matriz, Local Asignado y
 * Renovación de Contraseña del Usuario Activo (`/dashboard/settings`).
 */
@Component({
  selector: 'app-settings-view',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './settings-view.component.html',
  styleUrl: './settings-view.component.scss',
})
export class SettingsViewComponent implements OnInit {
  private readonly dummyData = inject(DummyDataService);

  /** Información del Negocio actual */
  readonly businessInfo = this.dummyData.businessInfo;

  /** Local asignado actual */
  readonly assignedBranch = this.dummyData.assignedBranch;

  /** Sucursales y locales disponibles */
  readonly availableBranches = this.dummyData.availableBranches;

  /** Perfil del usuario activo en sesión */
  readonly currentUserProfile = this.dummyData.currentUserProfile;

  /** Política de expiración de claves vigente */
  readonly passwordPolicy = this.dummyData.passwordPolicy;

  /** Notificación de retroalimentación tras acciones */
  readonly feedbackMessage = signal<FeedbackNotification | null>(null);

  /** Modelo reactivo de configuración de empresa */
  settingsModel = {
    ...this.dummyData.defaultSettings(),
  };

  /** Formulario de actualización de contraseña */
  passwordForm = {
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  };

  ngOnInit(): void {
    this.settingsModel = {
      ...this.dummyData.defaultSettings(),
      assignedBranch: this.assignedBranch(),
    };
  }

  /**
   * Guarda los cambios en la configuración del Negocio Matriz y Local Asignado.
   */
  saveSettingsConfiguration(): void {
    this.dummyData.updateBusinessAndBranchConfig(this.settingsModel);
    this.feedbackMessage.set({
      text: `Configuración guardada exitosamente. Negocio: ${this.settingsModel.commercialName} | Local asignado: ${this.settingsModel.assignedBranch}`,
      type: 'success',
    });
  }

  /**
   * Procesa la renovación de la contraseña del usuario actualmente autenticado.
   * Valida coincidencia de contraseñas y actualiza el estado de expiración.
   */
  updateActiveUserPassword(): void {
    if (
      !this.passwordForm.currentPassword ||
      !this.passwordForm.newPassword ||
      this.passwordForm.newPassword !== this.passwordForm.confirmPassword
    ) {
      this.feedbackMessage.set({
        text: 'Por favor, verifica tu contraseña actual y asegúrate de que la nueva contraseña y su confirmación coincidan.',
        type: 'warning',
      });
      return;
    }

    const result = this.dummyData.changeUserPassword(
      this.currentUserProfile().email,
      this.passwordForm.currentPassword,
      this.passwordForm.newPassword
    );

    this.feedbackMessage.set({
      text: result.message,
      type: result.success ? 'success' : 'warning',
    });
    if (result.success) {
      this.passwordForm = {
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      };
    }
  }
}
