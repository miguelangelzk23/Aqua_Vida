import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SwUpdate } from '@angular/service-worker';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  title = 'aqua_vida';
  
  private swUpdate = inject(SwUpdate);

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
