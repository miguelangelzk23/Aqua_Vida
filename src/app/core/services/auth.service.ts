import { Injectable, signal, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { SupabaseService } from './supabase.service';

export interface Profile {
  id: string;
  full_name: string;
  role: 'admin' | 'repartidor';
  is_active: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private supabase = inject(SupabaseService);
  private router = inject(Router);

  // Signals
  public currentUser = signal<Profile | null>(null);
  public isAuthenticated = computed(() => this.currentUser() !== null);
  public isAdmin = computed(() => this.currentUser()?.role === 'admin');
  public isRepartidor = computed(() => this.currentUser()?.role === 'repartidor');
  public loading = signal<boolean>(true);

  constructor() {
    this.initializeSession();
  }

  private async initializeSession() {
    this.loading.set(true);
    
    // Validar sesión actual al cargar
    const { data: { session } } = await this.supabase.client.auth.getSession();
    if (session?.user) {
      await this.fetchProfile(session.user.id);
    } else {
      this.currentUser.set(null);
      this.loading.set(false);
    }

    // Escuchar cambios de autenticación
    this.supabase.client.auth.onAuthStateChange(async (event, session) => {
      // Ignoramos INITIAL_SESSION porque ya lo manejamos arriba con getSession()
      if (event === 'INITIAL_SESSION') return;

      if (session?.user) {
        // Solo recargamos el perfil si no estábamos autenticados o si cambió el usuario
        if (!this.currentUser() || this.currentUser()?.id !== session.user.id) {
          await this.fetchProfile(session.user.id);
        }
      } else if (event === 'SIGNED_OUT') {
        // Solo redirigimos a login si es un evento explícito de cierre de sesión
        this.currentUser.set(null);
        localStorage.removeItem('aqua-vida-profile');
        this.router.navigate(['/login']);
      }
    });
  }

  public async fetchProfile(uid: string) {
    try {
      const { data, error } = await this.supabase.client
        .from('profiles')
        .select('*')
        .eq('id', uid)
        .single();
      
      if (error || !data) {
        // En caso de error (ej. sin internet), intentamos cargar del caché local
        const cached = localStorage.getItem('aqua-vida-profile');
        if (cached) {
          this.currentUser.set(JSON.parse(cached));
        } else {
          this.currentUser.set(null);
        }
      } else {
        // Guardamos en caché para uso offline
        localStorage.setItem('aqua-vida-profile', JSON.stringify(data));
        this.currentUser.set(data as Profile);
      }
    } catch (e) {
      // En caso de error de red, cargar de caché
      const cached = localStorage.getItem('aqua-vida-profile');
      if (cached) {
        this.currentUser.set(JSON.parse(cached));
      } else {
        this.currentUser.set(null);
      }
    } finally {
      this.loading.set(false);
    }
  }

  async login(email: string, password: string) {
    this.loading.set(true);
    try {
      const { data, error } = await this.supabase.client.auth.signInWithPassword({
        email,
        password
      });
      if (error) throw error;
      
      if (data.user) {
        await this.fetchProfile(data.user.id);
        const profile = this.currentUser();
        if (profile) {
          if (profile.role === 'admin') {
            this.router.navigate(['/admin']);
          } else {
            this.router.navigate(['/repartidor']);
          }
        }
      }
      return data;
    } catch (error) {
      this.loading.set(false);
      throw error;
    }
  }

  async logout() {
    this.loading.set(true);
    await this.supabase.client.auth.signOut();
    localStorage.removeItem('aqua-vida-profile');
    this.currentUser.set(null);
    this.loading.set(false);
    this.router.navigate(['/login']);
  }
}
