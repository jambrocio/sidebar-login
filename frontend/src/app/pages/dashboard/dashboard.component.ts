import { Component, signal, ViewChild, OnInit, OnDestroy, inject } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { SidebarComponent } from '../../shared/sidebar/sidebar.component';
import { NavbarComponent } from '../../shared/navbar/navbar.component';
import { CommonModule } from '@angular/common';
import { Title } from '@angular/platform-browser';
import { filter, map, mergeMap } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { AdminApiService } from '../../core/services/admin-api.service';
import { DummyDataService } from '../../core/services/dummy-data.service';

/**
 * Shell principal del panel administrativo (Dashboard Layout Shell).
 * Hospeda el Navbar, Sidebar multinivel colapsable y el área de contenido (RouterOutlet).
 * Adicionalmente, ejecuta el monitor de latido (Heartbeat) de actividad en tiempo real
 * para mantener el semáforo en línea y detectar expulsión remota por Administrador.
 */
@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterOutlet, SidebarComponent, NavbarComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit, OnDestroy {
  // Inicia colapsado para un comportamiento predecible en escritorio y móvil.
  sidebarCollapsed = signal(true);
  private routerSubscription!: Subscription;
  private heartbeatTimer: any;
  private readonly adminApi = inject(AdminApiService);
  private readonly dummyData = inject(DummyDataService);

  @ViewChild(SidebarComponent) sidebar!: SidebarComponent;

  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private titleService: Title
  ) {}

  ngOnInit(): void {
    this.routerSubscription = this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      map(() => this.activatedRoute),
      map(route => {
        while (route.firstChild) route = route.firstChild;
        return route;
      }),
      filter(route => route.outlet === 'primary'),
      mergeMap(route => route.data)
    ).subscribe(data => {
      const title = data['title'] ? `Admin - ${data['title']}` : 'Admin Panel';
      this.titleService.setTitle(title);
    });

    // Cargar y sincronizar todos los datos reales desde el Backend PostgreSQL
    this.dummyData.loadAllFromBackend();

    // Iniciar latido periódico (Heartbeat) cada 20 segundos para auditar conexión en vivo
    // y comprobar si un Administrador revocó remotamente la sesión
    this.startHeartbeatMonitor();
  }

  /**
   * Monitor de latido que emite peticiones a /api/v1/auth/heartbeat
   */
  private startHeartbeatMonitor(): void {
    const checkSession = () => {
      this.adminApi.sendHeartbeat().subscribe({
        next: (res) => {
          if (res && res.revoked) {
            this.handleRemotelyKilledSession();
          }
        },
        error: (err) => {
          if (err.status === 401 && err.error?.code === 'SESSION_REVOKED_BY_ADMIN') {
            this.handleRemotelyKilledSession();
          } else if (err.status === 0 || err.status === 503 || err.status === 502 || err.status === 504) {
            this.handleBackendServiceDown();
          }
        }
      });
    };

    // Primer chequeo inmediato
    checkSession();
    // Ciclo periódico cada 20 segundos
    this.heartbeatTimer = setInterval(checkSession, 20000);
  }

  /**
   * Expulsa inmediatamente al usuario hacia /login cuando el backend entra en fuera de servicio
   */
  private handleBackendServiceDown(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem('accessToken');
      sessionStorage.removeItem('currentUserProfile');
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('accessToken');
    }
    this.router.navigate(['/login'], { queryParams: { serviceUnavailable: 'true' } });
  }

  /**
   * Expulsa inmediatamente al usuario cuando su sesión es finalizada por un administrador
   */
  private handleRemotelyKilledSession(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem('accessToken');
      sessionStorage.removeItem('currentUserProfile');
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('accessToken');
    }
    this.router.navigate(['/login'], { queryParams: { revoked: 'true' } });
  }

  onSidebarCollapsed(collapsed: boolean) {
    this.sidebarCollapsed.set(collapsed);
  }

  toggleMainSidebar() {
    this.sidebar.toggleCollapse();
  }

  ngOnDestroy(): void {
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }
  }
}
