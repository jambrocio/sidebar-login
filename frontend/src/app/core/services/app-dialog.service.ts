import { Injectable, signal } from '@angular/core';

export type DialogVariant = 'danger' | 'warning' | 'info' | 'primary' | 'success';

export interface DialogOptions {
  title: string;
  subtitle?: string;
  message: string;
  warningText?: string;
  icon?: string;
  type?: DialogVariant;
  confirmText?: string;
  cancelText?: string;
  cancelIcon?: string;
}

export interface InternalDialogState extends DialogOptions {
  isAlertOnly: boolean;
  resolve: (value: boolean) => void;
}

/**
 * Servicio Centralizado de Diálogos, Alertas y Confirmaciones (COTIC Design System).
 *
 * Provee una interfaz asíncrona (Promise-based) para reemplazar `window.alert()` y
 * `window.confirm()`, renderizando ventanas modales que respetan el tema de interfaz
 * (Modo Claro / Modo Oscuro) y la jerarquía corporativa institucional.
 */
@Injectable({
  providedIn: 'root'
})
export class AppDialogService {
  readonly currentDialog = signal<InternalDialogState | null>(null);

  /**
   * Muestra un diálogo de confirmación interactivo.
   *
   * @param options Configuración visual y textos del diálogo.
   * @returns Promesa que resuelve a `true` si el usuario confirmó o `false` si canceló.
   */
  confirm(options: DialogOptions): Promise<boolean> {
    return new Promise<boolean>(resolve => {
      this.currentDialog.set({
        ...options,
        type: options.type || 'primary',
        confirmText: options.confirmText || 'Confirmar',
        cancelText: options.cancelText || 'Cancelar',
        isAlertOnly: false,
        resolve: (result: boolean) => {
          this.currentDialog.set(null);
          resolve(result);
        }
      });
    });
  }

  /**
   * Muestra un diálogo de alerta informativa simple con un único botón de aceptación.
   *
   * @param options Configuración visual y textos del diálogo.
   * @returns Promesa que resuelve al pulsar el botón de confirmación.
   */
  alert(options: Omit<DialogOptions, 'cancelText'>): Promise<void> {
    return new Promise<void>(resolve => {
      this.currentDialog.set({
        ...options,
        type: options.type || 'info',
        confirmText: options.confirmText || 'Entendido',
        cancelText: '',
        isAlertOnly: true,
        resolve: () => {
          this.currentDialog.set(null);
          resolve();
        }
      });
    });
  }

  /**
   * Confirma la acción activa en el diálogo.
   */
  handleConfirm(): void {
    const dialog = this.currentDialog();
    if (dialog) {
      dialog.resolve(true);
    }
  }

  /**
   * Cancela la acción activa o cierra la ventana modal.
   */
  handleCancel(): void {
    const dialog = this.currentDialog();
    if (dialog) {
      dialog.resolve(false);
    }
  }
}
