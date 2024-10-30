export interface Vinyl {
  id?: number;  
  titulo: string;
  artista: string;
  imagen: string;
  descripcion: string[];
  tracklist: string[];
  stock: number;
  precio: number;
  quantity?: number;
  IsAvailable: boolean;  
}