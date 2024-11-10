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
        console.log('Retrieving existing database connection');
        db = await this.sqlite.retrieveConnection(dbName, false);
      } else {
        console.log('Creating new database connection');
        db = await this.sqlite.createConnection(dbName, false, "no-encryption", 1, false);
        
        // Solo crear tablas e insertar datos si es una nueva conexión
        await db.open();
        this.database = db;
        await this.createTables();
        await this.insertSeedData().toPromise();
      }
  
      await db.open();
      this.database = db;
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
    console.log('Starting user registration process:', userData);
    return this.getDatabaseState().pipe(
      switchMap(ready => {
        if (!ready) {
          console.error('Database not ready during registration');
          throw new Error('Database not ready');
        }
  
        const query = `INSERT INTO Users 
          (firstName, lastName, email, password, role, createdAt) 
          VALUES (?, ?, ?, ?, ?, datetime('now'))`;
        
        return this.executeSQL(query, [
          userData.firstName,
          userData.lastName,
          userData.email,
          userData.password,
          'user'
        ]);
      }),
      map(result => {
        console.log('Database insert result:', result);
        
        // Generar un ID si no hay uno de la base de datos
        const userId = result?.changes?.lastId || Math.floor(Date.now() / 1000);
        
        return {
          success: true,
          userId: userId,
          user: {
            id: userId,
            firstName: userData.firstName,
            lastName: userData.lastName,
            email: userData.email,
            role: 'user',
            createdAt: new Date().toISOString()
          }
        };
      }),
      tap(response => {
        console.log('Registration response:', response);
      }),
      catchError(error => {
        console.error('Error in registration:', error);
        if (error.message?.includes('UNIQUE constraint failed')) {
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

  getUserById(userId: number): Observable<any> {
    return this.executeSQL(
      'SELECT * FROM Users WHERE id = ?',
      [userId]
    ).pipe(
      map(result => {
        if (result.values && result.values.length > 0) {
          return result.values[0];
        }
        throw new Error('Usuario no encontrado');
      }),
      catchError(error => {
        console.error('Error fetching user:', error);
        return of(null);
      })
    );
  }
  
  updateUser(userData: any): Observable<any> {
    const query = `
      UPDATE Users 
      SET firstName = ?,
          lastName = ?,
          address = ?,
          phoneNumber = ?
      WHERE id = ?
    `;
    
    return this.executeSQL(query, [
      userData.firstName,
      userData.lastName,
      userData.address || null,
      userData.phoneNumber || null,
      userData.id
    ]).pipe(
      map(result => ({
        success: true,
        changes: result.changes
      })),
      catchError(error => {
        console.error('Error updating user:', error);
        return of({
          success: false,
          error: error.message || 'Error updating user'
        });
      })
    );
  }
  
  updateUserPhoto(userId: number, photoData: string): Observable<any> {
    return this.executeSQL(
      'UPDATE Users SET photo = ? WHERE id = ?',
      [photoData, userId]
    ).pipe(
      map(result => ({
        success: true,
        changes: result.changes
      })),
      catchError(error => {
        console.error('Error updating user photo:', error);
        return of({
          success: false,
          error: error.message || 'Error updating photo'
        });
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
          'El tercer álbum de estudio de Billie Eilish, «HIT ME HARD AND SOFT», lanzado a través de Darkroom/Interscope Records, es su trabajo más atrevido hasta la fecha, una colección diversa pero cohesiva de canciones, idealmente escuchadas en su totalidad, de principio a fin.'
        ],
        tracklist: ['Skinny', 'Lunch', 'Chihiro', 'Birds Of A Feather', 'Wildflower', 'The Greatest', 'LAmour De Ma Vie', 'The Diner', 'Bittersuite', 'Blue'],
        stock: 10,
        precio: 39990,
        IsAvailable: true 
      },
      {
        titulo: 'Dont smite at me',
        artista: 'Billie Eilish',
        imagen: 'assets/img/dontat.jpg',
        descripcion: ['Dont Smile at Me, es el primer extended play de la cantante estadounidense Billie Eilish​ Se lanzó el 11 de agosto de 2017 a través del sello discográfico Interscope Records.'],
        tracklist: ['COPYCAT', 'idontwannabeyouanymore', 'my boy', 'watch', 'party favor', 'bellyache', 'ocean eyes', 'hostage', '&burn by Billie Eilish & Vince Staples'],
        stock: 10,
        precio: 29990,
        IsAvailable: true
      },
      {
        titulo: 'Happier than ever',
        artista: 'Billie Eilish',
        imagen: 'assets/img/happier.jpg',
        descripcion: ['Happier Than Ever es el segundo álbum de estudio de la cantautora estadounidense Billie Eilish, cuyo lanzamiento tuvo lugar el 30 de julio de 2021.'],
        tracklist: ['Getting Older', 'I Didnt Change My Number', 'Billie Bossa Nova', 'my future', 'Oxytocin', 'GOLDWING', 'Lost Cause', 'Halleys Comet', 'Not My Responsibility', 'OverHeated', 'Everybody Dies', 'Your Power', 'NDA', 'Therefore I Am', 'Happier Than Ever', 'Male Fantasy'],
        stock: 10,
        precio: 25990,
        IsAvailable: true
      },
      {
        titulo: 'When We All Fall Asleep, Where Do We Go?',
        artista: 'Billie Eilish',
        imagen: 'assets/img/whenwe.jpg',
        descripcion: ['When We All Fall Asleep, Where Do We Go? es el álbum de estudio debut de la cantante y compositora estadounidense Billie Eilish. Fue lanzado el 29 de marzo de 2019.'],
        tracklist: ['!!!!!!!', 'bad guy', 'xanny', 'you should see me in a crown', 'all the good girls go to hell', 'wish you were gay', 'when the partys over', '8', 'my strange addiction', 'bury a friend', 'ilomilo', 'listen before i go', 'i love you', 'goodbye'],
        stock: 10,
        precio: 21990,
        IsAvailable: true
      },
      {
        titulo: 'Sempiternal',
        artista: 'Bring me the horizon',
        imagen: 'assets/img/sempiternal.jpg',
        descripcion: ['Sempiternal es el cuarto álbum de estudio de la banda de rock británica Bring Me the Horizon. Fue lanzado el 1 de abril de 2013.'],
        tracklist: ['Can You Feel My Heart', 'The House of Wolves', 'Empire (Let Them Sing)', 'Sleepwalking', 'Go to Hell, for Heavens Sake', 'Shadow Moses', 'And the Snakes Start to Sing', 'Seen It All Before', 'Antivist', 'Crooked Young', 'Hospital for Souls'],
        stock: 10,
        precio: 35990,
        IsAvailable: true
      },
      {
        titulo: 'That the spirit',
        artista: 'Bring me the horizon',
        imagen: 'assets/img/spirit.jpg',
        descripcion: ['Thats the Spirit es el nombre del quinto álbum de estudio de la banda británica Bring Me the Horizon. Fue lanzado el 11 de septiembre de 2015.'],
        tracklist: ['Doomed', 'Happy Song', 'Throne', 'True Friends', 'Follow You', 'What You Need', 'Avalanche', 'Run', 'Drown', 'Blasphemy', 'Oh No'],
        stock: 10,
        precio: 41990,
        IsAvailable: true
      },
      {
        titulo: 'Anti-icon',
        artista: 'Ghostemane',
        imagen: 'assets/img/anti.jpg',
        descripcion: ['ANTI-ICON es el octavo álbum de estudio del artista estadounidense Ghostemane.'],
        tracklist: ['Intro.Destitute', 'Vagabond', 'Lazaretto', 'Sacrilege', 'AI', 'Fed Up', 'The Winds of Change', 'Hydrochloride', 'Hellrap', 'Anti-Social Masochistic Rage [ASMR]', 'Melanchoholic', 'Calamity', 'Falling Down'],
        stock: 10,
        precio: 33900,
        IsAvailable: true
      },
      {
        titulo: 'The Death of Peace of Mind',
        artista: 'Bad Omens',
        imagen: 'assets/img/thedeath.jpg',
        descripcion: ['The Death of Peace of Mind es el tercer álbum de estudio de la banda estadounidense Bad Omens.'],
        tracklist: ['Concrete Jungle', 'Nowhere To Go', 'Take Me First', 'The Death Of Peace Of Mind', 'What It Cost', 'Like A Villain', 'Bad Decisions', 'Just Pretend', 'The Grey', 'Who Are You', 'Somebody Else', 'IDWT$', 'What Do You Want From Me?', 'Artificial Suicide', 'Miracle'],
        stock: 10,
        precio: 33900,
        IsAvailable: true
      },
      {
        titulo: 'Scoring the End of the World',
        artista: 'Motionless in White',
        imagen: 'assets/img/scoring.jpg',
        descripcion: ['Scoring the End of the World es el sexto álbum de estudio de la banda estadounidense de metalcore Motionless in White. Fue lanzado el 10 de junio de 2022.'],
        tracklist: ['Meltdown', 'Sign of Life', 'Werewolf', 'Porcelain', 'Slaughterhouse', 'Masterpiece', 'Cause of Death', 'We Become the Night', 'Burned at Both Ends II', 'B.F.B.T.G.: Corpse Nation', 'Cyberhex', 'Red, White & Boom', 'Scoring the End of the World'],
        stock: 10,
        precio: 31990,
        IsAvailable: true
      },
      {
        titulo: 'For those that wish to exist',
        artista: 'Architects',
        imagen: 'assets/img/for.jpg',
        descripcion: ['For Those That Wish to Exist es el noveno álbum de estudio de la banda británica de metalcore Architects. Se lanzó el 26 de febrero de 2021.'],
        tracklist: ['Do You Dream of Armageddon', 'Black Lungs', 'Giving Blood', 'Discourse Is Dead', 'Dead Butterflies', 'An Ordinary Extinction', 'Impermanence', 'Flight Without Feathers', 'Little Wonder', 'Animals', 'Libertine', 'Goliath', 'Demi God', 'Meteor', 'Dying Is Absolutely Safe'],
        stock: 10,
        precio: 34990,
        IsAvailable: true
      },
      {
        titulo: 'Disguise',
        artista: 'Motionless in White',
        imagen: 'assets/img/disguise.jpg',
        descripcion: ['Disguise es el quinto álbum de estudio de la banda estadounidense de metal gótico'],
        tracklist: ['Disguise', 'Headache', '</c0de>', 'Thoughts & Prayers', 'Legacy', 'Undead Ahead 2: The Tale of the Midnight Ride', 'Holding On To Smoke', 'Another Life', 'Broadcasting From Beyond The Grave: Death Inc.', 'Brand New Numb', 'Catharsis'],
        stock: 10,
        precio: 28990,
        IsAvailable: true
      }
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