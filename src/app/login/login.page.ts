import { Component } from '@angular/core';
import { NavController, ToastController, LoadingController } from '@ionic/angular';
import { DatabaseService } from '../services/database.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
})
export class LoginPage {
  email: string = '';
  password: string = '';

  constructor(
    private navCtrl: NavController,
    private toastController: ToastController,
    private loadingController: LoadingController,
    private databaseService: DatabaseService
  ) {}

  async login() {
    if (!this.email || !this.password) {
      await this.presentToast('Por favor, ingrese email y contraseña', 'warning');
      return;
    }

    const loading = await this.loadingController.create({
      message: 'Iniciando sesión...'
    });
    await loading.present();

    try {
      const result = await this.databaseService.loginUser(this.email, this.password).toPromise();
      
      if (result.success) {
        // Guardar datos del usuario en localStorage
        localStorage.setItem('currentUser', JSON.stringify(result.user));
        
        await this.presentToast('Bienvenido!', 'success');
        this.navCtrl.navigateRoot('/home');
      } else {
        await this.presentToast('Credenciales inválidas', 'danger');
      }
    } catch (error) {
      console.error('Error en login:', error);
      await this.presentToast('Error al iniciar sesión', 'danger');
    } finally {
      loading.dismiss();
    }
  }

  async presentToast(message: string, color: string) {
    const toast = await this.toastController.create({
      message: message,
      duration: 2000,
      position: 'bottom',
      color: color
    });
    toast.present();
  }

  goToRegister() {
    this.navCtrl.navigateForward('/register');
  }
}