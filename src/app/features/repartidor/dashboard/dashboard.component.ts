import { Component, inject, signal, OnInit } from '@angular/core';
import { SupabaseService } from '../../../core/services/supabase.service';
import { AuthService } from '../../../core/services/auth.service';
import { OfflineSyncService, OfflineSale } from '../../../core/services/offline-sync.service';
import { RouterLink } from '@angular/router';
import { 
  LucidePlay, 
  LucideTruck, 
  LucidePlus, 
  LucidePackage,
  LucideCheckCircle
} from '@lucide/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-repartidor-dashboard',
  standalone: true,
  imports: [
    CommonModule, 
    RouterLink, 
    FormsModule,
    LucidePlay, 
    LucideTruck, 
    LucidePlus, 
    LucidePackage,
    LucideCheckCircle
  ],
  templateUrl: './dashboard.component.html'
})
export class RepartidorDashboardComponent implements OnInit {
  public auth = inject(AuthService);
  private supabase = inject(SupabaseService);
  public offlineSync = inject(OfflineSyncService);

  loading = signal<boolean>(true);
  actionLoading = signal<boolean>(false);
  loadErrorMessage = signal<string | null>(null);

  activeLoad = signal<any>(null);
  loadItems = signal<any[]>([]);
  availableProducts = signal<any[]>([]);
  globalInventory = signal<any[]>([]);
  sales = signal<any[]>([]);

  // Estructuras para el inventario de vehículo acumulado
  mobileInventory = signal<any[]>([]);

  // Para el formulario de carga inicial
  loadQuantities: { [productId: string]: number } = {};

  // Resumen de ventas
  summarySalesTotal = signal<number>(0);
  summarySalesCash = signal<number>(0);

  // Ventas pendientes offline
  pendingOfflineSales = signal<OfflineSale[]>([]);

  ngOnInit() {
    this.loadDashboardData();
  }

