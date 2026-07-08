import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { 
  LucideLayoutDashboard, 
  LucideShoppingCart, 
  LucideClipboardCheck, 
  LucideLogOut, 
  LucideUser
} from '@lucide/angular';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-repartidor-layout',
  standalone: true,
  imports: [
    CommonModule, 
    RouterOutlet, 
    RouterLink, 
    RouterLinkActive,
    LucideLayoutDashboard,
    LucideShoppingCart,
    LucideClipboardCheck,
    LucideLogOut,
    LucideUser
  ],
  template: `
    <div class="min-h-screen flex flex-col bg-slate-50 text-slate-800 pb-20">
      <!-- Header Móvil Superior -->
      <header class="sticky top-0 z-30 h-16 bg-gradient-to-r from-blue-600 to-indigo-700 text-white flex items-center justify-between px-4 shadow-md">
        <div class="flex items-center space-x-2.5">
          <div class="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center font-black text-sm">
            AV
          </div>
          <span class="font-bold text-lg tracking-tight">Aqua Vida <span class="text-xs text-cyan-200 bg-white/10 px-2 py-0.5 rounded-full font-normal ml-1">Reparto</span></span>
        </div>
        
        <div class="flex items-center space-x-3">
          <span class="text-xs font-semibold max-w-[120px] truncate block text-slate-100">{{ auth.currentUser()?.full_name }}</span>
          <button 
            (click)="auth.logout()"
            class="p-2 bg-white/10 hover:bg-red-500/20 text-white rounded-xl active:scale-95 transition-all cursor-pointer"
            title="Cerrar Sesión"
          >
            <svg lucideLogOut class="w-5 h-5"></svg>
          </button>
        </div>
      </header>

      <!-- Outlet de Contenido Principal -->
      <main class="flex-1 p-4 overflow-y-auto">
        <router-outlet></router-outlet>
      </main>

      <!-- Bottom Navigation Bar (Fijada abajo) -->
      <nav class="fixed bottom-0 left-0 right-0 z-30 h-18 bg-white/95 backdrop-blur-md border-t border-slate-200/80 shadow-2xl flex items-center justify-around px-4 pb-safe">
        <a 
          routerLink="/repartidor/dashboard" 
          routerLinkActive="text-blue-600 bg-blue-50/80 font-black"
          [routerLinkActiveOptions]="{exact: true}"
          class="flex flex-col items-center justify-center py-2 px-4 rounded-2xl text-slate-400 hover:text-slate-655 active:scale-95 transition-all duration-200"
        >
          <svg lucideLayoutDashboard class="w-5.5 h-5.5 mb-0.5"></svg>
          <span class="text-[9px] tracking-wider uppercase font-bold">Mi Jornada</span>
        </a>

        <a 
          routerLink="/repartidor/sales" 
          routerLinkActive="text-blue-600 bg-blue-50/80 font-black"
          class="flex flex-col items-center justify-center py-2 px-4 rounded-2xl text-slate-400 hover:text-slate-655 active:scale-95 transition-all duration-200"
        >
          <svg lucideShoppingCart class="w-5.5 h-5.5 mb-0.5"></svg>
          <span class="text-[9px] tracking-wider uppercase font-bold">Ventas</span>
        </a>

        <a 
          routerLink="/repartidor/closure" 
          routerLinkActive="text-blue-600 bg-blue-50/80 font-black"
          class="flex flex-col items-center justify-center py-2 px-4 rounded-2xl text-slate-400 hover:text-slate-655 active:scale-95 transition-all duration-200"
        >
          <svg lucideClipboardCheck class="w-5.5 h-5.5 mb-0.5"></svg>
          <span class="text-[9px] tracking-wider uppercase font-bold">Cerrar Día</span>
        </a>
      </nav>
    </div>
  `
})
export class RepartidorLayoutComponent {
  public auth = inject(AuthService);
}
