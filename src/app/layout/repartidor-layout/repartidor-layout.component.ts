import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { 
  LucideLayoutDashboard, 
  LucideShoppingCart, 
  LucideClipboardCheck, 
  LucideLogOut
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
    LucideLogOut
  ],
  template: `
    <div class="min-h-screen flex flex-col bg-slate-50 text-slate-800 pb-20">
      <!-- Header Móvil Superior -->
      <header class="sticky top-0 z-30 h-16 bg-gradient-to-r from-sky-600 to-blue-800 text-white flex items-center justify-between px-4 shadow-lg shadow-blue-900/10">
        <div class="flex items-center space-x-2.5">
          <div class="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center font-black text-sm border border-white/30 shadow-inner">
            AV
          </div>
          <span class="font-bold text-lg tracking-tight">Aqua Vida <span class="text-xs text-cyan-200 bg-white/10 px-2 py-0.5 rounded-full font-normal ml-1">Reparto</span></span>
        </div>
        
        <div class="flex items-center space-x-3">
          <span class="text-xs font-bold max-w-[120px] truncate block text-sky-50">{{ auth.currentUser()?.full_name }}</span>
          <button 
            (click)="auth.logout()"
            class="p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl active:scale-95 transition-all cursor-pointer border border-white/10"
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
      <nav class="fixed bottom-0 left-0 right-0 z-30 h-18 bg-white/95 backdrop-blur-xl border-t border-slate-200/80 shadow-[0_-8px_30px_rgb(0,0,0,0.04)] flex items-center justify-around px-4 pb-safe">
        <a 
          routerLink="/repartidor/dashboard" 
          routerLinkActive="text-blue-700 bg-sky-50 font-black shadow-inner border border-sky-100/50"
          [routerLinkActiveOptions]="{exact: true}"
          class="flex flex-col items-center justify-center py-2 px-4 rounded-2xl text-slate-400 hover:text-slate-600 active:scale-95 transition-all duration-300 ease-out"
        >
          <svg lucideLayoutDashboard class="w-5.5 h-5.5 mb-0.5"></svg>
          <span class="text-[9px] tracking-wider uppercase font-bold">Mi Jornada</span>
        </a>

        <a 
          routerLink="/repartidor/sales" 
          routerLinkActive="text-blue-700 bg-sky-50 font-black shadow-inner border border-sky-100/50"
          class="flex flex-col items-center justify-center py-2 px-4 rounded-2xl text-slate-400 hover:text-slate-600 active:scale-95 transition-all duration-300 ease-out"
        >
          <svg lucideShoppingCart class="w-5.5 h-5.5 mb-0.5"></svg>
          <span class="text-[9px] tracking-wider uppercase font-bold">Ventas</span>
        </a>

        <a 
          routerLink="/repartidor/closure" 
          routerLinkActive="text-blue-700 bg-sky-50 font-black shadow-inner border border-sky-100/50"
          class="flex flex-col items-center justify-center py-2 px-4 rounded-2xl text-slate-400 hover:text-slate-600 active:scale-95 transition-all duration-300 ease-out"
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
