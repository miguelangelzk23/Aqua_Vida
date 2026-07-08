import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { SupabaseService } from '../../../core/services/supabase.service';
import { AuthService } from '../../../core/services/auth.service';
import { 
  LucidePlus, 
  LucideTrash2, 
  LucideShoppingCart, 
  LucideCheck, 
  LucideAlertCircle,
  LucideX,
  LucideArrowLeft,
  LucideBanknote,
  LucideCreditCard,
  LucideSmartphone,
  LucideTag,
  LucideUser
} from '@lucide/angular';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';

interface LoadedItem {
  productId: string;
  name: string;
  unit: string;
  basePrice: number;
  loaded: number;
  sold: number;
  remaining: number;
  priceOptions: number[];
}

interface CartItem {
  productId: string;
  name: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  maxQuantity: number;
  priceOptions: number[];
  customPriceMode: boolean; // Si está ingresando precio manual
  isEditing: boolean; // Si el panel está expandido
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
    LucideX,
    LucideArrowLeft,
    LucideBanknote,
    LucideCreditCard,
    LucideSmartphone,
    LucideTag,
    LucideUser
  ],
  templateUrl: './sales.component.html'
})
export class RepartidorSalesComponent implements OnInit {
  private supabase = inject(SupabaseService);
  private auth = inject(AuthService);
  private fb = inject(FormBuilder);

  // Estados de UI
  loading = signal<boolean>(true);
  actionLoading = signal<boolean>(false);
  errorMessage = signal<string | null>(null);
  showSuccessModal = signal<boolean>(false);
  lastRegisteredSale = signal<any>(null);

  isProductModalOpen = signal<boolean>(false);

  // Flujo: history -> client -> cart -> checkout
  viewState = signal<'history' | 'client' | 'cart' | 'checkout'>('history');

  // Datos
  activeLoad = signal<any>(null);
  loadedItems = signal<LoadedItem[]>([]);
  sales = signal<any[]>([]);

  // Estado del Carrito
  cart = signal<CartItem[]>([]);

  checkoutForm!: FormGroup;

  // Calculados
  cartTotal = computed(() => {
    return this.cart().reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  });
  
  cartItemsCount = computed(() => {
    return this.cart().reduce((sum, item) => sum + item.quantity, 0);
  });

  hasInvalidPrices = computed(() => {
    return this.cart().some(item => !item.unitPrice || item.unitPrice <= 0);
  });

  ngOnInit() {
    this.initForm();
    this.loadSalesData();
  }

  initForm() {
    this.checkoutForm = this.fb.group({
      client_name: [''],
      description: [''],
      payment_method: ['efectivo', Validators.required]
    });
  }

