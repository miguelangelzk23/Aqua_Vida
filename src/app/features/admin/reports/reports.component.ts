import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { SupabaseService } from '../../../core/services/supabase.service';
import { 
  LucideBarChart3, 
  LucideCalendar, 
  LucideUsers, 
  LucideShoppingBag, 
  LucideDollarSign,
  LucideTruck,
  LucideRefreshCw,
  LucideFilter,
  LucideBanknote,
  LucideSmartphone
} from '@lucide/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

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
    LucideRefreshCw,
    LucideFilter,
    LucideBanknote,
    LucideSmartphone,
    FormsModule
  ],
  template: `
    <div class="space-y-8">
      
      <!-- Encabezado -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div class="flex items-start sm:items-center space-x-4">
          <div class="p-3.5 bg-gradient-to-br from-cyan-500 to-blue-600 text-white rounded-2xl shadow-md shrink-0">
            <svg lucideBarChart3 class="w-6 h-6"></svg>
          </div>
          <div>
            <h2 class="text-2xl font-black text-slate-800 tracking-tight">Reportes e Informes</h2>
            <p class="text-sm text-slate-500 font-medium mt-0.5">Métricas financieras, rendimiento de ventas y arqueo</p>
          </div>
        </div>
        
        <button 
          (click)="loadActiveTabReport()"
          [disabled]="loading()"
          class="w-full sm:w-auto px-6 py-3.5 bg-white border border-slate-200 hover:border-cyan-500 text-slate-700 hover:text-cyan-600 font-bold text-sm rounded-2xl shadow-sm flex items-center justify-center space-x-2 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
          title="Refrescar Reporte"
        >
          <svg lucideRefreshCw [class.animate-spin]="loading()" class="w-4.5 h-4.5"></svg>
          <span class="sm:hidden">Refrescar</span>
        </button>
      </div>

      <!-- Filtros de Fecha -->
      <div class="bg-white border border-slate-200 p-4 rounded-3xl shadow-sm">
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div class="flex items-center space-x-2 text-slate-500 font-bold text-sm">
            <svg lucideFilter class="w-5 h-5 text-cyan-600"></svg>
            <span>Filtro de Fecha:</span>
          </div>
          
          <div class="flex flex-wrap items-center gap-2">
            <button (click)="selectDateFilter('today')" [class]="dateFilter() === 'today' ? 'bg-cyan-100 text-cyan-700 border-cyan-200' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'" class="px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-colors">Hoy</button>
            <button (click)="selectDateFilter('yesterday')" [class]="dateFilter() === 'yesterday' ? 'bg-cyan-100 text-cyan-700 border-cyan-200' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'" class="px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-colors">Ayer</button>
            <button (click)="selectDateFilter('7days')" [class]="dateFilter() === '7days' ? 'bg-cyan-100 text-cyan-700 border-cyan-200' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'" class="px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-colors">Últ. 7 Días</button>
            <button (click)="selectDateFilter('this_week')" [class]="dateFilter() === 'this_week' ? 'bg-cyan-100 text-cyan-700 border-cyan-200' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'" class="px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-colors">Esta Semana</button>
            <button (click)="selectDateFilter('this_month')" [class]="dateFilter() === 'this_month' ? 'bg-cyan-100 text-cyan-700 border-cyan-200' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'" class="px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-colors">Este Mes</button>
            <button (click)="selectDateFilter('30days')" [class]="dateFilter() === '30days' ? 'bg-cyan-100 text-cyan-700 border-cyan-200' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'" class="px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-colors">Últ. 30 Días</button>
            <button (click)="selectDateFilter('all_time')" [class]="dateFilter() === 'all_time' ? 'bg-cyan-100 text-cyan-700 border-cyan-200' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'" class="px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-colors">Máximo</button>
            <button (click)="selectDateFilter('custom')" [class]="dateFilter() === 'custom' ? 'bg-cyan-100 text-cyan-700 border-cyan-200' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'" class="px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-colors">Personalizado</button>
          </div>
        </div>

        @if (dateFilter() === 'custom') {
          <div class="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row items-center gap-4">
            <div class="flex-1 w-full flex items-center space-x-3">
              <label class="text-xs font-bold text-slate-500 uppercase">Desde:</label>
              <input type="date" [ngModel]="customStartDate()" (ngModelChange)="customStartDate.set($event)" class="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:border-cyan-500">
            </div>
            <div class="flex-1 w-full flex items-center space-x-3">
              <label class="text-xs font-bold text-slate-500 uppercase">Hasta:</label>
              <input type="date" [ngModel]="customEndDate()" (ngModelChange)="customEndDate.set($event)" class="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:border-cyan-500">
            </div>
            <button (click)="loadActiveTabReport()" class="w-full sm:w-auto px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-sm transition-colors cursor-pointer">
              Aplicar Fechas
            </button>
          </div>
        }
      </div>

      <!-- Menú de Pestañas (Segmented Control / Pills) -->
      <div class="flex overflow-x-auto space-x-2 pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <button 
          (click)="selectTab('day')"
          [class]="activeTab() === 'day' ? 'bg-slate-900 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'"
          class="flex items-center space-x-2 py-2.5 px-5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap shrink-0"
        >
          <svg lucideCalendar class="w-4 h-4"></svg>
          <span>Por Día</span>
        </button>
        
        <button 
          (click)="selectTab('repartidor')"
          [class]="activeTab() === 'repartidor' ? 'bg-slate-900 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'"
          class="flex items-center space-x-2 py-2.5 px-5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap shrink-0"
        >
          <svg lucideUsers class="w-4 h-4"></svg>
          <span>Por Repartidor</span>
        </button>

        <button 
          (click)="selectTab('product')"
          [class]="activeTab() === 'product' ? 'bg-slate-900 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'"
          class="flex items-center space-x-2 py-2.5 px-5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap shrink-0"
        >
          <svg lucideShoppingBag class="w-4 h-4"></svg>
          <span>Por Producto</span>
        </button>

        <button 
          (click)="selectTab('payment')"
          [class]="activeTab() === 'payment' ? 'bg-slate-900 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'"
          class="flex items-center space-x-2 py-2.5 px-5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap shrink-0"
        >
          <svg lucideDollarSign class="w-4 h-4"></svg>
          <span>Pagos</span>
        </button>

        <button 
          (click)="selectTab('comparison')"
          [class]="activeTab() === 'comparison' ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-md border-transparent' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'"
          class="flex items-center space-x-2 py-2.5 px-5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap shrink-0"
        >
          <svg lucideTruck class="w-4 h-4"></svg>
          <span>Arqueo (Carga vs Venta)</span>
        </button>
      </div>

      <!-- Contenedor del Reporte Activo -->
      @if (loading()) {
        <div class="flex flex-col items-center justify-center py-16 space-y-3 bg-white border border-slate-200 rounded-3xl shadow-sm">
          <span class="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></span>
          <span class="text-sm text-slate-500 font-semibold">Generando analíticas...</span>
        </div>
      } @else {
        
        <div class="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
          
          <!-- PESTAÑA: POR DÍA -->
          @if (activeTab() === 'day') {
            
            <!-- KPIs -->
            @if (dayKPIs(); as kpis) {
              <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div class="bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl p-5 text-white shadow-md relative overflow-hidden">
                  <div class="absolute right-0 top-0 opacity-20">
                    <svg lucideDollarSign class="w-24 h-24 transform translate-x-4 -translate-y-4"></svg>
                  </div>
                  <span class="block text-[10px] font-bold uppercase tracking-wider text-cyan-100 mb-1">Ingresos Totales (Periodo)</span>
                  <span class="text-3xl font-black">&#36;{{ kpis.totalRevenue | number:'1.2-2' }}</span>
                </div>
                
                <div class="bg-slate-50 border border-slate-100 rounded-2xl p-5 shadow-inner">
                  <span class="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Promedio Diario</span>
                  <span class="text-2xl font-black text-slate-800">&#36;{{ kpis.avgRevenue | number:'1.2-2' }}</span>
                </div>

                <div class="bg-slate-50 border border-slate-100 rounded-2xl p-5 shadow-inner">
                  <span class="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Total Ventas Registradas</span>
                  <span class="text-2xl font-black text-slate-800">{{ kpis.totalSales }}</span>
                </div>
              </div>
            }

            <div class="space-y-4">
              <h3 class="font-bold text-slate-800 text-base border-b border-slate-100 pb-2">Desglose Diario</h3>
              
              <!-- Vista Móvil -->
              <div class="grid grid-cols-1 gap-3 md:hidden">
                @for (row of dayReport(); track row.date) {
                  <div class="bg-white border border-slate-150 rounded-2xl p-5 shadow-sm space-y-4">
                    <div class="flex justify-between items-start">
                      <span class="text-sm font-bold text-slate-800 uppercase">{{ row.date | date:'longDate' }}</span>
                      <span class="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">{{ row.total_sales_count }} ventas</span>
                    </div>
                    <div>
                      <span class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Ingresos del Día</span>
                      <span class="text-2xl font-black text-cyan-600">&#36;{{ row.total_sales_amount | number:'1.2-2' }}</span>
                    </div>
                  </div>
                } @empty {
                  <div class="text-center py-6 text-sm text-slate-400 font-medium bg-slate-50 rounded-2xl border border-slate-100">No hay registros de ventas.</div>
                }
              </div>
              
              <!-- Vista Desktop -->
              <div class="hidden md:block overflow-x-auto">
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
                        <td class="py-4 px-4 font-semibold text-slate-600">
                          <span class="bg-slate-100 px-2.5 py-1 rounded-md">{{ row.total_sales_count }} ventas</span>
                        </td>
                        <td class="py-4 pl-4 text-right font-black text-cyan-600 text-lg">&#36;{{ row.total_sales_amount | number:'1.2-2' }}</td>
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
            
            <!-- KPIs -->
            @if (repartidorKPIs(); as kpis) {
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div class="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-5 text-white shadow-md relative overflow-hidden">
                  <div class="absolute right-0 top-0 opacity-20">
                    <svg lucideUsers class="w-24 h-24 transform translate-x-4 -translate-y-4"></svg>
                  </div>
                  <span class="block text-[10px] font-bold uppercase tracking-wider text-indigo-100 mb-1">Mejor Vendedor</span>
                  <span class="text-2xl font-black mb-1 truncate">{{ kpis.topSeller || 'N/A' }}</span>
                  <span class="text-sm font-semibold text-indigo-200">&#36;{{ kpis.topSellerRevenue || 0 | number:'1.2-2' }} recaudado</span>
                </div>
                
                <div class="bg-slate-50 border border-slate-100 rounded-2xl p-5 shadow-inner">
                  <span class="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Total Global Facturado</span>
                  <span class="text-3xl font-black text-slate-800">&#36;{{ kpis.totalRevenue | number:'1.2-2' }}</span>
                </div>
              </div>
            }

            <div class="space-y-4">
              <h3 class="font-bold text-slate-800 text-base border-b border-slate-100 pb-2">Rendimiento por Repartidor</h3>
              
              <!-- Vista Móvil -->
              <div class="grid grid-cols-1 gap-3 md:hidden">
                @for (row of repartidorReport(); track row.repartidor_id) {
                  <div class="bg-white border border-slate-150 rounded-2xl p-5 shadow-sm space-y-4">
                    <div class="flex justify-between items-start">
                      <span class="text-sm font-bold text-slate-800">{{ row.repartidor_name }}</span>
                      <span class="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">{{ row.total_sales_count }} ventas</span>
                    </div>
                    <div>
                      <span class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Total Facturado</span>
                      <span class="text-2xl font-black text-indigo-600">&#36;{{ row.total_sales_amount | number:'1.2-2' }}</span>
                      
                      <div class="mt-3 pt-3 border-t border-slate-100 grid grid-cols-3 gap-2">
                        <div>
                          <span class="block text-[9px] font-bold text-slate-400 uppercase flex items-center gap-1"><svg lucideBanknote class="w-3 h-3"></svg> Efectivo</span>
                          <span class="block text-sm font-black text-emerald-600 mt-0.5">&#36;{{ row.cash_amount || 0 | number:'1.2-2' }}</span>
                        </div>
                        <div>
                          <span class="block text-[9px] font-bold text-slate-400 uppercase flex items-center gap-1"><svg lucideSmartphone class="w-3 h-3"></svg> Transf.</span>
                          <span class="block text-sm font-black text-blue-600 mt-0.5">&#36;{{ row.transfer_amount || 0 | number:'1.2-2' }}</span>
                        </div>
                        <div>
                          <span class="block text-[9px] font-bold text-slate-400 uppercase">Otros</span>
                          <span class="block text-sm font-black text-slate-600 mt-0.5">&#36;{{ row.other_amount || 0 | number:'1.2-2' }}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                } @empty {
                  <div class="text-center py-6 text-sm text-slate-400 font-medium bg-slate-50 rounded-2xl border border-slate-100">No hay registros de ventas por repartidor.</div>
                }
              </div>
              
              <!-- Vista Desktop -->
              <div class="hidden md:block overflow-x-auto">
                <table class="w-full text-left border-collapse">
                  <thead>
                    <tr class="border-b border-slate-100 text-slate-400 text-xs font-bold uppercase tracking-wider">
                      <th class="py-3 pr-4">Repartidor</th>
                      <th class="py-3 px-4 text-center">Ventas</th>
                      <th class="py-3 px-4">Desglose de Ingresos</th>
                      <th class="py-3 pl-4 text-right">Total Facturado</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100 text-sm">
                    @for (row of repartidorReport(); track row.repartidor_id) {
                      <tr class="hover:bg-slate-50/50">
                        <td class="py-4 pr-4 font-bold text-slate-800">
                          <div class="flex items-center space-x-3">
                            <div class="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-black text-xs">
                              {{ row.repartidor_name.charAt(0) }}
                            </div>
                            <span>{{ row.repartidor_name }}</span>
                          </div>
                        </td>
                        <td class="py-4 px-4 font-semibold text-slate-600 text-center">
                          <span class="bg-slate-100 px-2.5 py-1 rounded-md">{{ row.total_sales_count }}</span>
                        </td>
                        <td class="py-4 px-4">
                          <div class="flex flex-wrap items-center gap-2">
                            <div class="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-lg border border-emerald-100">
                              <svg lucideBanknote class="w-3.5 h-3.5"></svg>
                              <span class="text-xs font-black">&#36;{{ row.cash_amount || 0 | number:'1.2-2' }}</span>
                            </div>
                            <div class="flex items-center gap-1.5 bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg border border-blue-100">
                              <svg lucideSmartphone class="w-3.5 h-3.5"></svg>
                              <span class="text-xs font-black">&#36;{{ row.transfer_amount || 0 | number:'1.2-2' }}</span>
                            </div>
                            @if (row.other_amount && row.other_amount > 0) {
                              <div class="flex items-center gap-1.5 bg-slate-50 text-slate-600 px-2.5 py-1 rounded-lg border border-slate-200">
                                <span class="text-[10px] font-bold uppercase tracking-wider">Otros:</span>
                                <span class="text-xs font-black">&#36;{{ row.other_amount | number:'1.2-2' }}</span>
                              </div>
                            }
                          </div>
                        </td>
                        <td class="py-4 pl-4 text-right font-black text-indigo-600 text-lg">&#36;{{ row.total_sales_amount | number:'1.2-2' }}</td>
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
            
            <!-- KPIs -->
            @if (productKPIs(); as kpis) {
              <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div class="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-5 text-white shadow-md relative overflow-hidden">
                  <div class="absolute right-0 top-0 opacity-20">
                    <svg lucideShoppingBag class="w-24 h-24 transform translate-x-4 -translate-y-4"></svg>
                  </div>
                  <span class="block text-[10px] font-bold uppercase tracking-wider text-emerald-100 mb-1">Producto Estrella</span>
                  <span class="text-2xl font-black mb-1 truncate">{{ kpis.topProduct || 'N/A' }}</span>
                  <span class="text-sm font-semibold text-emerald-100">{{ kpis.topProductUnits || 0 }} unidades vendidas</span>
                </div>
                
                <div class="bg-slate-50 border border-slate-100 rounded-2xl p-5 shadow-inner">
                  <span class="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Volumen Total (Unidades)</span>
                  <span class="text-3xl font-black text-slate-800">{{ kpis.totalUnits }}</span>
                </div>

                <div class="bg-slate-50 border border-slate-100 rounded-2xl p-5 shadow-inner">
                  <span class="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Recaudación Global</span>
                  <span class="text-2xl font-black text-slate-800">&#36;{{ kpis.totalRevenue | number:'1.2-2' }}</span>
                </div>
              </div>
            }

            <div class="space-y-4">
              <h3 class="font-bold text-slate-800 text-base border-b border-slate-100 pb-2">Volumen de Ventas por Producto</h3>
              
              <!-- Vista Móvil -->
              <div class="grid grid-cols-1 gap-3 md:hidden">
                @for (row of productReport(); track row.product_id) {
                  <div class="bg-white border border-slate-150 rounded-2xl p-5 shadow-sm space-y-4">
                    <div class="flex justify-between items-start">
                      <div>
                        <span class="block font-bold text-slate-800">{{ row.product_name }}</span>
                        <span class="block text-xs font-semibold text-slate-500 uppercase mt-0.5">{{ row.product_unit }}</span>
                      </div>
                      <span class="text-xs font-bold text-slate-700 bg-emerald-50 text-emerald-700 border border-emerald-100 px-2.5 py-1 rounded-lg">{{ row.total_quantity_sold }} unid.</span>
                    </div>
                    <div>
                      <span class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Total Recaudado</span>
                      <span class="text-2xl font-black text-emerald-600">&#36;{{ row.total_sales_amount | number:'1.2-2' }}</span>
                    </div>
                  </div>
                } @empty {
                  <div class="text-center py-6 text-sm text-slate-400 font-medium bg-slate-50 rounded-2xl border border-slate-100">No hay registros de ventas por producto.</div>
                }
              </div>
              
              <!-- Vista Desktop -->
              <div class="hidden md:block overflow-x-auto">
                <table class="w-full text-left border-collapse">
                  <thead>
                    <tr class="border-b border-slate-100 text-slate-400 text-xs font-bold uppercase tracking-wider">
                      <th class="py-3 pr-4">Producto</th>
                      <th class="py-3 px-4">Presentación</th>
                      <th class="py-3 px-4 text-center">Cantidad Vendida</th>
                      <th class="py-3 pl-4 text-right">Total Recaudado</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100 text-sm">
                    @for (row of productReport(); track row.product_id) {
                      <tr class="hover:bg-slate-50/50">
                        <td class="py-4 pr-4 font-bold text-slate-800">{{ row.product_name }}</td>
                        <td class="py-4 px-4 font-semibold text-slate-500 text-xs uppercase tracking-wider">{{ row.product_unit }}</td>
                        <td class="py-4 px-4 font-black text-emerald-600 text-center text-lg">{{ row.total_quantity_sold }}</td>
                        <td class="py-4 pl-4 text-right font-black text-slate-900 text-lg">&#36;{{ row.total_sales_amount | number:'1.2-2' }}</td>
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
            
            <!-- KPIs -->
            @if (paymentKPIs(); as kpis) {
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div class="bg-slate-900 rounded-2xl p-5 text-white shadow-md relative overflow-hidden">
                  <div class="absolute right-0 top-0 opacity-10">
                    <svg lucideDollarSign class="w-24 h-24 transform translate-x-4 -translate-y-4"></svg>
                  </div>
                  <span class="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Método Principal</span>
                  <span class="text-2xl font-black mb-1 capitalize">{{ kpis.topMethod || 'N/A' }}</span>
                </div>
                
                <div class="bg-slate-50 border border-slate-100 rounded-2xl p-5 shadow-inner">
                  <span class="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Total Ingresos (Todos los métodos)</span>
                  <span class="text-3xl font-black text-slate-800">&#36;{{ kpis.totalRevenue | number:'1.2-2' }}</span>
                </div>
              </div>
            }

            <div class="space-y-4">
              <h3 class="font-bold text-slate-800 text-base border-b border-slate-100 pb-2">Distribución por Métodos de Pago</h3>
              
              <!-- Vista Móvil -->
              <div class="grid grid-cols-1 gap-3 md:hidden">
                @for (row of paymentReport(); track row.payment_method) {
                  <div class="bg-white border border-slate-150 rounded-2xl p-5 shadow-sm space-y-4">
                    <div class="flex justify-between items-center">
                      <span 
                        [class]="{
                          'bg-emerald-50 text-emerald-600 border-emerald-200': row.payment_method === 'efectivo',
                          'bg-blue-50 text-blue-600 border-blue-200': row.payment_method === 'transferencia',
                          'bg-slate-50 text-slate-600 border-slate-200': row.payment_method === 'otro'
                        }"
                        class="px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider border"
                      >
                        {{ row.payment_method }}
                      </span>
                      <span class="text-xs font-semibold text-slate-500">{{ row.sales_count }} trans.</span>
                    </div>
                    <div>
                      <span class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Monto Recibido</span>
                      <span class="text-2xl font-black text-slate-900">&#36;{{ row.total_amount | number:'1.2-2' }}</span>
                    </div>
                  </div>
                } @empty {
                  <div class="text-center py-6 text-sm text-slate-400 font-medium bg-slate-50 rounded-2xl border border-slate-100">No hay registros de transacciones.</div>
                }
              </div>
              
              <!-- Vista Desktop -->
              <div class="hidden md:block overflow-x-auto">
                <table class="w-full text-left border-collapse">
                  <thead>
                    <tr class="border-b border-slate-100 text-slate-400 text-xs font-bold uppercase tracking-wider">
                      <th class="py-3 pr-4">Método de Pago</th>
                      <th class="py-3 px-4">Volumen de Transacciones</th>
                      <th class="py-3 pl-4 text-right">Total Recibido</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100 text-sm">
                    @for (row of paymentReport(); track row.payment_method) {
                      <tr class="hover:bg-slate-50/50">
                        <td class="py-4 pr-4">
                          <span 
                            [class]="{
                              'bg-emerald-50 text-emerald-600 border-emerald-200': row.payment_method === 'efectivo',
                              'bg-blue-50 text-blue-600 border-blue-200': row.payment_method === 'transferencia',
                              'bg-slate-50 text-slate-600 border-slate-200': row.payment_method === 'otro'
                            }"
                            class="px-3.5 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider border"
                          >
                            {{ row.payment_method }}
                          </span>
                        </td>
                        <td class="py-4 px-4 font-semibold text-slate-600 text-base">{{ row.sales_count }} transacciones</td>
                        <td class="py-4 pl-4 text-right font-black text-slate-900 text-lg">&#36;{{ row.total_amount | number:'1.2-2' }}</td>
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

          <!-- PESTAÑA: COMPARATIVA CARGADO VS VENDIDO VS RESTANTE (ARQUEO) -->
          @else if (activeTab() === 'comparison') {
            <div class="space-y-4">
              <div class="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 class="font-bold text-slate-800 text-base">Arqueo e Inventario Móvil por Jornada</h3>
                <span class="text-[10px] text-slate-400 font-bold uppercase tracking-wider hidden sm:block">Control de Eficiencia</span>
              </div>
              
              <!-- Vista Móvil -->
              <div class="grid grid-cols-1 gap-4 md:hidden">
                @for (group of groupedComparisonReport(); track group.daily_load_id) {
                  <div class="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 relative overflow-hidden">
                    <div class="absolute right-0 top-0 w-2 h-full" 
                         [class]="group.load_status === 'open' ? 'bg-amber-400' : 'bg-slate-300'">
                    </div>
                    
                    <!-- Header: Repartidor y Fecha -->
                    <div class="border-b border-slate-100 pb-3">
                      <div class="flex justify-between items-start">
                        <div>
                          <span class="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Jornada - {{ group.load_date | date:'longDate' }}</span>
                          <span class="block font-black text-slate-800 text-lg">{{ group.repartidor_name }}</span>
                        </div>
                        <span 
                          [class]="group.load_status === 'open' ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-slate-100 text-slate-500 border-slate-200'"
                          class="px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border shadow-sm"
                        >
                          {{ group.load_status === 'open' ? 'En ruta' : 'Cerrado' }}
                        </span>
                      </div>
                    </div>
                    
                    <!-- Productos de la Jornada -->
                    <div class="space-y-4">
                      @for (product of group.products; track $index) {
                        <div class="bg-slate-50 border border-slate-100 rounded-xl p-3">
                          <span class="block text-sm font-bold text-slate-700 mb-2">{{ product.product_name }} <span class="text-[10px] text-slate-400 uppercase font-semibold">({{ product.product_unit }})</span></span>
                          
                          <div class="flex items-center justify-between text-[10px] font-bold mb-1.5">
                            <span class="text-blue-600 uppercase">Vendido: {{ product.quantity_sold }}</span>
                            <span class="text-slate-400 uppercase">Restante: {{ product.quantity_remaining }}</span>
                          </div>
                          <div class="w-full bg-slate-200 rounded-full h-2 overflow-hidden flex shadow-inner">
                            @if (product.quantity_loaded > 0) {
                              <div class="bg-gradient-to-r from-blue-500 to-blue-400 h-full transition-all" [style.width.%]="(product.quantity_sold / product.quantity_loaded) * 100"></div>
                              <div class="bg-slate-300 h-full transition-all" [style.width.%]="(product.quantity_remaining / product.quantity_loaded) * 100"></div>
                            } @else {
                              <div class="bg-slate-300 h-full w-full"></div>
                            }
                          </div>
                          
                          <div class="flex justify-between items-center mt-2 border-t border-slate-200/60 pt-2">
                            <span class="block text-[9px] font-bold text-slate-500 uppercase">Carga: <span class="text-slate-800">{{ product.quantity_loaded }}</span></span>
                            @if (group.load_status === 'closed') {
                              <span class="block text-[9px] font-bold text-emerald-600 uppercase">Devuelto: {{ product.quantity_returned }}</span>
                            }
                          </div>
                        </div>
                      }
                    </div>
                  </div>
                } @empty {
                  <div class="text-center py-6 text-sm text-slate-400 font-medium bg-slate-50 rounded-2xl border border-slate-100">No se registran jornadas ni cargas de inventario móvil.</div>
                }
              </div>
              
              <!-- Vista Desktop -->
              <div class="hidden md:block space-y-6">
                @for (group of groupedComparisonReport(); track group.daily_load_id) {
                  <div class="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                    <!-- Header Jornada -->
                    <div class="bg-slate-50 border-b border-slate-200 p-4 flex justify-between items-center">
                      <div class="flex items-center space-x-4">
                        <div class="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-black">
                          <svg lucideUser class="w-5 h-5"></svg>
                        </div>
                        <div>
                          <span class="block font-black text-slate-800 text-lg">{{ group.repartidor_name }}</span>
                          <span class="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Jornada: {{ group.load_date | date:'longDate' }}</span>
                        </div>
                      </div>
                      
                      <span 
                        [class]="group.load_status === 'open' ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-slate-100 text-slate-500 border-slate-200'"
                        class="px-3.5 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider border shadow-sm"
                      >
                        {{ group.load_status === 'open' ? 'En ruta (Abierta)' : 'Cerrada' }}
                      </span>
                    </div>

                    <!-- Tabla de Productos -->
                    <div class="overflow-x-auto">
                      <table class="w-full text-left border-collapse min-w-[700px]">
                        <thead>
                          <tr class="border-b border-slate-100 text-slate-400 text-[10px] font-bold uppercase tracking-wider bg-slate-50/50">
                            <th class="py-3 px-5">Producto</th>
                            <th class="py-3 px-4 w-1/3">Progreso de Ventas</th>
                            <th class="py-3 px-4 text-center">Cargado</th>
                            <th class="py-3 px-4 text-center">Vendido</th>
                            <th class="py-3 pr-5 text-center">Devuelto a Bodega</th>
                          </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100 text-sm">
                          @for (product of group.products; track $index) {
                            <tr class="hover:bg-slate-50/30 transition-colors">
                              <td class="py-4 px-5">
                                <span class="block font-bold text-slate-700">{{ product.product_name }}</span>
                                <span class="block text-[10px] font-semibold text-slate-400 uppercase mt-0.5">{{ product.product_unit }}</span>
                              </td>
                              
                              <!-- Progress Bar Column -->
                              <td class="py-4 px-4">
                                <div class="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden flex shadow-inner">
                                  @if (product.quantity_loaded > 0) {
                                    <div class="bg-gradient-to-r from-blue-500 to-blue-400 h-full transition-all" [style.width.%]="(product.quantity_sold / product.quantity_loaded) * 100"></div>
                                    <div class="bg-slate-300 h-full transition-all" [style.width.%]="(product.quantity_remaining / product.quantity_loaded) * 100"></div>
                                  } @else {
                                    <div class="bg-slate-200 h-full w-full"></div>
                                  }
                                </div>
                                <div class="flex items-center justify-between text-[9px] font-bold mt-1.5 px-1">
                                  <span class="text-blue-500 uppercase">{{ (product.quantity_sold / product.quantity_loaded) * 100 | number:'1.0-0' }}% Vendido</span>
                                  <span class="text-slate-400 uppercase">{{ product.quantity_remaining }} en ruta</span>
                                </div>
                              </td>

                              <td class="py-4 px-4 text-center font-black text-slate-800">{{ product.quantity_loaded }}</td>
                              <td class="py-4 px-4 text-center font-black text-blue-600">{{ product.quantity_sold }}</td>
                              
                              <td class="py-4 pr-5 text-center font-bold text-emerald-600">
                                {{ group.load_status === 'closed' ? product.quantity_returned : '-' }}
                              </td>
                            </tr>
                          }
                        </tbody>
                      </table>
                    </div>
                  </div>
                } @empty {
                  <div class="text-center py-10 bg-slate-50 rounded-2xl border border-slate-200">
                    <span class="block text-slate-400 font-medium mb-2">No se registran jornadas ni cargas de inventario.</span>
                    <span class="block text-xs text-slate-400">Intenta ampliando el rango de fechas.</span>
                  </div>
                }
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

  // Filtros de fecha
  dateFilter = signal<'today' | 'yesterday' | '7days' | 'this_week' | 'this_month' | '30days' | 'all_time' | 'custom'>('today');
  customStartDate = signal<string>('');
  customEndDate = signal<string>('');

  // Datos para los reportes
  dayReport = signal<any[]>([]);
  repartidorReport = signal<any[]>([]);
  productReport = signal<any[]>([]);
  paymentReport = signal<any[]>([]);
  comparisonReport = signal<any[]>([]);

  // Agrupar comparación por Jornada (Repartidor + Fecha)
  groupedComparisonReport = computed(() => {
    const report = this.comparisonReport();
    if (!report || report.length === 0) return [];
    
    const groups = new Map<string, any>();
    
    for (const row of report) {
      if (!groups.has(row.daily_load_id)) {
        groups.set(row.daily_load_id, {
          daily_load_id: row.daily_load_id,
          repartidor_name: row.repartidor_name,
          load_date: row.load_date,
          load_status: row.load_status,
          products: []
        });
      }
      groups.get(row.daily_load_id).products.push({
        product_name: row.product_name,
        product_unit: row.product_unit,
        quantity_loaded: row.quantity_loaded,
        quantity_sold: row.quantity_sold,
        quantity_remaining: row.quantity_remaining,
        quantity_returned: row.quantity_returned
      });
    }
    
    return Array.from(groups.values());
  });

  // Computed KPIs
  dayKPIs = computed(() => {
    const data = this.dayReport();
    if (!data.length) return null;
    const totalRevenue = data.reduce((sum, row) => sum + Number(row.total_sales_amount), 0);
    const totalSales = data.reduce((sum, row) => sum + Number(row.total_sales_count), 0);
    const avgRevenue = totalRevenue / data.length;
    return { totalRevenue, totalSales, avgRevenue };
  });

  repartidorKPIs = computed(() => {
    const data = this.repartidorReport();
    if (!data.length) return null;
    const totalRevenue = data.reduce((sum, row) => sum + Number(row.total_sales_amount), 0);
    const topSeller = [...data].sort((a, b) => Number(b.total_sales_amount) - Number(a.total_sales_amount))[0];
    return { totalRevenue, topSeller: topSeller.repartidor_name, topSellerRevenue: topSeller.total_sales_amount };
  });

  productKPIs = computed(() => {
    const data = this.productReport();
    if (!data.length) return null;
    const totalUnits = data.reduce((sum, row) => sum + Number(row.total_quantity_sold), 0);
    const totalRevenue = data.reduce((sum, row) => sum + Number(row.total_sales_amount), 0);
    const topProduct = [...data].sort((a, b) => Number(b.total_quantity_sold) - Number(a.total_quantity_sold))[0];
    return { totalUnits, totalRevenue, topProduct: topProduct.product_name, topProductUnits: topProduct.total_quantity_sold };
  });

  paymentKPIs = computed(() => {
    const data = this.paymentReport();
    if (!data.length) return null;
    const totalRevenue = data.reduce((sum, row) => sum + Number(row.total_amount), 0);
    const totalTransactions = data.reduce((sum, row) => sum + Number(row.sales_count), 0);
    const topMethod = [...data].sort((a, b) => Number(b.total_amount) - Number(a.total_amount))[0];
    return { totalRevenue, totalTransactions, topMethod: topMethod.payment_method };
  });

  ngOnInit() {
    this.loadActiveTabReport();
  }

  selectTab(tab: 'day' | 'repartidor' | 'product' | 'payment' | 'comparison') {
    this.activeTab.set(tab);
    this.loadActiveTabReport();
  }

  selectDateFilter(filter: 'today' | 'yesterday' | '7days' | 'this_week' | 'this_month' | '30days' | 'all_time' | 'custom') {
    this.dateFilter.set(filter);
    
    // Si no es custom, recargar inmediatamente. Si es custom, el usuario debe dar click en "Aplicar".
    if (filter !== 'custom') {
      this.loadActiveTabReport();
    }
  }

  private getDateRange(): { startDate: string | undefined, endDate: string | undefined } {
    const filter = this.dateFilter();
    
    if (filter === 'custom') {
      let sDate = this.customStartDate();
      let eDate = this.customEndDate();
      if (sDate && eDate) {
        // Asumiendo que el input 'date' devuelve YYYY-MM-DD
        const start = new Date(sDate + 'T00:00:00');
        const end = new Date(eDate + 'T23:59:59.999');
        return { startDate: start.toISOString(), endDate: end.toISOString() };
      }
      return { startDate: undefined, endDate: undefined };
    }

    if (filter === 'all_time') {
      return { startDate: undefined, endDate: undefined };
    }

    const today = new Date();
    
    // Función para obtener inicio y fin exactos del día en zona local
    const getDayBoundaries = (d: Date) => {
      const start = new Date(d);
      start.setHours(0, 0, 0, 0);
      const end = new Date(d);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    };

    let startDate: Date;
    let endDate: Date;
    
    switch (filter) {
      case 'today': {
        const bounds = getDayBoundaries(today);
        startDate = bounds.start;
        endDate = bounds.end;
        break;
      }
      case 'yesterday': {
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const bounds = getDayBoundaries(yesterday);
        startDate = bounds.start;
        endDate = bounds.end;
        break;
      }
      case '7days': {
        const start = new Date(today);
        start.setDate(today.getDate() - 6);
        startDate = getDayBoundaries(start).start;
        endDate = getDayBoundaries(today).end;
        break;
      }
      case '30days': {
        const start = new Date(today);
        start.setDate(today.getDate() - 29);
        startDate = getDayBoundaries(start).start;
        endDate = getDayBoundaries(today).end;
        break;
      }
      case 'this_week': {
        const start = new Date(today);
        const dayOfWeek = start.getDay() || 7;
        start.setDate(today.getDate() - dayOfWeek + 1);
        startDate = getDayBoundaries(start).start;
        endDate = getDayBoundaries(today).end;
        break;
      }
      case 'this_month': {
        const start = new Date(today.getFullYear(), today.getMonth(), 1);
        startDate = getDayBoundaries(start).start;
        endDate = getDayBoundaries(today).end;
        break;
      }
      default: {
        const bounds = getDayBoundaries(today);
        startDate = bounds.start;
        endDate = bounds.end;
      }
    }

    return {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    };
  }

  async loadActiveTabReport() {
    this.loading.set(true);
    try {
      const tab = this.activeTab();
      const { startDate, endDate } = this.getDateRange();

      if (tab === 'day') {
        const data = await this.supabase.getReportSalesByDay(startDate, endDate);
        this.dayReport.set(data || []);
      } else if (tab === 'repartidor') {
        const data = await this.supabase.getReportSalesByRepartidor(startDate, endDate);
        this.repartidorReport.set(data || []);
      } else if (tab === 'product') {
        const data = await this.supabase.getReportSalesByProduct(startDate, endDate);
        this.productReport.set(data || []);
      } else if (tab === 'payment') {
        const data = await this.supabase.getReportPaymentMethods(startDate, endDate);
        this.paymentReport.set(data || []);
      } else if (tab === 'comparison') {
        const data = await this.supabase.getReportLoadVsSoldVsRemaining(startDate, endDate);
        this.comparisonReport.set(data || []);
      }
    } catch (e) {
      console.error('Error al generar el reporte:', e);
    } finally {
      this.loading.set(false);
    }
  }
}
