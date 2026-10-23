import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DummyDataService } from '../../core/services/dummy-data.service';

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

  readonly businessInfo = this.dummyData.businessInfo;
  readonly assignedBranch = this.dummyData.assignedBranch;
  readonly availableBranches = this.dummyData.availableBranches;
  readonly currentUserProfile = this.dummyData.currentUserProfile;
  readonly passwordPolicy = this.dummyData.passwordPolicy;
  readonly feedbackMessage = signal<string | null>(null);

  settingsModel = {
    ...this.dummyData.defaultSettings(),
  };

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

  saveSettingsConfiguration(): void {
    this.dummyData.updateBusinessAndBranchConfig(this.settingsModel);
    this.feedbackMessage.set(
      `Configuración guardada. Negocio: ${this.settingsModel.commercialName} | Local asignado: ${this.settingsModel.assignedBranch}`
    );
  }

  updateActiveUserPassword(): void {
    if (
      !this.passwordForm.currentPassword ||
      !this.passwordForm.newPassword ||
      this.passwordForm.newPassword !== this.passwordForm.confirmPassword
    ) {
      this.feedbackMessage.set(
        'Por favor verifica tu contraseña actual y asegúrate de que la nueva contraseña y su confirmación coincidan.'
      );
      return;
    }

    const result = this.dummyData.changeUserPassword(
      this.currentUserProfile().email,
      this.passwordForm.currentPassword,
      this.passwordForm.newPassword
    );

    this.feedbackMessage.set(result.message);
    if (result.success) {
      this.passwordForm = {
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      };
    }
  }
}
