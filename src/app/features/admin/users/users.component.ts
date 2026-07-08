import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { SupabaseService } from '../../../core/services/supabase.service';
import {
  LucideUsers,
  LucideUserPlus,
  LucideMail,
  LucideLock,
  LucideShield,
  LucideX,
  LucideUserCheck,
  LucideUserX,
  LucideUserCog
} from '@lucide/angular';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    LucideUsers,
    LucideUserPlus,
    LucideMail,
    LucideLock,
    LucideShield,
    LucideX,
    LucideUserCheck,
    LucideUserX,
    LucideUserCog
  ],
  template: `
    <div class="space-y-8">
      
      <!-- Encabezado -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div class="flex items-start sm:items-center space-x-4">
          <div class="p-3.5 bg-gradient-to-br from-cyan-500 to-blue-600 text-white rounded-2xl shadow-md shrink-0">
            <svg lucideUsers class="w-6 h-6"></svg>
          </div>
          <div>
            <h2 class="text-2xl font-black text-slate-800 tracking-tight">Gestión de Personal</h2>
            <p class="text-sm text-slate-500 font-medium mt-0.5">Crea y administra repartidores y administradores</p>
          </div>
        </div>
        
        <button 
          (click)="openCreateModal()"
          class="w-full sm:w-auto px-6 py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm rounded-2xl shadow-md shadow-slate-900/20 flex items-center justify-center space-x-2 active:scale-95 transition-all cursor-pointer"
        >
          <svg lucideUserPlus class="w-4.5 h-4.5"></svg>
          <span>Nuevo Usuario</span>
        </button>
      </div>

      <!-- Lista de Usuarios -->
      @if (loading()) {
        <div class="flex flex-col items-center justify-center py-16 space-y-3 bg-white border border-slate-200 rounded-3xl shadow-sm">
          <span class="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></span>
          <span class="text-sm text-slate-500 font-semibold">Cargando usuarios...</span>
        </div>
      } @else {
        
        <!-- Vista Móvil (Tarjetas) -->
        <div class="grid grid-cols-1 gap-4 md:hidden">
          @for (user of users(); track user.id) {
            <div 
              class="bg-white border rounded-2xl p-5 shadow-sm space-y-4 relative overflow-hidden transition-all"
              [class.border-slate-200]="user.is_active"
              [class.border-red-200]="!user.is_active"
              [class.bg-slate-50]="!user.is_active"
            >
              <!-- Role Badge -->
              <div class="absolute top-0 right-0 p-3">
                <span 
                  [class]="user.role === 'admin' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'"
                  class="px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider"
                >
                  {{ user.role === 'admin' ? 'Administrador' : 'Repartidor' }}
                </span>
              </div>

              <div class="flex items-center space-x-3">
                <div 
                  [class]="user.is_active ? 'bg-cyan-100 text-cyan-700' : 'bg-red-100 text-red-600'"
                  class="w-12 h-12 rounded-full flex items-center justify-center font-black text-lg"
                >
                  {{ user.full_name?.charAt(0) }}
                </div>
                <div>
                  <h3 class="font-bold text-slate-800" [class.line-through]="!user.is_active">{{ user.full_name }}</h3>
                  <div class="flex items-center space-x-1 text-slate-500 mt-0.5">
                    <svg lucideMail class="w-3 h-3"></svg>
                    <span class="text-xs font-medium">{{ user.email || 'Correo oculto' }}</span>
                  </div>
                </div>
              </div>

              <div class="pt-4 border-t border-slate-100 flex items-center justify-between">
                <div class="flex items-center space-x-1.5">
                  <div 
                    [class]="user.is_active ? 'bg-emerald-500' : 'bg-red-500'"
                    class="w-2 h-2 rounded-full"
                  ></div>
                  <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {{ user.is_active ? 'Cuenta Activa' : 'Desactivado' }}
                  </span>
                </div>
                <button 
                  (click)="openEditModal(user)"
                  class="p-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl transition-colors cursor-pointer"
                >
                  <svg lucideUserCog class="w-4 h-4"></svg>
                </button>
              </div>
            </div>
          } @empty {
            <div class="text-center py-8 text-slate-400 font-medium bg-white rounded-3xl border border-slate-200">
              No hay usuarios registrados.
            </div>
          }
        </div>

        <!-- Vista Desktop (Tabla) -->
        <div class="hidden md:block bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="border-b border-slate-100 bg-slate-50/50 text-slate-400 text-xs font-bold uppercase tracking-wider">
                <th class="py-4 px-6">Usuario / Perfil</th>
                <th class="py-4 px-6">Rol de Acceso</th>
                <th class="py-4 px-6">Estado</th>
                <th class="py-4 px-6 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 text-sm">
              @for (user of users(); track user.id) {
                <tr class="hover:bg-slate-50/80 transition-colors" [class.opacity-60]="!user.is_active">
                  <td class="py-4 px-6">
                    <div class="flex items-center space-x-4">
                      <div 
                        [class]="user.is_active ? 'bg-cyan-100 text-cyan-700 border-cyan-200' : 'bg-red-100 text-red-600 border-red-200'"
                        class="w-10 h-10 rounded-full flex items-center justify-center font-black text-sm border"
                      >
                        {{ user.full_name?.charAt(0) }}
                      </div>
                      <div>
                        <span class="block font-bold text-slate-800" [class.line-through]="!user.is_active">{{ user.full_name }}</span>
                        <span class="block text-xs font-medium text-slate-500">{{ user.email || 'Oculto (Requiere RPC Admin)' }}</span>
                      </div>
                    </div>
                  </td>
                  <td class="py-4 px-6">
                    <span 
                      [class]="user.role === 'admin' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-slate-50 text-slate-600 border-slate-200'"
                      class="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border shadow-sm"
                    >
                      {{ user.role === 'admin' ? 'Admin' : 'Repartidor' }}
                    </span>
                  </td>
                  <td class="py-4 px-6">
                    <div class="flex items-center space-x-2">
                      <div 
                        [class]="user.is_active ? 'bg-emerald-500' : 'bg-red-500'"
                        class="w-2 h-2 rounded-full"
                      ></div>
                      <span class="text-xs font-bold text-slate-600">
                        {{ user.is_active ? 'Activo' : 'Desactivado' }}
                      </span>
                    </div>
                  </td>
                  <td class="py-4 px-6 text-right">
                    <button 
                      (click)="openEditModal(user)"
                      class="inline-flex items-center justify-center p-2 bg-white border border-slate-200 hover:border-cyan-500 hover:text-cyan-600 text-slate-400 rounded-xl shadow-sm transition-all cursor-pointer active:scale-95"
                    >
                      <svg lucideUserCog class="w-4.5 h-4.5"></svg>
                    </button>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="4" class="text-center py-12 text-slate-400 font-medium">No hay usuarios registrados.</td>
                </tr>
              }
            </tbody>
          </table>
        </div>

      }

    </div>

    <!-- MODAL: Crear Usuario -->
    @if (showCreateModal()) {
      <div class="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
        <!-- Backdrop -->
        <div 
          (click)="closeModals()"
          class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
        ></div>
        
        <!-- Panel -->
        <div class="relative w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden transform transition-all flex flex-col max-h-[90vh]">
          <div class="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <div class="flex items-center space-x-3">
              <div class="p-2 bg-cyan-100 text-cyan-600 rounded-xl">
                <svg lucideUserPlus class="w-5 h-5"></svg>
              </div>
              <h3 class="text-xl font-bold text-slate-800">Registrar Usuario</h3>
            </div>
            <button (click)="closeModals()" class="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full cursor-pointer transition-colors">
              <svg lucideX class="w-5 h-5"></svg>
            </button>
          </div>
          
          <div class="p-6 overflow-y-auto">
            <form [formGroup]="createForm" (ngSubmit)="onSubmitCreate()" class="space-y-5">
              
              <div class="space-y-1.5">
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider">Nombre Completo</label>
                <input 
                  type="text" 
                  formControlName="full_name"
                  class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 outline-none transition-all text-sm font-medium"
                  placeholder="Ej. Juan Pérez"
                >
              </div>

              <div class="space-y-1.5">
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider">Correo Electrónico</label>
                <div class="relative">
                  <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg lucideMail class="w-4 h-4 text-slate-400"></svg>
                  </div>
                  <input 
                    type="email" 
                    formControlName="email"
                    class="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 outline-none transition-all text-sm font-medium"
                    placeholder="juan@ejemplo.com"
                  >
                </div>
              </div>

              <div class="space-y-1.5">
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider">Contraseña Temporal</label>
                <div class="relative">
                  <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg lucideLock class="w-4 h-4 text-slate-400"></svg>
                  </div>
                  <input 
                    type="password" 
                    formControlName="password"
                    class="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 outline-none transition-all text-sm font-medium"
                    placeholder="Mínimo 6 caracteres"
                  >
                </div>
              </div>

              <div class="space-y-1.5 pt-2 border-t border-slate-100">
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">Rol del Usuario</label>
                <div class="grid grid-cols-2 gap-3">
                  <label 
                    class="relative flex flex-col items-center justify-center p-4 cursor-pointer rounded-2xl border-2 transition-all"
                    [class.border-cyan-500]="createForm.get('role')?.value === 'repartidor'"
                    [class.bg-cyan-50]="createForm.get('role')?.value === 'repartidor'"
                    [class.border-slate-100]="createForm.get('role')?.value !== 'repartidor'"
                  >
                    <input type="radio" formControlName="role" value="repartidor" class="sr-only">
                    <div class="p-3 rounded-full mb-2" [class.bg-cyan-500]="createForm.get('role')?.value === 'repartidor'" [class.bg-slate-100]="createForm.get('role')?.value !== 'repartidor'">
                      <svg lucideTruck class="w-6 h-6" [class.text-white]="createForm.get('role')?.value === 'repartidor'" [class.text-slate-400]="createForm.get('role')?.value !== 'repartidor'"></svg>
                    </div>
                    <span class="font-bold text-sm text-slate-800">Repartidor</span>
                  </label>

                  <label 
                    class="relative flex flex-col items-center justify-center p-4 cursor-pointer rounded-2xl border-2 transition-all"
                    [class.border-indigo-500]="createForm.get('role')?.value === 'admin'"
                    [class.bg-indigo-50]="createForm.get('role')?.value === 'admin'"
                    [class.border-slate-100]="createForm.get('role')?.value !== 'admin'"
                  >
                    <input type="radio" formControlName="role" value="admin" class="sr-only">
                    <div class="p-3 rounded-full mb-2" [class.bg-indigo-500]="createForm.get('role')?.value === 'admin'" [class.bg-slate-100]="createForm.get('role')?.value !== 'admin'">
                      <svg lucideShield class="w-6 h-6" [class.text-white]="createForm.get('role')?.value === 'admin'" [class.text-slate-400]="createForm.get('role')?.value !== 'admin'"></svg>
                    </div>
                    <span class="font-bold text-sm text-slate-800">Administrador</span>
                  </label>
                </div>
              </div>

              @if (errorMsg()) {
                <div class="p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs font-semibold">
                  {{ errorMsg() }}
                </div>
              }

              <div class="pt-4 mt-2">
                <button 
                  type="submit"
                  [disabled]="createForm.invalid || submitting()"
                  class="w-full py-3.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-md shadow-slate-900/20 flex justify-center items-center"
                >
                  @if (submitting()) {
                    <span class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  } @else {
                    Crear Cuenta de Usuario
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    }

    <!-- MODAL: Editar Usuario -->
    @if (showEditModal()) {
      <div class="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
        <!-- Backdrop -->
        <div 
          (click)="closeModals()"
          class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
        ></div>
        
        <!-- Panel -->
        <div class="relative w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden transform transition-all flex flex-col max-h-[90vh]">
          <div class="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <div class="flex items-center space-x-3">
              <div class="p-2 bg-slate-800 text-white rounded-xl">
                <svg lucideUserCog class="w-5 h-5"></svg>
              </div>
              <h3 class="text-xl font-bold text-slate-800">Editar Perfil</h3>
            </div>
            <button (click)="closeModals()" class="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full cursor-pointer transition-colors">
              <svg lucideX class="w-5 h-5"></svg>
            </button>
          </div>
          
          <div class="p-6 overflow-y-auto">
            <form [formGroup]="editForm" (ngSubmit)="onSubmitEdit()" class="space-y-5">
              
              <div class="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center space-x-3 mb-2">
                <svg lucideMail class="w-5 h-5 text-slate-400"></svg>
                <div>
                  <span class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cuenta / Correo</span>
                  <span class="font-bold text-slate-700 text-sm">{{ editingUser()?.email || 'Oculto' }}</span>
                </div>
              </div>

              <div class="space-y-1.5">
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider">Nombre Completo</label>
                <input 
                  type="text" 
                  formControlName="full_name"
                  class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 outline-none transition-all text-sm font-medium"
                >
              </div>

              <div class="space-y-1.5 pt-2 border-t border-slate-100">
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">Rol del Usuario</label>
                <div class="grid grid-cols-2 gap-3">
                  <label 
                    class="relative flex items-center p-3 cursor-pointer rounded-xl border-2 transition-all"
                    [class.border-cyan-500]="editForm.get('role')?.value === 'repartidor'"
                    [class.bg-cyan-50]="editForm.get('role')?.value === 'repartidor'"
                    [class.border-slate-100]="editForm.get('role')?.value !== 'repartidor'"
                  >
                    <input type="radio" formControlName="role" value="repartidor" class="sr-only">
                    <span class="font-bold text-sm text-slate-800 ml-2">Repartidor</span>
                  </label>

                  <label 
                    class="relative flex items-center p-3 cursor-pointer rounded-xl border-2 transition-all"
                    [class.border-indigo-500]="editForm.get('role')?.value === 'admin'"
                    [class.bg-indigo-50]="editForm.get('role')?.value === 'admin'"
                    [class.border-slate-100]="editForm.get('role')?.value !== 'admin'"
                  >
                    <input type="radio" formControlName="role" value="admin" class="sr-only">
                    <span class="font-bold text-sm text-slate-800 ml-2">Administrador</span>
                  </label>
                </div>
              </div>

              <div class="space-y-1.5 pt-2 border-t border-slate-100">
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">Estado de la Cuenta</label>
                
                <label class="relative flex items-center justify-between p-4 cursor-pointer rounded-xl border-2 transition-all"
                  [class.border-emerald-500]="editForm.get('is_active')?.value === true"
                  [class.bg-emerald-50]="editForm.get('is_active')?.value === true"
                  [class.border-red-500]="editForm.get('is_active')?.value === false"
                  [class.bg-red-50]="editForm.get('is_active')?.value === false"
                >
                  <div class="flex items-center space-x-3">
                    @if (editForm.get('is_active')?.value) {
                      <svg lucideUserCheck class="w-6 h-6 text-emerald-600"></svg>
                      <div>
                        <span class="block font-bold text-emerald-900 text-sm">Cuenta Activa</span>
                        <span class="block text-xs font-medium text-emerald-700">El usuario puede iniciar sesión</span>
                      </div>
                    } @else {
                      <svg lucideUserX class="w-6 h-6 text-red-600"></svg>
                      <div>
                        <span class="block font-bold text-red-900 text-sm">Cuenta Bloqueada</span>
                        <span class="block text-xs font-medium text-red-700">Se denegará el acceso</span>
                      </div>
                    }
                  </div>
                  
                  <!-- Toggle / Checkbox -->
                  <div class="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" formControlName="is_active" class="sr-only peer">
                    <div class="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                  </div>
                </label>
              </div>

              @if (errorMsg()) {
                <div class="p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs font-semibold">
                  {{ errorMsg() }}
                </div>
              }

              <div class="pt-4 mt-2">
                <button 
                  type="submit"
                  [disabled]="editForm.invalid || submitting()"
                  class="w-full py-3.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-md shadow-slate-900/20 flex justify-center items-center"
                >
                  @if (submitting()) {
                    <span class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  } @else {
                    Guardar Cambios
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    }
  `
})
export class AdminUsersComponent implements OnInit {
  private supabase = inject(SupabaseService);
  private fb = inject(FormBuilder);

