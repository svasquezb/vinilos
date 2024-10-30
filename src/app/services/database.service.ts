import { Injectable } from '@angular/core';
import { Platform, AlertController } from '@ionic/angular';
import { BehaviorSubject, Observable, from, of } from 'rxjs';
import { map, catchError, switchMap, tap } from 'rxjs/operators';
import { Capacitor } from '@capacitor/core';
import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';
import { User } from '../models/user.model';
import { Vinyl } from '../models/vinilos.model';
import { Order } from '../models/order.model';

@Injectable({
  providedIn: 'root'
})
export class DatabaseService {
  private database!: SQLiteDBConnection;
  private dbReady: BehaviorSubject<boolean> = new BehaviorSubject(false);
  private sqlite: SQLiteConnection;

  constructor(
    private platform: Platform,
    private alertController: AlertController
  ) {
    this.sqlite = new SQLiteConnection(CapacitorSQLite);
    this.platform.ready().then(() => {
      this.initializeDatabase();
    });
  }


  private async initializeDatabase() {
    const dbName = 'vinilos.db';
    try {
      const retCC = await this.sqlite.checkConnectionsConsistency();
      const isConn = (await this.sqlite.isConnection(dbName, false)).result;
      let db: SQLiteDBConnection;
      if (retCC.result && isConn) {
        db = await this.sqlite.retrieveConnection(dbName, false);
      } else {
        db = await this.sqlite.createConnection(dbName, false, "no-encryption", 1, false);
      }
      await db.open();
      this.database = db;
      await this.createTables();
      await this.insertSeedData().toPromise(); // Llamamos a insertSeedData aquí
      this.dbReady.next(true);
    } catch (error) {
      console.error('Error initializing database', error);
      await this.presentAlert('Error', 'Failed to initialize the database. Please try again.');
    }
  }

  isDatabaseReady(): Observable<boolean> {
    return this.dbReady.asObservable();
  }

  private async createTables() {
    const tables = [this.tableUsers, this.tableVinyls, this.tableOrders];
    for (const table of tables) {
      await this.database.run(table);
    }
  }

  // Define your table creation SQL strings here
  private tableUsers: string = `
    CREATE TABLE IF NOT EXISTS Users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('user', 'admin')),
      name TEXT NOT NULL,
      email TEXT UNIQUE,
      phoneNumber TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      lastLogin DATETIME
    );`;

  private tableVinyls: string = `
    CREATE TABLE IF NOT EXISTS Vinyls (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      titulo TEXT NOT NULL,
      artista TEXT NOT NULL,
      imagen TEXT,
      descripcion TEXT,
      tracklist TEXT,
      stock INTEGER NOT NULL,
      precio REAL NOT NULL,
      IsAvailable BOOLEAN DEFAULT 1
    );`;

  private tableOrders: string = `
    CREATE TABLE IF NOT EXISTS Orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      status TEXT NOT NULL,
      totalAmount REAL NOT NULL,
      orderDetails TEXT NOT NULL,
      FOREIGN KEY (userId) REFERENCES Users(id)
    );`;

  async presentAlert(titulo: string, msj: string) {
    const alert = await this.alertController.create({
      header: titulo,
      message: msj,
      buttons: ['OK'],
    });
    await alert.present();
  }

  private executeSQL(query: string, params: any[] = []): Observable<any> {
    return this.isDatabaseReady().pipe(
      switchMap(ready => {
        if (ready) {
          return from(this.database.query(query, params));
        } else {
          throw new Error('Database not ready');
        }
      }),
      catchError(error => {
        console.error('SQL execution error', error);
        return from([]);
      })
    );
  }

  // User methods
  createUser(user: User): Observable<number> {
    return this.executeSQL(
      'INSERT INTO Users (username, password, role, name, email, phoneNumber) VALUES (?, ?, ?, ?, ?, ?)',
      [user.username, user.password, user.role, user.name, user.email, user.phoneNumber]
    ).pipe(
      map(data => data.changes?.lastId || -1)
    );
  }

  getUsers(): Observable<User[]> {
    return this.executeSQL('SELECT * FROM Users').pipe(
      map(data => data.values as User[])
    );
  }

  // Vinyl methods
  createVinyl(vinyl: Vinyl): Observable<number> {
    return this.executeSQL(
      'INSERT INTO Vinyls (titulo, artista, imagen, descripcion, tracklist, stock, precio, IsAvailable) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [vinyl.titulo, vinyl.artista, vinyl.imagen, JSON.stringify(vinyl.descripcion), JSON.stringify(vinyl.tracklist), vinyl.stock, vinyl.precio, vinyl.IsAvailable ? 1 : 0]
    ).pipe(
      map(data => data.changes?.lastId || -1)
    );
  }

  getVinyls(): Observable<Vinyl[]> {
    console.log('Intentando obtener vinilos de la base de datos');
    return this.executeSQL('SELECT * FROM Vinyls').pipe(
      tap(data => console.log('Datos crudos de la base de datos:', data)),
      map(data => {
        if (!data.values || data.values.length === 0) {
          console.log('No se encontraron vinilos en la base de datos');
          return [];
        }
        console.log('Número de vinilos encontrados:', data.values.length);
        return (data.values as any[]).map(item => ({
          ...item,
          descripcion: JSON.parse(item.descripcion),
          tracklist: JSON.parse(item.tracklist),
          IsAvailable: item.IsAvailable === 1
        }));
      }),
      tap(vinyls => console.log('Vinilos procesados:', vinyls))
    );
  }


