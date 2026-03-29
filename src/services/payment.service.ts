/**
 * EcoTrade — Payment Service
 * 
 * Flutterwave payment gateway integration.
 * Supports real Flutterwave API calls and a simulation mode for demos.
 */

import axios from 'axios';
import { FLW_SECRET_KEY } from '../utils/constants.ts';

/**
 * Check if the payment system is running in simulation mode.
 * Simulation mode activates when:
 * - FLW_SECRET_KEY is not set
 * - FLW_SECRET_KEY is the default mock key
 */
export const isSimulationMode = (): boolean => {
  return !FLW_SECRET_KEY || FLW_SECRET_KEY === 'FLWSECK_TEST-MOCK-KEY';
};

/**
 * Initiate a Flutterwave payment.
 * 
 * @param params - Payment parameters
 * @returns Flutterwave API response with payment link
 * @throws Error if the API call fails
 */
export const initiatePayment = async (params: {
  tx_ref: string;
  amount: number;
  email: string;
  name: string;
  redirect_url: string;
}): Promise<any> => {
  const response = await axios.post(
    'https://api.flutterwave.com/v3/payments',
    {
      tx_ref: params.tx_ref,
      amount: params.amount,
      currency: 'KES',
      redirect_url: params.redirect_url,
      customer: {
        email: params.email,
        name: params.name,
      },
      customizations: {
        title: 'EcoTrade Checkout',
        description: 'Payment for EcoTrade items',
        logo: 'https://picsum.photos/seed/ecotrade/200/200',
      },
      payment_options: 'card, mpesa, airtel',
    },
    {
      headers: {
        Authorization: `Bearer ${FLW_SECRET_KEY}`,
      },
    }
  );

  return response.data;
};
