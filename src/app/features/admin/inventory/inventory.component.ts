import { Component, inject, signal, OnInit } from '@angular/core';
import { SupabaseService } from '../../../core/services/supabase.service';
import { 
  LucideWarehouse, 
  LucideCheck, 
  LucideX, 
  LucideAlertCircle, 
  LucideRefreshCw,
  LucideArrowUpRight
} from '@lucide/angular';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';

@Component({
  selector: 'app-admin-inventory',
  standalone: true,
  imports: [
    CommonModule, 
    ReactiveFormsModule,
    FormsModule,
    LucideWarehouse, 
    LucideCheck, 
    LucideX, 
    LucideAlertCircle, 
    LucideRefreshCw,
    LucideArrowUpRight
  ],
  template: `
    <div class="space-y-8">
      
      <!-- Encabezado -->
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-3">
          <div class="p-3 bg-cyan-100 text-cyan-600 rounded-2xl">
            <svg lucideWarehouse class="w-6 h-6"></svg>
          </div>
          <div>
            <h2 class="text-xl font-bold text-slate-800">Inventario General (Bodega)</h2>
            <p class="text-xs text-slate-400 font-semibold uppercase tracking-wider">Control de existencias físicas disponibles en almacén principal</p>
          </div>
        </div>
        
        <button 
          (click)="loadInventory()"
          [disabled]="loading()"
          class="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 rounded-xl transition-all cursor-pointer flex items-center justify-center disabled:opacity-50 active:scale-95"
          title="Refrescar"
        >
          <svg lucideRefreshCw [class.animate-spin]="loading()" class="w-5 h-5"></svg>
        </button>
      </div>

      @if (loading()) {
        <!-- Cargando -->
        <div class="flex flex-col items-center justify-center py-16 space-y-3">
          <span class="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></span>
          <span class="text-sm text-slate-500 font-semibold">Cargando existencias de bodega...</span>
        </div>
      } @else {
        
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          <!-- Lista de Stock por Producto (2/3) -->
          <div class="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm lg:col-span-2 space-y-4">
            <h3 class="font-bold text-slate-800 text-base border-b border-slate-100 pb-3">Existencias Disponibles</h3>
            
            <div class="divide-y divide-slate-100">
              @for (item of inventory(); track item.product_id) {
                <div class="py-4 flex items-center justify-between hover:bg-slate-50/20 px-2 rounded-xl transition-colors">
                  <div>
                    <h4 class="text-sm font-bold text-slate-800">{{ item.products?.name }}</h4>
                    <span class="text-xs text-slate-400 font-semibold uppercase">{{ item.products?.unit }}</span>
                  </div>
                  
                  <div class="flex items-center space-x-6">
                    <div class="text-right">
                      <span class="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Stock Físico</span>
                      <span 
                        [class]="item.stock > 10 ? 'text-slate-800' : 'text-red-500'" 
                        class="text-lg font-black block"
                      >
                        {{ item.stock }}
                      </span>
                    </div>

                    <button 
                      (click)="openAdjustForm(item)"
                      class="px-4 py-2.5 bg-cyan-500/10 hover:bg-cyan-500 hover:text-slate-950 text-cyan-700 font-bold text-xs rounded-xl active:scale-95 transition-all cursor-pointer flex items-center space-x-1"
                    >
                      <svg lucideArrowUpRight class="w-3.5 h-3.5"></svg>
                      <span>Ajustar Stock</span>
                    </button>
                  </div>
                </div>
              } @empty {
                <div class="text-center py-10 text-slate-400 font-medium">No hay existencias registradas. Agrega productos en el catálogo primero.</div>
              }
            </div>
          </div>

          <!-- Formulario de Ajuste de Stock (1/3) -->
          @if (showForm()) {
            <div class="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-5 animate-fadeIn">
              <div class="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 class="font-bold text-slate-800 text-base">Ajustar Inventario</h3>
                <button (click)="closeForm()" class="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-lg cursor-pointer">
                  <svg lucideX class="w-5 h-5"></svg>
                </button>
              </div>

              <div class="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                <span class="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Producto Seleccionado</span>
                <span class="block text-sm font-bold text-slate-800 mt-1">{{ selectedItem()?.products?.name }}</span>
                <span class="block text-xs text-slate-500 font-semibold uppercase mt-0.5">{{ selectedItem()?.products?.unit }} • Stock actual: {{ selectedItem()?.stock }}</span>
              </div>

              @if (errorMessage()) {
                <div class="p-3.5 bg-red-500/10 border border-red-500/20 text-red-700 rounded-xl text-xs font-semibold">
                  {{ errorMessage() }}
                </div>
              }

              <form [formGroup]="adjustForm" (ngSubmit)="onSubmit()" class="space-y-5">
                
                <!-- Tipo de Ajuste -->
                <div>
                  <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Método de Ajuste</label>
                  <div class="grid grid-cols-2 gap-3">
                    <button 
                      type="button"
                      (click)="setAdjustMode('add')"
                      [class]="adjustMode() === 'add' ? 'bg-cyan-500 text-slate-950 font-bold border-transparent' : 'bg-slate-50 text-slate-600 font-semibold border-slate-200'"
                      class="py-3 border rounded-xl text-xs transition-all cursor-pointer text-center"
                    >
                      Añadir Stock (+)
                    </button>
                    <button 
                      type="button"
                      (click)="setAdjustMode('set')"
                      [class]="adjustMode() === 'set' ? 'bg-cyan-500 text-slate-950 font-bold border-transparent' : 'bg-slate-50 text-slate-600 font-semibold border-slate-200'"
                      class="py-3 border rounded-xl text-xs transition-all cursor-pointer text-center"
                    >
                      Definir Stock Fijo (=)
                    </button>
                  </div>
                </div>

                <!-- Cantidad -->
                <div>
                  <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    {{ adjustMode() === 'add' ? 'Cantidad a Añadir' : 'Nuevo Inventario Total' }}
                  </label>
                  <input 
                    type="number" 
                    formControlName="quantity"
                    min="0"
                    placeholder="0"
                    class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-sm font-bold transition-all"
                  />
                  @if (adjustForm.get('quantity')?.touched && adjustForm.get('quantity')?.invalid) {
                    <span class="text-xs text-red-400 mt-1 block">Ingresa una cantidad válida mayor o igual a 0.</span>
                  }
                </div>

                <!-- Botones -->
                <div class="flex space-x-3 pt-3 border-t border-slate-100">
                  <button 
                    type="button" 
                    (click)="closeForm()"
                    class="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-all cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    [disabled]="adjustForm.invalid || actionLoading()"
                    class="flex-1 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-slate-950 font-bold rounded-xl text-xs shadow-md active:scale-95 transition-all cursor-pointer flex items-center justify-center space-x-2"
                  >
                    @if (actionLoading()) {
                      <span class="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></span>
                      <span>Guardando...</span>
                    } @else {
                      <svg lucideCheck class="w-4 h-4"></svg>
                      <span>Aplicar Ajuste</span>
                    }
                  </button>
                </div>

              </form>
            </div>
          }

        </div>

      }

    </div>
  `
})
export class AdminInventoryComponent implements OnInit {
  private supabase = inject(SupabaseService);
  private fb = inject(FormBuilder);