  // Order methods
  createOrder(order: Order): Observable<number> {
    return this.executeSQL(
      'INSERT INTO Orders (userId, status, totalAmount, orderDetails) VALUES (?, ?, ?, ?)',
      [order.userId, order.status, order.totalAmount, JSON.stringify(order.orderDetails)]
    ).pipe(
      map(data => data.changes?.lastId || -1)
    );
  }

  getOrders(userId?: number): Observable<Order[]> {
    let query = 'SELECT * FROM Orders';
    let params: any[] = [];
    
    if (userId) {
      query += ' WHERE userId = ?';
      params.push(userId);
    }
    
    return this.executeSQL(query, params).pipe(
      map(data => {
        return (data.values as any[]).map(item => ({
          ...item,
          orderDetails: JSON.parse(item.orderDetails)
        }));
      })
    );
  }

  // Authentication method
  authenticateUser(username: string, password: string): Observable<User | null> {
    return this.executeSQL(
      'SELECT * FROM Users WHERE username = ? AND password = ?',
      [username, password]
    ).pipe(
      map(data => data.values && data.values.length > 0 ? data.values[0] as User : null)
    );
  }

  // Update vinyl stock
  updateVinylStock(vinylId: number, newStock: number): Observable<boolean> {
    return this.executeSQL(
      'UPDATE Vinyls SET stock = ? WHERE id = ?',
      [newStock, vinylId]
    ).pipe(
      map(() => true),
      catchError(() => from([false]))
    );
  }

  insertSeedData(): Observable<boolean> {
    console.log('Iniciando inserción de datos de prueba');
    const users = [
      { username: 'admin', password: 'admin123', role: 'admin', name: 'Admin User', email: 'admin@example.com', phoneNumber: '966189340' ,createdAt: '2021-07-01 10:00:00', lastLogin: '2021-07-01 10:00:00' },
      { username: 'employee1', password: 'emp123', role: 'employee', name: 'Employee One', email: 'emp1@example.com', phoneNumber: '91182739,', createdAt: '2021-07-01 10:00:00', lastLogin: '2021-07-01 10:00:00' },
    ];
  
    const products: Vinyl[] = [
      { 
        titulo: 'Hit me hard & soft', 
        artista: 'Billie Eilish', 
        imagen: 'assets/img/hitme.jpg', 
        descripcion: [
          'El tercer álbum de estudio de Billie Eilish, «HIT ME HARD AND SOFT», lanzado a través de Darkroom/Interscope Records, es su trabajo más atrevido hasta la fecha, una colección diversa pero cohesiva de canciones, idealmente escuchadas en su totalidad, de principio a fin.',
          'Exactamente como sugiere el título del álbum; te golpea fuerte y suave tanto lírica como sonoramente, mientras cambia géneros y desafía tendencias a lo largo del camino.',
          'Con la ayuda de su hermano y único colaborador, FINNEAS, la pareja escribió, grabó y produjo el álbum juntos en su ciudad natal de Los Ángeles.',
          'Este álbum llega inmediatamente después de sus dos álbumes de gran éxito, «WHEN WE ALL FALL ASLEEP WHERE DO WE GO?» y «Happier Than Ever», y trabaja para desarrollar aún más el mundo de Billie Eilish.'
        ],
        tracklist: [
          'Skinny',
          'Lunch',
          'Chihiro',
          'Birds Of A Feather',
          'Wildflower',
          'The Greatest',
          'LAmour De Ma Vie',
          'The Diner',
          'Bittersuite',
          'Blue'
        ],
        stock: 10,
        precio: 5.00,
        IsAvailable: true 
      },
    ];
  
    return from(Promise.all([
      ...users.map(user => 
        this.database.run(
          'INSERT OR REPLACE INTO Users (username, password, role, name, email, phoneNumber, createdAt, lastLogin) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', 
          [user.username, user.password, user.role, user.name, user.email, user.phoneNumber, user.createdAt, user.lastLogin]
        ).then(() => console.log(`Usuario insertado: ${user.username}`))
      ),
      ...products.map(vinyl => 
        this.database.run(
          'INSERT OR REPLACE INTO Vinyls (titulo, artista, imagen, descripcion, tracklist, stock, precio, IsAvailable) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', 
          [vinyl.titulo, vinyl.artista, vinyl.imagen, JSON.stringify(vinyl.descripcion), JSON.stringify(vinyl.tracklist), vinyl.stock, vinyl.precio, vinyl.IsAvailable ? 1 : 0]
        ).then(() => console.log(`Vinilo insertado: ${vinyl.titulo}`))
      )
    ])).pipe(
      map(() => {
        console.log('Datos de prueba insertados correctamente');
        return true;
      }),
      catchError(error => {
        console.error('Error en insertSeedData:', error);
        return of(false);
      })
    );
  }
}