  async loadSalesData() {
    this.loading.set(true);
    try {
      const repartidorId = this.auth.currentUser()?.id;
      if (!repartidorId) return;

      const dailyLoad = await this.supabase.getOpenDailyLoad(repartidorId);
      this.activeLoad.set(dailyLoad);

      if (dailyLoad) {
        const salesList = await this.supabase.getSalesByLoad(dailyLoad.id);
        this.sales.set(salesList);

        const loadItems = await this.supabase.getDailyLoadItems(dailyLoad.id);
        
        const itemsMap: LoadedItem[] = loadItems.map(item => {
          let soldCount = 0;
          salesList.forEach(sale => {
            sale.sale_items?.forEach((si: any) => {
              if (si.product_id === item.product_id) {
                soldCount += si.quantity;
              }
            });
          });

          // Obtener precios
          let pOpts = item.products?.price_options || [];
          let baseP = Number(item.products?.base_price);
          let allPrices = Array.from(new Set([baseP, ...pOpts])).filter(p => p > 0).sort((a, b) => b - a);

          return {
            productId: item.product_id,
            name: item.products?.name,
            unit: item.products?.unit,
            basePrice: baseP,
            loaded: item.quantity_loaded,
            sold: soldCount,
            remaining: item.quantity_loaded - soldCount,
            priceOptions: allPrices
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

  // =====================================
  // FLUJO DE VISTAS
  // =====================================

  startNewSale() {
    this.cart.set([]);
    this.initForm();
    this.errorMessage.set(null);
    this.viewState.set('client');
  }

  goToCart() {
    this.viewState.set('cart');
  }

  goToCheckout() {
    if (this.cartItemsCount() === 0) return;
    this.viewState.set('checkout');
  }

  goBackToHistory() {
    this.viewState.set('history');
  }
  
  goBackToClient() {
    this.viewState.set('client');
  }

  goBackToCart() {
    this.viewState.set('cart');
  }

  // =====================================
  // LÓGICA DEL CARRITO (POS)
  // =====================================

  openProductModal() {
    this.isProductModalOpen.set(true);
  }

  closeProductModal() {
    this.isProductModalOpen.set(false);
  }

  addToCart(product: LoadedItem) {
    if (product.remaining <= 0) return;

    this.cart.update(items => {
      // Contraer todos los demás
      const mappedItems = items.map(i => ({ ...i, isEditing: false }));
      
      const existing = mappedItems.find(i => i.productId === product.productId);
      if (existing) {
        if (existing.quantity < existing.maxQuantity) {
          existing.quantity++;
        }
        existing.isEditing = true; // Expandir el existente
        return [...mappedItems];
      } else {
        return [...mappedItems, {
          productId: product.productId,
          name: product.name,
          unit: product.unit,
          quantity: 1,
          unitPrice: product.basePrice,
          maxQuantity: product.remaining,
          priceOptions: product.priceOptions,
          customPriceMode: false,
          isEditing: true // Nuevo ítem se expande
        }];
      }
    });
    
    // Cerramos el modal para que vea su carrito actualizado.
    this.closeProductModal();
  }

  editCartItem(productId: string) {
    this.cart.update(items => {
      return items.map(item => ({
        ...item,
        isEditing: item.productId === productId
      }));
    });
  }

  collapseCartItem(productId: string) {
    this.cart.update(items => {
      return items.map(item => {
        if (item.productId === productId) {
          return { ...item, isEditing: false };
        }
        return item;
      });
    });
  }

  removeFromCart(productId: string) {
    this.cart.update(items => {
      const existing = items.find(i => i.productId === productId);
      if (existing) {
        if (existing.quantity > 1) {
          existing.quantity--;
          return [...items];
        } else {
          return items.filter(i => i.productId !== productId);
        }
      }
      return items;
    });
  }

  incrementCartItem(productId: string) {
    this.cart.update(items => {
      const existing = items.find(i => i.productId === productId);
      if (existing) {
        if (existing.quantity < existing.maxQuantity) {
          existing.quantity++;
        }
      }
      return [...items];
    });
  }

  setCartItemPrice(productId: string, price: number) {
    this.cart.update(items => {
      const existing = items.find(i => i.productId === productId);
      if (existing) {
        existing.unitPrice = price;
      }
      return [...items];
    });
  }

  toggleCustomPriceMode(productId: string, state: boolean) {
    this.cart.update(items => {
      const existing = items.find(i => i.productId === productId);
      if (existing) {
        existing.customPriceMode = state;
      }
      return [...items];
    });
  }

  // =====================================
  // CHECKOUT
  // =====================================

  setPaymentMethod(method: string) {
    this.checkoutForm.get('payment_method')?.setValue(method);
  }

  async submitSale() {
    // Validar que haya items, el form sea válido y todos los items tengan precio mayor a 0
    const hasInvalidPrices = this.cart().some(item => !item.unitPrice || item.unitPrice <= 0);
    
    if (this.cartItemsCount() === 0 || this.checkoutForm.invalid || hasInvalidPrices) return;

    this.actionLoading.set(true);
    this.errorMessage.set(null);

    const formVal = this.checkoutForm.value;

    try {
      const repartidorId = this.auth.currentUser()?.id;
      const dailyLoad = this.activeLoad();

      if (!repartidorId || !dailyLoad) throw new Error('No hay jornada activa.');

      // Validar stock real
      this.cart().forEach(cItem => {
        const prod = this.loadedItems().find(p => p.productId === cItem.productId);
        if (prod && cItem.quantity > prod.remaining) {
          throw new Error(`Stock insuficiente para ${prod.name}. Quedan ${prod.remaining}.`);
        }
      });

      const saleItems = this.cart().map(c => ({
        product_id: c.productId,
        quantity: c.quantity,
        unit_price: c.unitPrice
      }));

      await this.supabase.createSale({
        daily_load_id: dailyLoad.id,
        repartidor_id: repartidorId,
        client_name: formVal.client_name || null,
        description: formVal.description || null,
        payment_method: formVal.payment_method
      }, saleItems);

      this.lastRegisteredSale.set({
        client_name: formVal.client_name || 'Consumidor Final',
        payment_method: formVal.payment_method,
        total_amount: this.cartTotal(),
        item_count: this.cartItemsCount()
      });

      this.showSuccessModal.set(true);
    } catch (e: any) {
      console.error(e);
      this.errorMessage.set(e.message || 'Error al registrar la venta.');
    } finally {
      this.actionLoading.set(false);
    }
  }

  closeSuccessModal() {
    this.showSuccessModal.set(false);
    this.lastRegisteredSale.set(null);
    this.viewState.set('history');
    this.loadSalesData();
  }
}
