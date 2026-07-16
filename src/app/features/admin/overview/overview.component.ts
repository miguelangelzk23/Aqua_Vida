import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SupabaseService } from '../../../core/services/supabase.service';
import { 
  LucidePieChart, 
  LucideTrendingUp, 
  LucideTrendingDown, 
  LucideWallet
} from '@lucide/angular';

interface ExpenseCategoryTotal {
  name: string;
  amount: number;
  percentage: number;
}

@Component({
  selector: 'app-admin-overview',
  standalone: true,
  imports: [
    CommonModule,
    LucidePieChart,
    LucideTrendingUp,
    LucideTrendingDown,
    LucideWallet
  ],
  templateUrl: './overview.component.html'
})
export class OverviewComponent implements OnInit {
  private supabase = inject(SupabaseService);

  loading = signal<boolean>(true);
  errorMessage = signal<string | null>(null);

  // Filtros
  activeFilter = signal<'today' | 'yesterday' | 'week' | 'month' | 'custom'>('month');
  
  // Fechas personalizadas (inicializadas con la fecha de hoy)
  customStart = signal<string>(new Date().toISOString().split('T')[0]);
  customEnd = signal<string>(new Date().toISOString().split('T')[0]);

  // Datos crudos
  salesData = signal<any[]>([]);
  expensesData = signal<any[]>([]);

  // KPIs Calculados
  totalIncome = computed(() => {
    return this.salesData().reduce((acc, curr) => acc + Number(curr.total_amount || 0), 0);
  });

  totalExpenses = computed(() => {
    return this.expensesData().reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
  });

  netBalance = computed(() => {
    return this.totalIncome() - this.totalExpenses();
  });

  // Desglose de Ventas por Método de Pago
  salesByMethod = computed(() => {
    let cash = 0;
    let transfer = 0;
    let other = 0;
    
    this.salesData().forEach(s => {
      const amt = Number(s.total_amount || 0);
      if (s.payment_method === 'efectivo') cash += amt;
      else if (s.payment_method === 'transferencia') transfer += amt;
      else other += amt;
    });

    return { cash, transfer, other };
  });

  // Desglose de Gastos por Categoría
  expensesByCategory = computed(() => {
    const map = new Map<string, number>();
    const total = this.totalExpenses();

    this.expensesData().forEach(e => {
      const catName = e.category?.name || 'General';
      const amt = Number(e.amount || 0);
      map.set(catName, (map.get(catName) || 0) + amt);
    });

    const result: ExpenseCategoryTotal[] = [];
    map.forEach((amount, name) => {
      result.push({
        name,
        amount,
        percentage: total > 0 ? (amount / total) * 100 : 0
      });
    });

    // Ordenar de mayor a menor
    return result.sort((a, b) => b.amount - a.amount);
  });

  ngOnInit() {
    this.loadData();
  }

  setFilter(filter: 'today' | 'yesterday' | 'week' | 'month' | 'custom') {
    this.activeFilter.set(filter);
    // Si no es custom, cargar directamente. Si es custom, el usuario debe dar a "Aplicar".
    if (filter !== 'custom') {
      this.loadData();
    }
  }

  applyCustomFilter() {
    this.loadData();
  }

  updateCustomStart(e: any) {
    this.customStart.set(e.target.value);
  }

  updateCustomEnd(e: any) {
    this.customEnd.set(e.target.value);
  }

  async loadData() {
    this.loading.set(true);
    this.errorMessage.set(null);
    
    try {
      const { start, end } = this.getDateRange(this.activeFilter());
      
      const [sales, expenses] = await Promise.all([
        this.supabase.getSalesForOverview(start, end),
        this.supabase.getExpenses(start, end)
      ]);

      this.salesData.set(sales || []);
      this.expensesData.set(expenses || []);
    } catch (e: any) {
      this.errorMessage.set('Error al cargar datos financieros: ' + e.message);
    } finally {
      this.loading.set(false);
    }
  }

  private getDateRange(filter: 'today' | 'yesterday' | 'week' | 'month' | 'custom'): { start: string, end: string } {
    if (filter === 'custom') {
      return { start: this.customStart(), end: this.customEnd() };
    }

    const now = new Date();
    let start = new Date();
    let end = new Date();
    
    if (filter === 'today') {
      // start y end son hoy
    } else if (filter === 'yesterday') {
      start.setDate(start.getDate() - 1);
      end.setDate(end.getDate() - 1);
    } else if (filter === 'week') {
      const day = start.getDay();
      const diff = start.getDate() - day + (day === 0 ? -6 : 1);
      start.setDate(diff);
    } else if (filter === 'month') {
      start.setDate(1);
    }

    const startStr = start.toISOString().split('T')[0];
    const endStr = end.toISOString().split('T')[0];

    return { start: startStr, end: endStr };
  }
}
