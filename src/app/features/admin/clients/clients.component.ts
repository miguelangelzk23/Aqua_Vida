import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SupabaseService } from '../../../core/services/supabase.service';
import { LucideUsers, LucidePhone, LucideMapPin, LucideClock, LucideAlertCircle, LucideMessageCircle } from '@lucide/angular';

@Component({
  selector: 'app-admin-clients',
  standalone: true,
  imports: [CommonModule, LucideUsers, LucidePhone, LucideMapPin, LucideClock, LucideAlertCircle, LucideMessageCircle],
  templateUrl: './clients.component.html'
})
export class ClientsComponent implements OnInit {
  private supabase = inject(SupabaseService);

  loading = signal<boolean>(true);
  clients = signal<any[]>([]);
  errorMessage = signal<string | null>(null);

  ngOnInit() {
    this.loadClients();
  }

  async loadClients() {
    this.loading.set(true);
    this.errorMessage.set(null);
    try {
      const data = await this.supabase.getClientStats();
      this.clients.set(data || []);
    } catch (e: any) {
      console.error(e);
      this.errorMessage.set('Error al cargar la lista de clientes: ' + e.message);
    } finally {
      this.loading.set(false);
    }
  }

  sendWhatsApp(client: any) {
    if (!client.phone) return;
    const phone = client.phone.startsWith('57') ? client.phone : `57${client.phone}`;
    const message = `Hola ${client.name}, te escribimos de Aqua Vida. ¿Deseas hacer un pedido de agua hoy?`;
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  }
}
