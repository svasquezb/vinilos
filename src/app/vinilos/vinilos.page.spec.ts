import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { IonicModule, NavController, ToastController, LoadingController } from '@ionic/angular';
import { VinilosPage } from './vinilos.page';
import { DatabaseService } from '../services/database.service';
import { CartService } from '../services/cart.service';
import { of, throwError } from 'rxjs';
import { Vinyl } from '../models/vinilos.model';

describe('VinilosPage', () => {
  let component: VinilosPage;
  let fixture: ComponentFixture<VinilosPage>;
  let databaseServiceSpy: jasmine.SpyObj<DatabaseService>;
  let cartServiceSpy: jasmine.SpyObj<CartService>;
  let toastControllerSpy: jasmine.SpyObj<ToastController>;
  let loadingControllerSpy: jasmine.SpyObj<LoadingController>;
  let mockLoading: any;

  const mockVinilos: Vinyl[] = [
    {
      id: 1,
      titulo: 'Test Album',
      artista: 'Test Artist',
      imagen: 'test.jpg',
      descripcion: ['Test description'],
      tracklist: ['Track 1', 'Track 2'],
      stock: 10,
      precio: 29.99,
      IsAvailable: true
    }
  ];

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

    const dbSpy = jasmine.createSpyObj('DatabaseService', ['getDatabaseState', 'getVinyls']);
    const cartSpy = jasmine.createSpyObj('CartService', ['addToCart']);
    const toastSpy = jasmine.createSpyObj('ToastController', ['create']);
    const loadingSpy = jasmine.createSpyObj('LoadingController', ['create']);

    dbSpy.getDatabaseState.and.returnValue(of(true));
    loadingSpy.create.and.returnValue(Promise.resolve(mockLoading));
    toastSpy.create.and.returnValue(Promise.resolve(mockToastElement));

    await TestBed.configureTestingModule({
      declarations: [VinilosPage],
      imports: [IonicModule.forRoot()],
      providers: [
        { provide: DatabaseService, useValue: dbSpy },
        { provide: CartService, useValue: cartSpy },
        { provide: ToastController, useValue: toastSpy },
        { provide: LoadingController, useValue: loadingSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(VinilosPage);
    component = fixture.componentInstance;
    databaseServiceSpy = TestBed.inject(DatabaseService) as jasmine.SpyObj<DatabaseService>;
    cartServiceSpy = TestBed.inject(CartService) as jasmine.SpyObj<CartService>;
    toastControllerSpy = TestBed.inject(ToastController) as jasmine.SpyObj<ToastController>;
    loadingControllerSpy = TestBed.inject(LoadingController) as jasmine.SpyObj<LoadingController>;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load vinilos successfully', fakeAsync(() => {
    databaseServiceSpy.getVinyls.and.returnValue(of(mockVinilos));
    
    component.ngOnInit();
    tick();

    expect(component.vinilos.length).toBe(1);
    expect(component.vinilosFiltrados.length).toBe(1);
    expect(component.loading).toBeFalse();
  }));

  it('should handle empty vinilos list', fakeAsync(() => {
    databaseServiceSpy.getVinyls.and.returnValue(of([]));
    
    component.ngOnInit();
    tick();

    expect(component.vinilos.length).toBe(0);
    expect(component.vinilosFiltrados.length).toBe(0);
    expect(toastControllerSpy.create).toHaveBeenCalledWith({
      message: 'No se encontraron vinilos disponibles',
      duration: 2000,
      position: 'bottom',
      color: 'warning'
    });
  }));

  it('should handle error loading vinilos', fakeAsync(() => {
    databaseServiceSpy.getVinyls.and.returnValue(throwError(() => new Error('Test error')));
    
    component.ngOnInit();
    tick();

    expect(toastControllerSpy.create).toHaveBeenCalledWith({
      message: 'Error al cargar los vinilos',
      duration: 2000,
      position: 'bottom',
      color: 'danger'
    });
  }));

  it('should filter vinilos by search text', () => {
    component.vinilos = mockVinilos;
    component.vinilosFiltrados = mockVinilos;

    component.buscarVinilos({ target: { value: 'Test' } });
    expect(component.vinilosFiltrados.length).toBe(1);

    component.buscarVinilos({ target: { value: 'NonExistent' } });
    expect(component.vinilosFiltrados.length).toBe(0);
  });

  it('should show vinyl description', () => {
    component.mostrarDescripcion(mockVinilos[0]);
    
    expect(component.viniloSeleccionado).toBe(mockVinilos[0]);
    expect(component.mostrarDescripcionDetalle).toBe('descripcion');
  });

  it('should close vinyl description', () => {
    component.viniloSeleccionado = mockVinilos[0];
    component.cerrarDescripcion();
    
    expect(component.viniloSeleccionado).toBeNull();
  });

  it('should get description text correctly', () => {
    const texto = component.getDescripcionTexto(mockVinilos[0]);
    expect(texto).toBe('Test description');
  });

  it('should add vinyl to cart', fakeAsync(() => {
    component.viniloSeleccionado = mockVinilos[0];
    cartServiceSpy.addToCart.and.returnValue(Promise.resolve(true));

    component.agregarAlCarrito();
    tick();

    expect(cartServiceSpy.addToCart).toHaveBeenCalledWith(mockVinilos[0]);
    expect(component.viniloSeleccionado).toBeNull();
  }));

  it('should handle error adding to cart', fakeAsync(() => {
    component.viniloSeleccionado = mockVinilos[0];
    cartServiceSpy.addToCart.and.returnValue(Promise.reject('Error'));

    component.agregarAlCarrito();
    tick();

    expect(cartServiceSpy.addToCart).toHaveBeenCalledWith(mockVinilos[0]);
    expect(component.viniloSeleccionado).not.toBeNull();
  }));
});