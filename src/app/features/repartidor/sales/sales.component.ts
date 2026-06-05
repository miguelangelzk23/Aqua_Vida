import { Component, inject, signal, OnInit } from '@angular/core';
import { SupabaseService } from '../../../core/services/supabase.service';
import { AuthService } from '../../../core/services/auth.service';
import { 
  LucidePlus, 
  LucideTrash2, 
  LucideShoppingCart, 
  LucideCheck, 
  LucideAlertCircle,
  LucideX
} from '@lucide/angular';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';

interface LoadedItem {
  productId: string;
  name: string;
  unit: string;
  basePrice: number;
  loaded: number;
  sold: number;
  remaining: number;
}

@Component({
  selector: 'app-repartidor-sales',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    ReactiveFormsModule,
    LucidePlus, 
    LucideTrash2, 
    LucideShoppingCart, 
    LucideCheck, 
    LucideAlertCircle,
    LucideX
  ],
  templateUrl: './sales.component.html'
})
export class RepartidorSalesComponent implements OnInit {
  private supabase = inject(SupabaseService);
  private auth = inject(AuthService);
  private fb = inject(FormBuilder);

  loading = signal<boolean>(true);
  actionLoading = signal<boolean>(false);
  showForm = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

  activeLoad = signal<any>(null);
  loadedItems = signal<LoadedItem[]>([]);
  sales = signal<any[]>([]);
  showSuccessModal = signal<boolean>(false);
  lastRegisteredSale = signal<any>(null);

  saleForm!: FormGroup;

  ngOnInit() {
    this.initForm();
    this.loadSalesData();
  }

  initForm() {
    this.saleForm = this.fb.group({
      client_name: [''],
      description: [''],
      payment_method: ['efectivo', Validators.required],
      items: this.fb.array([], Validators.required)
    });
  }

  get itemsFormArray() {
    return this.saleForm.get('items') as FormArray;
  }

