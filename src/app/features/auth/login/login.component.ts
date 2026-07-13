import { Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { LucideMail, LucideLock, LucideLogIn } from '@lucide/angular';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LucideMail, LucideLock, LucideLogIn],
  template: `
    <div class="relative min-h-screen flex items-center justify-center bg-gradient-to-tr from-cyan-600 via-blue-700 to-indigo-900 overflow-hidden px-4">
      
      <!-- Figuras de fondo animadas -->
      <div class="absolute -top-40 -left-40 w-96 h-96 bg-cyan-400 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse"></div>
      <div class="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-400 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse delay-1000"></div>

      <!-- Tarjeta Glassmorphic -->
      <div class="relative w-full max-w-md bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl p-8 md:p-10 text-white">
        
        <!-- Logo / Cabecera -->
        <div class="text-center mb-8">
          <div class="inline-flex p-4 bg-white/20 rounded-2xl mb-4 border border-white/30 shadow-inner">
            <span class="text-3xl font-extrabold tracking-wider text-cyan-200">AV</span>
          </div>
          <h1 class="text-3xl font-bold tracking-tight">Aqua Vida</h1>
          <p class="text-sm text-cyan-200/70 mt-1 font-medium">Control de Ventas e Inventario</p>
        </div>

        <!-- Alertas de Error -->
        @if (errorMessage()) {
          <div class="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-2xl text-red-200 text-sm flex items-center space-x-2">
            <span class="font-semibold">Error:</span>
            <span>{{ errorMessage() }}</span>
          </div>
        }

        <!-- Formulario -->
        <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" class="space-y-5">
          <!-- Campo Email -->
          <div>
            <label class="block text-xs font-semibold uppercase tracking-wider text-cyan-200/80 mb-2">Correo Electrónico</label>
            <div class="relative">
              <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-cyan-200/50">
                <svg lucideMail class="w-5 h-5"></svg>
              </span>
              <input 
                type="email" 
                formControlName="email"
                placeholder="tuemail@aquavida.com"
                class="w-full pl-10 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all"
              />
            </div>
            @if (loginForm.get('email')?.touched && loginForm.get('email')?.invalid) {
              <span class="text-xs text-red-300 mt-1 block">Por favor, ingresa un correo válido.</span>
            }
          </div>

          <!-- Campo Contraseña -->
          <div>
            <label class="block text-xs font-semibold uppercase tracking-wider text-cyan-200/80 mb-2">Contraseña</label>
            <div class="relative">
              <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-cyan-200/50">
                <svg lucideLock class="w-5 h-5"></svg>
              </span>
              <input 
                type="password" 
                formControlName="password"
                placeholder="••••••••"
                class="w-full pl-10 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all"
              />
            </div>
            @if (loginForm.get('password')?.touched && loginForm.get('password')?.invalid) {
              <span class="text-xs text-red-300 mt-1 block">La contraseña debe tener al menos 6 caracteres.</span>
            }
          </div>

          <!-- Botón de Ingreso -->
          <button 
            type="submit" 
            [disabled]="loginForm.invalid || auth.loading()"
            class="w-full py-4 px-6 bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-white font-bold rounded-2xl shadow-lg hover:shadow-cyan-500/20 active:scale-95 disabled:opacity-50 disabled:pointer-events-none transition-all flex items-center justify-center space-x-2 text-base cursor-pointer"
          >
            @if (auth.loading()) {
              <span class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              <span>Iniciando sesión...</span>
            } @else {
              <svg lucideLogIn class="w-5 h-5"></svg>
              <span>Ingresar</span>
            }
          </button>
        </form>

        <div class="mt-8 text-center text-xs text-cyan-200/40">
          &copy; 2026 Aqua Vida. Todos los derechos reservados.
        </div>
      </div>
    </div>
  `
})
export class LoginComponent implements OnInit {
  public auth = inject(AuthService);
  private fb = inject(FormBuilder);
  private router = inject(Router);

  loginForm: FormGroup;
  errorMessage = signal<string | null>(null);

  constructor() {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(5)]]
    });
  }

  ngOnInit() {
    // Si ya hay sesión activa al entrar a esta ruta, redirigir automáticamente
    const checkAuth = () => {
      if (this.auth.loading()) {
        setTimeout(checkAuth, 50);
      } else if (this.auth.isAuthenticated()) {
        if (this.auth.isAdmin()) {
          this.router.navigate(['/admin']);
        } else {
          this.router.navigate(['/repartidor']);
        }
      }
    };
    checkAuth();
  }

  async onSubmit() {
    if (this.loginForm.invalid) return;

    this.errorMessage.set(null);
    const { email, password } = this.loginForm.value;

    try {
      await this.auth.login(email, password);
    } catch (error: any) {
      this.errorMessage.set(error.message || 'Error al iniciar sesión. Verifica tus credenciales.');
    }
  }
}
