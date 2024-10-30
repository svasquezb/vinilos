export interface User {
    id?: number;              
    username: string;         
    password: string;         
    role: 'user' | 'admin' ;  
    name: string;             
    email: string;            
    phoneNumber?: string;     
    createdAt?: string;       
    lastLogin?: string;       
  }
  