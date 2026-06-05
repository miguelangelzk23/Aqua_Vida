import { Component, inject, signal, OnInit } from '@angular/core';
import { SupabaseService } from '../../../core/services/supabase.service';
import { 
  LucidePlus, 
  LucideEdit3, 
  LucideCheck, 
  LucideX, 
  LucideAlertCircle,
  LucideShoppingBag
} from '@lucide/angular';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';

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
    LucideShoppingBag
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
      base_price: [0, [Validators.required, Validators.min(0)]],
      is_active: [true]
    });
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
    this.productForm.setValue({
      name: product.name,
      unit: product.unit,
      base_price: product.base_price,
      is_active: product.is_active
    });
    this.showForm.set(true);
  }

  closeForm() {
    this.showForm.set(false);
  }

  async onSubmit() {
    if (this.productForm.invalid) return;

    this.actionLoading.set(true);
    this.errorMessage.set(null);

    const val = this.productForm.value;

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
