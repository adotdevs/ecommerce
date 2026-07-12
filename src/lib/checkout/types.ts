export type CheckoutStep = "shipping" | "payment" | "review" | "success";

export type ShippingMethodId = "standard" | "express" | "overnight";

export type CheckoutPaymentMethod =
  | "card"
  | "easypaisa"
  | "jazzcash"
  | "paypal"
  | "cod";

export interface CheckoutFormState {
  email: string;
  emailOffers: boolean;
  fullName: string;
  phone: string;
  street: string;
  apartment: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  saveAddress: boolean;
  shippingMethod: ShippingMethodId;
  paymentMethod: CheckoutPaymentMethod;
  cardNumber: string;
  cardName: string;
  cardExpiry: string;
  cardCvv: string;
  saveCard: boolean;
  billingSameAsShipping: boolean;
  billingFullName: string;
  billingStreet: string;
  billingCity: string;
  billingState: string;
  billingPostalCode: string;
  billingCountry: string;
}

export interface PlacedOrderResult {
  orderNumber: string;
  email: string;
  total: number;
  currency: string;
  paymentMethod: CheckoutPaymentMethod;
  createdAt: string;
}

export interface CheckoutFieldErrors {
  [key: string]: string | undefined;
}
