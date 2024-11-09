import { Injectable } from '@angular/core';
import { Platform, AlertController } from '@ionic/angular';
import { BehaviorSubject, Observable, from, of } from 'rxjs';
import { map, catchError, switchMap, tap } from 'rxjs/operators';
import { Capacitor } from '@capacitor/core';
import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';
import { User } from '../models/user.model';
import { Vinyl } from '../models/vinilos.model';
import { Order } from '../models/order.model';

interface SQLiteResponse {
  values?: any[];
  changes?: {
    changes: number;
    lastId: number;
  };
}

interface UserDBRecord {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phoneNumber: string | null;
  role: string;
  createdAt: string;
}

interface VinylDBRecord {
  id: number;
  titulo: string;
  artista: string;
  imagen: string;
  descripcion: string;
  tracklist: string;
  stock: number;
  precio: number;
  IsAvailable: number;
}

interface OrderDBRecord {
  id: number;
  userId: number;
  createdAt: string;
  status: string;
  totalAmount: number;
  orderDetails: string;
}

interface RegisterUserData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

@Injectable({
  providedIn: 'root'
})
export class DatabaseService {
  private database!: SQLiteDBConnection;
  private dbReady = new BehaviorSubject<boolean>(false);
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

  public getDatabaseState(): Observable<boolean> {
    return this.dbReady.asObservable();
  }

  private async initializeDatabase(): Promise<void> {
    const dbName = 'vinilos.db';
    try {
      await this.sqlite.closeAllConnections();
      
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
      await this.insertSeedData().toPromise();
      this.dbReady.next(true);
      console.log('Database initialized successfully');
    } catch (error) {
      console.error('Error initializing database:', error);
      await this.presentAlert('Error', 'Failed to initialize the database. Please try again.');
      this.dbReady.next(false);
    }
  }

  private async createTables(): Promise<void> {
    try {
      const dropTables = [
        'DROP TABLE IF EXISTS Orders;',
        'DROP TABLE IF EXISTS Vinyls;',
        'DROP TABLE IF EXISTS Users;'
      ];

      for (const sql of dropTables) {
        await this.database.execute(sql);
      }

      await this.database.execute(this.tableUsers);
      await this.database.execute(this.tableVinyls);
      await this.database.execute(this.tableOrders);

      console.log('Tables created successfully');
    } catch (error) {
      console.error('Error creating tables:', error);
      throw error;
    }
  }

  private readonly tableUsers: string = `
    CREATE TABLE IF NOT EXISTS Users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      firstName TEXT NOT NULL,
      lastName TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      phoneNumber TEXT,
      role TEXT DEFAULT 'user',
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );`;

