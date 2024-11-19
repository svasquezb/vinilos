import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { LoadingController, ToastController, NavController } from '@ionic/angular';
import { CartService } from '../services/cart.service';
import { DatabaseService } from '../services/database.service';
import emailjs from '@emailjs/browser';

@Component({
 selector: 'app-checkout',
 templateUrl: './checkout.page.html',
 styleUrls: ['./checkout.page.scss'],
})
export class CheckoutPage implements OnInit {
 checkoutForm: FormGroup;
 cartItems: any[] = [];
 total: number = 0;
 paymentMethods = [
   { value: 'debito', label: 'Tarjeta de Débito' },
   { value: 'credito', label: 'Tarjeta de Crédito' },
   { value: 'efectivo', label: 'Efectivo' }
 ];

 constructor(
   private formBuilder: FormBuilder,
   private cartService: CartService,
   private loadingController: LoadingController,
   private toastController: ToastController,
   private navCtrl: NavController,
   private databaseService: DatabaseService
 ) {
   this.checkoutForm = this.formBuilder.group({
     nombre: [{value: '', disabled: true}, [Validators.required]],
     email: [{value: '', disabled: true}, [Validators.required, Validators.email]],
     telefono: [{value: '', disabled: true}, [Validators.required, Validators.pattern('^[0-9]{9}$')]],
     direccion: [{value: '', disabled: true}, [Validators.required]],
     metodoPago: ['', [Validators.required]]
   });

   emailjs.init("VpUhr9UMBFrQQfzQw");
 }

 async ngOnInit() {
   const currentUser = this.databaseService.getCurrentUser();
   
   // Verificar si el usuario tiene la información completa
   if (!currentUser?.address || !currentUser?.phoneNumber) {
     await this.presentToast(
       'Por favor complete su perfil con dirección y teléfono antes de realizar una compra', 
       'warning'
     );
     this.navCtrl.navigateRoot('/profile-edit');
     return;
   }

   this.loadCartData();
   await this.loadUserData();
 }

 private async loadUserData() {
   const currentUser = this.databaseService.getCurrentUser();
   if (currentUser) {
     this.checkoutForm.patchValue({
       nombre: `${currentUser.firstName} ${currentUser.lastName}`,
       email: currentUser.email,
       telefono: currentUser.phoneNumber || '',
       direccion: currentUser.address || ''
     });
   }
 }

 private loadCartData() {
   this.cartService.getCart().subscribe(items => {
     this.cartItems = items;
     this.total = this.cartService.getTotal();
   });
 }

 async onSubmit() {
  if (this.checkoutForm.invalid) {
    await this.presentToast('Por favor complete todos los campos correctamente', 'warning');
    return;
  }

  // Verificar stock antes de procesar
  for (const item of this.cartItems) {
    const vinyl = await this.databaseService.executeQuerySQL(
      'SELECT stock FROM Vinyls WHERE id = ?',
      [item.id]
    ).toPromise();
    
    if (!vinyl?.values?.[0] || vinyl.values[0].stock < item.quantity) {
      await this.presentToast(`Stock insuficiente para ${item.titulo}`, 'warning');
      return;
    }
  }

  const loading = await this.loadingController.create({
    message: 'Procesando su orden...'
  });
  await loading.present();

  try {
    const cartDetails = this.cartItems.map(item => `
      Título: ${item.titulo}
      Artista: ${item.artista}
      Cantidad: ${item.quantity}
      Precio unitario: $${item.precio.toLocaleString('es-CL')}
      Subtotal: $${(item.precio * item.quantity).toLocaleString('es-CL')}
    `).join('\n\n');

    const formValue = {
      ...this.checkoutForm.getRawValue(),
    };

    const templateParams = {
      to_email: formValue.email,
      to_name: formValue.nombre,
      phone: formValue.telefono,
      address: formValue.direccion,
      payment_method: this.paymentMethods.find(m => m.value === formValue.metodoPago)?.label,
      cart_items: cartDetails,
      total: `$${this.total.toLocaleString('es-CL')}`,
      order_date: new Date().toLocaleDateString('es-CL'),
      reply_to: formValue.email
    };

    const response = await emailjs.send(
      "service_zht6lt2",
      "template_y3gl94i",
      templateParams,
      "VpUhr9UMBFrQQfzQw"
    );

    if (response.status === 200) {
      // Actualizar stocks solo después de confirmar la compra
      for (const item of this.cartItems) {
        await this.databaseService.executeQuerySQL(
          'UPDATE Vinyls SET stock = stock - ? WHERE id = ?',
          [item.quantity, item.id]
        ).toPromise();
      }
      
      await this.cartService.clearCart();
      await loading.dismiss();
      await this.presentToast('¡Orden enviada exitosamente! Revise su correo para más detalles', 'success');
      await this.navCtrl.navigateRoot('/home');
    } else {
      throw new Error('Error al enviar el email');
    }

  } catch (error) {
    console.error('Error al procesar la orden:', error);
    await loading.dismiss();
    await this.presentToast('Error al procesar la orden. Por favor intente nuevamente', 'danger');
  }
}

 async presentToast(message: string, color: string = 'success') {
   const toast = await this.toastController.create({
     message,
     duration: 3000,
     position: 'bottom',
     color,
     cssClass: 'custom-toast'
   });
   await toast.present();
 }

 getErrorMessage(controlName: string): string {
   const control = this.checkoutForm.get(controlName);
   if (control?.errors) {
     if (control.errors['required']) return 'Este campo es requerido';
     if (control.errors['email']) return 'Ingrese un email válido';
     if (control.errors['pattern']) return 'Ingrese un número válido de 9 dígitos';
   }
   return '';
 }

 formatPrice(price: number): string {
   return price.toLocaleString('es-CL', {
     style: 'currency',
     currency: 'CLP',
     minimumFractionDigits: 0,
     maximumFractionDigits: 0
   });
 }

 ionViewWillEnter() {
   const currentUser = this.databaseService.getCurrentUser();
   if (!currentUser?.address || !currentUser?.phoneNumber) {
     this.navCtrl.navigateRoot('/profile-edit');
   }
 }
}