import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { 
  LucideLayoutDashboard, 
  LucideShoppingBag, 
  LucideWarehouse, 
  LucideBarChart3, 
  LucideLogOut, 
  LucideUser,
  LucideUsers,
  LucideMenu,
  LucideX
} from '@lucide/angular';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [
    CommonModule, 
    RouterOutlet, 
    RouterLink, 
    RouterLinkActive,
    LucideLayoutDashboard,
    LucideShoppingBag,
    LucideWarehouse,
    LucideBarChart3,
    LucideLogOut,
    LucideUser,
    LucideUsers,
    LucideMenu,
    LucideX
  ],
  template: `
    <div class="min-h-screen flex bg-slate-50">
      <!-- Sidebar para escritorio / Drawer para móvil -->
      <aside 
        [class.translate-x-0]="isMobileMenuOpen()" 
        [class.-translate-x-full]="!isMobileMenuOpen()"
        class="fixed inset-y-0 left-0 z-40 w-72 bg-slate-900 text-white flex flex-col justify-between transition-transform duration-300 md:translate-x-0 md:static md:z-0 shadow-xl border-r border-slate-800"
      >
        <div>
          <!-- Cabecera Logo -->
          <div class="h-20 flex items-center justify-between px-6 border-b border-slate-800">
            <div class="flex items-center space-x-3">
              <div class="p-2.5 bg-cyan-500 rounded-xl text-slate-950 font-black tracking-wider shadow-md">
                AV
              </div>
              <span class="text-xl font-bold tracking-tight text-white">Aqua Vida <span class="text-cyan-400 font-medium text-sm">Admin</span></span>
            </div>
            <!-- Botón cerrar móvil -->
            <button (click)="toggleMobileMenu()" class="md:hidden text-slate-400 hover:text-white cursor-pointer">
              <svg lucideX class="w-6 h-6"></svg>
            </button>
          </div>

          <!-- Navegación -->
          <nav class="p-4 space-y-2 mt-4">
            <a 
              routerLink="/admin/dashboard" 
              routerLinkActive="bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/10 font-bold"
              [routerLinkActiveOptions]="{exact: true}"
              (click)="closeMobileMenu()"
              class="flex items-center space-x-3 px-4 py-3.5 rounded-xl text-slate-300 hover:bg-slate-800 hover:text-white transition-all group"
            >
              <svg lucideLayoutDashboard class="w-5 h-5 group-hover:scale-105 transition-transform"></svg>
              <span>Ventas en Tiempo Real</span>
            </a>
            <a 
              routerLink="/admin/products" 
              routerLinkActive="bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/10 font-bold"
              (click)="closeMobileMenu()"
              class="flex items-center space-x-3 px-4 py-3.5 rounded-xl text-slate-300 hover:bg-slate-800 hover:text-white transition-all group"
            >
              <svg lucideShoppingBag class="w-5 h-5 group-hover:scale-105 transition-transform"></svg>
              <span>Catálogo de Productos</span>
            </a>
            <a 
              routerLink="/admin/inventory" 
              routerLinkActive="bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/10 font-bold"
              (click)="closeMobileMenu()"
              class="flex items-center space-x-3 px-4 py-3.5 rounded-xl text-slate-300 hover:bg-slate-800 hover:text-white transition-all group"
            >
              <svg lucideWarehouse class="w-5 h-5 group-hover:scale-105 transition-transform"></svg>
              <span>Inventario General</span>
            </a>
            <a 
              routerLink="/admin/reports" 
              routerLinkActive="bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/10 font-bold"
              (click)="closeMobileMenu()"
              class="flex items-center space-x-3 px-4 py-3.5 rounded-xl text-slate-300 hover:bg-slate-800 hover:text-white transition-all group"
            >
              <svg lucideBarChart3 class="w-5 h-5 group-hover:scale-105 transition-transform"></svg>
              <span>Reportes & Comparativa</span>
            </a>
            <a 
              routerLink="/admin/users" 
              routerLinkActive="bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/10 font-bold"
              (click)="closeMobileMenu()"
              class="flex items-center space-x-3 px-4 py-3.5 rounded-xl text-slate-300 hover:bg-slate-800 hover:text-white transition-all group"
            >
              <svg lucideUsers class="w-5 h-5 group-hover:scale-105 transition-transform"></svg>
              <span>Gestión de Personal</span>
            </a>
          </nav>
        </div>

        <!-- Perfil de Usuario e Info de Salida -->
        <div class="p-4 border-t border-slate-800 bg-slate-950/40">
          <div class="flex items-center space-x-3 mb-4 px-2">
            <div class="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-cyan-400 border border-slate-700">
              <svg lucideUser class="w-5 h-5"></svg>
            </div>
            <div class="overflow-hidden">
              <h4 class="text-sm font-semibold truncate text-slate-100">{{ auth.currentUser()?.full_name }}</h4>
              <p class="text-xs text-slate-400 truncate font-medium">Administrador</p>
            </div>
          </div>
          <button 
            (click)="auth.logout()"
            class="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-red-600/10 hover:bg-red-600 text-red-400 hover:text-white font-semibold rounded-xl transition-all cursor-pointer border border-red-500/20 hover:border-transparent active:scale-95"
          >
            <svg lucideLogOut class="w-5 h-5"></svg>
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      <!-- Fondo oscuro del drawer en móvil -->
      @if (isMobileMenuOpen()) {
        <div 
          (click)="toggleMobileMenu()" 
          class="fixed inset-0 bg-slate-900/60 z-30 md:hidden backdrop-blur-sm"
        ></div>
      }

      <!-- Contenedor de Contenido Principal -->
      <div class="flex-1 flex flex-col min-h-screen overflow-hidden">
        <!-- Header Superior -->
        <header class="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-6 md:px-8">
          <div class="flex items-center space-x-4">
            <button (click)="toggleMobileMenu()" class="md:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl cursor-pointer">
              <svg lucideMenu class="w-6 h-6"></svg>
            </button>
            <h2 class="text-xl font-bold tracking-tight text-slate-800">Panel de Control General</h2>
          </div>
          <div class="flex items-center space-x-4">
            <div class="hidden sm:block text-right">
              <span class="block text-sm font-semibold text-slate-700">{{ auth.currentUser()?.full_name }}</span>
              <span class="block text-xs text-slate-400 font-semibold uppercase">Administrador</span>
            </div>
            <div class="w-10 h-10 rounded-full bg-cyan-100 text-cyan-600 flex items-center justify-center font-bold border border-cyan-200">
              {{ auth.currentUser()?.full_name?.charAt(0) }}
            </div>
          </div>
        </header>

        <!-- Outlet de Rutas -->
        <main class="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-50">
          <router-outlet></router-outlet>
        </main>
      </div>
    </div>
  `
})
export class AdminLayoutComponent {
  public auth = inject(AuthService);
  isMobileMenuOpen = signal<boolean>(false);

  toggleMobileMenu() {
    this.isMobileMenuOpen.update(v => !v);
  }

  closeMobileMenu() {
    this.isMobileMenuOpen.set(false);
  }
}
