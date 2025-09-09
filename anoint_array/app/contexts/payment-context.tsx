
'use client';

import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { toast } from 'sonner';

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  type: 'product' | 'seal';
  imageUrl?: string;
  category?: string;
  customData?: any; // For seal generator data
}

export interface AddressInfo {
  fullName: string;
  email?: string;
  phone?: string;
  street: string;
  address2?: string; // Optional second address line
  city: string;
  state: string;
  zip: string;
  country: string;
}

export interface PaymentState {
  cart: CartItem[];
  isOpen: boolean;
  selectedPaymentMethod: 'stripe' | 'paypal' | 'crypto' | null;
  orderData: any;
  isProcessing: boolean;
  shippingAddress?: AddressInfo;
  billingAddress?: AddressInfo;
  billingSameAsShipping: boolean;
}

type PaymentAction =
  | { type: 'ADD_TO_CART'; item: CartItem }
  | { type: 'REMOVE_FROM_CART'; id: string }
  | { type: 'UPDATE_QUANTITY'; id: string; quantity: number }
  | { type: 'CLEAR_CART' }
  | { type: 'TOGGLE_MODAL'; isOpen?: boolean }
  | { type: 'SET_PAYMENT_METHOD'; method: PaymentState['selectedPaymentMethod'] }
  | { type: 'SET_ORDER_DATA'; data: any }
  | { type: 'SET_PROCESSING'; processing: boolean }
  | { type: 'SET_SHIPPING_ADDRESS'; address: AddressInfo }
  | { type: 'SET_BILLING_ADDRESS'; address: AddressInfo }
  | { type: 'SET_BILLING_SAME_AS_SHIPPING'; value: boolean };

const initialState: PaymentState = {
  cart: [],
  isOpen: false,
  selectedPaymentMethod: null,
  orderData: null,
  isProcessing: false,
  shippingAddress: undefined,
  billingAddress: undefined,
  billingSameAsShipping: true,
};

function paymentReducer(state: PaymentState, action: PaymentAction): PaymentState {
  switch (action.type) {
    case 'ADD_TO_CART':
      const existingItem = state.cart.find(item => item.id === action.item.id);
      if (existingItem) {
        return {
          ...state,
          cart: state.cart.map(item =>
            item.id === action.item.id
              ? { ...item, quantity: item.quantity + action.item.quantity }
              : item
          )
        };
      }
      return {
        ...state,
        cart: [...state.cart, action.item]
      };

    case 'REMOVE_FROM_CART':
      return {
        ...state,
        cart: state.cart.filter(item => item.id !== action.id)
      };

    case 'UPDATE_QUANTITY':
      return {
        ...state,
        cart: state.cart.map(item =>
          item.id === action.id ? { ...item, quantity: action.quantity } : item
        ).filter(item => item.quantity > 0)
      };

    case 'CLEAR_CART':
      return {
        ...state,
        cart: []
      };

    case 'TOGGLE_MODAL':
      return {
        ...state,
        isOpen: action.isOpen !== undefined ? action.isOpen : !state.isOpen
      };

    case 'SET_PAYMENT_METHOD':
      return {
        ...state,
        selectedPaymentMethod: action.method
      };

    case 'SET_ORDER_DATA':
      return {
        ...state,
        orderData: action.data
      };

    case 'SET_PROCESSING':
      return {
        ...state,
        isProcessing: action.processing
      };

    case 'SET_SHIPPING_ADDRESS':
      return {
        ...state,
        shippingAddress: action.address,
        billingAddress: state.billingSameAsShipping ? action.address : state.billingAddress,
      };

    case 'SET_BILLING_ADDRESS':
      return {
        ...state,
        billingAddress: action.address,
      };

    case 'SET_BILLING_SAME_AS_SHIPPING':
      return {
        ...state,
        billingSameAsShipping: action.value,
        ...(action.value && state.shippingAddress ? { billingAddress: state.shippingAddress } : {}),
      };

    default:
      return state;
  }
}

const PaymentContext = createContext<{
  state: PaymentState;
  addToCart: (item: CartItem) => void;
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  toggleModal: (isOpen?: boolean) => void;
  setPaymentMethod: (method: PaymentState['selectedPaymentMethod']) => void;
  setOrderData: (data: any) => void;
  setProcessing: (processing: boolean) => void;
  getTotalPrice: () => number;
  getTotalItems: () => number;
  setShippingAddress: (address: AddressInfo) => void;
  setBillingAddress: (address: AddressInfo) => void;
  setBillingSameAsShipping: (value: boolean) => void;
} | null>(null);