  async loadDashboardData() {
    this.loading.set(true);
    try {
      const repartidorId = this.auth.currentUser()?.id;
      if (!repartidorId) return;

      // 1. Obtener jornada activa de hoy
      const dailyLoad = await this.supabase.getOpenDailyLoad(repartidorId);
      this.activeLoad.set(dailyLoad);

      if (dailyLoad) {
        // 2. Obtener items cargados de la jornada
        const items = await this.supabase.getDailyLoadItems(dailyLoad.id);
        this.loadItems.set(items);

        // 3. Obtener ventas de esta jornada
        const salesList = await this.supabase.getSalesByLoad(dailyLoad.id);
        this.sales.set(salesList);

        // 3.5 Obtener ventas offline pendientes para esta jornada
        const pending = await this.offlineSync.getPendingSales();
        this.pendingOfflineSales.set(pending.filter(p => p.sale.daily_load_id === dailyLoad.id));

        // 4. Calcular el stock actual del vehículo
        this.calculateMobileInventory();
        // 5. Calcular resumen de ventas
        this.calculateSalesSummary();
      } else {
        // Cargar productos activos e inventario global para formulario de carga inicial
        const prods = await this.supabase.getActiveProducts();
        this.availableProducts.set(prods);

        const stock = await this.supabase.getGlobalInventory();
        this.globalInventory.set(stock);

        // Inicializar cantidades de carga a 0
        prods.forEach(p => {
          this.loadQuantities[p.id] = 0;
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      this.loading.set(false);
    }
  }

  calculateMobileInventory() {
    const items = this.loadItems();
    const salesList = this.sales();
    
    const inventoryMap = items.map(item => {
      // Calcular lo vendido de este producto en la jornada
      let soldCount = 0;
      salesList.forEach(sale => {
        sale.sale_items?.forEach((si: any) => {
          if (si.product_id === item.product_id) {
            soldCount += si.quantity;
          }
        });
      });

      // Sumar lo vendido offline (aún no sincronizado)
      this.pendingOfflineSales().forEach(offlineSale => {
        offlineSale.items.forEach(si => {
          if (si.product_id === item.product_id) {
            soldCount += si.quantity;
          }
        });
      });

      return {
        id: item.id,
        productId: item.product_id,
        name: item.products?.name,
        unit: item.products?.unit,
        loaded: item.quantity_loaded,
        sold: soldCount,
        remaining: item.quantity_loaded - soldCount
      };
    });

    this.mobileInventory.set(inventoryMap);
  }

  calculateSalesSummary() {
    const salesList = this.sales();
    let total = 0;
    let cash = 0;
    
    // Ventas sincronizadas
    salesList.forEach(s => {
      total += Number(s.total_amount);
      if (s.payment_method === 'efectivo') {
        cash += Number(s.total_amount);
      }
    });

    // Ventas offline pendientes
    this.pendingOfflineSales().forEach(offlineSale => {
      const offlineTotal = offlineSale.sale.total_amount || 0;
      total += Number(offlineTotal);
      if (offlineSale.sale.payment_method === 'efectivo') {
        cash += Number(offlineTotal);
      }
    });

    this.summarySalesTotal.set(total);
    this.summarySalesCash.set(cash);
  }

  getProductStock(productId: string): number {
    const inv = this.globalInventory().find(i => i.product_id === productId);
    return inv ? inv.stock : 0;
  }

  hasSelectedLoadItems(): boolean {
    return Object.values(this.loadQuantities).some(qty => qty > 0);
  }

  async startDay() {
    const repartidorId = this.auth.currentUser()?.id;
    if (!repartidorId) return;

    this.actionLoading.set(true);
    try {
      await this.supabase.createDailyLoad(repartidorId);
      await this.loadDashboardData();
    } catch (e) {
      console.error(e);
    } finally {
      this.actionLoading.set(false);
    }
  }

  async submitInitialLoad() {
    const dailyLoad = this.activeLoad();
    if (!dailyLoad) return;

    this.actionLoading.set(true);
    this.loadErrorMessage.set(null);

    try {
      // Filtrar items con cantidad mayor a 0
      const itemsToInsert = Object.keys(this.loadQuantities)
        .filter(pid => this.loadQuantities[pid] > 0)
        .map(pid => {
          // Validar stock de bodega
          const stockAvailable = this.getProductStock(pid);
          const requested = this.loadQuantities[pid];
          if (requested > stockAvailable) {
            throw new Error(`Stock insuficiente en bodega para cargar. Solicitado: ${requested}, Disponible: ${stockAvailable}`);
          }

          return {
            daily_load_id: dailyLoad.id,
            product_id: pid,
            quantity_loaded: requested
          };
        });

      if (itemsToInsert.length === 0) return;

      await this.supabase.addDailyLoadItems(itemsToInsert);
      await this.loadDashboardData();
    } catch (e: any) {
      console.error(e);
      this.loadErrorMessage.set(e.message || 'Error al registrar la carga inicial en el vehículo.');
    } finally {
      this.actionLoading.set(false);
    }
  }

  getLoadQuantity(productId: string): number {
    return this.loadQuantities[productId] || 0;
  }

  incrementLoad(productId: string) {
    const current = this.loadQuantities[productId] || 0;
    const max = this.getProductStock(productId);
    if (current < max) {
      this.loadQuantities[productId] = current + 1;
    }
  }

  decrementLoad(productId: string) {
    const current = this.loadQuantities[productId] || 0;
    if (current > 0) {
      this.loadQuantities[productId] = current - 1;
    }
  }

  updateLoadQuantity(productId: string, event: any) {
    let val = parseInt(event.target.value, 10);
    if (isNaN(val) || val < 0) val = 0;
    
    const max = this.getProductStock(productId);
    if (val > max) val = max;

    this.loadQuantities[productId] = val;
    event.target.value = val;
  }
}
