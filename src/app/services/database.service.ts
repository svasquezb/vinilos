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
    try {
      if (Capacitor.getPlatform() === 'web') {
        await this.sqlite.initWebStore();
      }
  
      await this.sqlite.closeAllConnections();
      
      let db: SQLiteDBConnection;
      
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
      
      // Crear tablas y asegurar datos iniciales
      await this.ensureDatabaseStructure();
      
      this.dbReady.next(true);
      console.log('Database initialized successfully');
    } catch (error) {
      console.error('Error initializing database:', error);
      this.dbReady.next(false);
      throw error;
    }
  }

  private async ensureDatabaseStructure(): Promise<void> {
    try {
      // Crear tablas
      await this.database.execute(this.tableUsers);
      await this.database.execute(this.tableVinyls);
      await this.database.execute(this.tableOrders);
      await this.database.execute(this.tableCart);
      
      // Verificar si hay datos
      const countResult = await this.database.query(`
        SELECT 
          (SELECT COUNT(*) FROM Users) as userCount,
          (SELECT COUNT(*) FROM Vinyls) as vinylCount
      `);
      
      const counts = countResult.values?.[0];
      console.log('Conteo de registros:', counts);
  
      // Si no hay datos, insertar datos de ejemplo
      if (!counts || counts.vinylCount === 0) {
        console.log('No hay datos, insertando datos iniciales...');
        await this.insertSeedData().toPromise();
      }
  
      // Asegurar que existe el admin
      await this.createAdminIfNotExists();
  
      console.log('Estructura de base de datos verificada y completa');
    } catch (error) {
      console.error('Error ensuring database structure:', error);
      throw error;
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
    IsAvailable INTEGER DEFAULT 1
  );
`;

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

    private readonly tableCart = `
  CREATE TABLE IF NOT EXISTS Carts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    vinylId INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES Users(id),
    FOREIGN KEY (vinylId) REFERENCES Vinyls(id)
  );
