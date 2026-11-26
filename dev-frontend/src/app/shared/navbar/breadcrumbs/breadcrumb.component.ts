import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ActivatedRoute,
  NavigationEnd,
  Router,
  RouterLink,
} from '@angular/router';
import { filter } from 'rxjs/operators';

/**
 * Representa un segmento dentro de la barra de navegación de migas de pan (Breadcrumbs).
 */
export interface Breadcrumb {
  /** Texto visible del nivel de navegación */
  label: string;
  /** Ruta asociada; cadena vacía si es un agrupador padre no navegable */
  url: string;
}

/**
 * Componente encargado de generar dinámicamente las migas de pan (Breadcrumbs)
 * a partir de los metadatos (`data: { breadcrumb, parent }`) configurados en `app.routes.ts`.
 */
@Component({
  selector: 'app-breadcrumb',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './breadcrumb.component.html',
  styleUrls: ['./breadcrumb.component.scss'],
})
export class BreadcrumbComponent implements OnInit {
  /** Lista actual de segmentos de navegación */
  breadcrumbs: Breadcrumb[] = [];

  constructor(
    private readonly router: Router,
    private readonly activatedRoute: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        this.breadcrumbs = this.createBreadcrumbs(this.activatedRoute);
      });
    this.breadcrumbs = this.createBreadcrumbs(this.activatedRoute);
  }

  /**
   * Construye el arreglo de migas de pan recorriendo la jerarquía de rutas activas.
   * Soporta que `data['parent']` sea tanto un `string` como un arreglo `string[]`
   * para menús multinivel profundos.
   *
   * @param route Ruta activa raíz desde donde iniciar el recorrido.
   * @returns Arreglo ordenado de objetos `Breadcrumb`.
   */
  private createBreadcrumbs(route: ActivatedRoute): Breadcrumb[] {
    const breadcrumbs: Breadcrumb[] = [];
    let currentRoute: ActivatedRoute | null = route.root;
    const urlSegments: string[] = [];

    while (currentRoute) {
      const children: ActivatedRoute[] = currentRoute.children;
      currentRoute = null;

      for (const child of children) {
        if (child.outlet === 'primary') {
          const routeURL = child.snapshot.url
            .map(segment => segment.path)
            .join('/');
          if (routeURL && routeURL !== 'dashboard') {
            urlSegments.push(routeURL);
          }

          const routeData = child.snapshot.data;
          if (routeData && routeData['breadcrumb']) {
            const rawParent = routeData['parent'];
            const parentLabels: string[] = Array.isArray(rawParent)
              ? rawParent
              : rawParent
                ? [rawParent]
                : [];

            for (const parentLabel of parentLabels) {
              if (!breadcrumbs.some(b => b.label === parentLabel)) {
                breadcrumbs.push({ label: parentLabel, url: '' });
              }
            }

            const breadcrumbUrl = `/dashboard/${urlSegments.join('/')}`;
            breadcrumbs.push({
              label: routeData['breadcrumb'],
              url: breadcrumbUrl,
            });
          }

          currentRoute = child;
          break;
        }
      }
    }

    return breadcrumbs;
  }
}
