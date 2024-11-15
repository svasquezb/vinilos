import { Injectable } from '@angular/core';
import { Platform, AlertController } from '@ionic/angular';
import { BehaviorSubject, Observable, from, of } from 'rxjs';
import { map, catchError, switchMap, tap, take} from 'rxjs/operators';
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
  private dbName = 'vinilos.db';

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
    if (this.dbReady.getValue()) return;

    try {
      if (Capacitor.getPlatform() === 'web') {
        await this.sqlite.initWebStore();
      }

      await this.sqlite.closeAllConnections();
      
      let db: SQLiteDBConnection;
      
      // Intentar crear nueva conexión
      try {
        db = await this.sqlite.createConnection(
          this.dbName,
          false,
          'no-encryption',
          1,
          false
        );
      } catch (error) {
        console.log('Error creating connection, trying to retrieve existing one:', error);
        db = await this.sqlite.retrieveConnection(this.dbName, false);
      }

      await db.open();
      this.database = db;
      
      console.log('Verificando tablas y datos...');
      const hasTablesAndData = await this.verifyTablesAndData();
      
      if (!hasTablesAndData) {
        console.log('Creando tablas e insertando datos iniciales...');
        await this.createTables();
        await this.insertSeedData();
      }

      this.dbReady.next(true);
      console.log('Database initialized successfully');
    } catch (error) {
      console.error('Database initialization error:', error);
      this.dbReady.next(false);
      await this.presentAlert('Error', 'No se pudo inicializar la base de datos.');
    }
  }

  private async verifyTablesAndData(): Promise<boolean> {
    try {
      const result = await this.database.query(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name IN ('Users', 'Vinyls');
      `);

      if (!result.values || result.values.length < 2) return false;

      const countResult = await this.database.query(`
        SELECT 
          (SELECT COUNT(*) FROM Users) as userCount,
          (SELECT COUNT(*) FROM Vinyls) as vinylCount;
      `);

      return countResult.values?.[0]?.vinylCount > 0;
    } catch (error) {
      console.error('Error verifying tables:', error);
      return false;
    }
  }

  private async checkTablesAndData(): Promise<boolean> {
    try {
      const tablesExist = await this.checkTablesExist();
      if (!tablesExist) return false;
  
      const result = await this.database.query(`
        SELECT 
          (SELECT COUNT(*) FROM Users) as userCount,
          (SELECT COUNT(*) FROM Vinyls) as vinylCount
      `);
  
      const counts = result.values?.[0];
      return (counts?.userCount > 0 && counts?.vinylCount > 0);
    } catch (error) {
      console.error('Error checking tables and data:', error);
      return false;
    }
  }  

  private async createTables(): Promise<void> {
    try {
      const checkTableQuery = `
        SELECT sql FROM sqlite_master 
        WHERE type='table' AND name='Users';
      `;
      
      const tableResult = await this.database.query(checkTableQuery);
      const needsRecreation = !tableResult.values?.length || 
                             !tableResult.values[0].sql.includes('photo');
  
      if (needsRecreation) {
        console.log('Recreando tabla Users con estructura actualizada');
        
        // Eliminar tabla existente si existe
        await this.database.execute('DROP TABLE IF EXISTS Users;');
        
        // Crear tabla con nueva estructura
        const createUsersTable = `
          CREATE TABLE IF NOT EXISTS Users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            firstName TEXT NOT NULL,
            lastName TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            phoneNumber TEXT,
            role TEXT DEFAULT 'user',
            address TEXT,
            photo BLOB,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
          );
        `;
        
        await this.database.execute(createUsersTable);
        console.log('Tabla Users creada exitosamente');
        
        // Insertar datos de ejemplo después de recrear la tabla
        await this.insertSeedData().toPromise();
      }
  
      // Crear otras tablas si no existen
      await this.database.execute(this.tableVinyls);
      await this.database.execute(this.tableOrders);
  
      console.log('Todas las tablas creadas/verificadas exitosamente');
    } catch (error) {
      console.error('Error creando tablas:', error);
      throw error;
    }
  }

  private async checkTablesExist(): Promise<boolean> {
    try {
      const result = await this.database.query(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name IN ('Users', 'Vinyls', 'Orders');
      `);
      
      const existingTables = result.values?.length || 0;
      return existingTables === 3; // Retorna true si existen las 3 tablas
    } catch (error) {
      console.error('Error checking tables:', error);
      return false;
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
    address TEXT,
    photo TEXT,
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
    console.log('Iniciando registro de usuario:', userData);
  
    return this.getDatabaseState().pipe(
      switchMap(() => {
        const query = `
          INSERT INTO Users (
            firstName, 
            lastName, 
            email, 
            password, 
            role, 
            createdAt
          ) VALUES (?, ?, ?, ?, 'user', datetime('now'))
        `;
  
        return this.executeSQL(query, [
          userData.firstName,
          userData.lastName,
          userData.email,
          userData.password
        ]);
      }),
      map(result => {
        if (result.changes) {
          return {
            success: true,
            userId: result.changes.lastId,
            user: {
              id: result.changes.lastId,
              firstName: userData.firstName,
              lastName: userData.lastName,
              email: userData.email,
              role: 'user'
            }
          };
        }
        return {
          success: true,
          user: {
            firstName: userData.firstName,
            lastName: userData.lastName,
            email: userData.email,
            role: 'user'
          }
        };
      }),
      catchError(error => {
        console.error('Error en registro:', error);
        if (error.message?.includes('UNIQUE constraint')) {
          return of({
            success: false,
            error: 'El email ya está registrado'
          });
        }
        return of({
          success: false,
          error: 'Error al registrar usuario'
        });
      })
    );
  }
  
  // Método para verificar credenciales
  private currentSession = new BehaviorSubject<any>(null);

