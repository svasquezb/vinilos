import { Component } from '@angular/core';
import { NavController, LoadingController, ToastController } from '@ionic/angular';
import { DatabaseService } from '../services/database.service';
import { firstValueFrom } from 'rxjs';
import emailjs from '@emailjs/browser';

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.page.html',
  styleUrls: ['./forgot-password.page.scss'],
})
export class ForgotPasswordPage {
  email: string = '';
  verificationCode: string = '';
  newPassword: string = '';
  confirmPassword: string = '';
  generatedCode: string = '';
  step: 'email' | 'verify' | 'reset' = 'email';

  constructor(
    private navCtrl: NavController,
    private databaseService: DatabaseService,
    private loadingController: LoadingController,
    private toastController: ToastController
  ) {
    emailjs.init("VpUhr9UMBFrQQfzQw");
  }

  // Propiedades para validación de contraseña
  get hasUpperCase(): boolean {
    return /[A-Z]/.test(this.newPassword);
  }

  get hasLowerCase(): boolean {
    return /[a-z]/.test(this.newPassword);
  }

  get hasNumber(): boolean {
    return /\d/.test(this.newPassword);
  }

  get hasSpecialChar(): boolean {
    return /[!@#$%^&*(),.?":{}|<>]/.test(this.newPassword);
  }

  get isLongEnough(): boolean {
    return this.newPassword.length >= 6;
  }

  goBack() {
    if (this.step === 'verify') {
      this.step = 'email';
    } else if (this.step === 'reset') {
      this.step = 'verify';
    } else {
      this.navCtrl.navigateBack('/login');
    }
  }

  isValidPassword(password: string): boolean {
    return this.hasUpperCase && 
           this.hasLowerCase && 
           this.hasNumber && 
           this.hasSpecialChar && 
           this.isLongEnough;
  }

  async resetPassword() {
    if (!this.newPassword || !this.confirmPassword) {
      await this.presentToast('Por favor, complete todos los campos', 'warning');
      return;
    }

    if (this.newPassword !== this.confirmPassword) {
      await this.presentToast('Las contraseñas no coinciden', 'warning');
      return;
    }

    if (!this.isValidPassword(this.newPassword)) {
      await this.presentToast(
        'La contraseña debe contener al menos 6 caracteres, una mayúscula, una minúscula, un número y un carácter especial',
        'warning'
      );
      return;
    }

    const loading = await this.loadingController.create({
      message: 'Actualizando contraseña...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      // Primero obtenemos el userId
      const user = await firstValueFrom(this.databaseService.getUserByEmail(this.email));
      
      if (!user || !user.id) {
        throw new Error('No se encontró el usuario');
      }

      const tempCurrentPassword = 'temp123';
      
      const result = await firstValueFrom(
        this.databaseService.updateUserPassword(user.id, tempCurrentPassword, this.newPassword)
      );

      if (result.success) {
        await this.presentToast('Contraseña actualizada correctamente', 'success');
        this.navCtrl.navigateRoot('/login');
      } else {
        throw new Error(result.error || 'No se pudo actualizar la contraseña');
      }
    } catch (error) {
      console.error('Error:', error);
      await this.presentToast('Error al actualizar la contraseña', 'danger');
    } finally {
      await loading.dismiss();
    }
}

async sendVerificationCode() {
  if (!this.email) {
    await this.presentToast('Por favor, ingrese su correo electrónico', 'warning');
    return;
  }

  const loading = await this.loadingController.create({
    message: 'Verificando correo...',
    spinner: 'crescent'
  });
  await loading.present();

  try {
    const exists = await firstValueFrom(this.databaseService.checkEmailExists(this.email));

    if (!exists) {
      throw new Error('No existe una cuenta con este correo electrónico');
    }

    this.generatedCode = Math.floor(1000 + Math.random() * 9000).toString();
    
    const templateParams = {
      to_email: this.email,         // Email del cliente - IMPORTANTE: este es el campo clave
      verification_code: this.generatedCode,
      from_name: 'Vinyls Store'
    };

    console.log('Enviando email a:', this.email); // Para debugging

    const response = await emailjs.send(
      "service_zht6lt2",    
      "template_w822358",  
      templateParams,
      "VpUhr9UMBFrQQfzQw"  
    );

    if (response.status === 200) {
      console.log('Email enviado exitosamente a:', this.email); // Para debugging
      this.step = 'verify';
      await this.presentToast('Código de verificación enviado a su correo', 'success');
    } else {
      throw new Error('Error al enviar el correo');
    }

  } catch (error) {
    console.error('Error en el envío:', error);
    const message = error instanceof Error ? error.message : 'Error al enviar el código';
    await this.presentToast(message, 'danger');
  } finally {
    await loading.dismiss();
  }
}

  async verifyCode() {
    const inputCode = this.verificationCode.toString().trim();
    const storedCode = this.generatedCode.toString().trim();

    if (inputCode === storedCode) {
      this.step = 'reset';
      await this.presentToast('Código verificado correctamente', 'success');
    } else {
      await this.presentToast('Código de verificación incorrecto', 'danger');
    }
  }

  async presentToast(message: string, color: 'success' | 'warning' | 'danger') {
    const toast = await this.toastController.create({
      message: message,
      duration: 3000,
      position: 'bottom',
      color: color,
      cssClass: 'custom-toast'
    });
    await toast.present();
  }
}