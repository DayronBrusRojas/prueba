import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { Subscription } from 'rxjs';
import { NavbarVendedorComponent } from './pages/navbar-vendedor/navbar-vendedor.component';
import { NavbarClienteComponent } from './pages/navbar-cliente/navbar-cliente.component';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    NavbarVendedorComponent,
    NavbarClienteComponent
  ],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class AppComponent implements OnInit, OnDestroy {
  private readonly authService = inject(AuthService);
  private userSub?: Subscription;

  viewMode: 'cliente' | 'vendedor' = 'cliente';

  ngOnInit(): void {
    // Al iniciar, si ya está logueado como ADMIN, ir al panel de vendedor
    if (this.authService.isLoggedIn()) {
      const role = this.authService.getUserRole();
      if (role === 'ADMIN') {
        this.viewMode = 'vendedor';
      }
    }

    // Suscribirse a cambios del usuario (por si se loguea/desloguea en esta sesión)
    this.userSub = this.authService.currentUser$.subscribe(user => {
      if (user) {
        const role = user.role || this.authService.getUserRole();
        if (role === 'ADMIN') {
          this.viewMode = 'vendedor';
        }
      } else {
        this.viewMode = 'cliente';
      }
    });
  }

  ngOnDestroy(): void {
    this.userSub?.unsubscribe();
  }

  salirPanel(): void {
    this.viewMode = 'cliente';
  }
}
