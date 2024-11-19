import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { IonicModule, NavController, ToastController, LoadingController } from '@ionic/angular';
import { RegisterPage } from './register.page';
import { DatabaseService } from '../services/database.service';
import { of, throwError } from 'rxjs';

describe('RegisterPage', () => {
  let component: RegisterPage;
  let fixture: ComponentFixture<RegisterPage>;
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

    const dbSpy = jasmine.createSpyObj('DatabaseService', ['registerUser', 'checkDatabaseState', 'checkUsersTable', 'getUsersCount']);
    const navSpy = jasmine.createSpyObj('NavController', ['navigateRoot']);
    const toastSpy = jasmine.createSpyObj('ToastController', ['create']);
    const loadingSpy = jasmine.createSpyObj('LoadingController', ['create']);

    loadingSpy.create.and.returnValue(Promise.resolve(mockLoading));
    toastSpy.create.and.returnValue(Promise.resolve(mockToastElement));

    await TestBed.configureTestingModule({
      declarations: [RegisterPage],
      imports: [IonicModule.forRoot()],
      providers: [
        { provide: DatabaseService, useValue: dbSpy },
        { provide: NavController, useValue: navSpy },
        { provide: ToastController, useValue: toastSpy },
        { provide: LoadingController, useValue: loadingSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(RegisterPage);
    component = fixture.componentInstance;
    databaseServiceSpy = TestBed.inject(DatabaseService) as jasmine.SpyObj<DatabaseService>;
    navControllerSpy = TestBed.inject(NavController) as jasmine.SpyObj<NavController>;
    toastControllerSpy = TestBed.inject(ToastController) as jasmine.SpyObj<ToastController>;
    loadingControllerSpy = TestBed.inject(LoadingController) as jasmine.SpyObj<LoadingController>;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should validate password requirements', () => {
    component.password = 'Ab1@xyz';
    expect(component.hasUpperCase).toBe(true);
    expect(component.hasLowerCase).toBe(true);
    expect(component.hasNumber).toBe(true);
    expect(component.hasSpecialChar).toBe(true);
    expect(component.isLongEnough).toBe(true);
    expect(component.isValidPassword(component.password)).toBe(true);
  });

  it('should validate email format', () => {
    expect(component.validateEmail('test@example.com')).toBe(true);
    expect(component.validateEmail('invalid-email')).toBe(false);
  });

  it('should validate empty fields', async () => {
    component.email = '';
    component.password = '';
    component.confirmPassword = '';
    component.firstName = '';
    component.lastName = '';

    await component.register();

    expect(toastControllerSpy.create).toHaveBeenCalledWith({
      message: 'Por favor, complete todos los campos',
      duration: 2000,
      position: 'bottom',
      color: 'warning',
      cssClass: 'custom-toast'
    });
  });

  it('should validate matching passwords', async () => {
    component.email = 'test@example.com';
    component.password = 'Ab1@xyz';
    component.confirmPassword = 'different';
    component.firstName = 'John';
    component.lastName = 'Doe';

    await component.register();

    expect(toastControllerSpy.create).toHaveBeenCalledWith({
      message: 'Las contraseñas no coinciden',
      duration: 2000,
      position: 'bottom',
      color: 'danger',
      cssClass: 'custom-toast'
    });
  });

  it('should validate name format', async () => {
    component.email = 'test@example.com';
    component.password = 'Ab1@xyz';
    component.confirmPassword = 'Ab1@xyz';
    component.firstName = 'John123';
    component.lastName = 'Doe';

    await component.register();

    expect(toastControllerSpy.create).toHaveBeenCalledWith({
      message: 'El nombre y apellido solo pueden contener letras',
      duration: 2000,
      position: 'bottom',
      color: 'warning',
      cssClass: 'custom-toast'
    });
  });

  it('should handle successful registration', fakeAsync(() => {
    component.email = 'test@example.com';
    component.password = 'Ab1@xyz';
    component.confirmPassword = 'Ab1@xyz';
    component.firstName = 'John';
    component.lastName = 'Doe';

    databaseServiceSpy.registerUser.and.returnValue(of({ success: true }));

    component.register();
    tick();

    expect(navControllerSpy.navigateRoot).toHaveBeenCalledWith('/login');
  }));

  it('should handle registration error', fakeAsync(() => {
    component.email = 'test@example.com';
    component.password = 'Ab1@xyz';
    component.confirmPassword = 'Ab1@xyz';
    component.firstName = 'John';
    component.lastName = 'Doe';

    databaseServiceSpy.registerUser.and.returnValue(throwError(() => new Error('Test error')));

    component.register();
    tick();

    expect(toastControllerSpy.create).toHaveBeenCalledWith({
      message: 'Error al registrar usuario. Por favor, intente nuevamente.',
      duration: 2000,
      position: 'bottom',
      color: 'danger',
      cssClass: 'custom-toast'
    });
  }));

  it('should navigate to login page', () => {
    component.goToLogin();
    expect(navControllerSpy.navigateRoot).toHaveBeenCalledWith('/login');
  });

  it('should show password requirements on focus', () => {
    component.onPasswordFocus();
    expect(component.showPasswordRequirements).toBe(true);
  });
});