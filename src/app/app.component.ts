import { Component, OnInit } from '@angular/core';
import { NavController, MenuController } from '@ionic/angular';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { DatabaseService } from './services/database.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss']
})
export class AppComponent implements OnInit {
  public isLoggedIn: boolean = false;
  public userRole: string = '';
  public userName: string = '';

  constructor(
    private navCtrl: NavController,
    private menuCtrl: MenuController,
    private router: Router,
    private databaseService: DatabaseService
  ) {
    // Suscribirse a los cambios de ruta
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.checkAuthStatus();
    });
  }

  ngOnInit() {
    // Verificar estado inicial
    this.checkAuthStatus();
    
    // Agregar listener para cambios en localStorage
    window.addEventListener('storage', this.onStorageChange.bind(this));
  }

  private checkAuthStatus() {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      try {
        const currentUser = JSON.parse(storedUser);
        this.updateAuthState(true, currentUser);
      } catch (error) {
        console.error('Error parsing stored user:', error);
        this.clearAuthState();
      }
    } else {
      this.clearAuthState();
    }
  }

  private updateAuthState(isLoggedIn: boolean, user?: any) {
    this.isLoggedIn = isLoggedIn;
    if (user) {
      this.userRole = user.role || '';
      this.userName = user.firstName || '';
    } else {
      this.userRole = '';
      this.userName = '';
    }
  }

  private clearAuthState() {
    this.isLoggedIn = false;
    this.userRole = '';
    this.userName = '';
  }

  private onStorageChange(e: StorageEvent) {
    if (e.key === 'currentUser') {
      if (e.newValue) {
        try {
          const currentUser = JSON.parse(e.newValue);
          this.updateAuthState(true, currentUser);
        } catch (error) {
          console.error('Error parsing storage change:', error);
          this.clearAuthState();
        }
      } else {
        this.clearAuthState();
      }
    }
  }

  get isAdmin(): boolean {
    return this.userRole === 'admin';
  }

  login(user: { role: string, firstName: string }) {
    this.updateAuthState(true, user);
  }

  async logout() {
    // Solo eliminar la sesión actual
    localStorage.removeItem('currentUser');
    
    // Limpiar el estado de la aplicación
    this.clearAuthState();
    
    // Cerrar el menú
    await this.closeMenu();
    
    // Navegar al home
    this.router.navigate(['/home'], { replaceUrl: true });
  }

  async closeMenu() {
    await this.menuCtrl.close();
  }

  ngOnDestroy() {
    window.removeEventListener('storage', this.onStorageChange.bind(this));
  }
}