  private readonly tableVinyls: string = `
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

  private readonly tableOrders: string = `
    CREATE TABLE IF NOT EXISTS Orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      status TEXT NOT NULL,
      totalAmount REAL NOT NULL,
      orderDetails TEXT NOT NULL,
      FOREIGN KEY (userId) REFERENCES Users(id)
    );`;

  async presentAlert(titulo: string, msj: string): Promise<void> {
    const alert = await this.alertController.create({
      header: titulo,
      message: msj,
      buttons: ['OK'],
    });
    await alert.present();
  }

  private executeSQL(query: string, params: any[] = []): Observable<SQLiteResponse> {
    if (!this.database) {
      console.error('Database connection not established');
      return of({ values: [], changes: { changes: 0, lastId: -1 } });
    }

    return from(this.database.query(query, params)).pipe(
      tap(result => console.log('SQL Query Result:', result)),
      catchError(error => {
        console.error('SQL execution error:', error);
        throw error;
      })
    );
  }

  registerUser(userData: RegisterUserData): Observable<any> {
    console.log('Attempting to register user:', userData);
    return this.getDatabaseState().pipe(
      switchMap(ready => {
        if (!ready) {
          throw new Error('Database not ready');
        }

        return this.executeSQL(
          'INSERT INTO Users (firstName, lastName, email, password, role) VALUES (?, ?, ?, ?, ?)',
          [userData.firstName, userData.lastName, userData.email, userData.password, 'user']
        );
      }),
      map(result => {
        console.log('Registration result:', result);
        if (result && result.changes && result.changes.lastId) {
          return {
            success: true,
            userId: result.changes.lastId
          };
        }
        throw new Error('Failed to insert user');
      }),
      catchError(error => {
        console.error('Error in registerUser:', error);
        if (error.message && error.message.includes('UNIQUE constraint failed')) {
          return of({
            success: false,
            error: 'Este correo electrónico ya está registrado'
          });
        }
        return of({
          success: false,
          error: error.message || 'Error desconocido en el registro'
        });
      })
    );
  }

  loginUser(email: string, password: string): Observable<any> {
    console.log('Attempting login for:', email);
    return this.executeSQL(
      'SELECT * FROM Users WHERE email = ? AND password = ?',
      [email, password]
    ).pipe(
      map(data => {
        console.log('Login query result:', data);
        if (data.values && data.values.length > 0) {
          return {
            success: true,
            user: data.values[0] as UserDBRecord
          };
        }
        return {
          success: false,
          error: 'Credenciales inválidas'
        };
      }),
      catchError(error => {
        console.error('Error in login:', error);
        return of({
          success: false,
          error: error.message || 'Error en el inicio de sesión'
        });
      })
    );
  }

  checkEmailExists(email: string): Observable<boolean> {
    return this.executeSQL(
      'SELECT COUNT(*) as count FROM Users WHERE email = ?',
      [email]
    ).pipe(
      map(result => {
        const count = result.values?.[0]?.count ?? 0;
        console.log('Email check result:', { email, count });
        return count > 0;
      }),
      catchError(error => {
        console.error('Error checking email:', error);
        return of(false);
      })
    );
  }

  createVinyl(vinyl: Vinyl): Observable<number> {
    return this.executeSQL(
      'INSERT INTO Vinyls (titulo, artista, imagen, descripcion, tracklist, stock, precio, IsAvailable) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [vinyl.titulo, vinyl.artista, vinyl.imagen, JSON.stringify(vinyl.descripcion), JSON.stringify(vinyl.tracklist), vinyl.stock, vinyl.precio, vinyl.IsAvailable ? 1 : 0]
    ).pipe(
      map(data => data.changes?.lastId || -1),
      catchError(error => {
        console.error('Error creating vinyl:', error);
        throw error;
      })
    );
  }

  getVinyls(): Observable<Vinyl[]> {
    console.log('Fetching vinyls from database');
    return this.executeSQL('SELECT * FROM Vinyls').pipe(
      map(data => {
        if (!data.values || data.values.length === 0) {
          console.log('No vinyls found in database');
          return [];
        }
        return (data.values as VinylDBRecord[]).map(item => ({
          id: item.id,
          titulo: item.titulo,
          artista: item.artista,
          imagen: item.imagen,
          descripcion: JSON.parse(item.descripcion),
          tracklist: JSON.parse(item.tracklist),
          stock: item.stock,
          precio: item.precio,
          IsAvailable: item.IsAvailable === 1
        }));
      }),
      tap(vinyls => console.log('Processed vinyls:', vinyls)),
      catchError(error => {
        console.error('Error fetching vinyls:', error);
        return of([]);
      })
    );
  }

  createOrder(order: Order): Observable<number> {
    return this.executeSQL(
      'INSERT INTO Orders (userId, status, totalAmount, orderDetails) VALUES (?, ?, ?, ?)',
      [order.userId, order.status, order.totalAmount, JSON.stringify(order.orderDetails)]
    ).pipe(
      map(data => data.changes?.lastId || -1),
      catchError(error => {
        console.error('Error creating order:', error);
        throw error;
      })
    );
  }

  getOrders(userId?: number): Observable<Order[]> {
    let query = 'SELECT * FROM Orders';
    const params: number[] = [];
    
    if (userId) {
      query += ' WHERE userId = ?';
      params.push(userId);
    }
    
    return this.executeSQL(query, params).pipe(
      map(data => {
        return ((data.values || []) as OrderDBRecord[]).map(item => ({
          id: item.id,
          userId: item.userId,
          createdAt: item.createdAt,
          status: item.status,
          totalAmount: item.totalAmount,
          orderDetails: JSON.parse(item.orderDetails)
        }));
      }),
      catchError(error => {
        console.error('Error fetching orders:', error);
        return of([]);
      })
    );
  }

  updateVinylStock(vinylId: number, newStock: number): Observable<boolean> {
    return this.executeSQL(
      'UPDATE Vinyls SET stock = ? WHERE id = ?',
      [newStock, vinylId]
    ).pipe(
      map(() => true),
      catchError(error => {
        console.error('Error updating stock:', error);
        return of(false);
      })
    );
  }

  insertSeedData(): Observable<boolean> {
    console.log('Starting seed data insertion');
    const users = [
      { 
        firstName: 'Usuario',
        lastName: 'Ejemplo',
        email: 'usuario@example.com',
        password: '123456',
        phoneNumber: '966189340',
        role: 'user',
        createdAt: '2021-07-01 10:00:00'
      }
    ];
  
    const products: Vinyl[] = [
      { 
        titulo: 'Hit me hard & soft', 
        artista: 'Billie Eilish', 
        imagen: 'assets/img/hitme.jpg', 
        descripcion: [
          'El tercer álbum de estudio de Billie Eilish, «HIT ME HARD AND SOFT»',
          'Exactamente como sugiere el título del álbum',
          'Con la ayuda de su hermano y único colaborador, FINNEAS',
          'Este álbum llega inmediatamente después de sus dos álbumes'
        ],
        tracklist: [
          'Skinny',
          'Lunch',
          'Chihiro',
          'Birds Of A Feather',
          'Wildflower',
          'The greatest',
          'L’AMOUR DE MA VIE',
          'THE DINER',
          'BITTERSUITE',
          'Blue'
        ],
        stock: 10,
        precio: 35990,
        IsAvailable: true 
      },
    ];

    return from(Promise.all([
      ...users.map(user => 
        this.database.run(
          'INSERT INTO Users (firstName, lastName, email, password, phoneNumber, role, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)', 
          [user.firstName, user.lastName, user.email, user.password, user.phoneNumber, user.role, user.createdAt]
        ).then(() => console.log(`User inserted: ${user.firstName}`))
      ),
      ...products.map(vinyl => 
        this.database.run(
          'INSERT INTO Vinyls (titulo, artista, imagen, descripcion, tracklist, stock, precio, IsAvailable) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', 
          [vinyl.titulo, vinyl.artista, vinyl.imagen, JSON.stringify(vinyl.descripcion), JSON.stringify(vinyl.tracklist), vinyl.stock, vinyl.precio, vinyl.IsAvailable ? 1 : 0]
        ).then(() => console.log(`Vinyl inserted: ${vinyl.titulo}`))
      )
    ])).pipe(
      map(() => {
        console.log('Seed data inserted successfully');
        return true;
      }),
      catchError(error => {
        console.error('Error in seed data insertion:', error);
        return of(false);
      })
    );
  }

  public async checkDatabaseState(): Promise<boolean> {
    return this.dbReady.value;
  }
}