import { Component, OnInit, OnDestroy } from '@angular/core';
import { NavController, MenuController } from '@ionic/angular';
import { DatabaseService } from './services/database.service';
import { Subscription } from 'rxjs';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss']
})
export class AppComponent implements OnInit, OnDestroy {
  public isLoggedIn: boolean = false;
  public userRole: string = '';
  public userName: string = '';
  private sessionSubscription?: Subscription;
  private routerSubscription?: Subscription;

  constructor(
    private navCtrl: NavController,
    private menuCtrl: MenuController,
    private databaseService: DatabaseService,
    private router: Router
  ) {}

  ngOnInit() {
    // Suscribirse a los cambios de sesión
    this.sessionSubscription = this.databaseService.getActiveSession()
      .subscribe(user => {
        console.log('Estado de sesión actualizado:', user);
        if (user) {
          this.updateAuthState(true, user);
        } else {
          this.clearAuthState();
        }
      });

    // Suscribirse a los cambios de ruta
    this.routerSubscription = this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      this.handleRouteChange(event.url);
    });

    // Verificar sesión inicial
    this.checkInitialSession();
  }

  private async checkInitialSession() {
    const currentUser = this.databaseService.getCurrentUser();
    console.log('Usuario actual:', currentUser);
    if (currentUser) {
      this.updateAuthState(true, currentUser);
    }
  }

  private handleRouteChange(url: string) {
    // Rutas que requieren autenticación
    const protectedRoutes = ['/profile-edit', '/cart', '/vinilo-crud'];
    
    if (protectedRoutes.some(route => url.includes(route)) && !this.isLoggedIn) {
      console.log('Intento de acceso a ruta protegida sin autenticación');
      this.router.navigate(['/login']);
    }
  }

  private updateAuthState(isLoggedIn: boolean, user?: any) {
    console.log('Actualizando estado de autenticación:', { isLoggedIn, user });
    this.isLoggedIn = isLoggedIn;
    if (user) {
      this.userRole = user.role || 'user';
      this.userName = user.firstName || '';
      console.log('Estado actualizado:', {
        isLoggedIn: this.isLoggedIn,
        role: this.userRole,
        name: this.userName
      });
    } else {
      this.clearAuthState();
    }
  }

  private clearAuthState() {
    console.log('Limpiando estado de autenticación');
    this.isLoggedIn = false;
    this.userRole = '';
    this.userName = '';
  }

  get isAdmin(): boolean {
    return this.userRole === 'admin';
  }

  async navigateToPage(url: string) {
    if (url === '/profile-edit' && !this.isLoggedIn) {
      console.log('Intento de acceso a perfil sin autenticación');
      this.router.navigate(['/login']);
      return;
    }
    await this.closeMenu();
    this.router.navigate([url]);
  }

  async logout() {
    try {
      this.databaseService.logout();
      await this.closeMenu();
      this.router.navigate(['/login']);
    } catch (error) {
      console.error('Error en logout:', error);
    }
  }

  async closeMenu() {
    try {
      await this.menuCtrl.close();
    } catch (error) {
      console.error('Error cerrando menú:', error);
    }
  }

  ngOnDestroy() {
    if (this.sessionSubscription) {
      this.sessionSubscription.unsubscribe();
    }
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
  }
}