`;

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

getAllUsers(): Observable<any[]> {
  const query = `
    SELECT id, email, firstName, lastName, role 
    FROM Users 
    WHERE role != 'admin' 
    ORDER BY email
  `;
  
  return this.executeSQL(query).pipe(
    map(result => {
      if (result?.values) {
        return result.values;
      }
      return [];
    }),
    catchError(error => {
      console.error('Error getting users:', error);
      return of([]);
    })
  );
}

saveCartToDatabase(userId: number, cartItems: any[]): Observable<boolean> {
  return from(this.database.run('DELETE FROM Carts WHERE userId = ?', [userId])).pipe(
    switchMap(() => {
      const insertPromises = cartItems.map(item =>
        this.database.run(
          'INSERT INTO Carts (userId, vinylId, quantity) VALUES (?, ?, ?)',
          [userId, item.vinyl.id, item.quantity]
        )
      );
      return from(Promise.all(insertPromises));
    }),
    map(() => true),
    catchError(error => {
      console.error('Error saving cart:', error);
      return of(false);
    })
  );
}

getCartFromDatabase(userId: number): Observable<any[]> {
  return this.executeSQL(
    `SELECT c.*, v.* FROM Carts c 
     JOIN Vinyls v ON c.vinylId = v.id 
     WHERE c.userId = ?`,
    [userId]
  ).pipe(
    map(result => {
      if (!result.values) return [];
      return result.values.map(row => ({
        vinyl: {
          id: row.vinylId,
          titulo: row.titulo,
          artista: row.artista,
          imagen: row.imagen,
          descripcion: JSON.parse(row.descripcion),
          tracklist: JSON.parse(row.tracklist),
          stock: row.stock,
          precio: row.precio,
          IsAvailable: Boolean(row.IsAvailable)
        },
        quantity: row.quantity
      }));
    }),
    catchError(error => {
      console.error('Error loading cart:', error);
      return of([]);
    })
  );
}

deleteUser(userId: number): Observable<any> {
  const query = 'DELETE FROM Users WHERE id = ? AND role != "admin"';
  
  return this.executeSQL(query, [userId]).pipe(
    map(result => ({
      success: true,
      message: 'Usuario eliminado correctamente'
    })),
    catchError(error => {
      console.error('Error deleting user:', error);
      return of({
        success: false,
        error: 'Error al eliminar usuario'
      });
    })
  );
}

async verifyAdmin() {
  const query = 'SELECT * FROM Users WHERE role = "admin"';
  try {
    const result = await this.executeSQL(query).toPromise();
    console.log('Usuarios admin encontrados:', result?.values);
    return result?.values || [];
  } catch (error) {
    console.error('Error verificando admin:', error);
    return [];
  }
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
        console.error('Base de datos no está lista');
        throw new Error('Base de datos no está lista');
      }
      return this.executeSQL(query, [email, password]);
    }),
    map(result => {
      console.log('Resultado login:', result);
      
      if (result && result.values && result.values.length > 0) {
        const user = result.values[0];
        console.log('Usuario encontrado:', user);
        this.currentSession.next(user);
        return {
          success: true,
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            phoneNumber: user.phoneNumber,
            address: user.address,
            photo: user.photo
          }
        };
      }
      
      console.log('Credenciales incorrectas');
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

async createAdminIfNotExists(): Promise<void> {
  const query = `
    INSERT OR REPLACE INTO Users (
      firstName, lastName, email, password, phoneNumber, role
    ) VALUES (?, ?, ?, ?, ?, ?)
  `;
  
  try {
    await this.database.run(query, [
      'Admin',
      'Sistema',
      'admin@vinyls.com',
      'admin123',
      '966189341',
      'admin'
    ]);
    console.log('Usuario admin verificado/creado exitosamente');
  } catch (error) {
    console.error('Error al verificar/crear admin:', error);
    throw error;
  }
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
      `INSERT INTO Vinyls (
        titulo, artista, imagen, descripcion, tracklist, 
        stock, precio, IsAvailable
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        vinyl.titulo,
        vinyl.artista,
        vinyl.imagen,
        JSON.stringify(vinyl.descripcion),
        JSON.stringify(vinyl.tracklist),
        vinyl.stock,
        vinyl.precio,
        vinyl.IsAvailable ? 1 : 0
      ]
    ).pipe(
      map(result => result.changes?.lastId || -1),
      catchError(error => {
        console.error('Error creating vinyl:', error);
        return of(-1);
      })
    );
  }

  getVinyls(): Observable<Vinyl[]> {
    console.log('Iniciando obtención de vinilos');
  
    return this.getDatabaseState().pipe(
      tap(ready => console.log('Estado de la base de datos:', ready)),
      switchMap(ready => {
        if (!ready) {
          console.error('Base de datos no está lista');
          throw new Error('Base de datos no está lista');
        }
  
        return from(this.verifyVinylsTable()).pipe(
          switchMap(() => this.executeSQL('SELECT * FROM Vinyls ORDER BY id DESC'))
        );
      }),
      map(result => {
        console.log('Resultado raw de vinilos:', result);
  
        if (!result?.values?.length) {
          console.log('No se encontraron vinilos');
          return [];
        }
  
        return result.values.map(item => {
          try {
            return {
              id: item.id,
              titulo: item.titulo,
              artista: item.artista,
              imagen: item.imagen,
              descripcion: this.parseJsonSafely(item.descripcion),
              tracklist: this.parseJsonSafely(item.tracklist),
              stock: item.stock,
              precio: item.precio,
              IsAvailable: Boolean(item.IsAvailable)
            };
          } catch (error) {
            console.error('Error procesando vinilo:', error, item);
            return null;
          }
        }).filter(Boolean) as Vinyl[];
      }),
      tap(vinyls => console.log('Vinilos procesados:', vinyls.length)),
      catchError(error => {
        console.error('Error en getVinyls:', error);
        return of([]);
      })
    );
  }
  
  private async verifyVinylsTable(): Promise<void> {
    try {
      // Verificar si la tabla existe
      const tableExists = await this.database.query(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='Vinyls';
      `);
  
      if (!tableExists.values?.length) {
        console.log('Tabla Vinyls no existe, creando...');
        await this.database.execute(this.tableVinyls);
        await this.insertSeedData().toPromise();
      }
    } catch (error) {
      console.error('Error verificando tabla Vinyls:', error);
      throw error;
    }
  }
  
  private parseJsonSafely(value: string | any[]): string[] {
    if (Array.isArray(value)) return value;
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [String(parsed)];
    } catch {
      return [String(value)];
    }
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

  getUserByEmail(email: string): Observable<any> {
    return this.executeSQL(
      'SELECT * FROM Users WHERE email = ? LIMIT 1',
      [email]
    ).pipe(
      map(result => {
        if (result.values && result.values.length > 0) {
          return result.values[0];
        }
        return null;
      }),
      catchError(error => {
        console.error('Error getting user by email:', error);
        return of(null);
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
    
    // Si estamos en modo recuperación, no verificamos la contraseña actual
    const isRecoveryMode = currentPassword === 'temp123';
    
    if (isRecoveryMode) {
      // Actualizar directamente sin verificar la contraseña actual
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
    } else {
      // Proceso normal de cambio de contraseña
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

  

  updateVinyl(vinilo: Vinyl): Observable<any> {
    if (!vinilo.id) {
      return of({ success: false, error: 'ID no proporcionado' });
    }
  
    const query = `
      UPDATE Vinyls 
      SET 
        titulo = ?,
        artista = ?,
        imagen = ?,
        descripcion = ?,
        tracklist = ?,
        stock = ?,
        precio = ?,
        IsAvailable = ?
      WHERE id = ?
    `;
  
    return this.executeSQL(query, [
      vinilo.titulo,
      vinilo.artista,
      vinilo.imagen,
      JSON.stringify(vinilo.descripcion),
      JSON.stringify(vinilo.tracklist),
      vinilo.stock,
      vinilo.precio,
      vinilo.IsAvailable ? 1 : 0,
      vinilo.id
    ]);
  }
  
  deleteVinyl(id: number): Observable<any> {
    const query = 'DELETE FROM Vinyls WHERE id = ?';
    return this.executeSQL(query, [id]);
  }

  async checkAndCreateTables() {
    try {
      const tableCheck = await this.executeSQL(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='Vinyls';
      `).toPromise();
  
      if (!tableCheck?.values?.length) {
        console.log('Creando tabla Vinyls...');
        await this.database.execute(this.tableVinyls);
        await this.insertSeedData().toPromise();
      }
  
      const vinylCount = await this.executeSQL('SELECT COUNT(*) as count FROM Vinyls').toPromise();
      if (vinylCount?.values?.[0].count === 0) {
        console.log('Insertando datos iniciales...');
        await this.insertSeedData().toPromise();
      }
  
      return true;
    } catch (error) {
      console.error('Error en verificación de tablas:', error);
      return false;
    }
  }

  private insertSeedData(): Observable<boolean> {
    console.log('Insertando datos de ejemplo');
  
    const users = [
      {
        firstName: 'Usuario',
        lastName: 'Ejemplo',
        email: 'usuario@example.com',
        password: '123456',
        phoneNumber: '966189340',
        role: 'user',
        address: null,
        photo: null
      },
      // Usuario Administrador
      {
        firstName: 'Admin',
        lastName: 'Sistema',
        email: 'admin@vinyls.com',
        password: 'admin123',
        phoneNumber: '966189341',
        role: 'admin',
        address: null,
        photo: null
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