getActiveSession(): Observable<any> {
  return this.currentSession.asObservable();
}

getCurrentUser(): any {
  return this.currentSession.getValue();
}

loginUser(email: string, password: string): Observable<any> {
  console.log('Intentando login con:', email);
  
  const query = `
    SELECT * FROM Users 
    WHERE email = ? AND password = ?
    LIMIT 1
  `;

  return this.getDatabaseState().pipe(
    switchMap(ready => {
      if (!ready) {
        throw new Error('Base de datos no está lista');
      }
      return this.executeSQL(query, [email, password]);
    }),
    map(result => {
      console.log('Resultado login:', result);
      
      if (result && result.values && result.values.length > 0) {
        const user = result.values[0];
        this.currentSession.next(user);
        return {
          success: true,
          user: user
        };
      }
      
      this.currentSession.next(null);
      return {
        success: false,
        error: 'Credenciales incorrectas'
      };
    }),
    catchError(error => {
      console.error('Error en login:', error);
      this.currentSession.next(null);
      return of({
        success: false,
        error: 'Error al iniciar sesión'
      });
    })
  );
}

logout(): void {
  this.currentSession.next(null);
}

isAuthenticated(): boolean {
  return this.currentSession.getValue() !== null;
}

  checkUsersTable(): Observable<any> {
    return this.executeSQL(`
      SELECT sql FROM sqlite_master 
      WHERE type='table' AND name='Users';
    `).pipe(
      tap(result => {
        console.log('Estructura de la tabla Users:', result);
      })
    );
  }

  getUsersCount(): Observable<number> {
    return this.executeSQL('SELECT COUNT(*) as count FROM Users').pipe(
      map(result => {
        console.log('Conteo de usuarios:', result);
        return result.values?.[0]?.count || 0;
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
    return this.dbReady.pipe(
      take(1),
      switchMap(ready => {
        if (!ready) {
          console.log('Database not ready, initializing...');
          return from(this.initializeDatabase()).pipe(
            switchMap(() => this.executeSQL('SELECT * FROM Vinyls'))
          );
        }
        return this.executeSQL('SELECT * FROM Vinyls');
      }),
      map(result => {
        console.log('Raw vinyl data:', result);
        if (!result.values?.length) {
          console.log('No vinyls found in database');
          return [];
        }

        return result.values.map(item => ({
          id: item.id,
          titulo: item.titulo,
          artista: item.artista,
          imagen: item.imagen,
          descripcion: typeof item.descripcion === 'string' ? 
            JSON.parse(item.descripcion) : item.descripcion,
          tracklist: typeof item.tracklist === 'string' ? 
            JSON.parse(item.tracklist) : item.tracklist,
          stock: item.stock,
          precio: item.precio,
          IsAvailable: Boolean(item.IsAvailable)
        }));
      }),
      tap(vinyls => console.log('Processed vinyls:', vinyls)),
      catchError(error => {
        console.error('Error fetching vinyls:', error);
        return of([]);
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
    console.log('Actualizando usuario:', userData);
    
    const query = `
      UPDATE Users 
      SET firstName = ?,
          lastName = ?,
          address = ?,
          phoneNumber = ?
      WHERE id = ?
    `;
  
    const params = [
      userData.firstName,
      userData.lastName,
      userData.address || null,
      userData.phoneNumber || null,
      userData.id
    ];
  
    return this.executeSQL(query, params).pipe(
      map(result => {
        console.log('Resultado actualización:', result);
        
        if (result) {
          // Actualizar sesión activa
          const currentSession = this.currentSession.getValue();
          if (currentSession) {
            this.currentSession.next({
              ...currentSession,
              firstName: userData.firstName,
              lastName: userData.lastName,
              address: userData.address,
              phoneNumber: userData.phoneNumber
            });
          }
          return {
            success: true,
            message: 'Usuario actualizado correctamente'
          };
        }
        return {
          success: false,
          error: 'No se pudo actualizar el usuario'
        };
      }),
      catchError(error => {
        console.error('Error en updateUser:', error);
        return of({
          success: false,
          error: error.message || 'Error al actualizar usuario'
        });
      })
    );
  }

  
  updateUserPassword(userId: number, currentPassword: string, newPassword: string): Observable<any> {
    console.log('Actualizando contraseña para usuario:', userId);
    //Verificar contraseña
    const verifyQuery = ` 
      SELECT id FROM Users 
      WHERE id = ? AND password = ?
    `;
  
    return this.executeSQL(verifyQuery, [userId, currentPassword]).pipe(
      switchMap(result => {
        if (!result.values?.length) {
          return of({ 
            success: false, 
            error: 'La contraseña actual es incorrecta' 
          });
        }
  
        // Si la contraseña actual es correcta, actualizamos a la nueva
        const updateQuery = `
          UPDATE Users 
          SET password = ?
          WHERE id = ?
        `;
  
        return this.executeSQL(updateQuery, [newPassword, userId]).pipe(
          map(updateResult => ({
            success: true
          })),
          catchError(error => {
            console.error('Error updating password:', error);
            return of({
              success: false,
              error: 'Error al actualizar la contraseña'
            });
          })
        );
      })
    );
  }

  updateUserPhoto(userId: number, photoData: string): Observable<any> {
    console.log('Actualizando foto de usuario:', userId);
    
    const query = `
      UPDATE Users 
      SET photo = ?
      WHERE id = ?
    `;
  
    // Convertir la imagen a formato Base64 si no lo está ya
    const photoToSave = photoData.startsWith('data:image') ? 
      photoData : 
      `data:image/jpeg;base64,${photoData}`;
  
    return from(this.database.run(query, [photoToSave, userId])).pipe(
      map(result => {
        console.log('Resultado actualización foto:', result);
        const currentUser = this.currentSession.getValue();
        if (currentUser) {
          this.currentSession.next({
            ...currentUser,
            photo: photoToSave
          });
        }
        return { success: true };
      }),
      catchError(error => {
        console.error('Error updating photo:', error);
        return of({
          success: false,
          error: error.message || 'Error al actualizar foto'
        });
      })
    );
  }

  public executeQuerySQL(query: string, params?: any[]): Observable<SQLiteResponse> {
    return this.executeSQL(query, params);
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

  

  private insertSeedData(): Observable<boolean> {
    console.log('Insertando datos de ejemplo');
  
    const users = [{
      firstName: 'Usuario',
      lastName: 'Ejemplo',
      email: 'usuario@example.com',
      password: '123456',
      phoneNumber: '966189340',
      role: 'user',
      address: null,
      photo: null
    }];
  
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
      // Insertar usuarios
      ...users.map(user => 
        this.database.run(
          `INSERT OR IGNORE INTO Users (
            firstName, lastName, email, password, phoneNumber, role, address, photo
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            user.firstName,
            user.lastName,
            user.email,
            user.password,
            user.phoneNumber,
            user.role,
            user.address,
            user.photo
          ]
        )
      ),
      // Insertar productos
      ...products.map(product =>
        this.database.run(
          `INSERT OR IGNORE INTO Vinyls (
            titulo, artista, imagen, descripcion, tracklist, 
            stock, precio, IsAvailable
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            product.titulo,
            product.artista,
            product.imagen,
            JSON.stringify(product.descripcion),
            JSON.stringify(product.tracklist),
            product.stock,
            product.precio,
            product.IsAvailable ? 1 : 0
          ]
        )
      )
    ])).pipe(
      tap(() => console.log('Datos de ejemplo insertados exitosamente')),
      map(() => true),
      catchError(error => {
        console.error('Error insertando datos de ejemplo:', error);
        return of(false);
      })
    );
  }

  public async checkDatabaseState(): Promise<boolean> {
    return this.dbReady.value;
  }
}