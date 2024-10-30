import { Component } from '@angular/core';
import { NavController, ToastController } from '@ionic/angular';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
})
export class LoginPage {
  email: string = '';
  password: string = '';

  users: { email: string, password: string, role: string }[] = [
    { email: 'admin', password: '1234', role: 'admin' },
    { email: 'user', password: '1234', role: 'user' }
  ];

  constructor(
    private navCtrl: NavController,
    private toastController: ToastController,
    private authService: AuthService
  ) {}

  async login() {
    const user = this.users.find(user => 
      user.email === this.email && user.password === this.password
    );

    if (user) {
      this.authService.login(user.email, user.role);
      await this.presentToast('Inicio de sesión exitoso', 'success');
      this.navCtrl.navigateRoot('/home');
    } else {
      await this.presentToast('Correo electrónico o contraseña incorrectos', 'danger');
    }
  }

  goToRegister() {
    this.navCtrl.navigateForward('/register');
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
}