  loading = signal<boolean>(true);
  actionLoading = signal<boolean>(false);
  showForm = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

  inventory = signal<any[]>([]);
  selectedItem = signal<any | null>(null);
  adjustMode = signal<'add' | 'set'>('add'); // 'add' (sumar) o 'set' (fijar)

  adjustForm!: FormGroup;

  ngOnInit() {
    this.initForm();
    this.loadInventory();
  }

  initForm() {
    this.adjustForm = this.fb.group({
      quantity: [0, [Validators.required, Validators.min(0)]]
    });
  }

  async loadInventory() {
    this.loading.set(true);
    try {
      const data = await this.supabase.getGlobalInventory();
      this.inventory.set(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      this.loading.set(false);
    }
  }

  openAdjustForm(item: any) {
    this.errorMessage.set(null);
    this.selectedItem.set(item);
    this.adjustMode.set('add');
    this.adjustForm.setValue({
      quantity: 0
    });
    this.showForm.set(true);
  }

  closeForm() {
    this.showForm.set(false);
    this.selectedItem.set(null);
  }

  setAdjustMode(mode: 'add' | 'set') {
    this.adjustMode.set(mode);
  }

  async onSubmit() {
    if (this.adjustForm.invalid || !this.selectedItem()) return;

    this.actionLoading.set(true);
    this.errorMessage.set(null);

    const item = this.selectedItem();
    const qtyInput = this.adjustForm.value.quantity;

    // Calcular el stock final
    let finalStock = qtyInput;
    if (this.adjustMode() === 'add') {
      finalStock = Number(item.stock) + Number(qtyInput);
    }

    try {
      await this.supabase.updateGlobalStock(item.product_id, finalStock);
      this.showForm.set(false);
      await this.loadInventory();
    } catch (e: any) {
      console.error(e);
      this.errorMessage.set(e.message || 'Error al actualizar el stock en el servidor.');
    } finally {
      this.actionLoading.set(false);
    }
  }
}
