import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { IonicModule, NavController, ToastController, LoadingController } from '@ionic/angular';
import { LoginPage } from './login.page';
import { DatabaseService } from '../services/database.service';
import { of, throwError } from 'rxjs';

describe('LoginPage', () => {
  let component: LoginPage;
  let fixture: ComponentFixture<LoginPage>;
  let databaseServiceSpy: jasmine.SpyObj<DatabaseService>;
  let navControllerSpy: jasmine.SpyObj<NavController>;
  let toastControllerSpy: jasmine.SpyObj<ToastController>;
  let loadingControllerSpy: jasmine.SpyObj<LoadingController>;
  let mockLoading: any;

  beforeEach(async () => {
    mockLoading = {
      present: jasmine.createSpy('present'),
      dismiss: jasmine.createSpy('dismiss')
    };

    const mockToastElement = {
      present: jasmine.createSpy('present'),
      dismiss: jasmine.createSpy('dismiss'),
      addEventListener: jasmine.createSpy('addEventListener'),
      removeEventListener: jasmine.createSpy('removeEventListener'),
      animated: true,
      onDidDismiss: jasmine.createSpy('onDidDismiss'),
      onWillDismiss: jasmine.createSpy('onWillDismiss')
    } as any;

    const dbSpy = jasmine.createSpyObj('DatabaseService', ['loginUser']);
    const navSpy = jasmine.createSpyObj('NavController', ['navigateRoot']);
    const toastSpy = jasmine.createSpyObj('ToastController', ['create']);
    const loadingSpy = jasmine.createSpyObj('LoadingController', ['create']);

    loadingSpy.create.and.returnValue(Promise.resolve(mockLoading));
    toastSpy.create.and.returnValue(Promise.resolve(mockToastElement));

    await TestBed.configureTestingModule({
      declarations: [LoginPage],
      imports: [IonicModule.forRoot()],
      providers: [
        { provide: DatabaseService, useValue: dbSpy },
        { provide: NavController, useValue: navSpy },
        { provide: ToastController, useValue: toastSpy },
        { provide: LoadingController, useValue: loadingSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LoginPage);
    component = fixture.componentInstance;
    databaseServiceSpy = TestBed.inject(DatabaseService) as jasmine.SpyObj<DatabaseService>;
    navControllerSpy = TestBed.inject(NavController) as jasmine.SpyObj<NavController>;
    toastControllerSpy = TestBed.inject(ToastController) as jasmine.SpyObj<ToastController>;
    loadingControllerSpy = TestBed.inject(LoadingController) as jasmine.SpyObj<LoadingController>;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should validate empty fields', async () => {
    await component.login();

    expect(toastControllerSpy.create).toHaveBeenCalledWith({
      message: 'Por favor, ingrese email y contraseña',
      duration: 2000,
      position: 'bottom',
      color: 'warning'
    });
    expect(databaseServiceSpy.loginUser).not.toHaveBeenCalled();
  });

  it('should show loading indicator during login', fakeAsync(() => {
    component.email = 'test@example.com';
    component.password = 'password';
    databaseServiceSpy.loginUser.and.returnValue(of({ success: true }));

    component.login();
    tick();

    expect(loadingControllerSpy.create).toHaveBeenCalledWith({
      message: 'Iniciando sesión...'
    });
    expect(mockLoading.present).toHaveBeenCalled();
    expect(mockLoading.dismiss).toHaveBeenCalled();
  }));

  it('should navigate to home on successful login', fakeAsync(() => {
    component.email = 'test@example.com';
    component.password = 'password';
    databaseServiceSpy.loginUser.and.returnValue(of({ success: true }));

    component.login();
    tick();

    expect(navControllerSpy.navigateRoot).toHaveBeenCalledWith('/home', { replaceUrl: true });
  }));

  it('should show error toast on failed login', fakeAsync(() => {
    component.email = 'test@example.com';
    component.password = 'wrong';
    databaseServiceSpy.loginUser.and.returnValue(of({ 
      success: false, 
      error: 'Credenciales incorrectas' 
    }));

    component.login();
    tick();

    expect(toastControllerSpy.create).toHaveBeenCalledWith({
      message: 'Credenciales incorrectas',
      duration: 2000,
      position: 'bottom',
      color: 'danger'
    });
  }));

  it('should handle database service errors', fakeAsync(() => {
    component.email = 'test@example.com';
    component.password = 'password';
    databaseServiceSpy.loginUser.and.returnValue(throwError(() => new Error('Database error')));

    component.login();
    tick();

    expect(toastControllerSpy.create).toHaveBeenCalledWith({
      message: 'Error al iniciar sesión',
      duration: 2000,
      position: 'bottom',
      color: 'danger'
    });
  }));

  it('should validate email field', async () => {
    component.email = '';
    component.password = 'password';

    await component.login();

    expect(toastControllerSpy.create).toHaveBeenCalledWith({
      message: 'Por favor, ingrese email y contraseña',
      duration: 2000,
      position: 'bottom',
      color: 'warning'
    });
  });

  it('should validate password field', async () => {
    component.email = 'test@example.com';
    component.password = '';

    await component.login();

    expect(toastControllerSpy.create).toHaveBeenCalledWith({
      message: 'Por favor, ingrese email y contraseña',
      duration: 2000,
      position: 'bottom',
      color: 'warning'
    });
  });

  it('should show success toast on successful login', fakeAsync(() => {
    component.email = 'test@example.com';
    component.password = 'password';
    databaseServiceSpy.loginUser.and.returnValue(of({ success: true }));

    component.login();
    tick();

    expect(toastControllerSpy.create).toHaveBeenCalledWith({
      message: '¡Bienvenido!',
      duration: 2000,
      position: 'bottom',
      color: 'success'
    });
  }));

  it('should dismiss loading indicator even on error', fakeAsync(() => {
    component.email = 'test@example.com';
    component.password = 'password';
    databaseServiceSpy.loginUser.and.returnValue(throwError(() => new Error('Test error')));

    component.login();
    tick();

    expect(mockLoading.dismiss).toHaveBeenCalled();
  }));
});