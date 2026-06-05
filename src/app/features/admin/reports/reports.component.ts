import { Component, inject, signal, OnInit } from '@angular/core';
import { SupabaseService } from '../../../core/services/supabase.service';
import { 
  LucideBarChart3, 
  LucideCalendar, 
  LucideUsers, 
  LucideShoppingBag, 
  LucideDollarSign,
  LucideTruck,
  LucideRefreshCw
} from '@lucide/angular';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-admin-reports',
  standalone: true,
  imports: [
    CommonModule, 
    LucideBarChart3, 
    LucideCalendar, 
    LucideUsers, 
    LucideShoppingBag, 
    LucideDollarSign,
    LucideTruck,
    LucideRefreshCw
  ],
  template: `
    <div class="space-y-8">
      
      <!-- Encabezado -->
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-3">
          <div class="p-3 bg-cyan-100 text-cyan-600 rounded-2xl">
            <svg lucideBarChart3 class="w-6 h-6"></svg>
          </div>
          <div>
            <h2 class="text-xl font-bold text-slate-800">Reportes e Informes</h2>
            <p class="text-xs text-slate-400 font-semibold uppercase tracking-wider">Visualiza el rendimiento financiero, ventas y control de stock</p>
          </div>
        </div>
        
        <button 
          (click)="loadActiveTabReport()"
          [disabled]="loading()"
          class="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 rounded-xl transition-all cursor-pointer flex items-center justify-center disabled:opacity-50 active:scale-95"
          title="Refrescar Reporte"
        >
          <svg lucideRefreshCw [class.animate-spin]="loading()" class="w-5 h-5"></svg>
        </button>
      </div>

      <!-- Menú de Pestañas (Tabs) -->
      <div class="flex border-b border-slate-200 overflow-x-auto space-x-2 pb-px max-w-full">
        <button 
          (click)="selectTab('day')"
          [class]="activeTab() === 'day' ? 'border-cyan-500 text-cyan-600 font-bold border-b-2' : 'border-transparent text-slate-400 hover:text-slate-600 font-semibold'"
          class="py-3 px-4 text-xs uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap"
        >
          <span class="flex items-center space-x-1.5">
            <svg lucideCalendar class="w-4 h-4"></svg>
            <span>Por Día</span>
          </span>
        </button>
        
        <button 
          (click)="selectTab('repartidor')"
          [class]="activeTab() === 'repartidor' ? 'border-cyan-500 text-cyan-600 font-bold border-b-2' : 'border-transparent text-slate-400 hover:text-slate-600 font-semibold'"
          class="py-3 px-4 text-xs uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap"
        >
          <span class="flex items-center space-x-1.5">
            <svg lucideUsers class="w-4 h-4"></svg>
            <span>Por Repartidor</span>
          </span>
        </button>

        <button 
          (click)="selectTab('product')"
          [class]="activeTab() === 'product' ? 'border-cyan-500 text-cyan-600 font-bold border-b-2' : 'border-transparent text-slate-400 hover:text-slate-600 font-semibold'"
          class="py-3 px-4 text-xs uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap"
        >
          <span class="flex items-center space-x-1.5">
            <svg lucideShoppingBag class="w-4 h-4"></svg>
            <span>Por Producto</span>
          </span>
        </button>

        <button 
          (click)="selectTab('payment')"
          [class]="activeTab() === 'payment' ? 'border-cyan-500 text-cyan-600 font-bold border-b-2' : 'border-transparent text-slate-400 hover:text-slate-600 font-semibold'"
          class="py-3 px-4 text-xs uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap"
        >
          <span class="flex items-center space-x-1.5">
            <svg lucideDollarSign class="w-4 h-4"></svg>
            <span>Métodos de Pago</span>
          </span>
        </button>

        <button 
          (click)="selectTab('comparison')"
          [class]="activeTab() === 'comparison' ? 'border-cyan-500 text-cyan-600 font-bold border-b-2' : 'border-transparent text-slate-400 hover:text-slate-600 font-semibold'"
          class="py-3 px-4 text-xs uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap"
        >
          <span class="flex items-center space-x-1.5">
            <svg lucideTruck class="w-4 h-4"></svg>
            <span>Cargado vs Vendido vs Restante</span>
          </span>
        </button>
      </div>

      <!-- Contenedor del Reporte Activo -->
      @if (loading()) {
        <div class="flex flex-col items-center justify-center py-16 space-y-3 bg-white border border-slate-200 rounded-3xl shadow-sm">
          <span class="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></span>
          <span class="text-sm text-slate-500 font-semibold">Generando reporte...</span>
        </div>
      } @else {
        
        <div class="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
          
          <!-- PESTAÑA: POR DÍA -->
          @if (activeTab() === 'day') {
            <div class="space-y-4">
              <h3 class="font-bold text-slate-800 text-base border-b border-slate-100 pb-2">Ventas Diarias</h3>
              <div class="overflow-x-auto">
                <table class="w-full text-left border-collapse">
                  <thead>
                    <tr class="border-b border-slate-100 text-slate-400 text-xs font-bold uppercase tracking-wider">
                      <th class="py-3 pr-4">Fecha</th>
                      <th class="py-3 px-4">Cantidad de Ventas</th>
                      <th class="py-3 pl-4 text-right">Ingresos Totales</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100 text-sm">
                    @for (row of dayReport(); track row.date) {
                      <tr class="hover:bg-slate-50/50">
                        <td class="py-4 pr-4 font-bold text-slate-800">{{ row.date | date:'longDate' }}</td>
                        <td class="py-4 px-4 font-semibold text-slate-600">{{ row.total_sales_count }} ventas</td>
                        <td class="py-4 pl-4 text-right font-black text-slate-900">&#36;{{ row.total_sales_amount | number:'1.2-2' }}</td>
                      </tr>
                    } @empty {
                      <tr>
                        <td colspan="3" class="text-center py-8 text-slate-400 font-medium">No hay registros de ventas.</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>
          }

          <!-- PESTAÑA: POR REPARTIDOR -->
          @else if (activeTab() === 'repartidor') {
            <div class="space-y-4">
              <h3 class="font-bold text-slate-800 text-base border-b border-slate-100 pb-2">Rendimiento por Repartidor</h3>
              <div class="overflow-x-auto">
                <table class="w-full text-left border-collapse">
                  <thead>
                    <tr class="border-b border-slate-100 text-slate-400 text-xs font-bold uppercase tracking-wider">
                      <th class="py-3 pr-4">Repartidor</th>
                      <th class="py-3 px-4">Ventas Concretadas</th>
                      <th class="py-3 pl-4 text-right">Total Facturado</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100 text-sm">
                    @for (row of repartidorReport(); track row.repartidor_id) {
                      <tr class="hover:bg-slate-50/50">
                        <td class="py-4 pr-4 font-bold text-slate-800">{{ row.repartidor_name }}</td>
                        <td class="py-4 px-4 font-semibold text-slate-600">{{ row.total_sales_count }} ventas</td>
                        <td class="py-4 pl-4 text-right font-black text-blue-600">&#36;{{ row.total_sales_amount | number:'1.2-2' }}</td>
                      </tr>
                    } @empty {
                      <tr>
                        <td colspan="3" class="text-center py-8 text-slate-400 font-medium">No hay registros de ventas por repartidor.</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>
          }

          <!-- PESTAÑA: POR PRODUCTO -->
          @else if (activeTab() === 'product') {
            <div class="space-y-4">
              <h3 class="font-bold text-slate-800 text-base border-b border-slate-100 pb-2">Volumen de Ventas por Producto</h3>
              <div class="overflow-x-auto">
                <table class="w-full text-left border-collapse">
                  <thead>
                    <tr class="border-b border-slate-100 text-slate-400 text-xs font-bold uppercase tracking-wider">
                      <th class="py-3 pr-4">Producto</th>
                      <th class="py-3 px-4">Presentación</th>
                      <th class="py-3 px-4">Cantidad Vendida</th>
                      <th class="py-3 pl-4 text-right">Total Recaudado</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100 text-sm">
                    @for (row of productReport(); track row.product_id) {
                      <tr class="hover:bg-slate-50/50">
                        <td class="py-4 pr-4 font-bold text-slate-800">{{ row.product_name }}</td>
                        <td class="py-4 px-4 font-semibold text-slate-500">{{ row.product_unit }}</td>
                        <td class="py-4 px-4 font-bold text-slate-700">{{ row.total_quantity_sold }} unidades</td>
                        <td class="py-4 pl-4 text-right font-black text-slate-900">&#36;{{ row.total_sales_amount | number:'1.2-2' }}</td>
                      </tr>
                    } @empty {
                      <tr>
                        <td colspan="4" class="text-center py-8 text-slate-400 font-medium">No hay registros de ventas por producto.</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>
          }

          <!-- PESTAÑA: MÉTODOS DE PAGO -->
          @else if (activeTab() === 'payment') {
            <div class="space-y-4">
              <h3 class="font-bold text-slate-800 text-base border-b border-slate-100 pb-2">Distribución de Ingresos por Métodos de Pago</h3>
              <div class="overflow-x-auto">
                <table class="w-full text-left border-collapse">
                  <thead>
                    <tr class="border-b border-slate-100 text-slate-400 text-xs font-bold uppercase tracking-wider">
                      <th class="py-3 pr-4">Método de Pago</th>
                      <th class="py-3 px-4">Transacciones</th>
                      <th class="py-3 pl-4 text-right">Total Recibido</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100 text-sm">
                    @for (row of paymentReport(); track row.payment_method) {
                      <tr class="hover:bg-slate-50/50">
                        <td class="py-4 pr-4">
                          <span 
                            [class]="{
                              'bg-emerald-50 text-emerald-600 border border-emerald-100': row.payment_method === 'efectivo',
                              'bg-blue-50 text-blue-600 border border-blue-100': row.payment_method === 'transferencia',
                              'bg-slate-50 text-slate-600 border border-slate-100': row.payment_method === 'otro'
                            }"
                            class="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider"
                          >
                            {{ row.payment_method }}
                          </span>
                        </td>
                        <td class="py-4 px-4 font-semibold text-slate-600">{{ row.sales_count }} transacciones</td>
                        <td class="py-4 pl-4 text-right font-black text-slate-900">&#36;{{ row.total_amount | number:'1.2-2' }}</td>
                      </tr>
                    } @empty {
                      <tr>
                        <td colspan="3" class="text-center py-8 text-slate-400 font-medium">No hay registros de transacciones.</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>
          }

          <!-- PESTAÑA: COMPARATIVA CARGADO VS VENDIDO VS RESTANTE -->
          @else if (activeTab() === 'comparison') {
            <div class="space-y-4">
              <h3 class="font-bold text-slate-800 text-base border-b border-slate-100 pb-2">Arqueo e Inventario Móvil por Jornada</h3>
              <div class="overflow-x-auto">
                <table class="w-full text-left border-collapse min-w-[700px]">
                  <thead>
                    <tr class="border-b border-slate-100 text-slate-400 text-xs font-bold uppercase tracking-wider">
                      <th class="py-3 pr-4">Fecha</th>
                      <th class="py-3 px-4">Repartidor</th>
                      <th class="py-3 px-4">Producto</th>
                      <th class="py-3 px-4 text-center">Cargado</th>
                      <th class="py-3 px-4 text-center">Vendido</th>
                      <th class="py-3 px-4 text-center">Diferencia (Restante)</th>
                      <th class="py-3 px-4 text-center">Devuelto a Bodega</th>
                      <th class="py-3 pl-4 text-right">Estado</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100 text-sm">
                    @for (row of comparisonReport(); track $index) {
                      <tr class="hover:bg-slate-50/50">
                        <td class="py-4 pr-4 text-slate-500 font-semibold">{{ row.load_date | date:'mediumDate' }}</td>
                        <td class="py-4 px-4 font-bold text-slate-800">{{ row.repartidor_name }}</td>
                        <td class="py-4 px-4 text-slate-600">
                          {{ row.product_name }} 
                          <span class="block text-[10px] text-slate-400 uppercase font-semibold">{{ row.product_unit }}</span>
                        </td>
                        <td class="py-4 px-4 text-center font-semibold text-slate-700">{{ row.quantity_loaded }}</td>
                        <td class="py-4 px-4 text-center font-bold text-blue-600">{{ row.quantity_sold }}</td>
                        <td class="py-4 px-4 text-center font-bold text-slate-900">{{ row.quantity_remaining }}</td>
                        <td class="py-4 px-4 text-center font-bold text-emerald-600">
                          {{ row.load_status === 'closed' ? row.quantity_returned : '-' }}
                        </td>
                        <td class="py-4 pl-4 text-right">
                          <span 
                            [class]="row.load_status === 'open' ? 'bg-cyan-50 text-cyan-600 border border-cyan-100' : 'bg-slate-100 text-slate-400 border border-slate-200'"
                            class="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                          >
                            {{ row.load_status === 'open' ? 'En ruta' : 'Cerrado' }}
                          </span>
                        </td>
                      </tr>
                    } @empty {
                      <tr>
                        <td colspan="8" class="text-center py-8 text-slate-400 font-medium">No se registran jornadas ni cargas de inventario móvil.</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>
          }

        </div>

      }

    </div>
  `
})
export class AdminReportsComponent implements OnInit {
  private supabase = inject(SupabaseService);

