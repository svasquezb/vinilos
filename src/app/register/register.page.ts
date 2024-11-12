import { Component, OnInit } from '@angular/core';
import { NavController, ToastController, LoadingController } from '@ionic/angular';
import { DatabaseService } from '../services/database.service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
})
export class RegisterPage implements OnInit {
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

  async ngOnInit() {
    // Verificar el estado de la base de datos al iniciar
    try {
      const dbState = await this.databaseService.checkDatabaseState();
      console.log('Estado inicial de la base de datos:', dbState);
      
      // Verificar la estructura de la tabla
      const tableInfo = await firstValueFrom(this.databaseService.checkUsersTable());
      console.log('Información de la tabla Users:', tableInfo);
      
      // Verificar si hay usuarios
      const userCount = await firstValueFrom(this.databaseService.getUsersCount());
      console.log('Número de usuarios en la base de datos:', userCount);
    } catch (error) {
      console.error('Error al verificar la base de datos:', error);
    }
  }

  async register() {
    if (!this.validateFields()) {
      return;
    }

    const loading = await this.loadingController.create({
      message: 'Registrando usuario...'
    });

    try {
      await loading.present();

      console.log('Iniciando proceso de registro...');
      
      const result = await firstValueFrom(this.databaseService.registerUser({
        firstName: this.firstName,
        lastName: this.lastName,
        email: this.email,
        password: this.password
      }));

      console.log('Resultado del registro:', result);

      if (result.success) {
        await this.presentToast('Registro exitoso', 'success');
        this.navCtrl.navigateRoot('/login');
      } else {
        await this.presentToast(result.error || 'Error en el registro', 'danger');
      }
    } catch (error) {
      console.error('Error durante el registro:', error);
      await this.presentToast(
        'Error al registrar usuario. Por favor, intente nuevamente.',
        'danger'
      );
    } finally {
      await loading.dismiss();
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

    return true;
  }

  validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
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