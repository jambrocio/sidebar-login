import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, effect, inject, signal } from '@angular/core';
import {
  FormControl,
  FormGroup,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { DummyDataService } from '../../core/services/dummy-data.service';
import { AuthApiService, ProblemDetailError } from '../../core/services/auth-api.service';
import { BackendHealthService } from '../../core/services/backend-health.service';
import { SystemUser } from '../../core/models/domain.models';

/**
 * Contrato de tipado estricto para los controles del formulario de inicio de sesión.
 */
export interface LoginFormControls {
  /** Correo electrónico corporativo o nombre de usuario */
  email: FormControl<string>;
  /** Contraseña de acceso */
  password: FormControl<string>;
  /** Indicador para recordar el correo en el navegador */
  rememberMe: FormControl<boolean>;
}

/**
 * Contrato de tipado estricto para el formulario de cambio / renovación de contraseña por expiración.
 */
export interface ChangePasswordFormControls {
  /** Correo electrónico o usuario cuya clave se va a renovar */
  email: FormControl<string>;
  /** Contraseña actual (vigente, temporal o expirada) */
  currentPassword: FormControl<string>;
  /** Nueva contraseña que extiende la vigencia por 90 días */
  newPassword: FormControl<string>;
  /** Confirmación exacta de la nueva contraseña */
  confirmPassword: FormControl<string>;
}

/**
 * Claves de almacenamiento local utilizadas por el módulo de autenticación.
 */
const STORAGE_KEYS = {
  DARK_MODE: 'darkMode',
  REMEMBERED_EMAIL: 'rememberedEmail',
} as const;

/**
 * Componente de Inicio de Sesión y Gestión de Expiración de Contraseña (`/login`).
 *
 * Responsabilidades:
 * - Autenticar usuarios contra el catálogo cargado desde `frontend/json/users-and-roles.json`.
 * - Detectar estados de expiración de clave (`Vigente`, `Por Expirar`, `Expirada`, `Clave Temporal`).
 * - Permitir el cambio obligatorio o voluntario de contraseña directamente desde el Login,
 *   renovando su vigencia por 90 días y actualizando todas las interfaces del Dashboard.
 * - Ofrecer un selector rápido de Usuarios de Prueba para validar todos los escenarios de negocio.
 */
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login implements OnInit, OnDestroy {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly dummyData = inject(DummyDataService);
  private readonly authApi = inject(AuthApiService);
  public readonly backendHealth = inject(BackendHealthService);

  /** Modo visual activo en la tarjeta: 'LOGIN' o 'CHANGE_PASSWORD' */
  readonly activeViewMode = signal<'LOGIN' | 'CHANGE_PASSWORD'>('LOGIN');

  /** Indica si el cambio de clave fue forzado por expiración o clave temporal */
  readonly isForcedExpirationChange = signal<boolean>(false);

  /** Usuario cuya clave está próxima a vencer (permite elegir entre cambiar ahora o continuar) */
  readonly expiringSoonUser = signal<SystemUser | null>(null);

  /** Política corporativa de contraseñas (`90 días` de vigencia) */
  readonly passwordPolicy = this.dummyData.passwordPolicy;

  /** Formulario reactivo de inicio de sesión */
  readonly loginForm: FormGroup<LoginFormControls>;

  /** Formulario reactivo de cambio de contraseña por expiración o renovación */
  readonly changePasswordForm: FormGroup<ChangePasswordFormControls>;

  /** Controla visibilidad de contraseñas */
  readonly showPassword = signal<boolean>(false);
  readonly showNewPassword = signal<boolean>(false);

  /** Estado de envío */
  readonly isSubmitting = signal<boolean>(false);

  /** Mensajes de retroalimentación */
  readonly errorMessage = signal<string | null>(null);
  readonly warningMessage = signal<string | null>(null);
  readonly infoMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  /** Estado reactivo del tema visual activo (Claro / Oscuro) */
  readonly isDarkMode = signal<boolean>(false);

  /** Evaluación en tiempo real de los requisitos de seguridad de la nueva contraseña */
  readonly passwordStrengthChecks = signal({
    minLength: false,
    hasUppercase: false,
    hasNumber: false,
    hasSpecial: false,
    isDifferent: false,
    matchesConfirm: false,
  });

  readonly isNewPasswordPolicyValid = computed(() => {
    const c = this.passwordStrengthChecks();
    return (
      c.minLength &&
      c.hasUppercase &&
      c.hasNumber &&
      c.hasSpecial &&
      c.isDifferent &&
      c.matchesConfirm
    );
  });

  constructor() {
    this.loginForm = this.fb.group({
      email: ['ana.garcia@empresa.com', [Validators.required]],
      password: ['Admin123*', [Validators.required, Validators.minLength(6)]],
      rememberMe: [true],
    });

    this.changePasswordForm = this.fb.group({
      email: ['', [Validators.required]],
      currentPassword: ['', [Validators.required]],
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]],
    });

    this.changePasswordForm.valueChanges.subscribe(val => {
      const current = val.currentPassword || '';
      const next = val.newPassword || '';
      const confirm = val.confirmPassword || '';
      this.passwordStrengthChecks.set({
        minLength: next.length >= 8,
        hasUppercase: /[A-Z]/.test(next),
        hasNumber: /[0-9]/.test(next),
        hasSpecial: /[^A-Za-z0-9]/.test(next),
        isDifferent: next.length > 0 && next !== current,
        matchesConfirm: next.length > 0 && next === confirm,
      });
    });

    // Limpieza reactiva inmediata: si el servicio pasa a ONLINE, se remueve cualquier mensaje residual de indisponibilidad
    effect(() => {
      const status = this.backendHealth.backendStatus();
      if (status === 'ONLINE') {
        const msg = this.errorMessage();
        if (
          msg &&
          (msg.includes('fuera de servicio') ||
            msg.includes('interrumpió la conexión') ||
            msg.includes('inaccesible'))
        ) {
          this.errorMessage.set(null);
        }
      }
    });
  }

  /**
   * Inicializa el tema visual persistido y restaura el correo recordado si existe.
   */
  ngOnInit(): void {
    this.initializeTheme();
    this.restoreRememberedEmail();

    if (this.route.snapshot.queryParams['revoked'] === 'true') {
      this.errorMessage.set(
        'Su sesión ha sido revocada remotamente por un Administrador de Seguridad por motivos de auditoría o sospecha de acceso no autorizado.'
      );
    } else if (this.route.snapshot.queryParams['sessionExpired'] === 'true') {
      this.infoMessage.set(
        'Tu sesión no está activa o la pestaña/navegador fue cerrada. Por favor, inicia sesión para continuar.'
      );
    }

    // Iniciar el monitoreo activo de disponibilidad del backend cada 3 segundos
    this.backendHealth.startHealthPolling(3000);
  }

  ngOnDestroy(): void {
    // El sondeo de salud continúa globalmente a nivel de aplicación
  }

  /**
   * Cambia entre la pestaña de Inicio de Sesión y la pestaña de Cambio de Contraseña.
   */
  switchMode(mode: 'LOGIN' | 'CHANGE_PASSWORD'): void {
    this.clearMessages();
    this.expiringSoonUser.set(null);
    this.isForcedExpirationChange.set(false);
    this.activeViewMode.set(mode);

    if (mode === 'CHANGE_PASSWORD') {
      const currentLoginEmail = this.loginForm.controls.email.value;
      const currentLoginPass = this.loginForm.controls.password.value;
      this.changePasswordForm.patchValue({
        email: currentLoginEmail,
        currentPassword: currentLoginPass,
        newPassword: '',
        confirmPassword: '',
      });
    }
  }

  togglePasswordVisibility(): void {
    this.showPassword.update(visible => !visible);
  }

  toggleNewPasswordVisibility(): void {
    this.showNewPassword.update(visible => !visible);
  }

  /**
   * Alterna entre el modo claro y oscuro, persistiendo la preferencia en `localStorage`.
   */
  toggleDarkMode(): void {
    const nextMode = !this.isDarkMode();
    this.isDarkMode.set(nextMode);
    this.applyTheme(nextMode);

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.DARK_MODE, JSON.stringify(nextMode));
    }
  }

  hasFieldError(controlName: keyof LoginFormControls): boolean {
    const control = this.loginForm.controls[controlName];
    return control.invalid && (control.touched || control.dirty);
  }

  getFieldErrorMessage(controlName: 'email' | 'password'): string {
    const control = this.loginForm.controls[controlName];
    if (!control.errors || (!control.touched && !control.dirty)) {
      return '';
    }

    if (control.errors['required']) {
      return controlName === 'email'
        ? 'El correo o nombre de usuario es obligatorio.'
        : 'La contraseña es obligatoria.';
    }

    if (controlName === 'password' && control.errors['minlength']) {
      const requiredLength = control.errors['minlength'].requiredLength;
      return `La contraseña debe tener al menos ${requiredLength} caracteres.`;
    }

    return 'Campo no válido.';
  }

  /**
   * Procesa el inicio de sesión contra el Backend Spring Boot 4 (/api/v1/auth/login),
   * evaluando vigencia de clave, cambio obligatorio por expiración y bloqueo de cuenta.
   */
  login(): void {
    this.clearMessages();
    this.expiringSoonUser.set(null);

    // Si el backend está fuera de servicio, bloquea estrictamente la autenticación
    if (this.backendHealth.isBackendOffline()) {
      return;
    }

    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      this.errorMessage.set('Por favor, completa tu usuario/correo y contraseña.');
      return;
    }

    const { email, password, rememberMe } = this.loginForm.getRawValue();
    this.persistRememberedEmail(email.trim(), rememberMe);
    this.backendHealth.dismissRecoveryAlert();
    this.isSubmitting.set(true);

    this.authApi.login(email, password).subscribe({
      next: (response) => {
        this.isSubmitting.set(false);

        // Guardar token JWT en almacenamiento de sesión (sessionStorage)
        this.authApi.setSession(response);

        // Mapear y activar el usuario en el contexto del Dashboard y Navbar
        const systemUser = this.authApi.mapToSystemUser(response);
        this.dummyData.setActiveSessionUser(systemUser);

        // Caso Próxima a Expirar: Muestra alerta preventiva permitiendo elegir si renovar ahora o entrar
        if (response.passwordStatus === 'Por Expirar') {
          this.expiringSoonUser.set(systemUser);
          this.warningMessage.set(
            `Aviso Preventivo: Tu contraseña vencerá en ${response.daysUntilExpiration} días (${response.passwordExpiresAt}). Te recomendamos renovarla ahora.`
          );
          return;
        }

        // Caso Clave Vigente: Mensaje de confirmación y redirección fluida al Dashboard
        this.successMessage.set(
          `¡Bienvenido(a) ${response.user.fullName}! Conectado al local ${response.user.assignedBranchName}.`
        );
        const targetUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';
        setTimeout(() => {
          this.router.navigateByUrl(targetUrl);
        }, 200);
      },
      error: (err: ProblemDetailError) => {
        this.isSubmitting.set(false);

        // Caso 1: Servidor Backend offline (status 0, 502, 503, 504) -> Bloqueo estricto de autenticación
        if (err.status === 0 || err.status === 502 || err.status === 503 || err.status === 504) {
          this.backendHealth.markBackendOffline();
          return;
        }

        // Caso 2: Cuenta Bloqueada (HTTP 423) o bloqueo administrativo
        if (err.status === 423 || err.isLocked) {
          this.errorMessage.set(
            err.detail || 'La cuenta de usuario se encuentra bloqueada por motivos de seguridad.'
          );
          return;
        }

        // Caso 3: Contraseña Expirada o Temporal (HTTP 403 Forbidden) -> Cambio Forzado
        if (err.status === 403 && (err.mustChangePassword || err.actionRequired === 'CHANGE_PASSWORD')) {
          this.isForcedExpirationChange.set(true);
          this.activeViewMode.set('CHANGE_PASSWORD');
          this.warningMessage.set(
            err.detail || 'Tu contraseña ha expirado o requiere cambio obligatorio. Debes renovarla para poder acceder.'
          );
          this.changePasswordForm.patchValue({
            email: email.trim(),
            currentPassword: password,
            newPassword: '',
            confirmPassword: '',
          });
          return;
        }

        // Caso 4: Credenciales Inválidas (HTTP 401 Unauthorized) con aviso de intentos restantes
        if (err.status === 401) {
          this.errorMessage.set(err.detail || 'Usuario o contraseña incorrectos.');
          return;
        }

        // Cualquier otro error del backend
        this.errorMessage.set(err.detail || 'Error de autenticación en el servidor.');
      },
    });
  }

  /**
   * Permite al usuario cuya clave está "Por Expirar" abrir el formulario de renovación inmediata.
   */
  openPasswordRenewalFromWarning(): void {
    const user = this.expiringSoonUser();
    if (!user) return;
    this.expiringSoonUser.set(null);
    this.isForcedExpirationChange.set(false);
    this.activeViewMode.set('CHANGE_PASSWORD');
    this.changePasswordForm.patchValue({
      email: user.email,
      currentPassword: this.loginForm.controls.password.value,
      newPassword: '',
      confirmPassword: '',
    });
  }

  /**
   * Permite al usuario cuya clave está "Por Expirar" (aún no vencida) continuar hacia el Dashboard.
   */
  continueToDashboardWithExpiringPassword(): void {
    const user = this.expiringSoonUser();
    if (!user) return;
    this.dummyData.setActiveSessionUser(user);
    this.router.navigate(['/dashboard']);
  }

  /**
   * Rellena automáticamente una contraseña nueva sugerida que cumple todos los requisitos de seguridad
   * para agilizar las pruebas de validación del usuario.
   */
  fillSuggestedValidNewPassword(): void {
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    const suggested = `RobleSegura${randomSuffix}#`;
    this.changePasswordForm.patchValue({
      newPassword: suggested,
      confirmPassword: suggested,
    });
    this.showNewPassword.set(true);
  }

  /**
   * Procesa el cambio de contraseña contra el Backend Spring Boot 4 (/api/v1/auth/change-password).
   */
  submitPasswordChange(): void {
    this.clearMessages();

    // Si el backend está fuera de servicio, bloquea la operación
    if (this.backendHealth.isBackendOffline()) {
      this.errorMessage.set(
        'El servicio Backend se encuentra fuera de servicio. No es posible renovar contraseñas en este momento.'
      );
      return;
    }

    if (this.changePasswordForm.invalid || !this.isNewPasswordPolicyValid()) {
      this.changePasswordForm.markAllAsTouched();
      this.errorMessage.set(
        'Verifica que la nueva contraseña cumpla todos los requisitos de seguridad y que la confirmación coincida.'
      );
      return;
    }

    const { email, currentPassword, newPassword } = this.changePasswordForm.getRawValue();
    this.backendHealth.dismissRecoveryAlert();
    this.isSubmitting.set(true);

    this.authApi.changePassword(email, currentPassword, newPassword).subscribe({
      next: (response) => {
        this.isSubmitting.set(false);
        this.isForcedExpirationChange.set(false);

        // Guardar nuevo token JWT en almacenamiento de sesión
        this.authApi.setSession(response);

        // Mapear y activar la sesión en el Dashboard
        const systemUser = this.authApi.mapToSystemUser(response);
        this.dummyData.setActiveSessionUser(systemUser);

        // Sincronizar catálogo local de dummyData
        this.dummyData.changeUserPassword(email, currentPassword, newPassword);

        this.successMessage.set(
          '¡Contraseña actualizada exitosamente en el Backend! Tu nueva clave tiene vigencia por 90 días.'
        );

        // Sincronizar también el formulario de Login con la nueva contraseña actualizada
        this.loginForm.patchValue({
          email: response.user.username || email,
          password: newPassword,
        });
      },
      error: (err: ProblemDetailError) => {
        this.isSubmitting.set(false);

        // Si el backend no responde (status 0, 502, 503, 504)
        if (err.status === 0 || err.status === 502 || err.status === 503 || err.status === 504) {
          this.backendHealth.markBackendOffline();
          return;
        }

        this.errorMessage.set(err.detail || 'No fue posible actualizar la contraseña en el servidor.');
      },
    });
  }

  /**
   * Ingresa directamente al Dashboard tras haber renovado exitosamente la contraseña.
   */
  enterDashboardAfterPasswordChange(): void {
    this.router.navigate(['/dashboard']);
  }

  private clearMessages(): void {
    this.errorMessage.set(null);
    this.warningMessage.set(null);
    this.infoMessage.set(null);
    this.successMessage.set(null);
  }

  private initializeTheme(): void {
    if (typeof localStorage !== 'undefined') {
      const storedDark = localStorage.getItem(STORAGE_KEYS.DARK_MODE) === 'true';
      this.isDarkMode.set(storedDark);
      this.applyTheme(storedDark);
    }
  }

  private applyTheme(isDark: boolean): void {
    if (typeof document !== 'undefined') {
      document.body.setAttribute('data-theme', isDark ? 'dark' : 'light');
    }
  }

  private restoreRememberedEmail(): void {
    if (typeof localStorage !== 'undefined') {
      const savedEmail = localStorage.getItem(STORAGE_KEYS.REMEMBERED_EMAIL);
      if (savedEmail) {
        this.loginForm.patchValue({
          email: savedEmail,
          rememberMe: true,
        });
      }
    }
  }

  private persistRememberedEmail(email: string, remember: boolean): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    if (remember) {
      localStorage.setItem(STORAGE_KEYS.REMEMBERED_EMAIL, email);
    } else {
      localStorage.removeItem(STORAGE_KEYS.REMEMBERED_EMAIL);
    }
  }
}
