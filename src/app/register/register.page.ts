import { Component } from '@angular/core';
import { NavController, ToastController } from '@ionic/angular';

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

  users: { email: string, password: string, firstName: string, lastName: string }[] = [];

  constructor(
    private navCtrl: NavController,
    private toastController: ToastController
  ) {}

  async register() {
    if (!this.email || !this.password || !this.confirmPassword || !this.firstName || !this.lastName) {
      await this.presentToast('Por favor, rellene todos los campos', 'warning');
      return;
    }

    if (!this.validateEmail(this.email)) {
      await this.presentToast('Por favor, ingrese un correo electrónico válido', 'warning');
      return;
    }

    if (!this.validatePassword(this.password)) {
      await this.presentToast('La contraseña debe tener entre 8 y 30 caracteres, incluir al menos una mayúscula y un número', 'warning');
      return;
    }

    if (this.password !== this.confirmPassword) {
      await this.presentToast('Las contraseñas no coinciden', 'danger');
      return;
    }

    if (!this.validateName(this.firstName) || !this.validateName(this.lastName)) {
      await this.presentToast('El nombre y apellido no deben contener caracteres especiales', 'warning');
      return;
    }

    const userExists = this.users.some(user => user.email === this.email);

    if (userExists) {
      await this.presentToast('Este usuario ya está registrado', 'warning');
    } else {
      this.users.push({ 
        email: this.email, 
        password: this.password, 
        firstName: this.firstName, 
        lastName: this.lastName 
      });
      await this.presentToast('Registro exitoso', 'success');
      this.navCtrl.navigateForward('/login');
    }
  }

  validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  validatePassword(password: string): boolean {
    const passwordRegex = /^(?=.*[A-Z])(?=.*\d).{8,30}$/;
    return passwordRegex.test(password);
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
    toast.present();
  }

  goToLogin() {
    this.navCtrl.navigateForward('/login');
  }
}