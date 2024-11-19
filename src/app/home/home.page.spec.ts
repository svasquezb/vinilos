import { ComponentFixture, TestBed, fakeAsync, tick, discardPeriodicTasks } from '@angular/core/testing';
import { IonicModule, ToastController, LoadingController } from '@ionic/angular';
import { HomePage } from './home.page';
import { DatabaseService } from '../services/database.service';
import { CartService } from '../services/cart.service';
import { of, throwError } from 'rxjs';
import { Vinyl } from '../models/vinilos.model';

describe('HomePage', () => {
  let component: HomePage;
  let fixture: ComponentFixture<HomePage>;
  let databaseServiceSpy: jasmine.SpyObj<DatabaseService>;
  let cartServiceSpy: jasmine.SpyObj<CartService>;
  let toastControllerSpy: jasmine.SpyObj<ToastController>;
  let loadingControllerSpy: jasmine.SpyObj<LoadingController>;
  let mockLoading: any;

  const mockVinilos: Vinyl[] = [
    {
      id: 1,
      titulo: 'Test Album 1',
      artista: 'Test Artist 1',
      imagen: 'test1.jpg',
      descripcion: ['Test description 1'],
      tracklist: ['Track 1'],
      stock: 10,
      precio: 29.99,
      IsAvailable: true
    },
    {
      id: 2,
      titulo: 'Test Album 2',
      artista: 'Test Artist 2',
      imagen: 'test2.jpg',
      descripcion: ['Test description 2'],
      tracklist: ['Track 2'],
      stock: 5,
      precio: 19.99,
      IsAvailable: true
    },
    {
      id: 3,
      titulo: 'Test Album 3',
      artista: 'Test Artist 3',
      imagen: 'test3.jpg',
      descripcion: ['Test description 3'],
      tracklist: ['Track 3'],
      stock: 8,
      precio: 24.99,
      IsAvailable: true
    }
  ];

  beforeEach(async () => {
    const mockToastElement = {
      present: jasmine.createSpy('present'),
      dismiss: jasmine.createSpy('dismiss')
    } as any;

    mockLoading = {
      present: jasmine.createSpy('present'),
      dismiss: jasmine.createSpy('dismiss')
    };

    const dbSpy = jasmine.createSpyObj('DatabaseService', ['getDatabaseState', 'getVinyls']);
    const cartSpy = jasmine.createSpyObj('CartService', ['addToCart']);
    const toastSpy = jasmine.createSpyObj('ToastController', ['create']);
    const loadingSpy = jasmine.createSpyObj('LoadingController', ['create']);

    dbSpy.getDatabaseState.and.returnValue(of(true));
    loadingSpy.create.and.returnValue(Promise.resolve(mockLoading));
    toastSpy.create.and.returnValue(Promise.resolve(mockToastElement));

    await TestBed.configureTestingModule({
      declarations: [HomePage],
      imports: [IonicModule.forRoot()],
      providers: [
        { provide: DatabaseService, useValue: dbSpy },
        { provide: CartService, useValue: cartSpy },
        { provide: ToastController, useValue: toastSpy },
        { provide: LoadingController, useValue: loadingSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(HomePage);
    component = fixture.componentInstance;
    databaseServiceSpy = TestBed.inject(DatabaseService) as jasmine.SpyObj<DatabaseService>;
    cartServiceSpy = TestBed.inject(CartService) as jasmine.SpyObj<CartService>;
    toastControllerSpy = TestBed.inject(ToastController) as jasmine.SpyObj<ToastController>;
    loadingControllerSpy = TestBed.inject(LoadingController) as jasmine.SpyObj<LoadingController>;
  });

  afterEach(fakeAsync(() => {
    if (component.bannerInterval) {
      clearInterval(component.bannerInterval);
      component.bannerInterval = undefined;
    }
    tick(0);
    discardPeriodicTasks();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load featured vinyls successfully', fakeAsync(() => {
    databaseServiceSpy.getVinyls.and.returnValue(of(mockVinilos));
    
    component.ngOnInit();
    tick();

    expect(component.vinilosDestacados.length).toBe(3);
    expect(component.loading).toBeFalse();
    discardPeriodicTasks();
  }));

  it('should handle empty vinyls list', fakeAsync(() => {
    databaseServiceSpy.getVinyls.and.returnValue(of([]));
    
    component.ngOnInit();
    tick();

    expect(component.vinilosDestacados.length).toBe(0);
    expect(toastControllerSpy.create).toHaveBeenCalledWith({
      message: 'No se encontraron vinilos disponibles',
      duration: 2000,
      position: 'bottom',
      color: 'warning'
    });
    discardPeriodicTasks();
  }));

  it('should handle error loading vinyls', fakeAsync(() => {
    databaseServiceSpy.getVinyls.and.returnValue(throwError(() => new Error('Test error')));
    
    component.ngOnInit();
    tick();

    expect(toastControllerSpy.create).toHaveBeenCalledWith({
      message: 'Error al cargar los vinilos',
      duration: 2000,
      position: 'bottom',
      color: 'danger'
    });
    discardPeriodicTasks();
  }));

  it('should rotate banner index', fakeAsync(() => {
    component.startBannerRotation();
    expect(component.currentBannerIndex).toBe(0);
    
    tick(4000);
    expect(component.currentBannerIndex).toBe(1);
    
    tick(4000);
    expect(component.currentBannerIndex).toBe(2);
    
    tick(4000);
    expect(component.currentBannerIndex).toBe(0);
    
    discardPeriodicTasks();
  }));

  it('should clear banner interval on destroy', fakeAsync(() => {
    jasmine.clock().install();
    
    component.startBannerRotation();
    tick(0);
    expect(component.bannerInterval).toBeTruthy();
    
    component.ngOnDestroy();
    tick(0);
    
    expect(component.bannerInterval).toBeFalsy();
    
    jasmine.clock().uninstall();
    discardPeriodicTasks();
  }));

  it('should show vinyl details', () => {
    const testVinyl = mockVinilos[0];
    component.verDetalles(testVinyl);
    
    expect(component.viniloSeleccionado).toBe(testVinyl);
    expect(component.mostrarDescripcionDetalle).toBe('descripcion');
  });

  it('should close vinyl description', () => {
    component.viniloSeleccionado = mockVinilos[0];
    component.cerrarDescripcion();
    
    expect(component.viniloSeleccionado).toBeNull();
  });

  it('should add vinyl to cart and close description', fakeAsync(() => {
    component.viniloSeleccionado = mockVinilos[0];
    cartServiceSpy.addToCart.and.returnValue(Promise.resolve(true));

    component.agregarAlCarrito();
    tick();

    expect(cartServiceSpy.addToCart).toHaveBeenCalledWith(mockVinilos[0]);
    expect(component.viniloSeleccionado).toBeNull();
  }));

  it('should handle error when adding to cart', fakeAsync(() => {
    const testVinyl = mockVinilos[0];
    component.viniloSeleccionado = testVinyl;
    cartServiceSpy.addToCart.and.returnValue(Promise.reject('Error'));

    component.agregarAlCarrito();
    tick();

    expect(cartServiceSpy.addToCart).toHaveBeenCalledWith(testVinyl);
    expect(component.viniloSeleccionado).toBe(testVinyl);
  }));
});