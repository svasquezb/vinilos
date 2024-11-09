import { Component } from '@angular/core';
import { NavController, MenuController } from '@ionic/angular';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss']
})
export class AppComponent {
  public isLoggedIn: boolean = false;
  public userRole: string = '';
  public userName: string = '';

  constructor(
    private navCtrl: NavController,
    private menuCtrl: MenuController
  ) {
    // Verificar si hay un usuario guardado en localStorage
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      const currentUser = JSON.parse(storedUser);
      this.isLoggedIn = true;
      this.userRole = currentUser.role;
      this.userName = currentUser.firstName;
    }

    // Suscribirse a los cambios en el localStorage
    window.addEventListener('storage', this.onStorageChange.bind(this));
  }

  private onStorageChange(e: StorageEvent) {
    if (e.key === 'currentUser') {
      if (e.newValue) {
        const currentUser = JSON.parse(e.newValue);
        this.isLoggedIn = true;
        this.userRole = currentUser.role;
        this.userName = currentUser.firstName;
      } else {
        this.isLoggedIn = false;
        this.userRole = '';
        this.userName = '';
      }
    }
  }

  get isAdmin(): boolean {
    return this.userRole === 'admin';
  }

  login(user: { role: string, firstName: string }) {
    this.isLoggedIn = true;
    this.userRole = user.role;
    this.userName = user.firstName;
  }

  logout() {
    this.isLoggedIn = false;
    this.userRole = '';
    this.userName = '';
    localStorage.removeItem('currentUser');
    this.navCtrl.navigateRoot('/home');
  }

  async closeMenu() {
    await this.menuCtrl.close();
  }

  ngOnDestroy() {
    // Eliminar el event listener cuando el componente se destruye
    window.removeEventListener('storage', this.onStorageChange.bind(this));
  }
}