export interface Order {
    id?: number;
    userId: number;
    createdAt?: string;
    status: string;
    totalAmount: number;
    orderDetails: {
      productId: number;
      quantity: number;
      price: number;
    }[];
  }