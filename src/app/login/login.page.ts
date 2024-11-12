import { Component } from '@angular/core';
import { NavController, ToastController, LoadingController } from '@ionic/angular';
import { DatabaseService } from '../services/database.service';
import { firstValueFrom } from 'rxjs';

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
    if (!this.validateFields()) {
      return;
    }

    const loading = await this.loadingController.create({
      message: 'Iniciando sesión...'
    });

    try {
      await loading.present();

      const result = await firstValueFrom(
        this.databaseService.loginUser(this.email, this.password)
      );

      if (result.success) {
        await this.presentToast('¡Bienvenido!', 'success');
        this.navCtrl.navigateRoot('/home', { replaceUrl: true });
      } else {
        await this.presentToast(result.error || 'Credenciales incorrectas', 'danger');
      }
    } catch (error) {
      console.error('Error en login:', error);
      await this.presentToast('Error al iniciar sesión', 'danger');
    } finally {
      await loading.dismiss();
    }
  }

  private validateFields(): boolean {
    if (!this.email || !this.password) {
      this.presentToast('Por favor, ingrese email y contraseña', 'warning');
      return false;
    }
    return true;
  }

  async presentToast(message: string, color: string) {
    const toast = await this.toastController.create({
      message: message,
      duration: 2000,
      position: 'bottom',
      color: color
    });
    await toast.present();
  }
}