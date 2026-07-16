import { Component, inject, signal, OnInit } from '@angular/core';
import { SupabaseService } from '../../../core/services/supabase.service';
import { 
  LucideTrendingUp, 
  LucideShoppingCart, 
  LucideTruck,
  LucideDollarSign,
  LucideClock
} from '@lucide/angular';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [
    CommonModule, 
    LucideTrendingUp, 
    LucideShoppingCart, 
    LucideTruck,
    LucideDollarSign,
    LucideClock
  ],
  templateUrl: './dashboard.component.html'
})
export class AdminDashboardComponent implements OnInit {
  private supabase = inject(SupabaseService);

  loading = signal<boolean>(true);

  // Métricas
  todaySalesTotal = signal<number>(0);
  todaySalesCount = signal<number>(0);
  activeRoutesCount = signal<number>(0);
  ticketAverage = signal<number>(0);

  recentSales = signal<any[]>([]);
  activeLoadsList = signal<any[]>([]);

  // Montos por método de pago
  payCash = signal<number>(0);
  payTransfer = signal<number>(0);
  payOther = signal<number>(0);

  ngOnInit() {
    this.loadAdminData();
  }

  async loadAdminData() {
    this.loading.set(true);
    try {
      const today = new Date().toISOString().split('T')[0];

      // 1. Obtener jornadas activas hoy
      const { data: loads, error: loadsErr } = await this.supabase.client
        .from('daily_loads')
        .select('*, profiles(full_name)')
        .eq('status', 'open');

      if (loadsErr) throw loadsErr;
      this.activeLoadsList.set(loads || []);
      this.activeRoutesCount.set(loads?.length || 0);

      // 2. Obtener todas las ventas registradas el día de hoy
      const { data: sales, error: salesErr } = await this.supabase.client
        .from('sales')
        .select('*, profiles(full_name), sale_items(quantity, products(name))')
        .gte('sale_date', `${today}T00:00:00.000Z`)
        .order('sale_date', { ascending: false });

      if (salesErr) throw salesErr;
      
      this.recentSales.set(sales || []);
      this.todaySalesCount.set(sales?.length || 0);

      // Calcular totales
      let total = 0;
      let cash = 0;
      let transfer = 0;
      let other = 0;

      sales?.forEach(s => {
        const amount = Number(s.total_amount);
        total += amount;
        if (s.payment_method === 'efectivo') {
          cash += amount;
        } else if (s.payment_method === 'transferencia') {
          transfer += amount;
        } else {
          other += amount;
        }
      });

      this.todaySalesTotal.set(total);
      this.payCash.set(cash);
      this.payTransfer.set(transfer);
      this.payOther.set(other);

      this.ticketAverage.set(sales && sales.length > 0 ? total / sales.length : 0);

    } catch (e) {
      console.error('Error al cargar datos del administrador:', e);
    } finally {
      this.loading.set(false);
    }
  }

  getPercent(method: string): number {
    const total = this.todaySalesTotal();
    if (total === 0) return 0;
    
    let subtotal = 0;
    if (method === 'efectivo') subtotal = this.payCash();
    else if (method === 'transferencia') subtotal = this.payTransfer();
    else subtotal = this.payOther();

    return (subtotal / total) * 100;
  }
}
