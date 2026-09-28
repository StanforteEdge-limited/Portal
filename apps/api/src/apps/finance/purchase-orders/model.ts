export type PoLineItem = {
  description: string;
  qty: number;
  unit: string;
  unitCost: number;
  totalCost: number;
};

export type PurchaseOrderContext = {
  poNumber: string;
  date: string;
  vendor: {
    name: string;
    address?: string;
    email?: string;
  };
  preparedBy: string;
  deliveryAddress?: string;
  deliveryDate?: string;
  paymentTerms?: string;
  paymentPattern?: string | null;
  items: PoLineItem[];
  totalAmount: number;
  currency: string;
  orgName: string;
  orgAddress?: string;
};
