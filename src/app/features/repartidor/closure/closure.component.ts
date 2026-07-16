import { Component, inject, signal, OnInit } from '@angular/core';
import { SupabaseService } from '../../../core/services/supabase.service';
import { AuthService } from '../../../core/services/auth.service';
import { 
  LucideClipboardCheck, 
  LucideCheckCircle, 
  LucideAlertCircle, 
  LucideMessageSquare
} from '@lucide/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-repartidor-closure',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule,
    LucideClipboardCheck, 
    LucideCheckCircle, 
    LucideAlertCircle, 
    LucideMessageSquare
  ],
  templateUrl: './closure.component.html'
})
export class RepartidorClosureComponent implements OnInit {
  private supabase = inject(SupabaseService);
  private auth = inject(AuthService);

  loading = signal<boolean>(true);
  actionLoading = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

  activeLoad = signal<any>(null);
  mobileInventory = signal<any[]>([]);
  closureData = signal<any>(null);

  // Totales de venta
  salesCash = signal<number>(0);
  salesTransfer = signal<number>(0);
  salesOther = signal<number>(0);
  salesTotal = signal<number>(0);
  showConfirmModal = signal<boolean>(false);

  // Form
  observations: string = '';

  ngOnInit() {
    this.loadClosureData();
  }

  async loadClosureData() {
    this.loading.set(true);
    try {
      const repartidorId = this.auth.currentUser()?.id;
      if (!repartidorId) return;

      // Intentar obtener una jornada abierta
      let dailyLoad = await this.supabase.getOpenDailyLoad(repartidorId);
      
      // Si no hay jornada abierta, buscar la última jornada creada por el repartidor (para ver si ya cerró hoy)
      if (!dailyLoad) {
        const history = await this.supabase.getDailyLoadsHistory(repartidorId);
        if (history && history.length > 0) {
          // Tomar la última del historial
          dailyLoad = history[0];
        }
      }

      this.activeLoad.set(dailyLoad);

      if (dailyLoad) {
        if (dailyLoad.status === 'closed') {
          // Obtener datos del cierre de caja
          const closure = await this.supabase.getDailyClosure(dailyLoad.id);
          this.closureData.set(closure);
        } else {
          // Obtener items cargados
          const loadItems = await this.supabase.getDailyLoadItems(dailyLoad.id);
          // Obtener ventas
          const salesList = await this.supabase.getSalesByLoad(dailyLoad.id);

          // Calcular stock a devolver
          const inventoryMap = loadItems.map(item => {
            let soldCount = 0;
            salesList.forEach(sale => {
              sale.sale_items?.forEach((si: any) => {
                if (si.product_id === item.product_id) {
                  soldCount += si.quantity;
                }
              });
            });

            return {
              productId: item.product_id,
              name: item.products?.name,
              unit: item.products?.unit,
              loaded: item.quantity_loaded,
              sold: soldCount,
              remaining: item.quantity_loaded - soldCount
            };
          });
          this.mobileInventory.set(inventoryMap);

          // Calcular totales por método de pago
          let total = 0;
          let cash = 0;
          let transfer = 0;
          let other = 0;

          salesList.forEach(s => {
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

          this.salesTotal.set(total);
          this.salesCash.set(cash);
          this.salesTransfer.set(transfer);
          this.salesOther.set(other);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      this.loading.set(false);
    }
  }

  confirmClosure() {
    const dailyLoad = this.activeLoad();
    if (!dailyLoad || dailyLoad.status === 'closed') return;
    this.showConfirmModal.set(true);
  }

  closeConfirmModal() {
    this.showConfirmModal.set(false);
  }

  async executeClosure() {
    const dailyLoad = this.activeLoad();
    if (!dailyLoad || dailyLoad.status === 'closed') return;

    this.showConfirmModal.set(false);
    this.actionLoading.set(true);
    this.errorMessage.set(null);

    try {
      await this.supabase.closeDailyLoad(dailyLoad.id, this.observations);
      await this.loadClosureData();
    } catch (e: any) {
      console.error(e);
      this.errorMessage.set(e.message || 'Error al procesar el cierre de jornada en el servidor.');
    } finally {
      this.actionLoading.set(false);
    }
  }
}