export function PaymentProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(paymentReducer, initialState);

  // Load cart from localStorage on mount
  useEffect(() => {
    try {
      const savedCart = localStorage.getItem('anoint-cart');
      if (savedCart) {
        const cartItems = JSON.parse(savedCart);
        cartItems.forEach((item: CartItem) => {
          dispatch({ type: 'ADD_TO_CART', item });
        });
      }
      const savedShipping = localStorage.getItem('anoint-shipping-address');
      if (savedShipping) {
        const shipping = JSON.parse(savedShipping);
        dispatch({ type: 'SET_SHIPPING_ADDRESS', address: shipping });
      }
      const savedBilling = localStorage.getItem('anoint-billing-address');
      if (savedBilling) {
        const billing = JSON.parse(savedBilling);
        dispatch({ type: 'SET_BILLING_ADDRESS', address: billing });
      }
      const savedSame = localStorage.getItem('anoint-billing-same');
      if (savedSame !== null) {
        dispatch({ type: 'SET_BILLING_SAME_AS_SHIPPING', value: savedSame === 'true' });
      }
    } catch (error) {
      console.error('Error loading cart from localStorage:', error);
    }
  }, []);

  // Save cart to localStorage when cart changes
  useEffect(() => {
    try {
      localStorage.setItem('anoint-cart', JSON.stringify(state.cart));
    } catch (error) {
      console.error('Error saving cart to localStorage:', error);
    }
  }, [state.cart]);

  // Persist addresses and billing toggle
  useEffect(() => {
    try {
      if (state.shippingAddress) {
        localStorage.setItem('anoint-shipping-address', JSON.stringify(state.shippingAddress));
      }
      if (state.billingAddress) {
        localStorage.setItem('anoint-billing-address', JSON.stringify(state.billingAddress));
      }
      localStorage.setItem('anoint-billing-same', String(state.billingSameAsShipping));
    } catch (error) {
      console.error('Error saving addresses to localStorage:', error);
    }
  }, [state.shippingAddress, state.billingAddress, state.billingSameAsShipping]);

  const addToCart = (item: CartItem) => {
    dispatch({ type: 'ADD_TO_CART', item });
    toast.success(`${item.name} added to cart!`);
  };

  const removeFromCart = (id: string) => {
    const item = state.cart.find(item => item.id === id);
    dispatch({ type: 'REMOVE_FROM_CART', id });
    if (item) {
      toast.success(`${item.name} removed from cart`);
    }
  };

  const updateQuantity = (id: string, quantity: number) => {
    dispatch({ type: 'UPDATE_QUANTITY', id, quantity });
  };

  const clearCart = () => {
    dispatch({ type: 'CLEAR_CART' });
    toast.success('Cart cleared');
  };

  const toggleModal = (isOpen?: boolean) => {
    dispatch({ type: 'TOGGLE_MODAL', isOpen });
  };

  const setPaymentMethod = (method: PaymentState['selectedPaymentMethod']) => {
    dispatch({ type: 'SET_PAYMENT_METHOD', method });
  };

  const setOrderData = (data: any) => {
    dispatch({ type: 'SET_ORDER_DATA', data });
  };

  const setProcessing = (processing: boolean) => {
    dispatch({ type: 'SET_PROCESSING', processing });
  };

  const setShippingAddress = (address: AddressInfo) => {
    dispatch({ type: 'SET_SHIPPING_ADDRESS', address });
  };

  const setBillingAddress = (address: AddressInfo) => {
    dispatch({ type: 'SET_BILLING_ADDRESS', address });
  };

  const setBillingSameAsShipping = (value: boolean) => {
    dispatch({ type: 'SET_BILLING_SAME_AS_SHIPPING', value });
  };

  const getTotalPrice = () => {
    return state.cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const getTotalItems = () => {
    return state.cart.reduce((total, item) => total + item.quantity, 0);
  };

  return (
    <PaymentContext.Provider value={{
      state,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      toggleModal,
      setPaymentMethod,
      setOrderData,
      setProcessing,
      setShippingAddress,
      setBillingAddress,
      setBillingSameAsShipping,
      getTotalPrice,
      getTotalItems
    }}>
      {children}
    </PaymentContext.Provider>
  );
}

export function usePayment() {
  const context = useContext(PaymentContext);
  if (!context) {
    throw new Error('usePayment must be used within a PaymentProvider');
  }
  return context;
}
