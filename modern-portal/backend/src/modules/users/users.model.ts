export interface User {
  id: number;
  roleId: number;
  referenceNo?: string;
  reference?: number;
  name: string;
  email: string;
  password?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  organisation?: string;
  status: boolean;
  created?: string;
  modified?: string;
  deleted: boolean;
  gstin?: string;
  state?: string;
}

export interface CreateUserDto {
  roleId: number;
  referenceNo?: string;
  reference?: number;
  name: string;
  email: string;
  password: string;
  phone?: string;
  address?: string;
  street?: string;
  city?: string;
  country?: string;
  organisation?: string;
  gstin?: string;
  state?: string;
  stateCode?: number;
}

