import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  public client: SupabaseClient;

  constructor() {
    this.client = createClient(environment.supabaseUrl, environment.supabaseKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true
      }
    });
  }

  // --- Catálogo de Productos ---
  async getProducts() {
    const { data, error } = await this.client
      .from('products')
      .select('*')
      .order('name', { ascending: true });
    if (error) throw error;
    return data;
  }

  async getActiveProducts() {
    const { data, error } = await this.client
      .from('products')
      .select('*')
      .eq('is_active', true)
      .order('name', { ascending: true });
    if (error) throw error;
    return data;
  }

  async createProduct(product: { name: string; base_price: number; unit: string; is_active: boolean }) {
    const { data, error } = await this.client
      .from('products')
      .insert(product)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async updateProduct(id: string, updates: Partial<{ name: string; base_price: number; unit: string; is_active: boolean }>) {
    const { data, error } = await this.client
      .from('products')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  // --- Inventario Global ---
  async getGlobalInventory() {
    const { data, error } = await this.client
      .from('global_inventory')
      .select('*, products(name, unit, base_price)')
      .order('products(name)', { ascending: true });
    if (error) throw error;
    return data;
  }

  async updateGlobalStock(productId: string, stock: number) {
    const { data, error } = await this.client
      .from('global_inventory')
      .update({ stock })
      .eq('product_id', productId)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  // --- Jornadas de Repartidores (Daily Loads) ---
  async getOpenDailyLoad(repartidorId: string) {
    const { data, error } = await this.client
      .from('daily_loads')
      .select('*')
      .eq('repartidor_id', repartidorId)
      .eq('status', 'open')
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  async getDailyLoadsHistory(repartidorId: string) {
    const { data, error } = await this.client
      .from('daily_loads')
      .select('*')
      .eq('repartidor_id', repartidorId)
      .order('load_date', { ascending: false });
    if (error) throw error;
    return data;
  }

  async createDailyLoad(repartidorId: string) {
    const { data, error } = await this.client
      .from('daily_loads')
      .insert({ repartidor_id: repartidorId, status: 'open' })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  // --- Carga Inicial por Jornada (Daily Load Items) ---
  async getDailyLoadItems(dailyLoadId: string) {
    const { data, error } = await this.client
      .from('daily_load_items')
      .select('*, products(name, unit, base_price)')
      .eq('daily_load_id', dailyLoadId);
    if (error) throw error;
    return data;
  }

  async addDailyLoadItems(items: { daily_load_id: string; product_id: string; quantity_loaded: number }[]) {
    const { data, error } = await this.client
      .from('daily_load_items')
      .insert(items)
      .select();
    if (error) throw error;
    return data;
  }

  // --- Ventas ---
  async getSalesByLoad(dailyLoadId: string) {
    const { data, error } = await this.client
      .from('sales')
      .select('*, sale_items(*, products(name, unit))')
      .eq('daily_load_id', dailyLoadId)
      .order('sale_date', { ascending: false });
    if (error) throw error;
    return data;
  }

  async createSale(sale: { daily_load_id: string; repartidor_id: string; client_name?: string; description?: string; payment_method: string }, items: { product_id: string; quantity: number; unit_price: number }[]) {
    // Iniciamos una transacción simulada usando el cliente Supabase
    // Dado que Supabase JS no tiene transacciones complejas en cliente sin funciones, podemos insertar la venta principal 
    // y luego sus items. Si falla, manejamos el error. Nuestro disparador de stock móvil se ejecutará al insertar los items.
    
    const { data: saleData, error: saleError } = await this.client
      .from('sales')
      .insert(sale)
      .select()
      .single();

    if (saleError) throw saleError;

    const saleItems = items.map(item => ({
      sale_id: saleData.id,
      product_id: item.product_id,
      quantity: item.quantity,
      unit_price: item.unit_price
    }));

    const { error: itemsError } = await this.client
      .from('sale_items')
      .insert(saleItems);

    if (itemsError) {
      // Intentamos deshacer la venta creada en caso de error de stock
      await this.client.from('sales').delete().eq('id', saleData.id);
      throw itemsError;
    }

    return saleData;
  }

  // --- Cierre de Jornada (RPC) ---
  async closeDailyLoad(dailyLoadId: string, observations?: string) {
    const { data, error } = await this.client
      .rpc('close_daily_load', {
        p_daily_load_id: dailyLoadId,
        p_observations: observations || null
      });
    if (error) throw error;
    return data;
  }

  async getDailyClosure(dailyLoadId: string) {
    const { data, error } = await this.client
      .from('daily_closures')
      .select('*')
      .eq('daily_load_id', dailyLoadId)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  // --- Vistas de Reportes para Administrador ---
  async getReportSalesByDay() {
    const { data, error } = await this.client
      .from('view_sales_by_day')
      .select('*')
      .order('date', { ascending: false });
    if (error) throw error;
    return data;
  }

  async getReportSalesByRepartidor() {
    const { data, error } = await this.client
      .from('view_sales_by_repartidor')
      .select('*')
      .order('total_sales_amount', { ascending: false });
    if (error) throw error;
    return data;
  }

  async getReportSalesByProduct() {
    const { data, error } = await this.client
      .from('view_sales_by_product')
      .select('*')
      .order('total_sales_amount', { ascending: false });
    if (error) throw error;
    return data;
  }

  async getReportPaymentMethods() {
    const { data, error } = await this.client
      .from('view_sales_payment_methods')
      .select('*');
    if (error) throw error;
    return data;
  }

  async getReportLoadVsSoldVsRemaining(date?: string) {
    let query = this.client.from('view_load_vs_sold_vs_remaining').select('*');
    if (date) {
      query = query.eq('load_date', date);
    }
    const { data, error } = await query.order('load_date', { ascending: false });
    if (error) throw error;
    return data;
  }
}
