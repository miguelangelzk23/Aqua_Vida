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
      if (session?.user) {
        await this.fetchProfile(session.user.id);
      } else {
        this.currentUser.set(null);
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
        this.currentUser.set(null);
      } else {
        this.currentUser.set(data as Profile);
      }
    } catch (e) {
      this.currentUser.set(null);
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
    this.currentUser.set(null);
    this.loading.set(false);
    this.router.navigate(['/login']);
  }
}
