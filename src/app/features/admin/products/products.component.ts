import { Component, inject, signal, OnInit } from '@angular/core';
import { SupabaseService } from '../../../core/services/supabase.service';
import { 
  LucidePlus, 
  LucideEdit3, 
  LucideCheck, 
  LucideX, 
  LucideAlertCircle,
  LucideShoppingBag,
  LucideTrash2
} from '@lucide/angular';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule, FormArray, FormControl } from '@angular/forms';

@Component({
  selector: 'app-admin-products',
  standalone: true,
  imports: [
    CommonModule, 
    ReactiveFormsModule,
    FormsModule,
    LucidePlus, 
    LucideEdit3, 
    LucideX, 
    LucideShoppingBag,
    LucideTrash2
  ],
  templateUrl: './products.component.html'
})
export class AdminProductsComponent implements OnInit {
  private supabase = inject(SupabaseService);
  private fb = inject(FormBuilder);

  loading = signal<boolean>(true);
  actionLoading = signal<boolean>(false);
  showForm = signal<boolean>(false);
  isEditMode = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

  products = signal<any[]>([]);
  selectedProductId: string | null = null;
  productForm!: FormGroup;

  ngOnInit() {
    this.initForm();
    this.loadProducts();
  }

  initForm() {
    this.productForm = this.fb.group({
      name: ['', Validators.required],
      unit: ['', Validators.required],
      base_price: [0], // Default 0
      is_active: [true],
      price_options: this.fb.array([])
    });
    this.addPriceOption();
  }

  get priceOptionsArray(): FormArray {
    return this.productForm.get('price_options') as FormArray;
  }

  addPriceOption(value: string = '') {
    this.priceOptionsArray.push(new FormControl(value));
  }

  removePriceOption(index: number) {
    this.priceOptionsArray.removeAt(index);
  }

  formatCurrency(event: any, index: number) {
    let value = event.target.value.replace(/\D/g, '');
    if (value) {
      value = new Intl.NumberFormat('es-CO').format(Number(value));
    }
    this.priceOptionsArray.at(index).setValue(value, { emitEvent: false });
  }

  async loadProducts() {
    this.loading.set(true);
    try {
      const data = await this.supabase.getProducts();
      this.products.set(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      this.loading.set(false);
    }
  }

  openAddForm() {
    this.errorMessage.set(null);
    this.isEditMode.set(false);
    this.selectedProductId = null;
    this.initForm();
    this.showForm.set(true);
  }

  openEditForm(product: any) {
    this.errorMessage.set(null);
    this.isEditMode.set(true);
    this.selectedProductId = product.id;
    this.productForm.patchValue({
      name: product.name,
      unit: product.unit,
      base_price: product.base_price,
      is_active: product.is_active
    });
    
    this.priceOptionsArray.clear();
    if (product.price_options && product.price_options.length > 0) {
      product.price_options.forEach((price: number) => {
        this.addPriceOption(new Intl.NumberFormat('es-CO').format(price));
      });
    } else {
      this.addPriceOption();
    }
    
    this.showForm.set(true);
  }

  closeForm() {
    this.showForm.set(false);
  }

  async onSubmit() {
    if (this.productForm.invalid) return;

    this.actionLoading.set(true);
    this.errorMessage.set(null);

    const formVal = this.productForm.value;

    let parsedOptions: number[] = [];
    if (formVal.price_options && formVal.price_options.length > 0) {
      parsedOptions = formVal.price_options
        .map((o: string) => o ? Number(o.replace(/\D/g, '')) : 0)
        .filter((o: number) => !isNaN(o) && o > 0);
    }

    const val = {
      name: formVal.name,
      unit: formVal.unit,
      base_price: 0,
      is_active: formVal.is_active,
      price_options: parsedOptions
    };

    try {
      if (this.isEditMode()) {
        if (!this.selectedProductId) return;
        await this.supabase.updateProduct(this.selectedProductId, val);
      } else {
        await this.supabase.createProduct(val);
      }
      this.showForm.set(false);
      await this.loadProducts();
    } catch (e: any) {
      console.error(e);
      this.errorMessage.set(e.message || 'Error al guardar el producto. Nombre duplicado?');
    } finally {
      this.actionLoading.set(false);
    }
  }

  async toggleProductStatus(product: any) {
    this.actionLoading.set(true);
    try {
      await this.supabase.updateProduct(product.id, { is_active: !product.is_active });
      await this.loadProducts();
    } catch (e) {
      console.error(e);
    } finally {
      this.actionLoading.set(false);
    }
  }
}
