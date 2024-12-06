import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { DatabaseService } from './database.service';

export interface Order {
  id?: number;
  userId: number;
  total: number;
  items: any; 
  paymentMethod: string;
  createdAt?: string;
}

@Injectable({
  providedIn: 'root'
})
export class OrderService {
  constructor(private databaseService: DatabaseService) {}

  createOrder(order: Order): Observable<any> {
    const query = `
      INSERT INTO Orders 
      (userId, totalAmount, orderDetails, paymentMethod, createdAt, status) 
      VALUES (?, ?, ?, ?, ?, ?)
    `;
  
    return this.databaseService.executeQuerySQL(query, [
      order.userId,
      order.total, // Se usa "totalAmount" en lugar de "total"
      JSON.stringify(order.items), // Se inserta en "orderDetails"
      order.paymentMethod,
      new Date().toISOString(),
      'Pending' // Estado inicial del pedido
    ]).pipe(
      map(response => response),
      catchError(error => {
        console.error('Error creating order:', error);
        return of({ success: false, error: error.message });
      })
    );
  }

  updateOrderStatus(orderId: number, status: string): Observable<any> {
    const query = `UPDATE Orders SET status = ? WHERE id = ?`;
    return this.databaseService.executeQuerySQL(query, [status, orderId]).pipe(
      map(() => ({ success: true })),
      catchError(error => {
        console.error('Error actualizando estado de orden:', error);
        return of({ success: false, error });
      })
    );
  }
  

  getOrdersByUserId(userId: number): Observable<Order[]> {
    const query = `
      SELECT id, userId, totalAmount AS total, orderDetails AS items, paymentMethod, createdAt 
      FROM Orders 
      WHERE userId = ? 
      ORDER BY createdAt DESC
    `;
  
    return this.databaseService.executeQuerySQL(query, [userId]).pipe(
      map((result: any) => {
        if (!result || !result.values) return [];
        return result.values.map((row: any) => ({
          id: row.id,
          userId: row.userId,
          total: row.total || 0,
          items: JSON.parse(row.items || '[]'), // Parsear orderDetails como JSON
          paymentMethod: row.paymentMethod,
          createdAt: row.createdAt
        }));
      }),
      catchError(error => {
        console.error('Error fetching orders:', error);
        return of([]);
      })
    );
  }
}