import { Component, OnInit, inject, HostListener, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SwUpdate } from '@angular/service-worker';
import { CommonModule } from '@angular/common';
import { LucideDownload } from '@lucide/angular';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule, LucideDownload],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  title = 'aqua_vida';
  
  private swUpdate = inject(SwUpdate);

  // Variables para la instalación de la PWA
  deferredPrompt: any = null;
  showInstallBanner = signal<boolean>(false);

  @HostListener('window:beforeinstallprompt', ['$event'])
  onbeforeinstallprompt(e: Event) {
    // Previene que Chrome 67 y anteriores muestren automáticamente el prompt
    e.preventDefault();
    // Guarda el evento para que pueda ser disparado más tarde
    this.deferredPrompt = e;
    // Muestra el banner
    this.showInstallBanner.set(true);
  }

  async installPwa() {
    this.showInstallBanner.set(false);
    if (!this.deferredPrompt) {
      return;
    }
    // Muestra el prompt de instalación nativo
    this.deferredPrompt.prompt();
    // Espera a que el usuario responda al prompt
    const { outcome } = await this.deferredPrompt.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);
    // Limpiamos la variable ya que solo se puede usar una vez
    this.deferredPrompt = null;
  }

  closeBanner() {
    this.showInstallBanner.set(false);
  }

  ngOnInit() {
    // PWA Best Practice: Check for updates and prompt user to reload
    if (this.swUpdate.isEnabled) {
      this.swUpdate.versionUpdates.subscribe((event) => {
        if (event.type === 'VERSION_READY') {
          if (confirm('Hay una nueva versión de Aqua Vida disponible. ¿Deseas actualizar ahora?')) {
            window.location.reload();
          }
        }
      });
    }
  }
}
