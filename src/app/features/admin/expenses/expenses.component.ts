import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { SupabaseService } from '../../../core/services/supabase.service';
import { AuthService } from '../../../core/services/auth.service';
import { 
  LucideBanknote, 
  LucidePlus, 
  LucideTrash2, 
  LucideAlertCircle, 
  LucideTags,
  LucideCalendar,
  LucideFileText
} from '@lucide/angular';

@Component({
  selector: 'app-admin-expenses',
  standalone: true,
  imports: [
    CommonModule, 
    ReactiveFormsModule,
    LucideBanknote,
    LucidePlus,
    LucideTrash2,
    LucideAlertCircle,
    LucideTags,
    LucideCalendar,
    LucideFileText
  ],
  templateUrl: './expenses.component.html'
})
export class AdminExpensesComponent implements OnInit {
  private supabase = inject(SupabaseService);
  private auth = inject(AuthService);
  private fb = inject(FormBuilder);

  // Signals
  loading = signal<boolean>(true);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);
  
  categories = signal<any[]>([]);
  expenses = signal<any[]>([]);

  // Modos de vista
  activeTab = signal<'list' | 'new_expense' | 'categories'>('list');

  // Formularios
  expenseForm: FormGroup;
  categoryForm: FormGroup;

  constructor() {
    this.expenseForm = this.fb.group({
      category_id: ['', Validators.required],
      amount: ['', [Validators.required, Validators.min(1)]],
      description: ['', Validators.required],
      expense_date: [new Date().toISOString().split('T')[0], Validators.required]
    });

    this.categoryForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]]
    });
  }

  ngOnInit() {
    this.loadData();
  }

  async loadData() {
    this.loading.set(true);
    this.errorMessage.set(null);
    try {
      const [cats, exps] = await Promise.all([
        this.supabase.getExpenseCategories(),
        this.supabase.getExpenses()
      ]);
      this.categories.set(cats || []);
      this.expenses.set(exps || []);
    } catch (e: any) {
      this.errorMessage.set('Error al cargar datos: ' + e.message);
    } finally {
      this.loading.set(false);
    }
  }

  setTab(tab: 'list' | 'new_expense' | 'categories') {
    this.activeTab.set(tab);
    this.errorMessage.set(null);
    this.successMessage.set(null);
  }

  // --- Manejo de Gastos ---
  async onSubmitExpense() {
    if (this.expenseForm.invalid) return;
    
    this.loading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);
    
    const user = this.auth.currentUser();
    if (!user) {
      this.errorMessage.set('Debes iniciar sesión para registrar gastos');
      this.loading.set(false);
      return;
    }

    try {
      const formValue = this.expenseForm.value;
      await this.supabase.createExpense({
        category_id: formValue.category_id,
        amount: Number(formValue.amount),
        description: formValue.description,
        expense_date: formValue.expense_date,
        created_by: user.id
      });
      
      this.successMessage.set('Gasto registrado exitosamente');
      this.expenseForm.reset({
        expense_date: new Date().toISOString().split('T')[0]
      });
      await this.loadData();
      
      setTimeout(() => this.setTab('list'), 1500);
    } catch (e: any) {
      this.errorMessage.set('Error al guardar el gasto: ' + e.message);
    } finally {
      this.loading.set(false);
    }
  }

  async deleteExpense(id: string) {
    if (!confirm('¿Estás seguro de eliminar este gasto?')) return;
    this.loading.set(true);
    try {
      await this.supabase.deleteExpense(id);
      await this.loadData();
    } catch (e: any) {
      this.errorMessage.set('Error al eliminar: ' + e.message);
      this.loading.set(false);
    }
  }

  // --- Manejo de Categorías ---
  async onSubmitCategory() {
    if (this.categoryForm.invalid) return;
    
    this.loading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    try {
      await this.supabase.createExpenseCategory(this.categoryForm.value.name);
      this.successMessage.set('Categoría creada exitosamente');
      this.categoryForm.reset();
      await this.loadData();
    } catch (e: any) {
      this.errorMessage.set('Error al crear categoría: ' + e.message);
    } finally {
      this.loading.set(false);
    }
  }

  async deleteCategory(id: string) {
    if (!confirm('¿Estás seguro de eliminar esta categoría? Solo podrás hacerlo si no tiene gastos asociados.')) return;
    this.loading.set(true);
    this.errorMessage.set(null);
    try {
      await this.supabase.deleteExpenseCategory(id);
      await this.loadData();
    } catch (e: any) {
      this.errorMessage.set('No se puede eliminar la categoría porque tiene gastos asociados o hubo un error.');
      this.loading.set(false);
    }
  }
}
