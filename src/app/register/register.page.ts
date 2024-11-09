import { Component } from '@angular/core';
import { NavController, ToastController, LoadingController } from '@ionic/angular';
import { DatabaseService } from '../services/database.service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
})
export class RegisterPage {
  email: string = '';
  password: string = '';
  confirmPassword: string = '';
  firstName: string = '';
  lastName: string = '';

  constructor(
    private navCtrl: NavController,
    private toastController: ToastController,
    private loadingController: LoadingController,
    private databaseService: DatabaseService
  ) {}

  async register() {
    if (!this.validateFields()) {
      return;
    }

    const loading = await this.loadingController.create({
      message: 'Registrando usuario...'
    });

    try {
      await loading.present();

      // Verificar si el email existe
      const emailExists = await firstValueFrom(this.databaseService.checkEmailExists(this.email));
      
      if (emailExists) {
        await loading.dismiss();
        await this.presentToast('Este correo electrónico ya está registrado', 'warning');
        return;
      }

      // Registrar usuario
      const result = await firstValueFrom(this.databaseService.registerUser({
        firstName: this.firstName,
        lastName: this.lastName,
        email: this.email,
        password: this.password
      }));

      await loading.dismiss();

      if (result.success) {
        await this.presentToast('Registro exitoso', 'success');
        this.navCtrl.navigateRoot('/home');
      } else {
        await this.presentToast('Error en el registro: ' + (result.error || 'Error desconocido'), 'danger');
      }
    } catch (error) {
      console.error('Error en el registro:', error);
      await loading.dismiss();
      await this.presentToast('Error en el registro. Por favor, intente nuevamente.', 'danger');
    }
  }

  private validateFields(): boolean {
    if (!this.email || !this.password || !this.confirmPassword || !this.firstName || !this.lastName) {
      this.presentToast('Por favor, complete todos los campos', 'warning');
      return false;
    }

    if (!this.validateEmail(this.email)) {
      this.presentToast('Por favor, ingrese un correo electrónico válido', 'warning');
      return false;
    }

    if (this.password !== this.confirmPassword) {
      this.presentToast('Las contraseñas no coinciden', 'danger');
      return false;
    }

    if (this.password.length < 6) {
      this.presentToast('La contraseña debe tener al menos 6 caracteres', 'warning');
      return false;
    }

    if (!this.validateName(this.firstName) || !this.validateName(this.lastName)) {
      this.presentToast('El nombre y apellido no deben contener caracteres especiales', 'warning');
      return false;
    }

    return true;
  }

  validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  validateName(name: string): boolean {
    const nameRegex = /^[a-zA-Z\s]+$/;
    return nameRegex.test(name);
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