  users = signal<any[]>([]);
  loading = signal<boolean>(true);

  // Modals state
  showCreateModal = signal<boolean>(false);
  showEditModal = signal<boolean>(false);
  submitting = signal<boolean>(false);
  errorMsg = signal<string | null>(null);

  editingUser = signal<any>(null);

  // Forms
  createForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    full_name: ['', Validators.required],
    role: ['repartidor', Validators.required]
  });

  editForm: FormGroup = this.fb.group({
    full_name: ['', Validators.required],
    role: ['repartidor', Validators.required],
    is_active: [true, Validators.required]
  });

  ngOnInit() {
    this.loadUsers();
  }

  async loadUsers() {
    this.loading.set(true);
    try {
      const data = await this.supabase.adminGetUsers();
      this.users.set(data || []);
    } catch (e: any) {
      console.error('Error al cargar usuarios:', e);
      alert('Error de Supabase: ' + (e.message || 'Error desconocido') + '\n\nDetalles: Si el error dice "does not exist", verifica que el script SQL se ejecutó correctamente con el rol postgres.');
    } finally {
      this.loading.set(false);
    }
  }

  openCreateModal() {
    this.createForm.reset({ role: 'repartidor' });
    this.errorMsg.set(null);
    this.showCreateModal.set(true);
  }

  openEditModal(user: any) {
    this.editingUser.set(user);
    this.editForm.patchValue({
      full_name: user.full_name,
      role: user.role,
      is_active: user.is_active
    });
    this.errorMsg.set(null);
    this.showEditModal.set(true);
  }

  closeModals() {
    this.showCreateModal.set(false);
    this.showEditModal.set(false);
    this.editingUser.set(null);
  }

  async onSubmitCreate() {
    if (this.createForm.invalid) return;
    this.submitting.set(true);
    this.errorMsg.set(null);

    try {
      const { email, password, full_name, role } = this.createForm.value;
      await this.supabase.adminCreateUser(email, password, full_name, role);

      this.closeModals();
      await this.loadUsers();
    } catch (e: any) {
      console.error(e);
      this.errorMsg.set(e.message || 'Error al crear el usuario. Verifica los datos.');
    } finally {
      this.submitting.set(false);
    }
  }

  async onSubmitEdit() {
    if (this.editForm.invalid || !this.editingUser()) return;
    this.submitting.set(true);
    this.errorMsg.set(null);

    try {
      const userId = this.editingUser().id;
      const updates = this.editForm.value;
      await this.supabase.adminUpdateUserProfile(userId, updates);

      this.closeModals();
      await this.loadUsers();
    } catch (e: any) {
      console.error(e);
      this.errorMsg.set(e.message || 'Error al actualizar el usuario.');
    } finally {
      this.submitting.set(false);
    }
  }
}