  loading = signal<boolean>(true);
  activeTab = signal<'day' | 'repartidor' | 'product' | 'payment' | 'comparison'>('day');

  // Datos para los reportes
  dayReport = signal<any[]>([]);
  repartidorReport = signal<any[]>([]);
  productReport = signal<any[]>([]);
  paymentReport = signal<any[]>([]);
  comparisonReport = signal<any[]>([]);

  ngOnInit() {
    this.loadActiveTabReport();
  }

  selectTab(tab: 'day' | 'repartidor' | 'product' | 'payment' | 'comparison') {
    this.activeTab.set(tab);
    this.loadActiveTabReport();
  }

  async loadActiveTabReport() {
    this.loading.set(true);
    try {
      const tab = this.activeTab();
      if (tab === 'day') {
        const data = await this.supabase.getReportSalesByDay();
        this.dayReport.set(data || []);
      } else if (tab === 'repartidor') {
        const data = await this.supabase.getReportSalesByRepartidor();
        this.repartidorReport.set(data || []);
      } else if (tab === 'product') {
        const data = await this.supabase.getReportSalesByProduct();
        this.productReport.set(data || []);
      } else if (tab === 'payment') {
        const data = await this.supabase.getReportPaymentMethods();
        this.paymentReport.set(data || []);
      } else if (tab === 'comparison') {
        const data = await this.supabase.getReportLoadVsSoldVsRemaining();
        this.comparisonReport.set(data || []);
      }
    } catch (e) {
      console.error('Error al generar el reporte:', e);
    } finally {
      this.loading.set(false);
    }
  }
}