  async loadSalesData() {
    this.loading.set(true);
    try {
      const repartidorId = this.auth.currentUser()?.id;
      if (!repartidorId) return;

      const dailyLoad = await this.supabase.getOpenDailyLoad(repartidorId);
      this.activeLoad.set(dailyLoad);

      if (dailyLoad) {
        // Cargar ventas de hoy
        const salesList = await this.supabase.getSalesByLoad(dailyLoad.id);
        this.sales.set(salesList);

        // Cargar stock disponible en el camión
        const loadItems = await this.supabase.getDailyLoadItems(dailyLoad.id);
        
        // Mapear items cargados con lo vendido para calcular lo restante
        const itemsMap: LoadedItem[] = loadItems.map(item => {
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
            basePrice: Number(item.products?.base_price),
            loaded: item.quantity_loaded,
            sold: soldCount,
            remaining: item.quantity_loaded - soldCount
          };
        });

        this.loadedItems.set(itemsMap);
      }
    } catch (e) {
      console.error(e);
    } finally {
      this.loading.set(false);
    }
  }

  openSaleForm() {
    this.errorMessage.set(null);
    this.initForm();
    this.addItem(); // Agregar una fila por defecto
    this.showForm.set(true);
  }

  closeSaleForm() {
    this.showForm.set(false);
  }

  addItem() {
    const itemGroup = this.fb.group({
      product_id: ['', Validators.required],
      quantity: [1, [Validators.required, Validators.min(1)]],
      unit_price: [0, [Validators.required, Validators.min(0)]]
    });
    this.itemsFormArray.push(itemGroup);
  }

  removeItem(index: number) {
    if (this.itemsFormArray.length > 1) {
      this.itemsFormArray.removeAt(index);
    }
  }

  onProductChange(index: number) {
    const group = this.itemsFormArray.at(index) as FormGroup;
    const productId = group.get('product_id')?.value;
    const prod = this.loadedItems().find(p => p.productId === productId);
    
    if (prod) {
      group.get('unit_price')?.setValue(prod.basePrice);
      // Validar cantidad máxima
      group.get('quantity')?.setValidators([
        Validators.required, 
        Validators.min(1), 
        Validators.max(prod.remaining)
      ]);
      group.get('quantity')?.updateValueAndValidity();
    } else {
      group.get('unit_price')?.setValue(0);
      group.get('quantity')?.clearValidators();
      group.get('quantity')?.setValidators([
        Validators.required,
        Validators.min(1)
      ]);
      group.get('quantity')?.updateValueAndValidity();
    }
  }

  getUnitPrice(index: number): number {
    const group = this.itemsFormArray.at(index);
    return group ? (group.get('unit_price')?.value || 0) : 0;
  }

  getMaxQuantity(index: number): number {
    const group = this.itemsFormArray.at(index);
    const productId = group.get('product_id')?.value;
    const prod = this.loadedItems().find(p => p.productId === productId);
    return prod ? prod.remaining : 999;
  }

  getSubtotal(index: number): number {
    const group = this.itemsFormArray.at(index);
    const quantity = group.get('quantity')?.value || 0;
    const unitPrice = group.get('unit_price')?.value || 0;
    return quantity * unitPrice;
  }

  calculateTotalSale(): number {
    let total = 0;
    for (let i = 0; i < this.itemsFormArray.length; i++) {
      total += this.getSubtotal(i);
    }
    return total;
  }

  getQuantityValue(index: number): number {
    const group = this.itemsFormArray.at(index);
    return group ? (group.get('quantity')?.value || 1) : 1;
  }

  incrementQuantity(index: number) {
    const group = this.itemsFormArray.at(index);
    if (!group) return;
    const current = group.get('quantity')?.value || 0;
    const max = this.getMaxQuantity(index);
    if (current < max) {
      group.get('quantity')?.setValue(current + 1);
      group.get('quantity')?.updateValueAndValidity();
    }
  }

  decrementQuantity(index: number) {
    const group = this.itemsFormArray.at(index);
    if (!group) return;
    const current = group.get('quantity')?.value || 1;
    if (current > 1) {
      group.get('quantity')?.setValue(current - 1);
      group.get('quantity')?.updateValueAndValidity();
    }
  }

  setPaymentMethod(method: string) {
    this.saleForm.get('payment_method')?.setValue(method);
  }

  async submitSale() {
    if (this.saleForm.invalid) return;

    this.actionLoading.set(true);
    this.errorMessage.set(null);

    const formVal = this.saleForm.value;
    const items = formVal.items;

    try {
      const repartidorId = this.auth.currentUser()?.id;
      const dailyLoad = this.activeLoad();

      if (!repartidorId || !dailyLoad) throw new Error('No hay jornada activa.');

      // Validaciones adicionales de stock en el cliente
      items.forEach((item: any) => {
        const prod = this.loadedItems().find(p => p.productId === item.product_id);
        if (prod && item.quantity > prod.remaining) {
          throw new Error('Stock insuficiente para ' + prod.name + '. Llevas ' + prod.remaining + ' y solicitas ' + item.quantity + '.');
        }
      });

      // Crear venta
      await this.supabase.createSale({
        daily_load_id: dailyLoad.id,
        repartidor_id: repartidorId,
        client_name: formVal.client_name || null,
        description: formVal.description || null,
        payment_method: formVal.payment_method
      }, items);

      // Guardar información simplificada de éxito para el modal
      this.lastRegisteredSale.set({
        client_name: formVal.client_name || 'Consumidor Final',
        payment_method: formVal.payment_method,
        total_amount: this.calculateTotalSale(),
        item_count: items.reduce((acc: number, cur: any) => acc + Number(cur.quantity), 0)
      });

      // Mostrar modal
      this.showSuccessModal.set(true);
    } catch (e: any) {
      console.error(e);
      this.errorMessage.set(e.message || 'Error al registrar la venta en la base de datos.');
    } finally {
      this.actionLoading.set(false);
    }
  }

  closeSuccessModal() {
    this.showSuccessModal.set(false);
    this.lastRegisteredSale.set(null);
    this.showForm.set(false);
    this.loadSalesData();
  }
}
