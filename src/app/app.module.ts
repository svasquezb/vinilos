import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouteReuseStrategy } from '@angular/router';
import { IonicModule, IonicRouteStrategy } from '@ionic/angular';
import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';

// Importar Capacitor y SQLite
import { Capacitor } from '@capacitor/core';
import { CapacitorSQLite } from '@capacitor-community/sqlite';

// Servicios
import { DatabaseService } from './services/database.service';

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    IonicModule.forRoot(),
    AppRoutingModule
  ],
  providers: [
    DatabaseService,
    { 
      provide: RouteReuseStrategy, 
      useClass: IonicRouteStrategy 
    },
    { 
      provide: CapacitorSQLite, 
      useFactory: () => {
        if (Capacitor.isNativePlatform()) {
          return CapacitorSQLite;
        } else {
          return {};
        }
      }
    }
  ],
  bootstrap: [AppComponent]
})
export class AppModule {}